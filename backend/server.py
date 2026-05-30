from fastapi import FastAPI, APIRouter, HTTPException, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionRequest,
    CheckoutSessionResponse,
    CheckoutStatusResponse,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# MongoDB
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

STRIPE_API_KEY = os.environ["STRIPE_API_KEY"]

app = FastAPI(title="PawHaus VIP Portal A/B")
api_router = APIRouter(prefix="/api")

# ---------------------------------------------------------------------------
# Static catalog (server-side source of truth — never trust the client)
# ---------------------------------------------------------------------------

ROOMS: Dict[str, Dict[str, Any]] = {
    "petite": {
        "id": "petite",
        "name": "Petite Room",
        "bed": "Queen Bed",
        "capacity": "Sleeps 2 + Pets",
        "description": "Intimate glass cabin tucked in the pines. Queen bed, private yard, fire pit.",
        "has_hot_tub": False,
        "nightly_rates": {"WEEKDAY": 558.0, "WEEKEND": 558.0},
    },
    "standard": {
        "id": "standard",
        "name": "Standard Room",
        "bed": "King Bed",
        "capacity": "Sleeps 2 + Pets",
        "description": "Upgraded suite with private wood-fire hot tub, king bed, and forest-facing deck.",
        "has_hot_tub": True,
        "nightly_rates": {"WEEKDAY": 658.0, "WEEKEND": 658.0},
    },
    "monolith": {
        "id": "monolith",
        "name": "Monolith Room",
        "bed": "King Bed",
        "capacity": "Sleeps 4 + Pets",
        "description": "Our flagship architectural suite. Double-height glass, fireplace, dog spa nook, hot tub.",
        "has_hot_tub": True,
        # Monolith has a slight weekend differential per spec ($849 nightly on weekend)
        "nightly_rates": {"WEEKDAY": 858.0, "WEEKEND": 849.0},
    },
}

HOT_TUB_PREMIUM_PER_NIGHT = 20.0

STAY_OPTIONS = [
    {"id": "WEEKDAY_1N", "label": "Weekday • 1 Night", "type": "WEEKDAY", "nights": 1},
    {"id": "WEEKDAY_2N", "label": "Weekday • 2 Nights", "type": "WEEKDAY", "nights": 2},
    {"id": "WEEKEND_1N", "label": "Weekend • 1 Night", "type": "WEEKEND", "nights": 1},
    {"id": "WEEKEND_2N", "label": "Weekend • 2 Nights", "type": "WEEKEND", "nights": 2},
]

# Discount tiers
VIP_CODE = "PAWVIP"
DISCOUNTS = {
    "VIP": {"label": "Founders Pass", "percent": 0.50},
    "PUBLIC": {"label": "Pre-Launch Guest", "percent": 0.20},
}


def calculate_quote(room_id: str, stay_id: str, tier: str) -> Dict[str, Any]:
    room = ROOMS.get(room_id)
    stay = next((s for s in STAY_OPTIONS if s["id"] == stay_id), None)
    if not room or not stay:
        raise HTTPException(status_code=400, detail="Invalid room or stay selection.")
    if tier not in DISCOUNTS:
        raise HTTPException(status_code=400, detail="Invalid discount tier.")

    nightly = room["nightly_rates"][stay["type"]]
    base_rate = round(nightly * stay["nights"], 2)
    discount_amount = round(base_rate * DISCOUNTS[tier]["percent"], 2)
    hot_tub_premium = round(HOT_TUB_PREMIUM_PER_NIGHT * stay["nights"], 2) if room["has_hot_tub"] else 0.0
    total = round(base_rate - discount_amount + hot_tub_premium, 2)

    return {
        "room_id": room_id,
        "room_name": room["name"],
        "stay_id": stay_id,
        "stay_label": stay["label"],
        "nights": stay["nights"],
        "tier": tier,
        "tier_label": DISCOUNTS[tier]["label"],
        "base_rate": base_rate,
        "discount_amount": discount_amount,
        "discount_percent": DISCOUNTS[tier]["percent"],
        "hot_tub_premium": hot_tub_premium,
        "total": total,
        "currency": "usd",
    }


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class Pet(BaseModel):
    name: str
    breed: Optional[str] = ""
    size: Optional[str] = "Medium (25-60 lb)"
    special_needs: Optional[str] = ""


class CodeValidateRequest(BaseModel):
    code: str


class QuoteRequest(BaseModel):
    room_id: str
    stay_id: str
    tier: str  # VIP | PUBLIC


class BookingDetails(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    guests: int = 2
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    backup_date_1: Optional[str] = None
    backup_date_2: Optional[str] = None
    pets: List[Pet] = []
    notes: Optional[str] = ""


class CheckoutRequest(BaseModel):
    room_id: str
    stay_id: str
    tier: str
    booking: BookingDetails
    origin_url: str


# ---------------------------------------------------------------------------
# Catalog endpoints
# ---------------------------------------------------------------------------

@api_router.get("/catalog")
async def get_catalog():
    return {
        "rooms": list(ROOMS.values()),
        "stay_options": STAY_OPTIONS,
        "hot_tub_premium_per_night": HOT_TUB_PREMIUM_PER_NIGHT,
        "discounts": DISCOUNTS,
    }


@api_router.post("/code/validate")
async def validate_code(req: CodeValidateRequest):
    code = (req.code or "").strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="Please enter a code.")
    if code == VIP_CODE:
        # Check if this VIP code has already been used for a paid first stay (one-time per code)
        # Founders codes are unique per user in reality; here PAWVIP is a demo code we keep usable.
        return {
            "valid": True,
            "tier": "VIP",
            "tier_label": DISCOUNTS["VIP"]["label"],
            "discount_percent": DISCOUNTS["VIP"]["percent"],
            "message": "Welcome, Founder. 50% off your first stay is unlocked.",
        }
    raise HTTPException(status_code=400, detail="That code doesn't match any Founders Pass. Continue with 20% off pre-launch pricing.")


