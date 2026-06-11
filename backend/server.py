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

from meta_capi import (
    send_meta_event,
    build_purchase_event,
    build_initiate_checkout_event,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# MongoDB
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

STRIPE_API_KEY = os.environ["STRIPE_API_KEY"]
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
GHL_WEBHOOK_URL = os.environ.get("GHL_WEBHOOK_URL", "")
GHL_ABANDONED_WEBHOOK_URL = os.environ.get("GHL_ABANDONED_WEBHOOK_URL", "")
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


REFERRAL_DISCOUNT_USD = 50.0  # $ off for the friend; referrer earns a matching voucher via GHL


async def _is_valid_referral_code(code: str) -> bool:
    if not code:
        return False
    return await db.bookings.find_one({"referral_code": code.upper()}) is not None


def calculate_quote(room_id: str, stay_id: str, tier: str, referral_applied: bool = False) -> Dict[str, Any]:
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
    referral_discount = REFERRAL_DISCOUNT_USD if referral_applied else 0.0
    total = round(base_rate - discount_amount + hot_tub_premium - referral_discount, 2)

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
        "referral_discount": referral_discount,
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
    referrer_code: Optional[str] = None


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
    referrer_code: Optional[str] = None


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
    ref_ok = await _is_valid_referral_code(req.referrer_code or "")
    return calculate_quote(req.room_id, req.stay_id, req.tier, referral_applied=ref_ok)


# Total weekend slots we're treating as "prime launch window" (Dec 2026 + Q1 2027).
# Tighter number = more visible scarcity. As real bookings come in, this naturally compresses further.
TOTAL_WEEKEND_SLOTS_PER_ROOM = 14



# ---------------------------------------------------------------------------
# Admin (token-protected) — funnel stats + booking list
# ---------------------------------------------------------------------------

ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "")


def _require_admin(req: Request) -> None:
    if not ADMIN_TOKEN:
        raise HTTPException(status_code=503, detail="Admin disabled (no ADMIN_TOKEN set)")
    token = req.headers.get("x-admin-token") or req.query_params.get("token")
    if token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")


@api_router.get("/admin/stats")
async def admin_stats(request: Request):
    _require_admin(request)
    confirmed_q = {"status": "confirmed"}
    started_count = await db.payment_transactions.count_documents({})
    confirmed_count = await db.bookings.count_documents(confirmed_q)
    pending_count = await db.bookings.count_documents({"status": "pending_payment"})

    revenue_cursor = db.bookings.find(confirmed_q, {"_id": 0, "quote.total": 1})
    revenue = 0.0
    async for d in revenue_cursor:
        revenue += float((d.get("quote") or {}).get("total") or 0)

    by_room: Dict[str, int] = {r: 0 for r in ROOMS.keys()}
    by_stay: Dict[str, int] = {}
    cur = db.bookings.find(confirmed_q, {"_id": 0, "room_id": 1, "stay_id": 1})
    async for d in cur:
        if d.get("room_id"):
            by_room[d["room_id"]] = by_room.get(d["room_id"], 0) + 1
        sid = d.get("stay_id")
        if sid:
            by_stay[sid] = by_stay.get(sid, 0) + 1

    return {
        "site": SITE_SOURCE,
        "funnel": {
            "checkouts_started": started_count,
            "bookings_pending": pending_count,
            "bookings_confirmed": confirmed_count,
            "conversion_rate": round((confirmed_count / started_count * 100), 1) if started_count else 0,
        },
        "revenue": {"total_usd": round(revenue, 2)},
        "by_room": by_room,
        "by_stay": by_stay,
    }


