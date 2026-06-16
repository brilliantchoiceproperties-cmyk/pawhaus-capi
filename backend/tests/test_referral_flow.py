"""
End-to-end referral flow verification.

Validates the full $50-off referral mechanism without touching Stripe payment:
  1. Quote with no referrer → base price
  2. Quote with INVALID referrer → ignored (no discount)
  3. Quote with VALID referrer → $50 discount applied
  4. Checkout session with VALID referrer → booking stored with referrer_code + referrer_email,
     new referral_code generated for the friend, $50 less than the no-ref total
  5. Self-referral (same email as referrer) → silently rejected
  6. Each new booking gets a unique referral_code

Run: python -m pytest backend/tests/test_referral_flow.py -v -s
"""
import os
import uuid
import asyncio

import pytest
import httpx
from motor.motor_asyncio import AsyncIOMotorClient

API_URL = os.environ.get("REACT_APP_BACKEND_URL_FOR_TEST") or "http://localhost:8001"

# Allow override via env var; otherwise read frontend .env
if API_URL.startswith("http://localhost") and os.path.exists("/app/frontend/.env"):
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                API_URL = line.split("=", 1)[1].strip()

ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "gMonNetmm9f0sJXvJ1z1e2PTeMFkHeskSOb3YndWvGs")

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

# Read backend/.env to grab DB_NAME / MONGO_URL if present
if os.path.exists("/app/backend/.env"):
    with open("/app/backend/.env") as f:
        for line in f:
            line = line.strip()
            if line.startswith("MONGO_URL="):
                MONGO_URL = line.split("=", 1)[1].strip().strip('"').strip("'")
            if line.startswith("DB_NAME="):
                DB_NAME = line.split("=", 1)[1].strip().strip('"').strip("'")


REFERRAL_DISCOUNT = 50.0
ROOM_ID = "standard"  # no per-date cap — keeps referral tests independent
STAY_ID = "WEEKDAY_1N"
SAFE_CHECKIN = "2026-12-15"  # post-launch, not a blackout


def _make_payload(email, referrer_code=None, full_name="Test Referrer"):
    return {
        "room_id": ROOM_ID,
        "stay_id": STAY_ID,
        "tier": "PUBLIC",
        "origin_url": "https://example.com",
        "referrer_code": referrer_code,
        "booking": {
            "full_name": full_name,
            "email": email,
            "phone": "5551234567",
            "guests": 2,
            "check_in": SAFE_CHECKIN,
            "check_out": "2026-12-16",
            "pets": [{"name": "Bella", "breed": "Lab", "size": "Medium (25-60 lb)", "special_needs": ""}],
            "notes": "",
        },
    }


@pytest.fixture(scope="module")
def client():
    return httpx.Client(base_url=API_URL.rstrip("/"), timeout=30.0)


