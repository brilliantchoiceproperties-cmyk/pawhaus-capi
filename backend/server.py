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
import stripe

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# MongoDB
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

STRIPE_API_KEY = os.environ["STRIPE_API_KEY"]
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
stripe.api_key = STRIPE_API_KEY

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
        "capacity": "Sleeps 2 + up to 2 pets",
        "description": "Intimate glass cabin tucked in the pines. Queen bed, private yard, fire pit, in-cabin shower and bathroom, small kitchenette, lake & dog park access.",
        "has_hot_tub": False,
        "nightly_rates": {"WEEKDAY": 500.0, "WEEKEND": 550.0},
    },
    "standard": {
        "id": "standard",
        "name": "Standard Room",
        "bed": "King Bed",
        "capacity": "Sleeps 2 + up to 3 pets (snug)",
        "description": "Upgraded suite with private wood-fire hot tub included, king bed, forest-facing deck, in-cabin shower and bathroom, small kitchenette. It's a tiny home — comfortable for two humans with two dogs; snug with three.",
        "has_hot_tub": True,
        "nightly_rates": {"WEEKDAY": 575.0, "WEEKEND": 675.0},
    },
    "monolith": {
        "id": "monolith",
        "name": "Monolith Room",
        "bed": "King Bed",
        "capacity": "Sleeps 4 + up to 3 pets",
        "description": "Our largest unit. Double-height glass, king bed, in-cabin shower and bathroom, small kitchenette, private wood-fire hot tub included. Sleeps four humans plus up to three dogs.",
        "has_hot_tub": True,
        "nightly_rates": {"WEEKDAY": 650.0, "WEEKEND": 750.0},
    },
}

# Hot tub is now included in the Standard & Monolith room rate — no extra charge.
HOT_TUB_PREMIUM_PER_NIGHT = 0.0

STAY_OPTIONS = [
    {"id": "WEEKDAY_1N", "label": "Weekday • 1 Night", "type": "WEEKDAY", "nights": 1},
    {"id": "WEEKDAY_2N", "label": "Weekday • 2 Nights", "type": "WEEKDAY", "nights": 2},
    {"id": "WEEKEND_1N", "label": "Weekend • 1 Night", "type": "WEEKEND", "nights": 1},
    {"id": "WEEKEND_2N", "label": "Weekend • 2 Nights", "type": "WEEKEND", "nights": 2},
]

# Date constraints
MIN_CHECKIN = "2026-12-01"  # doors open Dec 1, 2026
BLACKOUT_MONTH_DAYS = {"12-24", "12-25", "12-31"}  # Christmas Eve, Christmas, NYE — recurring annually


def _validate_dates(check_in: Optional[str], nights: int) -> None:
    """Raise HTTPException if check-in or any night of the stay is invalid."""
    from datetime import date, timedelta
    if not check_in:
        return  # frontend already required it; backend stays permissive for partial drafts
    try:
        d = date.fromisoformat(check_in)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid check-in date format.")
    min_date = date.fromisoformat(MIN_CHECKIN)
    if d < min_date:
        raise HTTPException(status_code=400, detail="Check-in must be on or after December 1, 2026.")
    for i in range(nights):
        night = d + timedelta(days=i)
        md = f"{night.month:02d}-{night.day:02d}"
        if md in BLACKOUT_MONTH_DAYS:
            raise HTTPException(
                status_code=400,
                detail=f"{night.strftime('%b %-d')} is a holiday blackout date. Please pick different dates.",
            )


# Discount tiers
VIP_CODE = "PAWVIP"
INSIDER_CODE = "PAW40"
DISCOUNTS = {
    "VIP": {"label": "Founders Pass", "percent": 0.50},
    "INSIDER": {"label": "Insider Pass", "percent": 0.40},
    "PUBLIC": {"label": "Pre-Launch Guest", "percent": 0.25},
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
        return {
            "valid": True,
            "tier": "VIP",
            "tier_label": DISCOUNTS["VIP"]["label"],
            "discount_percent": DISCOUNTS["VIP"]["percent"],
            "message": "Welcome, Founder. 50% off your first stay is unlocked.",
        }
    if code == INSIDER_CODE:
        return {
            "valid": True,
            "tier": "INSIDER",
            "tier_label": DISCOUNTS["INSIDER"]["label"],
            "discount_percent": DISCOUNTS["INSIDER"]["percent"],
            "message": "Code unlocked. 40% off your first stay.",
        }
    raise HTTPException(status_code=400, detail="That code doesn't match any active discount. Continue with 25% off pre-launch pricing.")


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

    # Server-side date guard
    stay = next((s for s in STAY_OPTIONS if s["id"] == req.stay_id), None)
    if stay:
        _validate_dates(req.booking.check_in, stay["nights"])

    # Anti-abuse: VIP and INSIDER first-stay discounts are one-time per email
    if req.tier in ("VIP", "INSIDER"):
        existing = await db.payment_transactions.find_one(
            {"metadata.tier": req.tier, "metadata.email": req.booking.email.lower(), "payment_status": "paid"},
            {"_id": 0},
        )
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"That discount has already been used for this email.",
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

    # Verify signature with the official Stripe library + the webhook signing secret.
    # Falls back to the emergentintegrations helper only if no signing secret is configured (dev / preview).
    if STRIPE_WEBHOOK_SECRET:
        try:
            event = stripe.Webhook.construct_event(body, signature, STRIPE_WEBHOOK_SECRET)
        except (stripe.error.SignatureVerificationError, ValueError) as e:
            logger.warning("Stripe webhook signature verification failed: %s", e)
            raise HTTPException(status_code=400, detail="Invalid signature.")

        event_type = event["type"]
        data_object = event["data"]["object"]
        session_id = data_object.get("id") if event_type.startswith("checkout.session.") else None
        payment_status = data_object.get("payment_status") if session_id else None
        metadata = data_object.get("metadata") or {}

        if session_id:
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {
                    "$set": {
                        "payment_status": payment_status or "",
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                        "last_event_type": event_type,
                    }
                },
            )
            if payment_status == "paid" or event_type == "checkout.session.completed":
                booking_id = metadata.get("booking_id")
                if booking_id:
                    await db.bookings.update_one(
                        {"id": booking_id},
                        {"$set": {"status": "confirmed", "paid_at": datetime.now(timezone.utc).isoformat()}},
                    )
        return {"received": True}

    # No signing secret configured — fall back to the integration helper (dev only).
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