@api_router.get("/admin/bookings")
async def admin_bookings(request: Request, limit: int = 50, status: Optional[str] = None):
    _require_admin(request)
    q: Dict[str, Any] = {}
    if status:
        q["status"] = status
    cursor = (
        db.bookings.find(q, {"_id": 0})
        .sort("created_at", -1)
        .limit(min(limit, 200))
    )
    items = []
    async for d in cursor:
        items.append({
            "id": d.get("id"),
            "site": SITE_SOURCE,
            "status": d.get("status"),
            "room_name": d.get("room_name"),
            "stay_label": d.get("stay_label"),
            "total": (d.get("quote") or {}).get("total"),
            "full_name": (d.get("booking") or {}).get("full_name"),
            "email": (d.get("booking") or {}).get("email"),
            "phone": (d.get("booking") or {}).get("phone"),
            "check_in": (d.get("booking") or {}).get("check_in"),
            "check_out": (d.get("booking") or {}).get("check_out"),
            "pet_count": len([p for p in (d.get("booking") or {}).get("pets") or [] if (p.get("name") or "").strip()]),
            "created_at": d.get("created_at"),
            "paid_at": d.get("paid_at"),
        })
    return {"site": SITE_SOURCE, "items": items}


@api_router.delete("/admin/bookings/all")
async def admin_wipe_all(request: Request, confirm: str = ""):
    """One-shot wipe of ALL bookings + payment_transactions. Requires admin token AND confirm=YES."""
    _require_admin(request)
    if confirm != "YES":
        raise HTTPException(status_code=400, detail="Add ?confirm=YES to confirm wipe.")
    r1 = await db.bookings.delete_many({})
    r2 = await db.payment_transactions.delete_many({})
    return {
        "site": SITE_SOURCE,
        "bookings_deleted": r1.deleted_count,
        "payment_transactions_deleted": r2.deleted_count,
    }


@api_router.get("/scarcity")
async def scarcity():
    """
    Returns live availability counts (per cabin) and recent confirmed bookings
    for the on-page scarcity ticker. Fast, no-auth, safe to call frequently.
    """
    # Per-room weekend stays already booked
    confirmed_filter = {"status": "confirmed", "stay_id": {"$in": ["WEEKEND_1N", "WEEKEND_2N", "LONG_3N"]}}
    weekends_left = {}
    for room_id in ROOMS.keys():
        booked = await db.bookings.count_documents({**confirmed_filter, "room_id": room_id})
        left = max(1, TOTAL_WEEKEND_SLOTS_PER_ROOM - booked)
        weekends_left[room_id] = left

    # Last 5 confirmed bookings — anonymized (first name only)
    cursor = (
        db.bookings.find({"status": "confirmed"}, {"_id": 0, "booking.full_name": 1, "room_name": 1, "paid_at": 1, "stay_label": 1})
        .sort("paid_at", -1)
        .limit(5)
    )
    recent = []
    now = datetime.now(timezone.utc)
    async for doc in cursor:
        paid_at_raw = doc.get("paid_at")
        if not paid_at_raw:
            continue
        try:
            paid_at_dt = datetime.fromisoformat(paid_at_raw.replace("Z", "+00:00"))
        except Exception:
            continue
        delta = now - paid_at_dt
        seconds = int(delta.total_seconds())
        if seconds < 60:
            ago = "just now"
        elif seconds < 3600:
            ago = f"{seconds // 60} min ago"
        elif seconds < 86400:
            ago = f"{seconds // 3600} hr ago"
        else:
            ago = f"{seconds // 86400} day{'s' if seconds // 86400 > 1 else ''} ago"
        full_name = (doc.get("booking") or {}).get("full_name") or "A guest"
        first_name = full_name.split(" ")[0]
        recent.append({
            "first_name": first_name,
            "room_name": doc.get("room_name"),
            "stay_label": doc.get("stay_label"),
            "ago": ago,
        })

    return {
        "weekends_left": weekends_left,
        "total_bookings": await db.bookings.count_documents({"status": "confirmed"}),
        "recent": recent,
    }


# ---------------------------------------------------------------------------
# Stripe checkout
# ---------------------------------------------------------------------------

def _meta_signals_from_request(req: Request) -> Dict[str, Optional[str]]:
    """Extract Meta CAPI signals from the inbound HTTP request (IP, UA, fbp, fbc cookies)."""
    fwd = req.headers.get("x-forwarded-for", "")
    ip = (fwd.split(",")[0].strip() if fwd else (req.client.host if req.client else "")) or None
    return {
        "client_ip": ip,
        "client_ua": req.headers.get("user-agent"),
        "fbp": req.cookies.get("_fbp"),
        "fbc": req.cookies.get("_fbc"),
    }