@pytest.fixture(scope="module")
def mongo():
    """Direct Mongo access to inspect persisted booking docs by booking_id (admin endpoint only returns subset)."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    client_m = AsyncIOMotorClient(MONGO_URL)
    db = client_m[DB_NAME]
    yield (loop, db)
    client_m.close()
    loop.close()


def _mongo_find_booking(mongo, booking_id):
    loop, db = mongo
    return loop.run_until_complete(db.bookings.find_one({"id": booking_id}, {"_id": 0}))


@pytest.fixture(scope="module")
def seeded_referrer(client, mongo):
    """Seed an initial 'referrer' booking and force-confirm it so its referral_code is valid."""
    email = f"referrer-{uuid.uuid4().hex[:6]}@test.pawhaus.dev"
    payload = _make_payload(email, full_name="Test Referrer")
    r = client.post("/api/payments/checkout/session", json=payload)
    assert r.status_code == 200, f"seed booking failed: {r.text}"
    data = r.json()
    booking_id = data["booking_id"]

    # Force-confirm to mimic a paid referrer (referral validation only requires the code exist in DB
    # regardless of status — see _is_valid_referral_code in server.py — but we confirm for realism)
    loop, db = mongo
    loop.run_until_complete(
        db.bookings.update_one({"id": booking_id}, {"$set": {"status": "confirmed"}})
    )

    booking = _mongo_find_booking(mongo, booking_id)
    assert booking and booking.get("referral_code"), "seeded booking missing referral_code"

    yield {
        "booking_id": booking_id,
        "email": email,
        "referral_code": booking["referral_code"],
    }


# ---------------------------------------------------------------------------
# 1. Quote endpoint — base
# ---------------------------------------------------------------------------
def test_quote_without_referrer(client):
    r = client.post("/api/quote", json={"room_id": ROOM_ID, "stay_id": STAY_ID, "tier": "PUBLIC"})
    assert r.status_code == 200
    q = r.json()
    assert q["referral_discount"] == 0.0
    print(f"\n  ✓ base quote (no ref):    total=${q['total']}  referral_discount=$0")


# ---------------------------------------------------------------------------
# 2. Quote with INVALID referrer — discount ignored
# ---------------------------------------------------------------------------
def test_quote_with_invalid_referrer(client):
    r = client.post(
        "/api/quote",
        json={"room_id": ROOM_ID, "stay_id": STAY_ID, "tier": "PUBLIC", "referrer_code": "FAKE-XXXX"},
    )
    assert r.status_code == 200
    q = r.json()
    assert q["referral_discount"] == 0.0, "invalid code should NOT apply discount"
    print(f"  ✓ invalid ref ignored:    total=${q['total']}  referral_discount=$0")


# ---------------------------------------------------------------------------
# 3. Quote with VALID referrer — $50 off
# ---------------------------------------------------------------------------
def test_quote_with_valid_referrer(client, seeded_referrer):
    base = client.post(
        "/api/quote",
        json={"room_id": ROOM_ID, "stay_id": STAY_ID, "tier": "PUBLIC"},
    ).json()
    r = client.post(
        "/api/quote",
        json={
            "room_id": ROOM_ID,
            "stay_id": STAY_ID,
            "tier": "PUBLIC",
            "referrer_code": seeded_referrer["referral_code"],
        },
    )
    assert r.status_code == 200
    q = r.json()
    assert q["referral_discount"] == REFERRAL_DISCOUNT
    assert round(base["total"] - q["total"], 2) == REFERRAL_DISCOUNT
    print(
        f"  ✓ valid ref applies $50:  base=${base['total']}  ref=${q['total']}  "
        f"delta=${round(base['total'] - q['total'], 2)}  code={seeded_referrer['referral_code']}"
    )


# ---------------------------------------------------------------------------
# 4. Checkout session — referral stored + new code generated
# ---------------------------------------------------------------------------
def test_checkout_persists_referrer_and_generates_new_code(client, mongo, seeded_referrer):
    friend_email = f"friend-{uuid.uuid4().hex[:6]}@test.pawhaus.dev"
    base_total = client.post(
        "/api/quote", json={"room_id": ROOM_ID, "stay_id": STAY_ID, "tier": "PUBLIC"}
    ).json()["total"]

    payload = _make_payload(friend_email, referrer_code=seeded_referrer["referral_code"], full_name="Friend Bob")
    r = client.post("/api/payments/checkout/session", json=payload)
    assert r.status_code == 200
    data = r.json()
    booking_id = data["booking_id"]

    booking = _mongo_find_booking(mongo, booking_id)
    assert booking is not None, "booking not persisted"

    # Referrer linkage
    assert booking["referrer_code"] == seeded_referrer["referral_code"], "referrer_code missing"
    assert booking["referrer_email"] == seeded_referrer["email"], "referrer_email missing"

    # New referral_code generated for the friend
    assert booking.get("referral_code"), "friend missing their own referral_code"
    assert booking["referral_code"] != seeded_referrer["referral_code"], "friend got the same code as referrer"
    assert booking["referral_code"].startswith("FRIEND-"), \
        f"new code should start with first name uppercase, got {booking['referral_code']}"

    # Quote actually applied the $50 off
    assert booking["quote"]["referral_discount"] == REFERRAL_DISCOUNT
    assert round(base_total - booking["quote"]["total"], 2) == REFERRAL_DISCOUNT

    print(
        f"  ✓ checkout linked referral:  friend_code={booking['referral_code']}  "
        f"referrer={booking['referrer_email']}  total=${booking['quote']['total']} (saved $50)"
    )


# ---------------------------------------------------------------------------
# 5. Self-referral — silently rejected
# ---------------------------------------------------------------------------
def test_self_referral_rejected(client, mongo, seeded_referrer):
    """Booking with the same email as the referrer should NOT get the discount."""
    payload = _make_payload(seeded_referrer["email"], referrer_code=seeded_referrer["referral_code"], full_name="Self Referrer")
    r = client.post("/api/payments/checkout/session", json=payload)
    assert r.status_code == 200
    booking_id = r.json()["booking_id"]
    booking = _mongo_find_booking(mongo, booking_id)
    assert booking is not None

    assert booking.get("referrer_code") is None, "self-referral should NOT store referrer_code"
    assert booking.get("referrer_email") is None, "self-referral should NOT store referrer_email"
    assert booking["quote"]["referral_discount"] == 0.0, "self-referral should NOT get $50 off"
    print(f"  ✓ self-referral blocked:  referrer_code=None  referral_discount=$0")


# ---------------------------------------------------------------------------
# 6. Each new booking gets a unique referral_code
# ---------------------------------------------------------------------------
def test_referral_codes_are_unique(client, mongo):
    codes = set()
    for i in range(3):
        email = f"unique-{i}-{uuid.uuid4().hex[:5]}@test.pawhaus.dev"
        r = client.post("/api/payments/checkout/session", json=_make_payload(email, full_name=f"Unique{i} User"))
        assert r.status_code == 200
        booking = _mongo_find_booking(mongo, r.json()["booking_id"])
        code = booking["referral_code"]
        assert code not in codes, f"duplicate referral_code generated: {code}"
        codes.add(code)
    print(f"  ✓ 3/3 unique codes generated: {codes}")


# ---------------------------------------------------------------------------
# Cleanup — remove test bookings
# ---------------------------------------------------------------------------
def test_zz_cleanup(client, mongo):
    """Remove every booking created in this test run (test.pawhaus.dev domain)."""
    loop, db = mongo
    result = loop.run_until_complete(
        db.bookings.delete_many({"booking.email": {"$regex": "@test.pawhaus.dev$"}})
    )
    loop.run_until_complete(
        db.payment_transactions.delete_many({"metadata.email": {"$regex": "@test.pawhaus.dev$"}})
    )
    print(f"\n  ✓ cleanup: deleted {result.deleted_count} test bookings")
