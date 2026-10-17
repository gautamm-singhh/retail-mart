import unittest
from decimal import Decimal
from app import create_app
from app.utils.tax import (
    calculate_order_tax_breakdown,
    lookup_product_tax,
    determine_supply_type,
    get_seller_tax_config,
    STATUTORY_PRODUCT_TAX_REGISTRY,
)


class TestTaxEngine(unittest.TestCase):
    def setUp(self):
        self.app = create_app("testing")
        self.ctx = self.app.app_context()
        self.ctx.push()

    def tearDown(self):
        self.ctx.pop()

    def test_seller_configuration_defaults(self):
        cfg = get_seller_tax_config()
        self.assertEqual(cfg["seller_state"], "Telangana")
        self.assertEqual(cfg["seller_state_code"], "36")
        self.assertEqual(cfg["seller_country"], "India")
        # GSTIN is pending client registration; must be None/empty (no fake GSTIN)
        self.assertFalse(cfg["is_verified_gst"])
        self.assertIn(cfg["gst_mode"], ("preview", "pending"))

    def test_statutory_hsn_and_rates(self):
        # 1. T-Shirt <= Rs. 2,500: 5% HSN 6109 (Notification 09/2025-CT(R))
        tshirt = lookup_product_tax("Cotton Crew T-Shirt")
        self.assertIsNotNone(tshirt)
        self.assertEqual(tshirt["hsn"], "6109")
        self.assertEqual(tshirt["gst_rate"], Decimal("5.00"))

        # 2. Jeans <= Rs. 2,500: 5% HSN 6203 (Notification 09/2025-CT(R) revised threshold)
        jeans = lookup_product_tax("APP-JNS-014", unit_price=Decimal("1799.00"))
        self.assertIsNotNone(jeans)
        self.assertEqual(jeans["hsn"], "6203")
        self.assertEqual(jeans["gst_rate"], Decimal("5.00"))

        # Dynamic threshold verification: Apparel > Rs. 2,500 attracts 18%
        expensive_jeans = lookup_product_tax("APP-JNS-014", unit_price=Decimal("2999.00"))
        self.assertEqual(expensive_jeans["gst_rate"], Decimal("18.00"))

        # 3. Shoes <= Rs. 2,500: 5% HSN 6404 (Notification 09/2025-CT(R))
        shoes = lookup_product_tax("FTW-RUN-031", unit_price=Decimal("2499.00"))
        self.assertIsNotNone(shoes)
        self.assertEqual(shoes["hsn"], "6404")
        self.assertEqual(shoes["gst_rate"], Decimal("5.00"))

        # 4. Earbuds: 18% HSN 8518
        earbuds = lookup_product_tax("ELE-EAR-009")
        self.assertIsNotNone(earbuds)
        self.assertEqual(earbuds["hsn"], "8518")
        self.assertEqual(earbuds["gst_rate"], Decimal("18.00"))

        # 5. Water bottle: 12% HSN 7323
        bottle = lookup_product_tax("HOM-BTL-022")
        self.assertIsNotNone(bottle)
        self.assertEqual(bottle["hsn"], "7323")
        self.assertEqual(bottle["gst_rate"], Decimal("12.00"))

    def test_gstin_validation_and_unverified_guard(self):
        from app.utils.tax import validate_gstin_format
        # Must fail if empty
        self.assertFalse(validate_gstin_format(None)["valid"])
        self.assertFalse(validate_gstin_format("")["valid"])

        # Must fail if not 15 characters
        self.assertFalse(validate_gstin_format("36ABCDE1234F")["valid"])

        # Must fail if invalid regex pattern
        self.assertFalse(validate_gstin_format("36ABCDE1234F999")["valid"])

        # Must fail if state code does not match Telangana (36)
        self.assertFalse(validate_gstin_format("27ABCDE1234F1Z5", expected_state_code="36")["valid"])

        # Pass format check with correct Telangana prefix
        val = validate_gstin_format("36ABCDE1234F1Z5", expected_state_code="36")
        self.assertTrue(val["valid"])

        # But get_seller_tax_config MUST NOT treat format validity alone as proof of active registration
        with self.app.test_request_context():
            self.app.config["SELLER_GSTIN"] = "36ABCDE1234F1Z5"
            self.app.config["SELLER_GST_VERIFIED"] = False  # Pending authoritative verification
            self.app.config["SELLER_GST_STATUS"] = "PENDING"
            cfg = get_seller_tax_config()
            self.assertFalse(cfg["is_verified_gst"])
            self.assertEqual(cfg["gst_mode"], "preview")

    def test_authoritative_guard_prevents_manual_bypass(self):
        # Even if a user manually sets SELLER_GST_VERIFIED=True and GST_MODE=live in .env,
        # without authoritative portal verification the engine must lock to preview!
        with self.app.test_request_context():
            self.app.config["SELLER_GSTIN"] = "36ABCDE1234F1Z5"
            self.app.config["SELLER_GST_VERIFIED"] = True  # Manual flag attempt
            self.app.config["GST_MODE"] = "live"
            cfg = get_seller_tax_config()
            # Authoritative check fails because portal API is not configured
            self.assertFalse(cfg["is_verified_gst"])
            self.assertEqual(cfg["gst_mode"], "preview")
            self.assertEqual(cfg["seller_gst_status"], "PENDING_REGISTRATION")

    def test_historical_invoice_vs_snapshot_invoice_handling(self):
        from app.utils.pdf import build_invoice_pdf
        from app.models.order import Order, OrderItem
        from app.extensions import db
        import pypdf

        # 1. Historical Order WITHOUT snapshot
        historical_order = Order(
            id="ORD-HIST-01",
            customer="Ravi Kumar",
            customer_email="ravi@example.com",
            amount=499.00,
        )
        historical_order.items.append(OrderItem(product_name="Cotton Crew T-Shirt", quantity=1, price=499))

        pdf_bio = build_invoice_pdf(historical_order)
        reader = pypdf.PdfReader(pdf_bio)
        text_content = "".join([p.extract_text() for p in reader.pages])

        # Must be marked as Informational Estimate, NEVER original recorded tax!
        self.assertIn("Informational Estimate", text_content)
        self.assertIn("Snapshot Recorded", text_content)

        # 2. Modern Order WITH immutable snapshot
        snapshot = {
            "seller_business_name": "Retail Mart Commerce",
            "seller_state": "Telangana",
            "seller_state_code": "36",
            "seller_country": "India",
            "seller_address": "[Pending Registration - Proposed Origin: Hyderabad, Telangana]",
            "seller_gstin": None,
            "gst_mode": "preview",
            "is_verified_gst": False,
            "destination_state": "Telangana",
            "destination_state_code": "36",
            "supply_type": "intra",
            "is_intra_state": True,
            "subtotal": 499.0,
            "taxable_value": 475.24,
            "cgst_amount": 11.88,
            "sgst_amount": 11.88,
            "igst_amount": 0.0,
            "total_gst": 23.76,
            "delivery_charges": 0.0,
            "discount_amount": 0.0,
            "total_payable": 499.0,
            "items": [
                {
                    "product_name": "Cotton Crew T-Shirt",
                    "sku": "APP-TSH-001",
                    "hsn": "6109",
                    "quantity": 1,
                    "unit_price": 499.0,
                    "gross_amount": 499.0,
                    "taxable_value": 475.24,
                    "gst_rate": 5.0,
                    "cgst_rate": 2.5,
                    "cgst_amount": 11.88,
                    "sgst_rate": 2.5,
                    "sgst_amount": 11.88,
                    "igst_rate": 0.0,
                    "igst_amount": 0.0,
                    "total_tax": 23.76,
                }
            ],
            "slabs_summary": [],
        }

        snap_order = Order(
            id="ORD-SNAP-02",
            customer="Sneha Patel",
            customer_email="sneha@example.com",
            amount=499.00,
        )
        snap_order.tax_snapshot = snapshot
        snap_order.items.append(OrderItem(product_name="Cotton Crew T-Shirt", quantity=1, price=499))

        snap_pdf_bio = build_invoice_pdf(snap_order)
        snap_reader = pypdf.PdfReader(snap_pdf_bio)
        snap_text = "".join([p.extract_text() for p in snap_reader.pages])

        # Must be marked as Recorded Order-Time Snapshot (Immutable)
        self.assertIn("Recorded Order-Time Snapshot (Immutable)", snap_text)

    def test_supply_type_determination(self):
        # Telangana -> Telangana = intra
        self.assertEqual(determine_supply_type("Telangana", "Telangana"), "intra")
        self.assertEqual(determine_supply_type("Telangana", "Hyderabad, Telangana"), "intra")
        self.assertEqual(determine_supply_type("Telangana", "TG"), "intra")

        # Telangana -> Karnataka / Maharashtra = inter
        self.assertEqual(determine_supply_type("Telangana", "Karnataka"), "inter")
        self.assertEqual(determine_supply_type("Telangana", "Maharashtra"), "inter")
        self.assertEqual(determine_supply_type("Telangana", "Delhi"), "inter")

    def test_telangana_to_telangana_intra_state_single_item(self):
        # 1 item: Cotton Crew T-Shirt (₹499 inclusive @ 5%)
        items = [{"productName": "Cotton Crew T-Shirt", "quantity": 1, "price": 499}]
        res = calculate_order_tax_breakdown(items, destination_state="Telangana")

        self.assertTrue(res["is_intra_state"])
        self.assertEqual(res["supply_type"], "intra")
        self.assertEqual(res["subtotal"], 499.00)
        self.assertEqual(res["total_payable"], 499.00)

        # Taxable: 499 / 1.05 = 475.24
        self.assertEqual(res["taxable_value"], 475.24)
        # Total GST: 499 - 475.24 = 23.76
        self.assertEqual(res["total_gst"], 23.76)
        # Split: 50% CGST (11.88) + 50% SGST (11.88)
        self.assertEqual(res["cgst_amount"], 11.88)
        self.assertEqual(res["sgst_amount"], 11.88)
        self.assertEqual(res["igst_amount"], 0.00)
        # Zero 1-paisa discrepancy check
        self.assertEqual(round(res["taxable_value"] + res["cgst_amount"] + res["sgst_amount"], 2), 499.00)

    def test_telangana_to_karnataka_inter_state_single_item(self):
        # 1 item: Cotton Crew T-Shirt (₹499 inclusive @ 5%) to Bengaluru, Karnataka
        items = [{"productName": "Cotton Crew T-Shirt", "quantity": 1, "price": 499}]
        res = calculate_order_tax_breakdown(items, destination_state="Karnataka")

        self.assertFalse(res["is_intra_state"])
        self.assertEqual(res["supply_type"], "inter")
        self.assertEqual(res["subtotal"], 499.00)
        self.assertEqual(res["total_payable"], 499.00)

        self.assertEqual(res["taxable_value"], 475.24)
        self.assertEqual(res["cgst_amount"], 0.00)
        self.assertEqual(res["sgst_amount"], 0.00)
        self.assertEqual(res["igst_amount"], 23.76)
        self.assertEqual(res["total_gst"], 23.76)
        self.assertEqual(round(res["taxable_value"] + res["igst_amount"], 2), 499.00)

    def test_mixed_gst_rates_multi_product_cart(self):
        # Cart with items:
        # 1 x T-Shirt (₹499 @ 5%)
        # 1 x Denim Jeans (₹1,799 @ 5% under Notification 09/2025 <= Rs. 2,500)
        # 1 x Earbuds (₹2,999 @ 18%)
        items = [
            {"productName": "Cotton Crew T-Shirt", "quantity": 1, "price": 499},
            {"productName": "Slim Fit Denim Jeans", "quantity": 1, "price": 1799},
            {"productName": "Wireless Earbuds Pro", "quantity": 1, "price": 2999},
        ]
        # Gross = 499 + 1799 + 2999 = 5297.00
        res = calculate_order_tax_breakdown(items, destination_state="Telangana")

        self.assertEqual(res["subtotal"], 5297.00)
        self.assertEqual(res["total_payable"], 5297.00)

        # Item 1: 499 @ 5% -> Taxable 475.24, GST 23.76 (CGST 11.88, SGST 11.88)
        # Item 2: 1799 @ 5% -> Taxable 1713.33, GST 85.67 (CGST 42.84, SGST 42.83)
        # Item 3: 2999 @ 18% -> Taxable 2541.53, GST 457.47 (CGST 228.74, SGST 228.73)
        # Total Taxable = 475.24 + 1713.33 + 2541.53 = 4730.10
        # Total CGST = 11.88 + 42.84 + 228.74 = 283.46
        # Total SGST = 11.88 + 42.83 + 228.73 = 283.44
        # Total Taxes = 566.90
        self.assertEqual(res["taxable_value"], 4730.10)
        self.assertEqual(res["cgst_amount"], 283.46)
        self.assertEqual(res["sgst_amount"], 283.44)
        self.assertEqual(round(res["cgst_amount"] + res["sgst_amount"], 2), 566.90)
        self.assertEqual(round(res["taxable_value"] + res["total_gst"], 2), 5297.00)

    def test_quantity_update_proportionality(self):
        # 2 x T-Shirts = 998.00
        items = [{"productName": "Cotton Crew T-Shirt", "quantity": 2, "price": 499}]
        res = calculate_order_tax_breakdown(items, destination_state="Telangana")
        self.assertEqual(res["total_payable"], 998.00)
        self.assertEqual(res["taxable_value"], 950.48)
        self.assertEqual(res["total_gst"], 47.52)
        self.assertEqual(round(res["taxable_value"] + res["total_gst"], 2), 998.00)

    def test_quote_api_endpoint(self):
        client = self.app.test_client()
        resp = client.post(
            "/api/orders?quote=true",
            json={
                "items": [{"productName": "Cotton Crew T-Shirt", "quantity": 1, "price": 499}],
                "destinationState": "Karnataka",
            },
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertEqual(data["supply_type"], "inter")
        self.assertEqual(data["igst_amount"], 23.76)
        self.assertEqual(data["cgst_amount"], 0.0)
        self.assertEqual(data["total_payable"], 499.00)


if __name__ == "__main__":
    unittest.main()
