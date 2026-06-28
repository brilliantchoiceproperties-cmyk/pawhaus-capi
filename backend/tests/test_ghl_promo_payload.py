"""
Verify GHL webhook payload includes promo_code + promo_discount_applied
when a booking is created with PAW25.
"""
import os
import uuid
import asyncio
from unittest.mock import patch

import pytest
import httpx
from motor.motor_asyncio import AsyncIOMotorClient

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


def test_ghl_payload_contains_promo_fields(loop_and_db):
    loop, db = loop_and_db
    email = f"promo-ghl-{uuid.uuid4().hex[:6]}@test.pawhaus.dev"
    payload = {
        "room_id": "standard",
        "stay_id": "WEEKDAY_1N",
        "tier": "PUBLIC",
        "origin_url": "https://staypawhaus.com",
        "promo_code": "PAW25",
        "booking": {
            "full_name": "Promo GHL",
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
    booking_id = r.json()["booking_id"]

    import sys
    sys.path.insert(0, "/app/backend")
    if "server" in sys.modules:
        del sys.modules["server"]
    import server  # noqa

    captured = {}

    class _MockResponse:
        def raise_for_status(self): pass
        status_code = 200

    class _MockAsyncClient:
        def __init__(self, *a, **kw): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): pass
        async def post(self, url, json=None, **kw):
            captured["json"] = json
            return _MockResponse()

    original_url = server.GHL_WEBHOOK_URL
    server.GHL_WEBHOOK_URL = "https://example.com/ghl/test"
    try:
        with patch("server.httpx.AsyncClient", _MockAsyncClient):
            loop.run_until_complete(server.notify_ghl("payment_success", booking_id))
    finally:
        server.GHL_WEBHOOK_URL = original_url

    p = captured.get("json")
    assert p is not None, "GHL was never called"
    assert p.get("promo_code") == "PAW25", f"expected PAW25 got {p.get('promo_code')}"
    assert p.get("promo_discount_applied") == 25.0, f"expected 25.0 got {p.get('promo_discount_applied')}"
    print(f"\n  ✓ promo_code in GHL payload:        {p['promo_code']}")
    print(f"  ✓ promo_discount_applied:           ${p['promo_discount_applied']}")

    # cleanup
    loop.run_until_complete(db.bookings.delete_many({"booking.email": {"$regex": "@test.pawhaus.dev$"}}))
    loop.run_until_complete(db.payment_transactions.delete_many({"metadata.email": {"$regex": "@test.pawhaus.dev$"}}))