@api_router.post("/payments/checkout/session")
async def create_checkout_session(req: CheckoutRequest, http_request: Request):
    # Validate referrer first (if provided)
    referrer_code_clean = (req.referrer_code or "").strip().upper()
    referral_applied = await _is_valid_referral_code(referrer_code_clean)
    referrer_booking = None
    if referral_applied:
        referrer_booking = await db.bookings.find_one({"referral_code": referrer_code_clean}, {"_id": 0})
        # Don't let users refer themselves
        if referrer_booking and (referrer_booking.get("booking") or {}).get("email", "").lower() == req.booking.email.lower():
            referral_applied = False
            referrer_booking = None

    # Server-side computed amount (NEVER trust frontend)
    quote_data = calculate_quote(req.room_id, req.stay_id, req.tier, referral_applied=referral_applied)

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
    # Generate a unique referral code for THIS new booking — they can share to earn $50 vouchers
    first_name_clean = "".join(c for c in (req.booking.full_name or "").split(" ")[0].upper() if c.isalpha())[:8] or "PAW"
    referral_code = f"{first_name_clean}-{uuid.uuid4().hex[:4].upper()}"
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

    # Direct Stripe SDK call so we can enable Apple Pay, Google Pay, and Link.
    # Stripe Checkout auto-renders the relevant wallets on supported devices.
    session = stripe.checkout.Session.create(
        mode="payment",
        success_url=success_url,
        cancel_url=cancel_url,
        payment_method_types=["card", "link"],
        line_items=[{
            "price_data": {
                "currency": "usd",
                "unit_amount": int(round(float(quote_data["total"]) * 100)),
                "product_data": {
                    "name": quote_data["room_name"],
                    "description": f"{quote_data['stay_label']} • {quote_data['tier_label']} ({int(quote_data['discount_percent'] * 100)}% off applied)",
                },
            },
            "quantity": 1,
        }],
        metadata=metadata,
        customer_email=req.booking.email,
        allow_promotion_codes=False,
        phone_number_collection={"enabled": False},
    )
    # Adapter object so the rest of the existing code (session.url, session.session_id) keeps working
    class _SessionView:
        url = session.url
        session_id = session.id
    session = _SessionView()

    sig = _meta_signals_from_request(http_request)
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
        "origin_url": origin,
        "referral_code": referral_code,
        "referrer_code": referrer_code_clean if referral_applied else None,
        "referrer_email": ((referrer_booking or {}).get("booking") or {}).get("email") if referrer_booking else None,
        "client_ip": sig["client_ip"],
        "client_ua": sig["client_ua"],
        "fbp": sig["fbp"],
        "fbc": sig["fbc"],
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

    # Fire "checkout_started" to GHL — seeds the abandoned-cart workflow.
    # If the customer pays, "payment_success" fires later and GHL workflow removes the abandoned tag.
    await notify_ghl("checkout_started", booking_id)

    # Fire Meta InitiateCheckout (server-side, dedupes with browser pixel via event_id = booking_id)
    meta = build_initiate_checkout_event(
        booking_doc=booking_doc,
        event_source_url=origin,
        client_ip=sig["client_ip"],
        client_ua=sig["client_ua"],
        fbp=sig["fbp"],
        fbc=sig["fbc"],
    )
    await send_meta_event(
        event_name="InitiateCheckout",
        event_id=f"initiate_{booking_id}",
        event_source_url=origin,
        user_data=meta["user_data"],
        custom_data=meta["custom_data"],
    )

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


SITE_SOURCE = "pawhaus-public-30"  # distinguishes this A/B variant from any future VIP-only site


