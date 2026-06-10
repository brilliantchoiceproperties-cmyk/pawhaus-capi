"""
Meta Conversions API (server-side) — fires conversion events directly to Meta's
backend so attribution survives iOS14+ tracking restrictions.

Designed to dedupe with the browser-side Pixel: same `event_id` on both sides →
Meta counts a single conversion.
"""
from __future__ import annotations

import hashlib
import logging
import os
import time
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

META_API_VERSION = "v21.0"


def _get_config() -> Dict[str, str]:
    """Re-read env at call time (env may be loaded after this module is imported)."""
    return {
        "pixel_id": os.environ.get("META_PIXEL_ID", ""),
        "access_token": os.environ.get("META_CAPI_ACCESS_TOKEN", ""),
        "test_event_code": os.environ.get("META_TEST_EVENT_CODE", ""),
        "site_source": os.environ.get("SITE_SOURCE", "pawhaus-public-30"),
    }


def _sha256(value: Optional[str]) -> Optional[str]:
    """SHA-256 hash, lowercased + trimmed (per Meta CAPI spec). Returns None if blank."""
    if not value:
        return None
    return hashlib.sha256(value.strip().lower().encode("utf-8")).hexdigest()


def _build_user_data(
    *,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    external_id: Optional[str] = None,
    client_ip_address: Optional[str] = None,
    client_user_agent: Optional[str] = None,
    fbp: Optional[str] = None,
    fbc: Optional[str] = None,
    country: Optional[str] = "us",
) -> Dict[str, Any]:
    """Build the `user_data` block per Meta CAPI spec. PII is SHA-256 hashed."""
    user: Dict[str, Any] = {}
    if email:
        user["em"] = [_sha256(email)]
    if phone:
        # strip non-digits before hashing
        digits = "".join(ch for ch in phone if ch.isdigit())
        if digits:
            user["ph"] = [_sha256(digits)]
    if first_name:
        user["fn"] = [_sha256(first_name)]
    if last_name:
        user["ln"] = [_sha256(last_name)]
    if external_id:
        user["external_id"] = [_sha256(external_id)]
    if country:
        user["country"] = [_sha256(country)]
    if client_ip_address:
        user["client_ip_address"] = client_ip_address
    if client_user_agent:
        user["client_user_agent"] = client_user_agent
    if fbp:
        user["fbp"] = fbp
    if fbc:
        user["fbc"] = fbc
    return user


async def send_meta_event(
    *,
    event_name: str,
    event_id: str,
    event_source_url: str,
    user_data: Dict[str, Any],
    custom_data: Optional[Dict[str, Any]] = None,
    event_time: Optional[int] = None,
) -> bool:
    """
    Fire a single event to the Meta Conversions API.
    Returns True on success, False on failure. Never raises — Meta failures
    must never block the user flow.
    """
    cfg = _get_config()
    pixel_id = cfg["pixel_id"]
    access_token = cfg["access_token"]
    test_event_code = cfg["test_event_code"]
    if not pixel_id or not access_token:
        return False
    graph_url = f"https://graph.facebook.com/{META_API_VERSION}/{pixel_id}/events"
    payload_event: Dict[str, Any] = {
        "event_name": event_name,
        "event_time": event_time or int(time.time()),
        "event_id": event_id,
        "event_source_url": event_source_url,
        "action_source": "website",
        "user_data": user_data,
    }
    if custom_data:
        payload_event["custom_data"] = custom_data

    payload: Dict[str, Any] = {
        "data": [payload_event],
        "access_token": access_token,
    }
    if test_event_code:
        payload["test_event_code"] = test_event_code

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(graph_url, json=payload)
            resp.raise_for_status()
        logger.info("Meta CAPI [%s] sent (event_id=%s)", event_name, event_id)
        return True
    except httpx.HTTPStatusError as e:
        logger.warning(
            "Meta CAPI [%s] rejected: status=%s body=%s",
            event_name, e.response.status_code, e.response.text[:500],
        )
    except Exception as e:
        logger.exception("Meta CAPI [%s] failed: %s", event_name, e)
    return False


def build_purchase_event(
    *,
    booking_doc: Dict[str, Any],
    event_source_url: str,
    client_ip: Optional[str],
    client_ua: Optional[str],
    fbp: Optional[str] = None,
    fbc: Optional[str] = None,
) -> Dict[str, Any]:
    """Translate a booking doc into a Meta Purchase event payload."""
    details = booking_doc.get("booking") or {}
    quote = booking_doc.get("quote") or {}
    full_name = (details.get("full_name") or "").strip()
    first, _, last = full_name.partition(" ")
    user = _build_user_data(
        email=details.get("email"),
        phone=details.get("phone"),
        first_name=first,
        last_name=last,
        external_id=booking_doc.get("id"),
        client_ip_address=client_ip,
        client_user_agent=client_ua,
        fbp=fbp,
        fbc=fbc,
    )
    custom: Dict[str, Any] = {
        "currency": "USD",
        "value": float(quote.get("total") or 0),
        "content_ids": [booking_doc.get("room_id")],
        "content_type": "product",
        "content_name": booking_doc.get("room_name"),
        "content_category": booking_doc.get("stay_label"),
        "num_items": 1,
        "site": _get_config()["site_source"],
    }
    return {"user_data": user, "custom_data": custom}


def build_initiate_checkout_event(
    *,
    booking_doc: Dict[str, Any],
    event_source_url: str,
    client_ip: Optional[str],
    client_ua: Optional[str],
    fbp: Optional[str] = None,
    fbc: Optional[str] = None,
) -> Dict[str, Any]:
    """Translate a pending booking into an InitiateCheckout payload."""
    return build_purchase_event(
        booking_doc=booking_doc,
        event_source_url=event_source_url,
        client_ip=client_ip,
        client_ua=client_ua,
        fbp=fbp,
        fbc=fbc,
    )
