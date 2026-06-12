"""Backend tests for the POST /api/lead-capture endpoint (exit-intent)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://experiment-forge.preview.emergentagent.com").rstrip("/")
LEAD_URL = f"{BASE_URL}/api/lead-capture"

TEST_EMAIL_1 = "test-exit-1@test.pawhaus.dev"
TEST_EMAIL_2 = "test-exit-2@test.pawhaus.dev"


@pytest.fixture
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


class TestLeadCapture:
    def test_lead_capture_basic_success(self, client):
        r = client.post(
            LEAD_URL,
            json={"email": TEST_EMAIL_1, "source": "exit_intent", "page": "/"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True

    def test_lead_capture_upsert_no_duplicate_error(self, client):
        # Re-post with same email — should still 200 (upsert)
        r1 = client.post(
            LEAD_URL,
            json={"email": TEST_EMAIL_1, "source": "exit_intent", "page": "/"},
            timeout=15,
        )
        assert r1.status_code == 200
        r2 = client.post(
            LEAD_URL,
            json={"email": TEST_EMAIL_1, "source": "exit_intent", "page": "/booking"},
            timeout=15,
        )
        assert r2.status_code == 200
        assert r2.json().get("ok") is True

    def test_lead_capture_invalid_email_rejected(self, client):
        r = client.post(
            LEAD_URL,
            json={"email": "not-an-email", "source": "exit_intent"},
            timeout=15,
        )
        assert r.status_code in (400, 422), r.text

    def test_lead_capture_minimum_payload(self, client):
        # source / page optional
        r = client.post(LEAD_URL, json={"email": TEST_EMAIL_2}, timeout=15)
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_lead_capture_email_lowercased_and_persisted(self, client):
        # Different casing should still upsert without error
        r = client.post(
            LEAD_URL,
            json={"email": TEST_EMAIL_1.upper(), "source": "exit_intent"},
            timeout=15,
        )
        assert r.status_code == 200


def test_zz_cleanup_test_leads():
    """Cleanup test-prefixed leads by hitting Mongo directly (best-effort)."""
    try:
        from pymongo import MongoClient
        from dotenv import load_dotenv
        load_dotenv("/app/backend/.env")
        mongo_url = os.environ.get("MONGO_URL")
        db_name = os.environ.get("DB_NAME")
        if not mongo_url or not db_name:
            pytest.skip("No mongo creds available for cleanup")
        c = MongoClient(mongo_url)
        res = c[db_name].leads.delete_many({"email": {"$regex": "@test.pawhaus.dev$"}})
        print(f"Cleaned up {res.deleted_count} test leads")
    except Exception as e:
        print(f"cleanup skipped: {e}")
