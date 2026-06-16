"""PawHaus welcome perks (bandana + spa pick) - Backend API tests"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_TOKEN = "gMonNetmm9f0sJXvJ1z1e2PTeMFkHeskSOb3YndWvGs"
ADMIN_HEADERS = {"X-Admin-Token": ADMIN_TOKEN}


def _payload(email, pets):
    return {
        "room_id": "extended",
        "stay_id": "WEEKDAY_1N",
        "tier": "PUBLIC",
        "origin_url": "https://example.com",
        "booking": {
            "full_name": "Test Perks",
            "email": email,
            "phone": "555-1234",
            "guests": 2,
            "check_in": "2026-12-15",
            "check_out": "2026-12-16",
            "pets": pets,
        },
    }


# Health / catalog reachable
def test_catalog_reachable():
    r = requests.get(f"{API}/catalog", timeout=15)
    assert r.status_code == 200
    assert "rooms" in r.json()


# Perks: blueberry_facial accepted and persisted
def test_checkout_with_blueberry_facial():
    email = f"TEST_perks_blueberry_{uuid.uuid4().hex[:6]}@example.com"
    pets = [{"name": "Bella", "breed": "Lab", "size": "Medium (25-60 lb)", "spa_perk": "blueberry_facial"}]
    r = requests.post(f"{API}/payments/checkout/session", json=_payload(email, pets), timeout=30)
    assert r.status_code == 200, r.text
    booking_id = r.json()["booking_id"]

    # Verify via admin
    a = requests.get(f"{API}/admin/bookings?limit=200", headers=ADMIN_HEADERS, timeout=15)
    assert a.status_code == 200
    items = a.json()["items"]
    found = next((b for b in items if b["id"] == booking_id), None)
    assert found, "Booking not returned via /admin/bookings"
    assert "perks" in found
    assert isinstance(found["perks"], list) and len(found["perks"]) == 1
    perk = found["perks"][0]
    assert perk["name"] == "Bella"
    assert perk["spa_perk"] == "blueberry_facial"
    assert perk["spa_perk_label"] == "Blueberry Facial"
    assert found["pet_count"] == 1


# Perks: nail_trim is the default and humanized label
def test_checkout_with_nail_trim_default():
    email = f"TEST_perks_nail_{uuid.uuid4().hex[:6]}@example.com"
    pets = [{"name": "Rex", "breed": "Husky", "size": "Large (60+ lb)", "spa_perk": "nail_trim"}]
    r = requests.post(f"{API}/payments/checkout/session", json=_payload(email, pets), timeout=30)
    assert r.status_code == 200, r.text
    booking_id = r.json()["booking_id"]

    a = requests.get(f"{API}/admin/bookings?limit=200", headers=ADMIN_HEADERS, timeout=15)
    found = next((b for b in a.json()["items"] if b["id"] == booking_id), None)
    assert found
    assert found["perks"][0]["spa_perk"] == "nail_trim"
    assert found["perks"][0]["spa_perk_label"] == "Nail Trim"


# Invalid spa_perk should be silently coerced to nail_trim (per Pet validator)
def test_invalid_spa_perk_coerced_to_default():
    email = f"TEST_perks_invalid_{uuid.uuid4().hex[:6]}@example.com"
    pets = [{"name": "Ziggy", "spa_perk": "bogus_treatment"}]
    r = requests.post(f"{API}/payments/checkout/session", json=_payload(email, pets), timeout=30)
    assert r.status_code == 200, r.text
    booking_id = r.json()["booking_id"]

    a = requests.get(f"{API}/admin/bookings?limit=200", headers=ADMIN_HEADERS, timeout=15)
    found = next((b for b in a.json()["items"] if b["id"] == booking_id), None)
    assert found
    assert found["perks"][0]["spa_perk"] == "nail_trim"
    assert found["perks"][0]["spa_perk_label"] == "Nail Trim"


# Per-pet choice: each pet can pick a different perk
def test_multiple_pets_different_perks():
    email = f"TEST_perks_multi_{uuid.uuid4().hex[:6]}@example.com"
    pets = [
        {"name": "Bella", "spa_perk": "blueberry_facial"},
        {"name": "Max", "spa_perk": "nail_trim"},
    ]
    r = requests.post(f"{API}/payments/checkout/session", json=_payload(email, pets), timeout=30)
    assert r.status_code == 200, r.text
    booking_id = r.json()["booking_id"]

    a = requests.get(f"{API}/admin/bookings?limit=200", headers=ADMIN_HEADERS, timeout=15)
    found = next((b for b in a.json()["items"] if b["id"] == booking_id), None)
    assert found
    assert len(found["perks"]) == 2
    by_name = {p["name"]: p for p in found["perks"]}
    assert by_name["Bella"]["spa_perk"] == "blueberry_facial"
    assert by_name["Bella"]["spa_perk_label"] == "Blueberry Facial"
    assert by_name["Max"]["spa_perk"] == "nail_trim"
    assert by_name["Max"]["spa_perk_label"] == "Nail Trim"


# No pets -> empty perks array
def test_no_pets_empty_perks():
    email = f"TEST_perks_nopets_{uuid.uuid4().hex[:6]}@example.com"
    r = requests.post(f"{API}/payments/checkout/session", json=_payload(email, []), timeout=30)
    assert r.status_code == 200, r.text
    booking_id = r.json()["booking_id"]

    a = requests.get(f"{API}/admin/bookings?limit=200", headers=ADMIN_HEADERS, timeout=15)
    found = next((b for b in a.json()["items"] if b["id"] == booking_id), None)
    assert found
    assert found["perks"] == []
    assert found["pet_count"] == 0


# Admin token guard
def test_admin_bookings_requires_token():
    r = requests.get(f"{API}/admin/bookings", timeout=15)
    assert r.status_code == 401


def test_admin_bookings_wrong_token():
    r = requests.get(f"{API}/admin/bookings", headers={"X-Admin-Token": "wrong"}, timeout=15)
    assert r.status_code == 401


# Cleanup at end of module — wipe all test bookings to keep dashboard clean per request
def test_zz_cleanup_all_test_bookings():
    r = requests.delete(
        f"{API}/admin/bookings/all?confirm=YES",
        headers=ADMIN_HEADERS,
        timeout=20,
    )
    assert r.status_code == 200
    body = r.json()
    assert "bookings_deleted" in body
    print(f"Cleanup deleted {body['bookings_deleted']} bookings, {body['payment_transactions_deleted']} txns")