@api_router.post("/quote")
async def quote(req: QuoteRequest):
    return calculate_quote(req.room_id, req.stay_id, req.tier)


# ---------------------------------------------------------------------------
# Stripe checkout
# ---------------------------------------------------------------------------

@api_router.post("/payments/checkout/session")
async def create_checkout_session(req: CheckoutRequest, http_request: Request):
    # Server-side computed amount (NEVER trust frontend)
    quote_data = calculate_quote(req.room_id, req.stay_id, req.tier)

    # Anti-abuse: for VIP tier require the booking email hasn't already paid with VIP
    if req.tier == "VIP":
        existing = await db.payment_transactions.find_one(
            {"metadata.tier": "VIP", "metadata.email": req.booking.email.lower(), "payment_status": "paid"},
            {"_id": 0},
        )
        if existing:
            raise HTTPException(
                status_code=400,
                detail="The Founders 50% first-stay discount has already been used for this email.",
            )

    booking_id = str(uuid.uuid4())
    origin = req.origin_url.rstrip("/")
    success_url = f"{origin}/booking/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/booking/cancel"

    metadata = {
        "booking_id": booking_id,
        "room_id": req.room_id,
        "stay_id": req.stay_id,
        "tier": req.tier,
        "email": req.booking.email.lower(),
        "full_name": req.booking.full_name,
    }

    host_url = str(http_request.base_url)
    webhook_url = f"{host_url.rstrip('/')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)

    checkout_req = CheckoutSessionRequest(
        amount=float(quote_data["total"]),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_req)

    booking_doc = {
        "id": booking_id,
        "room_id": req.room_id,
        "room_name": quote_data["room_name"],
        "stay_id": req.stay_id,
        "stay_label": quote_data["stay_label"],
        "tier": req.tier,
        "tier_label": quote_data["tier_label"],
        "booking": req.booking.model_dump(),
        "quote": quote_data,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "pending_payment",
        "stripe_session_id": session.session_id,
    }
    await db.bookings.insert_one(booking_doc)

    transaction_doc = {
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "amount": float(quote_data["total"]),
        "currency": "usd",
        "metadata": metadata,
        "payment_status": "initiated",
        "status": "open",
        "booking_id": booking_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.payment_transactions.insert_one(transaction_doc)

    return {"url": session.url, "session_id": session.session_id, "booking_id": booking_id}


@api_router.get("/payments/checkout/status/{session_id}")
async def get_payment_status(session_id: str, http_request: Request):
    txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not txn:
        raise HTTPException(status_code=404, detail="Session not found.")

    # If already finalized, return as-is (avoid double-processing)
    if txn.get("payment_status") in ("paid", "expired", "failed"):
        booking = await db.bookings.find_one({"id": txn.get("booking_id")}, {"_id": 0})
        return {
            "payment_status": txn["payment_status"],
            "status": txn["status"],
            "amount": txn["amount"],
            "currency": txn["currency"],
            "booking": booking,
        }

    host_url = str(http_request.base_url)
    webhook_url = f"{host_url.rstrip('/')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)

    new_payment_status = status.payment_status
    new_status = status.status

    update = {
        "payment_status": new_payment_status,
        "status": new_status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.payment_transactions.update_one({"session_id": session_id}, {"$set": update})

    if new_payment_status == "paid":
        await db.bookings.update_one(
            {"id": txn.get("booking_id")}, {"$set": {"status": "confirmed", "paid_at": datetime.now(timezone.utc).isoformat()}}
        )

    booking = await db.bookings.find_one({"id": txn.get("booking_id")}, {"_id": 0})
    return {
        "payment_status": new_payment_status,
        "status": new_status,
        "amount": status.amount_total / 100.0,
        "currency": status.currency,
        "booking": booking,
    }


@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")
    host_url = str(request.base_url)
    webhook_url = f"{host_url.rstrip('/')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    try:
        evt = await stripe_checkout.handle_webhook(body, signature)
    except Exception as e:
        logger.exception("Stripe webhook handling failed: %s", e)
        raise HTTPException(status_code=400, detail="Invalid webhook payload.")

    if evt.session_id:
        await db.payment_transactions.update_one(
            {"session_id": evt.session_id},
            {
                "$set": {
                    "payment_status": evt.payment_status,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "last_event_type": evt.event_type,
                }
            },
        )
        if evt.payment_status == "paid":
            booking_id = (evt.metadata or {}).get("booking_id")
            if booking_id:
                await db.bookings.update_one(
                    {"id": booking_id},
                    {"$set": {"status": "confirmed", "paid_at": datetime.now(timezone.utc).isoformat()}},
                )

    return {"received": True}


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@api_router.get("/")
async def root():
    return {"message": "PawHaus VIP Portal A/B API", "status": "ok"}


# ---------------------------------------------------------------------------
# App wiring
# ---------------------------------------------------------------------------

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
