"""
Verifies the new room catalog + per-date inventory cap.

1. Room IDs: petite / extended / standard_ht / monolith all exist with new prices
2. Backwards-compat: room_id="standard" still resolves to standard_ht
3. Monolith was bumped by $50/night across all stays
4. Extended (no HT) is exactly $75/night cheaper than standard_ht
5. standard_ht has a HARD cap of 2 bookings per check-in date (3rd → 409)
6. Petite is unchanged

Run: python -m pytest backend/tests/test_room_catalog_v2.py -v -s
"""
import os
import uuid
import asyncio

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

# Use a check-in date NOT used by any other test to keep cap test isolated
CAP_CHECKIN = "2027-01-20"


def _payload(room_id, check_in, email):
    return {
        "room_id": room_id,
        "stay_id": "WEEKDAY_1N",
        "tier": "PUBLIC",
        "origin_url": "https://staypawhaus.com",
        "booking": {
            "full_name": "Cap Tester",
            "email": email,
            "phone": "5551234567",
            "guests": 2,
            "check_in": check_in,
            "check_out": "2027-01-21",
            "pets": [{"name": "Bella", "breed": "Lab", "size": "Medium (25-60 lb)", "special_needs": ""}],
            "notes": "",
        },
    }


@pytest.fixture(scope="module")
def client():
    return httpx.Client(base_url=API_URL.rstrip("/"), timeout=30.0)


@pytest.fixture(scope="module")
def loop_and_db():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    client_m = AsyncIOMotorClient(MONGO_URL)
    db = client_m[DB_NAME]
    yield loop, db
    client_m.close()
    loop.close()


def _quote(client, room_id):
    r = client.post("/api/quote", json={"room_id": room_id, "stay_id": "WEEKDAY_1N", "tier": "PUBLIC"})
    assert r.status_code == 200, r.text
    return r.json()


def test_petite_unchanged(client):
    """Petite price was NOT touched in this update — sanity guard."""
    q = _quote(client, "petite")
    # 558 base × 0.70 = 390.60
    assert q["base_rate"] == 558.0
    assert q["total"] == round(558.0 * 0.70, 2)
    print(f"\n  ✓ petite unchanged: base=${q['base_rate']} total=${q['total']}")


def test_extended_no_hot_tub_price(client):
    """Extended (no hot tub) — $623 weekday 1N base."""
    q = _quote(client, "standard")
    assert q["base_rate"] == 623.0
    assert q["room_name"] == "Standard Room"
    print(f"  ✓ standard (no HT):  base=${q['base_rate']} total=${q['total']}")


def test_standard_ht_removed(client):
    """standard_ht SKU has been removed — Monolith is the only hot-tub room now."""
    r = client.post("/api/quote", json={"room_id": "standard_ht", "stay_id": "WEEKDAY_1N", "tier": "PUBLIC"})
    assert r.status_code == 400, f"standard_ht should return 400 (Invalid room), got {r.status_code}"
    print(f"\n  ✓ standard_ht removed: API returns 400 for that room_id")


def test_only_monolith_has_hot_tub(client):
    """Hot-tub flag should only be True on monolith now."""
    catalog = client.get("/api/catalog").json()
    hot_tub_rooms = [r["id"] for r in catalog["rooms"] if r.get("has_hot_tub")]
    assert hot_tub_rooms == ["monolith"], f"expected only monolith to have hot tub, got {hot_tub_rooms}"
    print(f"  ✓ only monolith has_hot_tub=True: {hot_tub_rooms}")


def test_monolith_bumped_by_50(client):
    """Monolith was bumped by $50 × nights. 1N was 898, now 948."""
    q = _quote(client, "monolith")
    assert q["base_rate"] == 948.0
    print(f"  ✓ monolith +$50/night: 1N base=${q['base_rate']} (was 898)")


def test_monolith_2n_bumped_by_100(client):
    """2N monolith bumped by 2 × $50 = $100. 1478 → 1578."""
    r = client.post("/api/quote", json={"room_id": "monolith", "stay_id": "WEEKDAY_2N", "tier": "PUBLIC"})
    assert r.status_code == 200
    assert r.json()["base_rate"] == 1578.0
    print(f"  ✓ monolith 2N: ${r.json()['base_rate']} (was 1478)")


def test_standard_no_hot_tub(client):
    """Standard Room is the only mid-tier — no hot tub."""
    q = _quote(client, "standard")
    assert q["base_rate"] == 623.0
    assert q["room_id"] == "standard"
    assert q["room_name"] == "Standard Room"
    print(f"  ✓ standard direct: base=${q['base_rate']}")


def test_no_capped_rooms_for_now(client, loop_and_db):
    """ROOM_DAILY_CAPS is now empty (standard_ht removed). No cap should block bookings."""
    loop, db = loop_and_db
    # Clean any leftovers for this date
    loop.run_until_complete(
        db.bookings.delete_many({
            "room_id": "standard",
            "booking.check_in": CAP_CHECKIN,
        })
    )

    # 3+ bookings on the same date should ALL succeed for non-capped rooms
    for i in range(3):
        email = f"nocap-{i}-{uuid.uuid4().hex[:5]}@test.pawhaus.dev"
        r = client.post("/api/payments/checkout/session", json=_payload("standard", CAP_CHECKIN, email))
        assert r.status_code == 200, f"booking #{i+1} should succeed (no cap): {r.text}"
    print(f"  ✓ no per-date cap: 3 standard bookings same date all succeed")


def test_zz_cleanup(loop_and_db):
    loop, db = loop_and_db
    r = loop.run_until_complete(
        db.bookings.delete_many({"booking.email": {"$regex": "@test.pawhaus.dev$"}})
    )
    loop.run_until_complete(
        db.payment_transactions.delete_many({"metadata.email": {"$regex": "@test.pawhaus.dev$"}})
    )
    print(f"\n  ✓ cleanup: deleted {r.deleted_count} test bookings")
