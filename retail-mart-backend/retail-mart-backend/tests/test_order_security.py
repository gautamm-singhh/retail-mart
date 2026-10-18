"""
tests/test_order_security.py
============================
Targeted security regression tests for Retail Mart backend order-creation API:
  1. Rejection of demo product IDs and isDemo flags.
  2. Rejection of unknown product IDs not in live MySQL inventory.
  3. Rejection of inactive / draft products (e.g. p-1009).
  4. Rejection of zero-stock / out-of-stock products (e.g. p-1003).
  5. Rejection of tampered / manipulated prices.
  6. Rejection of invalid quantities (zero or negative).
  7. Acceptance of genuine in-stock products at verified prices.
"""

import os
import sys
import unittest
from flask_jwt_extended import create_access_token

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from dotenv import load_dotenv
load_dotenv(os.path.join(PROJECT_ROOT, ".env"), override=False)

from app import create_app
from app.extensions import db
from app.models.catalog import Category, Product


class TestOrderCreationSecurity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app("testing")
        cls.client = cls.app.test_client()

        with cls.app.app_context():
            db.create_all()

            # Seed minimal required categories
            c1 = Category(id="c-01", name="Apparel", slug="apparel", status="active")
            c2 = Category(id="c-02", name="Home & Kitchen", slug="home-kitchen", status="active")
            c3 = Category(id="c-03", name="Electronics", slug="electronics", status="active")
            db.session.add_all([c1, c2, c3])

            # Seed products matching MySQL production records:
            # p-1001: Active, in-stock (stock=240, price=499)
            prod_active = Product(
                id="p-1001",
                name="Cotton Crew T-Shirt",
                sku="APP-TSH-001",
                category_id="c-01",
                description="Comfortable cotton tee",
                price=499.00,
                stock=240,
                status="active",
            )
            # p-1003: Out of stock (stock=0, price=349, status='out-of-stock')
            prod_out_of_stock = Product(
                id="p-1003",
                name="Stainless Steel Water Bottle 1L",
                sku="HOM-BTL-022",
                category_id="c-02",
                description="Insulated water bottle",
                price=349.00,
                stock=0,
                status="out-of-stock",
            )
            # p-1009: Draft / Unapproved (stock=45, price=1499, status='draft')
            prod_draft = Product(
                id="p-1009",
                name="Bluetooth Speaker Mini",
                sku="ELE-SPK-012",
                category_id="c-03",
                description="Compact portable speaker",
                price=1499.00,
                stock=45,
                status="draft",
            )
            db.session.add_all([prod_active, prod_out_of_stock, prod_draft])
            db.session.commit()

    @classmethod
    def tearDownClass(cls):
        with cls.app.app_context():
            db.session.remove()
            db.drop_all()

    def setUp(self):
        self.ctx = self.app.app_context()
        self.ctx.push()
        with self.app.app_context():
            self.auth_token = create_access_token(
                identity="u-1001",
                additional_claims={
                    "role": "Customer",
                    "email": "customer@retailmart.dev",
                    "name": "Security Test Customer",
                },
            )
            self.headers = {
                "Authorization": f"Bearer {self.auth_token}",
                "Content-Type": "application/json",
            }

    def tearDown(self):
        self.ctx.pop()

    def test_reject_demo_product_id(self):
        """API must independently reject demo product IDs (e.g. demo-app-001) or isDemo flags."""
        payload = {
            "customer": "Security Tester",
            "customerEmail": "customer@retailmart.dev",
            "destinationState": "Telangana",
            "items": [
                {
                    "productId": "demo-app-001",
                    "productName": "Demo Silk Kurta",
                    "price": 1499,
                    "quantity": 1,
                    "isDemo": True,
                }
            ],
        }
        resp = self.client.post("/api/orders", json=payload, headers=self.headers)
        self.assertEqual(resp.status_code, 400)
        data = resp.get_json()
        self.assertIn("Demo product", data.get("error", ""))

    def test_reject_unknown_product_id(self):
        """API must reject product IDs not found in the live MySQL inventory."""
        payload = {
            "customer": "Security Tester",
            "customerEmail": "customer@retailmart.dev",
            "destinationState": "Telangana",
            "items": [
                {
                    "productId": "p-fake-9999",
                    "productName": "Imaginary Product",
                    "price": 999,
                    "quantity": 1,
                }
            ],
        }
        resp = self.client.post("/api/orders", json=payload, headers=self.headers)
        self.assertEqual(resp.status_code, 400)
        data = resp.get_json()
        self.assertIn("not found in live inventory", data.get("error", ""))

    def test_reject_draft_product(self):
        """API must reject draft / inactive products (e.g. p-1009 Bluetooth Speaker Mini)."""
        payload = {
            "customer": "Security Tester",
            "customerEmail": "customer@retailmart.dev",
            "destinationState": "Telangana",
            "items": [
                {
                    "productId": "p-1009",
                    "productName": "Bluetooth Speaker Mini",
                    "price": 1499.00,
                    "quantity": 1,
                }
            ],
        }
        resp = self.client.post("/api/orders", json=payload, headers=self.headers)
        self.assertEqual(resp.status_code, 400)
        data = resp.get_json()
        self.assertIn("not currently available for purchase", data.get("error", ""))

    def test_reject_zero_stock_product(self):
        """API must reject out-of-stock products with 0 stock (e.g. p-1003 Water Bottle)."""
        payload = {
            "customer": "Security Tester",
            "customerEmail": "customer@retailmart.dev",
            "destinationState": "Telangana",
            "items": [
                {
                    "productId": "p-1003",
                    "productName": "Stainless Steel Water Bottle 1L",
                    "price": 349.00,
                    "quantity": 1,
                }
            ],
        }
        resp = self.client.post("/api/orders", json=payload, headers=self.headers)
        self.assertEqual(resp.status_code, 400)
        data = resp.get_json()
        self.assertTrue(
            "out of stock" in data.get("error", "") or "not currently available for purchase" in data.get("error", "")
        )

    def test_reject_manipulated_price(self):
        """API must reject client-side price tampering (e.g. submitting Rs 10 for a Rs 499 item)."""
        payload = {
            "customer": "Security Tester",
            "customerEmail": "customer@retailmart.dev",
            "destinationState": "Telangana",
            "items": [
                {
                    "productId": "p-1001",
                    "productName": "Cotton Crew T-Shirt",
                    "price": 10.00,  # Manipulated! Real price is 499.00
                    "quantity": 1,
                }
            ],
        }
        resp = self.client.post("/api/orders", json=payload, headers=self.headers)
        self.assertEqual(resp.status_code, 400)
        data = resp.get_json()
        self.assertIn("Price mismatch", data.get("error", ""))

    def test_reject_invalid_quantity(self):
        """API must reject zero or negative quantities."""
        payload = {
            "customer": "Security Tester",
            "customerEmail": "customer@retailmart.dev",
            "destinationState": "Telangana",
            "items": [
                {
                    "productId": "p-1001",
                    "productName": "Cotton Crew T-Shirt",
                    "price": 499.00,
                    "quantity": 0,
                }
            ],
        }
        resp = self.client.post("/api/orders", json=payload, headers=self.headers)
        self.assertEqual(resp.status_code, 400)
        data = resp.get_json()
        self.assertIn("Invalid quantity", data.get("error", ""))

    def test_reject_quantity_exceeding_stock(self):
        """API must reject quantities greater than available stock."""
        payload = {
            "customer": "Security Tester",
            "customerEmail": "customer@retailmart.dev",
            "destinationState": "Telangana",
            "items": [
                {
                    "productId": "p-1001",
                    "productName": "Cotton Crew T-Shirt",
                    "price": 499.00,
                    "quantity": 9999,  # available is 240
                }
            ],
        }
        resp = self.client.post("/api/orders", json=payload, headers=self.headers)
        self.assertEqual(resp.status_code, 400)
        data = resp.get_json()
        self.assertIn("exceeds available stock", data.get("error", ""))

    def test_accept_valid_product_order(self):
        """API must successfully process genuine active in-stock products with matching price."""
        payload = {
            "customer": "Security Tester",
            "customerEmail": "customer@retailmart.dev",
            "destinationState": "Telangana",
            "items": [
                {
                    "productId": "p-1001",
                    "productName": "Cotton Crew T-Shirt",
                    "price": 499.00,
                    "quantity": 1,
                }
            ],
        }
        resp = self.client.post("/api/orders", json=payload, headers=self.headers)
        self.assertEqual(resp.status_code, 201)
        data = resp.get_json()
        self.assertEqual(data["amount"], 499.00)
        self.assertEqual(len(data["items"]), 1)
        self.assertEqual(data["items"][0]["productName"], "Cotton Crew T-Shirt")


if __name__ == "__main__":
    unittest.main()
