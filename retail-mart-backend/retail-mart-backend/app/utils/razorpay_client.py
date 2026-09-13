"""
Talks to RazorPay's REST API directly with `requests`, used only by
POST /api/payments/razorpay/order and /verify.

Deliberately does NOT use the official `razorpay` PyPI package: that SDK
hard-imports `pkg_resources` (from setuptools) at import time, which
newer Python/setuptools combinations don't ship by default, so importing
it can crash with `ModuleNotFoundError: No module named 'pkg_resources'`
on a perfectly fine setup. RazorPay's order-create and signature-verify
operations are simple enough (one POST, one HMAC check) that hand-rolling
them is more reliable than depending on that package.

If RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET aren't set, get_razorpay_client()
returns a mock with the same two methods (`order.create`,
`utility.verify_payment_signature`), so the whole checkout flow - create
order, pay, verify signature - works end-to-end in dev without a real
RazorPay account. Going live is purely setting the two env vars;
app/routes/payments.py never changes.
"""

import hashlib
import hmac
import uuid

from flask import current_app

RAZORPAY_API_BASE = "https://api.razorpay.com/v1"


class _MockOrder:
    @staticmethod
    def create(data: dict) -> dict:
        return {
            "id": f"order_mock_{uuid.uuid4().hex[:14]}",
            "amount": data["amount"],
            "currency": data.get("currency", "INR"),
            "status": "created",
        }


class _MockUtility:
    @staticmethod
    def verify_payment_signature(params: dict) -> bool:
        # Mock mode: accept anything shaped like a signature so the happy
        # path (and the frontend's checkout flow) can be exercised without
        # a real RazorPay account. Real mode below does a proper HMAC check.
        return bool(params.get("razorpay_signature"))


class MockRazorpayClient:
    """Drop-in stand-in for the real client when no API keys are configured."""

    order = _MockOrder()
    utility = _MockUtility()


class RealRazorpayOrder:
    def __init__(self, key_id: str, key_secret: str):
        self._auth = (key_id, key_secret)

    def create(self, data: dict) -> dict:
        import requests  # imported lazily so this stays optional in mock mode

        response = requests.post(
            f"{RAZORPAY_API_BASE}/orders",
            auth=self._auth,
            json=data,
            timeout=10,
        )
        response.raise_for_status()
        return response.json()


class RealRazorpayUtility:
    """Reimplements the signature check RazorPay's docs specify: HMAC-SHA256 of "order_id|payment_id" using the key secret."""

    def __init__(self, key_secret: str):
        self._key_secret = key_secret

    def verify_payment_signature(self, params: dict) -> bool:
        payload = f"{params['razorpay_order_id']}|{params['razorpay_payment_id']}"
        expected = hmac.new(
            self._key_secret.encode(), payload.encode(), hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected, params.get("razorpay_signature", ""))


class RealRazorpayClient:
    def __init__(self, key_id: str, key_secret: str):
        self.order = RealRazorpayOrder(key_id, key_secret)
        self.utility = RealRazorpayUtility(key_secret)


def get_razorpay_client():
    key_id = current_app.config.get("RAZORPAY_KEY_ID")
    key_secret = current_app.config.get("RAZORPAY_KEY_SECRET")

    if not key_id or not key_secret:
        return MockRazorpayClient()

    return RealRazorpayClient(key_id, key_secret)


def is_razorpay_live() -> bool:
    return bool(current_app.config.get("RAZORPAY_KEY_ID") and current_app.config.get("RAZORPAY_KEY_SECRET"))
