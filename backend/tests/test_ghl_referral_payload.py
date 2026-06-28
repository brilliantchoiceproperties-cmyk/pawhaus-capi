"""
Verify the GHL webhook payload now includes referral fields so GHL workflows
can email the buyer their share code automatically.
"""
import os
import uuid
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock

import pytest
import httpx
from motor.motor_asyncio import AsyncIOMotorClient

# Reuse the same config-loading approach as test_referral_flow.py
API_URL = "http://localhost:8001"
if os.path.exists("/app/frontend/.env"):
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                API_URL = line.split("=", 1)[1].strip()

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"
if os.path.exists("/app/backend/.env"):
    with open("/app/backend/.env") as f:
        for line in f:
            line = line.strip()
            if line.startswith("MONGO_URL="):
                MONGO_URL = line.split("=", 1)[1].strip().strip('"').strip("'")
            if line.startswith("DB_NAME="):
                DB_NAME = line.split("=", 1)[1].strip().strip('"').strip("'")


@pytest.fixture(scope="module")
def loop_and_db():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    client_m = AsyncIOMotorClient(MONGO_URL)
    db = client_m[DB_NAME]
    yield loop, db
    client_m.close()
    loop.close()


def _seed_booking_via_api(referrer_code=None, full_name="GHL Tester"):
    email = f"ghl-{uuid.uuid4().hex[:6]}@test.pawhaus.dev"
    payload = {
        "room_id": "standard",
        "stay_id": "WEEKDAY_1N",
        "tier": "PUBLIC",
        "origin_url": "https://staypawhaus.com",
        "referrer_code": referrer_code,
        "booking": {
            "full_name": full_name,
            "email": email,
            "phone": "5551234567",
            "guests": 2,
            "check_in": "2027-01-15",
            "check_out": "2027-01-16",
            "pets": [{"name": "Bella", "breed": "Lab", "size": "Medium (25-60 lb)", "special_needs": ""}],
            "notes": "",
        },
    }
    r = httpx.post(f"{API_URL}/api/payments/checkout/session", json=payload, timeout=30.0)
    assert r.status_code == 200, r.text
    return r.json()["booking_id"], email


def test_ghl_payload_contains_referral_share_url(loop_and_db):
    """
    Confirms `notify_ghl` builds a payload that includes:
      - referral_code (buyer's new code)
      - referral_share_url (ready-to-email URL)
      - referred_by_code / referred_by_email (if this booking came from a referrer)
    by intercepting the outbound httpx.AsyncClient.post call.
    """
    loop, db = loop_and_db

    # 1. seed a referrer booking and confirm it
    referrer_id, referrer_email = _seed_booking_via_api(full_name="Referrer Bob")
    loop.run_until_complete(db.bookings.update_one({"id": referrer_id}, {"$set": {"status": "confirmed"}}))
    referrer_doc = loop.run_until_complete(db.bookings.find_one({"id": referrer_id}, {"_id": 0}))
    referrer_code = referrer_doc["referral_code"]
    print(f"\n  referrer booking → code={referrer_code} email={referrer_email}")

    # 2. seed the friend booking USING the referrer's code
    friend_id, friend_email = _seed_booking_via_api(referrer_code=referrer_code, full_name="Friend Jane")
    friend_doc = loop.run_until_complete(db.bookings.find_one({"id": friend_id}, {"_id": 0}))

    # 3. Now invoke notify_ghl directly with a mocked httpx client to inspect the payload
    import sys
    sys.path.insert(0, "/app/backend")
    # Force reload to pick up updated server.py (in case running in same process as previous test)
    if "server" in sys.modules:
        del sys.modules["server"]
    import server  # noqa

    captured_payload = {}

    class _MockResponse:
        def raise_for_status(self): pass
        status_code = 200

    class _MockAsyncClient:
        def __init__(self, *a, **kw): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): pass
        async def post(self, url, json=None, **kw):
            captured_payload["url"] = url
            captured_payload["json"] = json
            return _MockResponse()

    # Force GHL URL non-empty (the function early-returns when empty)
    original_url = server.GHL_WEBHOOK_URL
    server.GHL_WEBHOOK_URL = "https://example.com/ghl/test"

    try:
        with patch("server.httpx.AsyncClient", _MockAsyncClient):
            loop.run_until_complete(server.notify_ghl("payment_success", friend_id))
    finally:
        server.GHL_WEBHOOK_URL = original_url

    p = captured_payload.get("json")
    assert p is not None, "GHL was never called"

    # --- Assertions ---
    assert p.get("event") == "payment_success"
    assert p.get("email") == friend_email

    # Buyer's own code + share URL
    assert p.get("referral_code") == friend_doc["referral_code"]
    expected_url = f"https://staypawhaus.com/?ref={friend_doc['referral_code']}"
    assert p.get("referral_share_url") == expected_url, \
        f"share url mismatch: got {p.get('referral_share_url')}, expected {expected_url}"

    # Inbound referrer info
    assert p.get("referred_by_code") == referrer_code
    assert p.get("referred_by_email") == referrer_email
    assert p.get("referral_discount_applied") == 50.0

    print(f"  ✓ referral_code in payload:        {p['referral_code']}")
    print(f"  ✓ referral_share_url in payload:   {p['referral_share_url']}")
    print(f"  ✓ referred_by_code in payload:     {p['referred_by_code']}")
    print(f"  ✓ referred_by_email in payload:    {p['referred_by_email']}")
    print(f"  ✓ referral_discount_applied:       ${p['referral_discount_applied']}")

    # Cleanup
    loop.run_until_complete(
        db.bookings.delete_many({"booking.email": {"$regex": "@test.pawhaus.dev$"}})
    )
    loop.run_until_complete(
        db.payment_transactions.delete_many({"metadata.email": {"$regex": "@test.pawhaus.dev$"}})
    )
    print(f"  ✓ cleanup complete")
