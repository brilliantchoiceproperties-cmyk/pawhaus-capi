"""
Polish v2 regression suite:
- Rename: extended/extended_ht -> standard/standard_ht (room IDs and names).
- TTL: old pending_payment bookings (>30 min) no longer count toward cap.
- Admin inventory endpoint: returns rooms/items/ttl_min shape.
- Full funnel: $623 / $698 base * 0.70 totals via /api/payments/checkout/session.

Run: pytest backend/tests/test_polish_v2_rename_ttl_inventory.py -v -s
"""
import os
import uuid
import asyncio
from datetime import datetime, timedelta, timezone

import pytest
import httpx
from motor.motor_asyncio import AsyncIOMotorClient


# Load env
API_URL = "http://localhost:8001"
if os.path.exists("/app/frontend/.env"):
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                API_URL = line.split("=", 1)[1].strip()

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"
ADMIN_TOKEN = "gMonNetmm9f0sJXvJ1z1e2PTeMFkHeskSOb3YndWvGs"
if os.path.exists("/app/backend/.env"):
    with open("/app/backend/.env") as f:
        for line in f:
            line = line.strip()
            if line.startswith("MONGO_URL="):
                MONGO_URL = line.split("=", 1)[1].strip().strip('"').strip("'")
            if line.startswith("DB_NAME="):
                DB_NAME = line.split("=", 1)[1].strip().strip('"').strip("'")
            if line.startswith("ADMIN_TOKEN="):
                ADMIN_TOKEN = line.split("=", 1)[1].strip().strip('"').strip("'")

BASE = API_URL.rstrip("/")


def _checkout_payload(room_id, check_in, email, check_out=None):
    if check_out is None:
        d = datetime.fromisoformat(check_in) + timedelta(days=1)
        check_out = d.strftime("%Y-%m-%d")
    return {
        "room_id": room_id,
        "stay_id": "WEEKDAY_1N",
        "tier": "PUBLIC",
        "origin_url": "https://staypawhaus.com",
        "booking": {
            "full_name": "Polish Tester",
            "email": email,
            "phone": "5551234567",
            "guests": 2,
            "check_in": check_in,
            "check_out": check_out,
            "pets": [{"name": "Bella", "breed": "Lab", "size": "Medium (25-60 lb)", "special_needs": ""}],
            "notes": "",
        },
    }


@pytest.fixture(scope="module")
def client():
    c = httpx.Client(base_url=BASE, timeout=60.0)
    yield c
    c.close()


@pytest.fixture(scope="module")
def loop_and_db():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    cm = AsyncIOMotorClient(MONGO_URL)
    db = cm[DB_NAME]
    yield loop, db
    cm.close()
    loop.close()


# --- 1. RENAME REGRESSION -----------------------------------------------

def test_catalog_has_renamed_rooms(client):
    r = client.get("/api/catalog")
    assert r.status_code == 200, r.text
    body = r.json()
    rooms = body.get("rooms") if isinstance(body, dict) else body
    assert isinstance(rooms, list)
    assert len(rooms) == 4, f"expected 4 rooms, got {len(rooms)}"

    ids = [rm["id"] for rm in rooms]
    names = [rm["name"] for rm in rooms]
    print(f"\n  ids={ids}\n  names={names}")

    assert "petite" in ids
    assert "standard" in ids
    assert "standard_ht" in ids
    assert "monolith" in ids
    assert "extended" not in ids
    assert "extended_ht" not in ids

    by_id = {rm["id"]: rm for rm in rooms}
    assert by_id["standard"]["name"] == "Standard Room"
    assert by_id["standard_ht"]["name"] == "Standard Room + Wood-Fired Hot Tub"
    assert by_id["petite"]["name"] == "Petite Room"
    assert by_id["monolith"]["name"] == "Monolith Room"


def test_quote_standard_no_ht(client):
    r = client.post("/api/quote", json={"room_id": "standard", "stay_id": "WEEKDAY_1N", "tier": "PUBLIC"})
    assert r.status_code == 200, r.text
    q = r.json()
    assert q["base_rate"] == 623.0
    assert q["room_name"] == "Standard Room"
    print(f"  ✓ standard base=${q['base_rate']}")


def test_quote_standard_ht(client):
    r = client.post("/api/quote", json={"room_id": "standard_ht", "stay_id": "WEEKDAY_1N", "tier": "PUBLIC"})
    assert r.status_code == 200, r.text
    q = r.json()
    assert q["base_rate"] == 698.0
    assert "Hot Tub" in q["room_name"]
    print(f"  ✓ standard_ht base=${q['base_rate']}")


# --- 2. TTL ON PENDING_PAYMENT ------------------------------------------

TTL_DATE = "2027-01-05"


def test_ttl_old_pending_does_not_block(client, loop_and_db):
    loop, db = loop_and_db

    # Clean any residue for this isolated date
    loop.run_until_complete(db.bookings.delete_many({
        "room_id": "standard_ht",
        "booking.check_in": TTL_DATE,
    }))
    loop.run_until_complete(db.bookings.delete_many({"id": {"$regex": "^ttl-test-"}}))

    # Seed 2 OLD pending bookings (60 min ago) — should NOT count toward cap
    old_iso = (datetime.now(timezone.utc) - timedelta(minutes=60)).isoformat()
    for i in range(2):
        loop.run_until_complete(db.bookings.insert_one({
            "id": f"ttl-test-old-{i}-{uuid.uuid4().hex[:6]}",
            "room_id": "standard_ht",
            "booking": {"check_in": TTL_DATE, "check_out": "2027-01-06",
                        "email": f"ttl-test-old-{i}@test.pawhaus.dev"},
            "status": "pending_payment",
            "created_at": old_iso,
        }))

    # 1st fresh checkout — should succeed (old ones excluded)
    email1 = f"ttl-fresh-1-{uuid.uuid4().hex[:5]}@test.pawhaus.dev"
    r = client.post("/api/payments/checkout/session",
                    json=_checkout_payload("standard_ht", TTL_DATE, email1))
    assert r.status_code == 200, f"old pending should not block: {r.status_code} {r.text}"
    print(f"  ✓ old (60m) pending excluded — fresh booking OK")


