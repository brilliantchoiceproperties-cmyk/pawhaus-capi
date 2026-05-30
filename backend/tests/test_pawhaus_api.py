"""PawHaus VIP Portal A/B - Backend API tests"""
import os
import uuid
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://experiment-forge.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


@pytest.fixture(scope="module")
def db():
    c = MongoClient(MONGO_URL)
    yield c[DB_NAME]
    c.close()


# Catalog
def test_catalog():
    r = requests.get(f"{API}/catalog", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert "rooms" in data and "stay_options" in data and "discounts" in data
    assert len(data["rooms"]) == 3
    ids = {r["id"] for r in data["rooms"]}
    assert ids == {"petite", "standard", "monolith"}
    assert len(data["stay_options"]) == 4
    assert data["discounts"]["VIP"]["percent"] == 0.5
    assert data["discounts"]["PUBLIC"]["percent"] == 0.2


# Code validation
def test_code_validate_pawvip():
    r = requests.post(f"{API}/code/validate", json={"code": "PAWVIP"}, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["valid"] is True
    assert d["tier"] == "VIP"
    assert d["discount_percent"] == 0.5


def test_code_validate_lowercase():
    r = requests.post(f"{API}/code/validate", json={"code": "pawvip"}, timeout=15)
    assert r.status_code == 200
    assert r.json()["tier"] == "VIP"


def test_code_validate_invalid():
    r = requests.post(f"{API}/code/validate", json={"code": "WRONG"}, timeout=15)
    assert r.status_code == 400
    assert "detail" in r.json()
    assert "20%" in r.json()["detail"].lower() or "founders" in r.json()["detail"].lower()


def test_code_validate_empty():
    r = requests.post(f"{API}/code/validate", json={"code": ""}, timeout=15)
    assert r.status_code == 400


# Quote tests
def test_quote_standard_weekday_vip():
    r = requests.post(f"{API}/quote", json={"room_id": "standard", "stay_id": "WEEKDAY_1N", "tier": "VIP"}, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["base_rate"] == 658.0
    assert d["discount_amount"] == 329.0
    assert d["hot_tub_premium"] == 20.0
    assert d["total"] == 349.0


def test_quote_monolith_weekend_2n_vip():
    r = requests.post(f"{API}/quote", json={"room_id": "monolith", "stay_id": "WEEKEND_2N", "tier": "VIP"}, timeout=15)
    assert r.status_code == 200
    d = r.json()
    # base = 849*2=1698, discount=849, hot tub=40, total = 1698-849+40 = 889
    assert d["base_rate"] == 1698.0
    assert d["discount_amount"] == 849.0
    assert d["hot_tub_premium"] == 40.0
    assert d["total"] == 889.0


def test_quote_monolith_weekend_2n_public():
    r = requests.post(f"{API}/quote", json={"room_id": "monolith", "stay_id": "WEEKEND_2N", "tier": "PUBLIC"}, timeout=15)
    assert r.status_code == 200
    d = r.json()
    # base 1698, discount 20% = 339.60, hot tub 40, total = 1698-339.6+40 = 1398.40
    assert d["total"] == 1398.40


def test_quote_petite_no_hot_tub():
    r = requests.post(f"{API}/quote", json={"room_id": "petite", "stay_id": "WEEKDAY_1N", "tier": "PUBLIC"}, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["hot_tub_premium"] == 0.0
    # base 558, -20% = 111.6, total = 446.4
    assert d["total"] == 446.40


def test_quote_invalid_room():
    r = requests.post(f"{API}/quote", json={"room_id": "bogus", "stay_id": "WEEKDAY_1N", "tier": "VIP"}, timeout=15)
    assert r.status_code == 400


def test_quote_invalid_stay():
    r = requests.post(f"{API}/quote", json={"room_id": "petite", "stay_id": "BOGUS", "tier": "VIP"}, timeout=15)
    assert r.status_code == 400


def test_quote_invalid_tier():
    r = requests.post(f"{API}/quote", json={"room_id": "petite", "stay_id": "WEEKDAY_1N", "tier": "ADMIN"}, timeout=15)
    assert r.status_code == 400


# Checkout session
def _booking_payload(email):
    return {
        "room_id": "standard",
        "stay_id": "WEEKDAY_1N",
        "tier": "PUBLIC",
        "origin_url": "https://example.com",
        "booking": {
            "full_name": "Test User",
            "email": email,
            "phone": "555-1234",
            "guests": 2,
            "check_in": "2026-03-01",
            "check_out": "2026-03-02",
            "pets": [{"name": "Rex", "breed": "Lab", "size": "Medium (25-60 lb)"}],
        },
    }


def test_create_checkout_session_public(db):
    email = f"TEST_public_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/payments/checkout/session", json=_booking_payload(email), timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "url" in d and d["url"].startswith("https://")
    assert "session_id" in d
    assert "booking_id" in d
    # Verify persistence
    booking = db.bookings.find_one({"id": d["booking_id"]})
    assert booking is not None
    assert booking["stripe_session_id"] == d["session_id"]
    txn = db.payment_transactions.find_one({"session_id": d["session_id"]})
    assert txn is not None
    assert txn["payment_status"] == "initiated"
    # Cleanup
    db.bookings.delete_one({"id": d["booking_id"]})
    db.payment_transactions.delete_one({"session_id": d["session_id"]})


def test_checkout_status_pending(db):
    # Create a session first
    email = f"TEST_status_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/payments/checkout/session", json=_booking_payload(email), timeout=30)
    assert r.status_code == 200
    sid = r.json()["session_id"]
    bid = r.json()["booking_id"]
    s = requests.get(f"{API}/payments/checkout/status/{sid}", timeout=30)
    assert s.status_code == 200
    body = s.json()
    assert "payment_status" in body and "status" in body
    # Cleanup
    db.bookings.delete_one({"id": bid})
    db.payment_transactions.delete_one({"session_id": sid})


def test_checkout_status_not_found():
    r = requests.get(f"{API}/payments/checkout/status/cs_nonexistent_xxx", timeout=15)
    assert r.status_code == 404


def test_vip_repeat_block(db):
    """Manually insert a paid VIP transaction, then try to create another VIP checkout for same email."""
    email = f"TEST_vip_repeat_{uuid.uuid4().hex[:8]}@example.com"
    fake = {
        "id": str(uuid.uuid4()),
        "session_id": f"cs_test_fake_{uuid.uuid4().hex[:8]}",
        "amount": 349.0,
        "currency": "usd",
        "metadata": {"tier": "VIP", "email": email.lower()},
        "payment_status": "paid",
        "status": "complete",
        "booking_id": str(uuid.uuid4()),
    }
    db.payment_transactions.insert_one(fake)
    try:
        payload = _booking_payload(email)
        payload["tier"] = "VIP"
        r = requests.post(f"{API}/payments/checkout/session", json=payload, timeout=30)
        assert r.status_code == 400
        assert "founders" in r.json()["detail"].lower() or "already" in r.json()["detail"].lower()
    finally:
        db.payment_transactions.delete_one({"id": fake["id"]})


def test_webhook_invalid_signature():
    r = requests.post(
        f"{API}/webhook/stripe",
        data=b'{"id":"evt_test"}',
        headers={"Stripe-Signature": "invalid", "Content-Type": "application/json"},
        timeout=15,
    )
    assert r.status_code == 400
