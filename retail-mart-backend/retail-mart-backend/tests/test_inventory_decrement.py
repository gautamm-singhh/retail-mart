"""
tests/test_inventory_decrement.py
=================================
Targeted regression tests for inventory decrement and idempotency upon payment verification:
  1. Successful payment decreases stock exactly once.
  2. Duplicate payment callback does not decrease stock again (Idempotency).
  3. Failed payment signature leaves stock unchanged.
  4. Preventing negative stock when stock is limited.
  5. Checkout rejects quantities exceeding available inventory.
  6. Order payment_status accurately transitions to 'Paid'.
  7. Status sync: Product status transitions to 'out-of-stock' when stock reaches 0.
"""

import os
import sys
import unittest
import hmac
import hashlib
from datetime import date
from decimal import Decimal

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from dotenv import load_dotenv
load_dotenv(os.path.join(PROJECT_ROOT, ".env"), override=False)

from app import create_app
from app.extensions import db
from app.models.catalog import Category, Product
from app.models.order import Order, OrderItem, OrderStatusEvent
from app.models.payment import Payment, PaymentStatusEvent
from app.models.user import User, Role
from flask_jwt_extended import create_access_token


class TestInventoryDecrement(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app("testing")
        cls.app.config["RAZORPAY_KEY_ID"] = "rzp_test_TVwKu2djOw5HPj"
        cls.app.config["RAZORPAY_KEY_SECRET"] = "test_secret_for_tests"
        cls.client = cls.app.test_client()

        with cls.app.app_context():
            db.create_all()

            # Seed Category
            cat = Category.query.get("c-test")
            if not cat:
                cat = Category(id="c-test", name="Apparel", slug="apparel", status="active")
                db.session.add(cat)

            # Seed User Role & Customer
            r_cust = Role.query.filter_by(role_name="Customer").first()
            if not r_cust:
                r_cust = Role(role_name="Customer")
                db.session.add(r_cust)
                db.session.flush()

            u_cust = User.query.get("u-test-cust")
            if not u_cust:
                u_cust = User(
                    id="u-test-cust",
                    name="Test Buyer",
                    email="buyer@test.dev",
                    role_id=r_cust.role_id,
                    status="active"
                )
                db.session.add(u_cust)

            db.session.commit()

        with cls.app.app_context():
            cls.cust_token = create_access_token(identity="u-test-cust", additional_claims={"role": "Customer"})

    def _create_test_order_and_payment(self, product: Product, quantity: int):
        with self.app.app_context():
            p = Product.query.get(product.id)
            order_id = f"ORD-TEST-{os.urandom(3).hex()}"
            payment_id = f"PAY-TEST-{os.urandom(3).hex()}"

            order = Order(
                id=order_id,
                user_id="u-test-cust",
                customer="Test Buyer",
                customer_email="buyer@test.dev",
                date=date.today(),
                amount=Decimal(str(p.price * quantity)),
                payment_status="Pending",
                status="Pending",
            )
            order.items.append(OrderItem(product_name=p.name, quantity=quantity, price=p.price))
            order.status_history.append(OrderStatusEvent(status="Pending", date=date.today()))

            payment = Payment(
                id=payment_id,
                order_id=order_id,
                customer="Test Buyer",
                amount=order.amount,
                method="Pending",
                status="Pending",
                date=date.today(),
            )
            payment.history.append(PaymentStatusEvent(status="Pending", date=date.today()))

            db.session.add_all([order, payment])
            db.session.commit()
            return order_id, payment_id

    def test_01_successful_payment_decrements_stock_once(self):
        """Verify successful payment reduces stock by purchased quantity exactly once."""
        with self.app.app_context():
            prod = Product(
                id=f"p-test-{os.urandom(3).hex()}",
                name="Inventory Test Shirt",
                sku=f"APP-TEST-{os.urandom(3).hex()}",
                category_id="c-test",
                price=500.00,
                stock=50,
                status="active"
            )
            db.session.add(prod)
            db.session.commit()
            prod_id = prod.id

        order_id, payment_id = self._create_test_order_and_payment(prod, quantity=3)

        # Generate valid Razorpay HMAC signature
        order_r_id = f"order_mock_{payment_id}"
        pay_r_id = f"pay_mock_{payment_id}"
        secret = self.app.config["RAZORPAY_KEY_SECRET"]
        payload = f"{order_r_id}|{pay_r_id}"
        sig = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()

        headers = {"Authorization": f"Bearer {self.cust_token}", "Content-Type": "application/json"}
        resp = self.client.post("/api/payments/razorpay/verify", json={
            "paymentId": payment_id,
            "razorpayOrderId": order_r_id,
            "razorpayPaymentId": pay_r_id,
            "razorpaySignature": sig
        }, headers=headers)

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.get_json()["status"], "Paid")

        with self.app.app_context():
            updated_prod = Product.query.get(prod_id)
            self.assertEqual(updated_prod.stock, 47)  # 50 - 3 = 47
            self.assertEqual(updated_prod.status, "active")

    def test_02_duplicate_payment_callback_is_idempotent(self):
        """Verify repeated/duplicate payment verification does not decrement stock twice."""
        with self.app.app_context():
            prod = Product(
                id=f"p-test-{os.urandom(3).hex()}",
                name="Idempotency Test Shirt",
                sku=f"APP-TEST-{os.urandom(3).hex()}",
                category_id="c-test",
                price=600.00,
                stock=20,
                status="active"
            )
            db.session.add(prod)
            db.session.commit()
            prod_id = prod.id

        order_id, payment_id = self._create_test_order_and_payment(prod, quantity=2)

        order_r_id = f"order_mock_{payment_id}"
        pay_r_id = f"pay_mock_{payment_id}"
        secret = self.app.config["RAZORPAY_KEY_SECRET"]
        payload = f"{order_r_id}|{pay_r_id}"
        sig = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()

        headers = {"Authorization": f"Bearer {self.cust_token}", "Content-Type": "application/json"}
        # First verification
        resp1 = self.client.post("/api/payments/razorpay/verify", json={
            "paymentId": payment_id,
            "razorpayOrderId": order_r_id,
            "razorpayPaymentId": pay_r_id,
            "razorpaySignature": sig
        }, headers=headers)
        self.assertEqual(resp1.status_code, 200)

        with self.app.app_context():
            self.assertEqual(Product.query.get(prod_id).stock, 18)

        # Second verification (duplicate callback attempt)
        resp2 = self.client.post("/api/payments/razorpay/verify", json={
            "paymentId": payment_id,
            "razorpayOrderId": order_r_id,
            "razorpayPaymentId": pay_r_id,
            "razorpaySignature": sig
        }, headers=headers)
        self.assertEqual(resp2.status_code, 200)

        # Stock MUST remain 18, never 16!
        with self.app.app_context():
            self.assertEqual(Product.query.get(prod_id).stock, 18)

    def test_03_failed_signature_leaves_stock_unchanged(self):
        """Verify failed or invalid payment signature never reduces stock."""
        with self.app.app_context():
            prod = Product(
                id=f"p-test-{os.urandom(3).hex()}",
                name="Failed Signature Test",
                sku=f"APP-TEST-{os.urandom(3).hex()}",
                category_id="c-test",
                price=800.00,
                stock=30,
                status="active"
            )
            db.session.add(prod)
            db.session.commit()
            prod_id = prod.id

        order_id, payment_id = self._create_test_order_and_payment(prod, quantity=5)

        headers = {"Authorization": f"Bearer {self.cust_token}", "Content-Type": "application/json"}
        # Send bogus signature
        resp = self.client.post("/api/payments/razorpay/verify", json={
            "paymentId": payment_id,
            "razorpayOrderId": "order_invalid",
            "razorpayPaymentId": "pay_invalid",
            "razorpaySignature": "invalid_signature_xyz"
        }, headers=headers)

        self.assertEqual(resp.status_code, 400)

        # Stock must remain unchanged at 30
        with self.app.app_context():
            self.assertEqual(Product.query.get(prod_id).stock, 30)
            pay = Payment.query.get(payment_id)
            self.assertEqual(pay.status, "Pending")

    def test_04_prevents_negative_stock_and_syncs_out_of_stock(self):
        """Verify stock reaching 0 sets status='out-of-stock' and cannot become negative."""
        with self.app.app_context():
            prod = Product(
                id=f"p-test-{os.urandom(3).hex()}",
                name="Exhaustion Test Item",
                sku=f"APP-TEST-{os.urandom(3).hex()}",
                category_id="c-test",
                price=100.00,
                stock=2,
                status="active"
            )
            db.session.add(prod)
            db.session.commit()
            prod_id = prod.id

        order_id, payment_id = self._create_test_order_and_payment(prod, quantity=2)

        order_r_id = f"order_mock_{payment_id}"
        pay_r_id = f"pay_mock_{payment_id}"
        secret = self.app.config["RAZORPAY_KEY_SECRET"]
        payload = f"{order_r_id}|{pay_r_id}"
        sig = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()

        headers = {"Authorization": f"Bearer {self.cust_token}", "Content-Type": "application/json"}
        resp = self.client.post("/api/payments/razorpay/verify", json={
            "paymentId": payment_id,
            "razorpayOrderId": order_r_id,
            "razorpayPaymentId": pay_r_id,
            "razorpaySignature": sig
        }, headers=headers)
        self.assertEqual(resp.status_code, 200)

        # Stock should be 0 and status synchronized to 'out-of-stock'
        with self.app.app_context():
            updated = Product.query.get(prod_id)
            self.assertEqual(updated.stock, 0)
            self.assertEqual(updated.status, "out-of-stock")

    def test_05_insufficient_stock_creates_auditable_reconciliation(self):
        """Verify stock conflict results in persistent Failed payment & Cancelled order (never a misleading completed order)."""
        with self.app.app_context():
            prod = Product(
                id=f"p-test-{os.urandom(3).hex()}",
                name="Reconciliation Conflict Item",
                sku=f"APP-TEST-{os.urandom(3).hex()}",
                category_id="c-test",
                price=250.00,
                stock=5,
                status="active"
            )
            db.session.add(prod)
            db.session.commit()
            prod_id = prod.id

        order_id, payment_id = self._create_test_order_and_payment(prod, quantity=5)

        # Simulate another buyer depleting stock right before payment verification
        with self.app.app_context():
            p_to_drain = Product.query.get(prod_id)
            p_to_drain.stock = 1  # Only 1 left, but order needed 5!
            db.session.commit()

        order_r_id = f"order_mock_{payment_id}"
        pay_r_id = f"pay_mock_{payment_id}"
        secret = self.app.config["RAZORPAY_KEY_SECRET"]
        payload = f"{order_r_id}|{pay_r_id}"
        sig = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()

        headers = {"Authorization": f"Bearer {self.cust_token}", "Content-Type": "application/json"}
        resp = self.client.post("/api/payments/razorpay/verify", json={
            "paymentId": payment_id,
            "razorpayOrderId": order_r_id,
            "razorpayPaymentId": pay_r_id,
            "razorpaySignature": sig
        }, headers=headers)

        self.assertEqual(resp.status_code, 409)
        resp_json = resp.get_json()
        self.assertIn("Insufficient inventory", resp_json["error"])
        self.assertIn("reconciliation", resp_json)

        # Assert persistent auditable database status
        with self.app.app_context():
            verified_pay = Payment.query.get(payment_id)
            verified_order = Order.query.get(order_id)
            verified_prod = Product.query.get(prod_id)

            # Payment remains marked Paid (money was captured from customer)
            self.assertEqual(verified_pay.status, "Paid")
            # Order is marked Cancelled (never completed without stock) and flagged for refund
            self.assertEqual(verified_order.status, "Cancelled")
            self.assertEqual(verified_order.payment_status, "Paid")
            # Stock is preserved at 1 (not negative or deducted)
            self.assertEqual(verified_prod.stock, 1)

    def test_06_concurrent_callbacks_deduct_exactly_once(self):
        """Verify simultaneous duplicate payment callbacks lock row and deduct stock exactly once."""
        import threading

        with self.app.app_context():
            prod = Product(
                id=f"p-test-{os.urandom(3).hex()}",
                name="Concurrent Locking Item",
                sku=f"APP-TEST-{os.urandom(3).hex()}",
                category_id="c-test",
                price=400.00,
                stock=10,
                status="active"
            )
            db.session.add(prod)
            db.session.commit()
            prod_id = prod.id

        order_id, payment_id = self._create_test_order_and_payment(prod, quantity=2)

        order_r_id = f"order_mock_{payment_id}"
        pay_r_id = f"pay_mock_{payment_id}"
        secret = self.app.config["RAZORPAY_KEY_SECRET"]
        payload = f"{order_r_id}|{pay_r_id}"
        sig = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()

        headers = {"Authorization": f"Bearer {self.cust_token}", "Content-Type": "application/json"}
        req_data = {
            "paymentId": payment_id,
            "razorpayOrderId": order_r_id,
            "razorpayPaymentId": pay_r_id,
            "razorpaySignature": sig
        }

        results = []

        def call_verify():
            with self.app.test_client() as cl:
                r = cl.post("/api/payments/razorpay/verify", json=req_data, headers=headers)
                results.append(r.status_code)

        t1 = threading.Thread(target=call_verify)
        t2 = threading.Thread(target=call_verify)

        t1.start()
        t2.start()

        t1.join()
        t2.join()

        # Both callbacks receive successful HTTP 200 (one processes, second is idempotent skip)
        self.assertEqual(results, [200, 200])

        with self.app.app_context():
            # Initial stock was 10, quantity was 2 -> stock MUST be exactly 8!
            updated = Product.query.get(prod_id)
            self.assertEqual(updated.stock, 8)
            pay = Payment.query.get(payment_id)
            self.assertEqual(pay.status, "Paid")


if __name__ == "__main__":
    unittest.main()
