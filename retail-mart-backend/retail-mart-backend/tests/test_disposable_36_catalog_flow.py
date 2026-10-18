"""
Disposable Database Test for 36-Product Catalog Synchronization & Order Flow.
Runs against isolated in-memory SQLite / disposable database to verify end-to-end
order validation, cart checkout, inventory decrement and category counts.
"""

import os
import sys
import unittest
from datetime import date
from decimal import Decimal

# Ensure backend root is in sys.path
BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from flask import Flask

from app import create_app
from app.extensions import db
from app.models.user import Role, User
from app.models.catalog import Category, Product
from app.models.order import Order, OrderItem, OrderStatusEvent
from canonical_36_catalog import CANONICAL_36_PRODUCTS, DEMO_UPDATES as DEMO_UPDATE_SPECS


class TestDisposable36CatalogFlow(unittest.TestCase):
    def setUp(self):
        self.app = create_app("testing")
        self.app.config["TESTING"] = True
        self.app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
        self.app.config["JWT_SECRET_KEY"] = "super-secret-jwt-key-32-chars-min-len!"
        self.app.config["RAZORPAY_KEY_ID"] = "rzp_test_mock123"
        self.app.config["RAZORPAY_KEY_SECRET"] = "mock_secret_123"
        self.client = self.app.test_client()

        with self.app.app_context():
            db.create_all()

            # Seed Roles
            roles = {name: Role(role_name=name) for name in ("Admin", "Manager", "Staff", "Customer")}
            db.session.add_all(roles.values())
            db.session.flush()

            # Seed Customer
            cust = User(id="u-cust-test", name="Demo Customer", email="demo.cust@example.com", role_id=roles["Customer"].role_id, status="active")
            cust.set_password("password123")
            db.session.add(cust)

            # Seed 6 Categories
            cats = [
                ("c-01", "Apparel"),
                ("c-02", "Footwear"),
                ("c-03", "Electronics"),
                ("c-04", "Home & Kitchen"),
                ("c-05", "Sports & Fitness"),
                ("c-06", "Accessories"),
            ]
            for cid, cname in cats:
                db.session.add(Category(id=cid, name=cname, slug=cname.lower().replace(" & ", "-").replace(" ", "-"), status="active"))
            db.session.flush()

            # Seed Baseline 10 Products (with p-1003, p-1007 at 0 stock, p-1009 at draft)
            baseline_products = [
                Product(id="p-1001", name="Cotton Crew T-Shirt", sku="APP-TSH-001", category_id="c-01", price=499, stock=240, status="active"),
                Product(id="p-1002", name="Slim Fit Denim Jeans", sku="APP-JNS-014", category_id="c-01", price=1799, stock=58, status="active"),
                Product(id="p-1003", name="Stainless Steel Water Bottle 1L", sku="HOM-BTL-022", category_id="c-04", price=349, stock=0, status="out-of-stock"),
                Product(id="p-1004", name="Wireless Earbuds Pro", sku="ELE-EAR-009", category_id="c-03", price=2999, stock=132, status="active"),
                Product(id="p-1005", name="Non-Stick Frying Pan 26cm", sku="HOM-PAN-005", category_id="c-04", price=899, stock=76, status="active"),
                Product(id="p-1006", name="Running Shoes - Trail", sku="FTW-RUN-031", category_id="c-02", price=2499, stock=12, status="active"),
                Product(id="p-1007", name="Ceramic Coffee Mug Set (4pc)", sku="HOM-MUG-018", category_id="c-04", price=649, stock=0, status="out-of-stock"),
                Product(id="p-1008", name="Yoga Mat 6mm", sku="SPT-YOG-007", category_id="c-05", price=799, stock=94, status="active"),
                Product(id="p-1009", name="Bluetooth Speaker Mini", sku="ELE-SPK-012", category_id="c-03", price=1499, stock=45, status="draft"),
                Product(id="p-1010", name="Leather Wallet - Bifold", sku="ACC-WAL-003", category_id="c-06", price=999, stock=61, status="active"),
            ]
            db.session.add_all(baseline_products)
            db.session.commit()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def get_jwt_token(self):
        resp = self.client.post("/api/auth/login", json={
            "email": "demo.cust@example.com",
            "password": "password123"
        })
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        return data.get("accessToken") or data.get("token")

    def test_01_catalog_synchronization_in_disposable_db(self):
        with self.app.app_context():
            # Initial count must be 10
            self.assertEqual(Product.query.count(), 10)

            # Perform Synchronization
            existing_ids = {p.id for p in Product.query.all()}
            for item in CANONICAL_36_PRODUCTS:
                pid = item["id"]
                if pid not in existing_ids:
                    # INSERT missing
                    db.session.add(Product(
                        id=pid,
                        name=item["name"],
                        sku=item["sku"],
                        category_id=item["category_id"],
                        description=item["description"],
                        price=Decimal(str(item["price"])),
                        stock=item["stock"],
                        status=item["status"],
                        image_url=item["image_url"]
                    ))
                elif pid in DEMO_UPDATE_SPECS:
                    # UPDATE baseline demo records
                    spec = DEMO_UPDATE_SPECS[pid]
                    existing_p = Product.query.get(pid)
                    existing_p.stock = spec["stock"]
                    existing_p.status = spec["status"]

            db.session.commit()

            # Verification 1: Exactly 36 products
            all_prods = Product.query.all()
            self.assertEqual(len(all_prods), 36)

            # Verification 2: Exactly 6 active products per category
            from collections import Counter
            cat_counts = Counter([p.category_ref.name for p in all_prods if p.status == "active"])
            for cat_name in ["Apparel", "Footwear", "Electronics", "Home & Kitchen", "Sports & Fitness", "Accessories"]:
                self.assertEqual(cat_counts[cat_name], 6, f"Category {cat_name} does not have exactly 6 active products")

            # Verification 3: No zero or negative stocks
            for p in all_prods:
                self.assertGreater(p.stock, 0, f"Product {p.id} has 0 stock")
                self.assertEqual(p.status, "active", f"Product {p.id} is not active")

    def test_02_server_side_order_validation_with_new_and_updated_products(self):
        # First sync the database
        self.test_01_catalog_synchronization_in_disposable_db()
        token = self.get_jwt_token()

        with self.app.app_context():
            # Test Order 1: Order a NEWLY ADDED product (p-1011 Classic Fleece Pullover Hoodie, qty=2)
            resp = self.client.post("/api/orders", headers={"Authorization": f"Bearer {token}"}, json={
                "customer": "Demo Customer",
                "customerEmail": "demo.cust@example.com",
                "items": [
                    {"productId": "p-1011", "productName": "Classic Fleece Pullover Hoodie", "quantity": 2, "price": 1499.00}
                ]
            })
            self.assertEqual(resp.status_code, 201)
            order1 = resp.get_json()
            self.assertEqual(order1["status"], "Pending")
            self.assertEqual(order1["paymentStatus"], "Pending")

            # Test Order 2: Order an UPDATED product (p-1003 Stainless Steel Bottle, was 0 stock, now active)
            resp2 = self.client.post("/api/orders", headers={"Authorization": f"Bearer {token}"}, json={
                "customer": "Demo Customer",
                "customerEmail": "demo.cust@example.com",
                "items": [
                    {"productId": "p-1003", "productName": "Stainless Steel Water Bottle 1L", "quantity": 1, "price": 349.00}
                ]
            })
            self.assertEqual(resp2.status_code, 201)

            # Test Order 3: Server-side validation MUST REJECT quantity > stock
            resp3 = self.client.post("/api/orders", headers={"Authorization": f"Bearer {token}"}, json={
                "customer": "Demo Customer",
                "customerEmail": "demo.cust@example.com",
                "items": [
                    {"productId": "p-1011", "productName": "Classic Fleece Pullover Hoodie", "quantity": 9999, "price": 1499.00}
                ]
            })
            self.assertEqual(resp3.status_code, 400)
            self.assertIn("exceeds available stock", resp3.get_json()["error"])

    def test_03_inventory_decrement_and_reconciliation(self):
        # Sync database
        self.test_01_catalog_synchronization_in_disposable_db()
        token = self.get_jwt_token()

        with self.app.app_context():
            # Initial stock of p-1012 is 64
            p1012 = Product.query.get("p-1012")
            self.assertEqual(p1012.stock, 64)

            # Place order for 4 units of p-1012
            resp = self.client.post("/api/orders", headers={"Authorization": f"Bearer {token}"}, json={
                "customer": "Demo Customer",
                "customerEmail": "demo.cust@example.com",
                "items": [
                    {"productId": "p-1012", "productName": "Slim Fit Stretch Chino Trousers", "quantity": 4, "price": 1299.00}
                ]
            })
            self.assertEqual(resp.status_code, 201)
            order_data = resp.get_json()
            order_id = order_data["id"]

            # Deduct inventory via inventory decrement engine
            from app.utils.inventory import deduct_order_stock
            order_obj = Order.query.get(order_id)
            deduct_order_stock(order_obj)
            db.session.commit()

            # Verify stock decremented by exactly 4 (64 -> 60)
            db.session.expire_all()
            self.assertEqual(Product.query.get("p-1012").stock, 60)


if __name__ == "__main__":
    unittest.main()
