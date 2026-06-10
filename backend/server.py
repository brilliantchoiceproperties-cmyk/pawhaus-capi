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
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# MongoDB
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

STRIPE_API_KEY = os.environ["STRIPE_API_KEY"]
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
GHL_WEBHOOK_URL = os.environ.get("GHL_WEBHOOK_URL", "")
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
        "max_pets": 2,
        "description": "Intimate glass cabin tucked in the pines. Queen bed, private yard, fire pit, in-cabin shower and bathroom, small kitchenette, lake & dog park access.",
        "has_hot_tub": False,
        # base totals BEFORE the public 30% discount, per stay
        "stay_totals": {
            "WEEKDAY_1N": 558.0,
            "WEEKDAY_2N": 1116.0,
            "WEEKEND_1N": 798.0,
            "WEEKEND_2N": 1474.0,
            "LONG_3N": 1759.0,
        },
    },
    "standard": {
        "id": "standard",
        "name": "Standard Room",
        "bed": "King Bed",
        "capacity": "Sleeps 2 + up to 3 pets (snug)",
        "max_pets": 3,
        "description": "Upgraded suite with private wood-fire hot tub included, king bed, forest-facing deck, in-cabin shower and bathroom, small kitchenette. It's a tiny home — comfortable for two humans with two dogs; snug with three.",
        "has_hot_tub": True,
        "stay_totals": {
            "WEEKDAY_1N": 698.0,
            "WEEKDAY_2N": 1278.0,
            "WEEKEND_1N": 938.0,
            "WEEKEND_2N": 1692.0,
            "LONG_3N": 2089.0,
        },
    },
    "monolith": {
        "id": "monolith",
        "name": "Monolith Room",
        "bed": "King Bed",
        "capacity": "Sleeps 4 + up to 3 pets",
        "max_pets": 3,
        "description": "Our largest unit. Double-height glass, king bed, in-cabin shower and bathroom, small kitchenette, private wood-fire hot tub included. Sleeps four humans plus up to three dogs.",
        "has_hot_tub": True,
        "stay_totals": {
            "WEEKDAY_1N": 898.0,
            "WEEKDAY_2N": 1478.0,
            "WEEKEND_1N": 1138.0,
            "WEEKEND_2N": 1952.0,
            "LONG_3N": 2419.0,
        },
    },
}

# Hot tub is now included in the Standard & Monolith room rate — no extra charge.
HOT_TUB_PREMIUM_PER_NIGHT = 0.0

STAY_OPTIONS = [
    {"id": "WEEKDAY_1N", "label": "Weekday • 1 Night", "type": "WEEKDAY", "nights": 1},
    {"id": "WEEKDAY_2N", "label": "Weekday • 2 Nights", "type": "WEEKDAY", "nights": 2},
    {"id": "WEEKEND_1N", "label": "Weekend • 1 Night", "type": "WEEKEND", "nights": 1},
    {"id": "WEEKEND_2N", "label": "Weekend • 2 Nights", "type": "WEEKEND", "nights": 2},
    {"id": "LONG_3N", "label": "Long Weekend • 3 Nights", "type": "MIXED", "nights": 3},
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


# Public discount only (VIP/Insider site moved to its own variant)
DISCOUNTS = {
    "PUBLIC": {"label": "Pre-Launch Guest", "percent": 0.30},
}


def calculate_quote(room_id: str, stay_id: str, tier: str) -> Dict[str, Any]:
    room = ROOMS.get(room_id)
    stay = next((s for s in STAY_OPTIONS if s["id"] == stay_id), None)
    if not room or not stay:
        raise HTTPException(status_code=400, detail="Invalid room or stay selection.")
    # Always PUBLIC tier on this site
    tier = "PUBLIC"

    base_rate = room["stay_totals"].get(stay_id)
    if base_rate is None:
        raise HTTPException(status_code=400, detail="No price configured for that room/stay combination.")
    base_rate = round(base_rate, 2)
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
    code: str  # deprecated — site is now public-only; kept to avoid import errors elsewhere


class QuoteRequest(BaseModel):
    room_id: str
    stay_id: str
    tier: str = "PUBLIC"


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
    tier: str = "PUBLIC"
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

    # Enforce max pets per room
    room = ROOMS.get(req.room_id)
    if room:
        pets_count = len([p for p in req.booking.pets if p.name.strip()])
        if pets_count > room.get("max_pets", 99):
            raise HTTPException(
                status_code=400,
                detail=f"{room['name']} allows up to {room['max_pets']} pets. Please remove some.",
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
        await notify_ghl_payment_success(txn.get("booking_id"))

    booking = await db.bookings.find_one({"id": txn.get("booking_id")}, {"_id": 0})
    return {
        "payment_status": new_payment_status,
        "status": new_status,
        "amount": status.amount_total / 100.0,
        "currency": status.currency,
        "booking": booking,
    }


async def notify_ghl_payment_success(booking_id: str) -> None:
    """
    Forward a confirmed booking to the GoHighLevel inbound webhook.
    Idempotent: only fires once per booking (guarded by `ghl_notified_at`).
    Failures are logged but never raised — GHL must not block payment flow.
    """
    if not GHL_WEBHOOK_URL:
        return

    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking or booking.get("ghl_notified_at"):
        return

    details = booking.get("booking") or {}
    quote = booking.get("quote") or {}
    full_name = (details.get("full_name") or "").strip()
    name_parts = full_name.split(" ", 1)
    first_name = name_parts[0] if name_parts else ""
    last_name = name_parts[1] if len(name_parts) > 1 else ""
    pets = details.get("pets") or []

    payload = {
        "event": "payment_success",
        "booking_id": booking.get("id"),
        "stripe_session_id": booking.get("stripe_session_id"),
        "tier": booking.get("tier"),
        "tier_label": booking.get("tier_label"),
        "room_id": booking.get("room_id"),
        "room_name": booking.get("room_name"),
        "stay_id": booking.get("stay_id"),
        "stay_label": booking.get("stay_label"),
        "email": details.get("email"),
        "full_name": full_name,
        "first_name": first_name,
        "last_name": last_name,
        "phone": details.get("phone"),
        "guests": details.get("guests"),
        "check_in": details.get("check_in"),
        "check_out": details.get("check_out"),
        "backup_date_1": details.get("backup_date_1"),
        "backup_date_2": details.get("backup_date_2"),
        "notes": details.get("notes"),
        "pet_count": len(pets),
        "pet_names": ", ".join([p.get("name", "") for p in pets if p.get("name")]),
        "pets": pets,
        "total_amount": quote.get("total"),
        "base_price": quote.get("base"),
        "discount_amount": quote.get("discount"),
        "hot_tub_premium": quote.get("hot_tub"),
        "currency": "usd",
        "paid_at": booking.get("paid_at") or datetime.now(timezone.utc).isoformat(),
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as ghl:
            resp = await ghl.post(GHL_WEBHOOK_URL, json=payload)
            resp.raise_for_status()
        await db.bookings.update_one(
            {"id": booking_id},
            {"$set": {"ghl_notified_at": datetime.now(timezone.utc).isoformat()}},
        )
        logger.info("GHL notified for booking %s", booking_id)
    except Exception as e:
        logger.exception("GHL notification failed for booking %s: %s", booking_id, e)


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
                    await notify_ghl_payment_success(booking_id)
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
                await notify_ghl_payment_success(booking_id)

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
