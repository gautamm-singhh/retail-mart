"""
Regression Test: Product-to-Category Mappings and Catalog Distribution
Ensures that all 10 baseline products retain their true database categories and names,
and that the 26 inserts achieve exactly 6 products in each of the 6 active categories.
"""

import os
import re
import sys
import unittest
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from canonical_36_catalog import CANONICAL_36_PRODUCTS

class TestCategoryProductMappingRegression(unittest.TestCase):
    def setUp(self):
        self.sql_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "sync_catalog_sample_36.sql")
        self.by_id = {p["id"]: p for p in CANONICAL_36_PRODUCTS}

    def test_baseline_10_products_exact_mappings(self):
        """Verify the 10 baseline products match actual database records."""
        expected_baselines = {
            "p-1001": ("Cotton Crew T-Shirt", "APP-TSH-001", "c-01", "Apparel"),
            "p-1002": ("Slim Fit Denim Jeans", "APP-JNS-014", "c-01", "Apparel"),
            "p-1003": ("Stainless Steel Water Bottle 1L", "HOM-BTL-022", "c-04", "Home & Kitchen"),
            "p-1004": ("Wireless Earbuds Pro", "ELE-EAR-009", "c-03", "Electronics"),
            "p-1005": ("Non-Stick Frying Pan 26cm", "HOM-PAN-005", "c-04", "Home & Kitchen"),
            "p-1006": ("Running Shoes - Trail", "FTW-RUN-031", "c-02", "Footwear"),
            "p-1007": ("Ceramic Coffee Mug Set (4pc)", "HOM-MUG-018", "c-04", "Home & Kitchen"),
            "p-1008": ("Yoga Mat 6mm", "SPT-YOG-007", "c-05", "Sports & Fitness"),
            "p-1009": ("Bluetooth Speaker Mini", "ELE-SPK-012", "c-03", "Electronics"),
            "p-1010": ("Leather Wallet - Bifold", "ACC-WAL-003", "c-06", "Accessories"),
        }

        for pid, (name, sku, cat_id, cat_name) in expected_baselines.items():
            prod = self.by_id.get(pid)
            self.assertIsNotNone(prod, f"Baseline product {pid} missing from catalog!")
            self.assertEqual(prod["name"], name, f"Product {pid} name mismatch!")
            self.assertEqual(prod["sku"], sku, f"Product {pid} SKU mismatch!")
            self.assertEqual(prod["category_id"], cat_id, f"Product {pid} category_id mismatch!")
            self.assertEqual(prod["category_name"], cat_name, f"Product {pid} category_name mismatch!")

    def test_exactly_6_products_per_category(self):
        """Verify each of the 6 active categories contains exactly 6 products."""
        expected_cats = {
            "c-01": "Apparel",
            "c-02": "Footwear",
            "c-03": "Electronics",
            "c-04": "Home & Kitchen",
            "c-05": "Sports & Fitness",
            "c-06": "Accessories",
        }

        counts = Counter([p["category_id"] for p in CANONICAL_36_PRODUCTS])
        self.assertEqual(len(counts), 6, "Expected exactly 6 active categories!")
        for cid, cname in expected_cats.items():
            self.assertEqual(counts[cid], 6, f"Category {cid} ({cname}) does not have 6 products!")

    def test_all_products_active_and_positive_stock(self):
        """Verify that after sync, all 36 products are active with stock > 0."""
        self.assertEqual(len(CANONICAL_36_PRODUCTS), 36)
        for p in CANONICAL_36_PRODUCTS:
            self.assertEqual(p["status"], "active", f"Product {p['id']} is not active!")
            self.assertGreater(p["stock"], 0, f"Product {p['id']} has zero stock!")

    def test_sync_sql_script_structure(self):
        """Verify the sync SQL script conforms to safe insert-only and 3 updates."""
        if not os.path.exists(self.sql_path):
            self.skipTest("sync_catalog_sample_36.sql is not present in deployment directory")
        with open(self.sql_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Check atomic transaction
        self.assertIn("START TRANSACTION;", content)
        self.assertIn("COMMIT;", content)

        # Check no broad ON DUPLICATE KEY UPDATE in executable lines
        executable_lines = [l.strip() for l in content.splitlines() if not l.strip().startswith("--")]
        for l in executable_lines:
            self.assertNotIn("ON DUPLICATE KEY UPDATE", l.upper())

        # Check exactly 3 updates
        updates = [l for l in executable_lines if l.upper().startswith("UPDATE ")]
        self.assertEqual(len(updates), 3, "Expected exactly 3 UPDATE statements!")

        # Verify the 3 updates target p-1003, p-1007, and p-1009
        self.assertIn("WHERE id = 'p-1003';", content)
        self.assertIn("WHERE id = 'p-1007';", content)
        self.assertIn("WHERE id = 'p-1009';", content)

        # Count INSERT statements
        inserts = [l for l in executable_lines if l.upper().startswith("INSERT INTO ")]
        self.assertEqual(len(inserts), 26, "Expected exactly 26 INSERT statements!")

if __name__ == "__main__":
    unittest.main()