async def notify_ghl(event: str, booking_id: str) -> None:
    """
    Forward a booking lifecycle event to the GoHighLevel inbound webhook.
    Supported events: "checkout_started" (abandoned-cart seed) and "payment_success".
    Each event is routed to its dedicated GHL webhook URL.
    Idempotent per event — each fires at most once per booking (guarded by
    `ghl_{event}_at` timestamp on the booking doc).
    Failures are logged but never raised — GHL must not block the user flow.
    """
    target_url = {
        "payment_success": GHL_WEBHOOK_URL,
        "checkout_started": GHL_ABANDONED_WEBHOOK_URL,
    }.get(event, "")
    if not target_url:
        return

    guard_field = f"ghl_{event}_at"
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking or booking.get(guard_field):
        return

    details = booking.get("booking") or {}
    quote = booking.get("quote") or {}
    full_name = (details.get("full_name") or "").strip()
    name_parts = full_name.split(" ", 1)
    first_name = name_parts[0] if name_parts else ""
    last_name = name_parts[1] if len(name_parts) > 1 else ""
    pets = details.get("pets") or []

    payload = {
        "event": event,
        "source": SITE_SOURCE,
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
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "paid_at": booking.get("paid_at"),
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as ghl:
            resp = await ghl.post(target_url, json=payload)
            resp.raise_for_status()
        await db.bookings.update_one(
            {"id": booking_id},
            {"$set": {guard_field: datetime.now(timezone.utc).isoformat()}},
        )
        logger.info("GHL notified [%s] for booking %s", event, booking_id)
    except Exception as e:
        logger.exception("GHL notify [%s] failed for booking %s: %s", event, booking_id, e)


# Backwards-compatible alias used in older call sites
async def notify_ghl_payment_success(booking_id: str) -> None:
    await notify_ghl("payment_success", booking_id)
    await fire_meta_purchase(booking_id)


async def fire_meta_purchase(booking_id: str) -> None:
    """Fire a Meta CAPI Purchase event for a confirmed booking. Idempotent."""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking or booking.get("meta_purchase_at"):
        return
    origin = (booking.get("origin_url") or "https://staypawhaus.com").rstrip("/")
    meta = build_purchase_event(
        booking_doc=booking,
        event_source_url=origin,
        client_ip=booking.get("client_ip"),
        client_ua=booking.get("client_ua"),
        fbp=booking.get("fbp"),
        fbc=booking.get("fbc"),
    )
    ok = await send_meta_event(
        event_name="Purchase",
        event_id=f"purchase_{booking_id}",
        event_source_url=origin,
        user_data=meta["user_data"],
        custom_data=meta["custom_data"],
    )
    if ok:
        await db.bookings.update_one(
            {"id": booking_id},
            {"$set": {"meta_purchase_at": datetime.now(timezone.utc).isoformat()}},
        )

    # Fire referral_converted to GHL (idempotent — guarded by ghl_referral_converted_at)
    if booking.get("referrer_email") and not booking.get("ghl_referral_converted_at"):
        await _notify_ghl_referral(booking_id)


async def _notify_ghl_referral(booking_id: str) -> None:
    """Fires a referral_converted event to GHL so the referrer gets a $50 voucher email."""
    if not GHL_WEBHOOK_URL:
        return
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking or booking.get("ghl_referral_converted_at"):
        return
    payload = {
        "event": "referral_converted",
        "source": SITE_SOURCE,
        "referrer_email": booking.get("referrer_email"),
        "referrer_code": booking.get("referrer_code"),
        "friend_first_name": ((booking.get("booking") or {}).get("full_name") or "").split(" ")[0],
        "friend_email": (booking.get("booking") or {}).get("email"),
        "friend_room_name": booking.get("room_name"),
        "friend_total": (booking.get("quote") or {}).get("total"),
        "voucher_amount": REFERRAL_DISCOUNT_USD,
        "occurred_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as ghl:
            resp = await ghl.post(GHL_WEBHOOK_URL, json=payload)
            resp.raise_for_status()
        await db.bookings.update_one(
            {"id": booking_id},
            {"$set": {"ghl_referral_converted_at": datetime.now(timezone.utc).isoformat()}},
        )
        logger.info("GHL referral_converted sent for booking %s", booking_id)
    except Exception as e:
        logger.warning("GHL referral_converted failed: %s", e)


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