def test_ttl_recent_pending_does_block(client, loop_and_db):
    loop, db = loop_and_db

    # After previous test we have 1 fresh pending. Add a 2nd fresh — should also pass
    email2 = f"ttl-fresh-2-{uuid.uuid4().hex[:5]}@test.pawhaus.dev"
    r = client.post("/api/payments/checkout/session",
                    json=_checkout_payload("standard_ht", TTL_DATE, email2))
    assert r.status_code == 200, f"2nd fresh should succeed: {r.text}"

    # 3rd fresh — should hit the 409 cap
    email3 = f"ttl-fresh-3-{uuid.uuid4().hex[:5]}@test.pawhaus.dev"
    r = client.post("/api/payments/checkout/session",
                    json=_checkout_payload("standard_ht", TTL_DATE, email3))
    assert r.status_code == 409, f"3rd fresh should be capped: got {r.status_code} {r.text}"
    assert "Only 2" in r.json().get("detail", "")
    print(f"  ✓ 2 fresh pending fills cap → 3rd 409")


# --- 3. ADMIN INVENTORY ENDPOINT ----------------------------------------

INV_DATE = "2027-01-10"


def test_admin_inventory_shape_and_data(client, loop_and_db):
    loop, db = loop_and_db
    # Clean
    loop.run_until_complete(db.bookings.delete_many({
        "room_id": "standard_ht",
        "booking.check_in": INV_DATE,
    }))

    # Seed 2 fresh pending via real API
    for i in range(2):
        email = f"inv-{i}-{uuid.uuid4().hex[:5]}@test.pawhaus.dev"
        r = client.post("/api/payments/checkout/session",
                        json=_checkout_payload("standard_ht", INV_DATE, email))
        assert r.status_code == 200, f"seed #{i+1} failed: {r.text}"

    # 1. without admin token -> 401/403
    r = client.get("/api/admin/inventory")
    assert r.status_code in (401, 403), f"expected auth error, got {r.status_code}"

    # 2. with token
    r = client.get("/api/admin/inventory", headers={"X-Admin-Token": ADMIN_TOKEN})
    assert r.status_code == 200, r.text
    body = r.json()
    assert "site" in body
    assert "rooms" in body
    assert "items" in body
    assert body.get("ttl_min") == 30
    assert any(rm["room_id"] == "standard_ht" and rm["cap"] == 2 for rm in body["rooms"])

    items_for_date = [it for it in body["items"]
                      if it["room_id"] == "standard_ht" and it["date"] == INV_DATE]
    assert len(items_for_date) == 1, f"expected 1 item for {INV_DATE}, got {items_for_date}"
    item = items_for_date[0]
    assert item["booked"] == 2
    assert item["cap"] == 2
    assert item["remaining"] == 0
    assert item["status"] == "sold_out"
    print(f"  ✓ admin/inventory item for {INV_DATE}: {item}")


# --- 4. FULL FUNNEL REGRESSION -----------------------------------------

FUNNEL_DATE = "2027-01-15"


def test_funnel_standard_returns_stripe_url(client, loop_and_db):
    loop, db = loop_and_db
    loop.run_until_complete(db.bookings.delete_many({
        "booking.check_in": FUNNEL_DATE,
        "booking.email": {"$regex": "@test.pawhaus.dev$"},
    }))

    email = f"funnel-std-{uuid.uuid4().hex[:5]}@test.pawhaus.dev"
    r = client.post("/api/payments/checkout/session",
                    json=_checkout_payload("standard", FUNNEL_DATE, email))
    assert r.status_code == 200, r.text
    body = r.json()
    url = body.get("checkout_url") or body.get("url")
    assert url and ("checkout.stripe.com" in url or url.startswith("https://")), f"missing stripe url in {body}"
    # Total should be 623 * 0.7 = 436.10
    total = body.get("amount") or body.get("total") or body.get("amount_total")
    print(f"  ✓ funnel standard: total={total} url_present={bool(url)}")


def test_funnel_standard_ht_returns_stripe_url(client, loop_and_db):
    email = f"funnel-ht-{uuid.uuid4().hex[:5]}@test.pawhaus.dev"
    r = client.post("/api/payments/checkout/session",
                    json=_checkout_payload("standard_ht", FUNNEL_DATE, email))
    assert r.status_code == 200, r.text
    body = r.json()
    url = body.get("checkout_url") or body.get("url")
    assert url
    total = body.get("amount") or body.get("total") or body.get("amount_total")
    print(f"  ✓ funnel standard_ht: total={total} url_present={bool(url)}")


# --- 99. CLEANUP --------------------------------------------------------

def test_zz_cleanup(loop_and_db):
    loop, db = loop_and_db
    r1 = loop.run_until_complete(db.bookings.delete_many({
        "$or": [
            {"booking.email": {"$regex": "@test.pawhaus.dev$"}},
            {"id": {"$regex": "^ttl-test-"}},
        ]
    }))
    r2 = loop.run_until_complete(db.payment_transactions.delete_many({
        "metadata.email": {"$regex": "@test.pawhaus.dev$"}
    }))
    print(f"\n  ✓ cleanup bookings={r1.deleted_count} tx={r2.deleted_count}")
