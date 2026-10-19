"""
Automated regression tests for Retail Mart Payment Receipt PDF generation.
Verifies:
  1. build_receipt_pdf generates valid A4 PDF with real transaction data.
  2. Header, Status Badge (PAYMENT SUCCESSFUL), Amount Paid card, 2-column details.
  3. Purchased items breakdown when linked order items exist.
  4. Clean single-page composition without awkward whitespace or text overlap.
  5. Long values (names, IDs, emails) wrap gracefully.
  6. Endpoint GET /api/payments/<id>/receipt returns 200 application/pdf for Paid payments.
"""

import unittest
from datetime import date, datetime
from io import BytesIO
import pypdf

from app import create_app
from app.models.payment import Payment, Receipt
from app.utils.pdf import build_receipt_pdf


class FakeItem:
    def __init__(self, name, qty, price):
        self.product_name = name
        self.quantity = qty
        self.price = price


class FakeOrder:
    def __init__(self, items, customer_email="customer@example.com"):
        self.id = "ORD-TEST-1001"
        self.customer_email = customer_email
        self.items = items


class FakePayment:
    def __init__(self, customer="Pooja Verma", amount=3499.00, method="Razorpay UPI", status="Paid", items=None):
        self.id = "PAY-TEST-9901"
        self.order_id = "ORD-TEST-1001"
        self.customer = customer
        self.amount = amount
        self.method = method
        self.status = status
        self.date = date(2026, 9, 20)
        self.order = FakeOrder(items) if items is not None else None


class FakeReceipt:
    def __init__(self, receipt_no="RCPT-882211", amount=3499.00):
        self.receipt_no = receipt_no
        self.amount = amount
        self.issued_at = datetime(2026, 9, 20, 14, 45)



class TestPaymentReceiptPdf(unittest.TestCase):
    def test_build_receipt_pdf_with_items(self):
        items = [
            FakeItem("Noise-Cancelling Headphones", 1, 2999.00),
            FakeItem("USB-C Fast Charging Cable", 1, 500.00),
        ]
        payment = FakePayment(items=items)
        receipt = FakeReceipt()

        buf = build_receipt_pdf(payment, receipt)
        self.assertIsInstance(buf, BytesIO)
        pdf_bytes = buf.getvalue()
        self.assertGreater(len(pdf_bytes), 1000)

        reader = pypdf.PdfReader(BytesIO(pdf_bytes))
        self.assertEqual(len(reader.pages), 1, "Receipt should fit on a single A4 page")

        text = reader.pages[0].extract_text()
        self.assertIn("Retail Mart", text)
        self.assertIn("PAYMENT RECEIPT — TAX PREVIEW", text)
        self.assertTrue("PAYMENT SUCCESSFUL" in text or "TEST PAYMENT VERIFIED" in text)
        self.assertIn("RCPT-882211", text)
        self.assertIn("Pooja Verma", text)
        self.assertIn("ORD-TEST-1001", text)
        self.assertIn("PAY-TEST-9901", text)
        self.assertIn("Razorpay UPI", text)
        self.assertIn("3,499.00", text)
        self.assertIn("Noise-Cancelling Headphones", text)
        self.assertIn("USB-C Fast Charging Cable", text)
        self.assertTrue("Payment Confirmed & Verified" in text or "Test Payment Verified" in text)
        self.assertIn("support@retailmart.dev", text)

    def test_build_receipt_pdf_standalone_without_items(self):
        payment = FakePayment(items=None)
        receipt = FakeReceipt()

        buf = build_receipt_pdf(payment, receipt)
        reader = pypdf.PdfReader(buf)
        self.assertEqual(len(reader.pages), 1)

        text = reader.pages[0].extract_text()
        self.assertIn("Retail Mart", text)
        self.assertTrue("PAYMENT SUCCESSFUL" in text or "TEST PAYMENT VERIFIED" in text)
        self.assertIn("3,499.00", text)

    def test_build_receipt_pdf_long_values_wrap_safely(self):
        long_customer = "Dr. Siddhartha Gautama Venkatanarasimharajuvaripeta Sharma III"
        long_items = [
            FakeItem("Ultra-Wide 34-Inch Curved Gaming Monitor with HDR400 and USB-C Power Delivery Hub", 1, 65000.00),
            FakeItem("Mechanical Ergonomic Wireless Keyboard RGB Backlit with Wrist Rest", 2, 4999.00),
        ]
        payment = FakePayment(customer=long_customer, amount=74998.00, items=long_items)
        receipt = FakeReceipt(receipt_no="RCPT-SUPER-LONG-IDENTIFIER-9999", amount=74998.00)

        buf = build_receipt_pdf(payment, receipt)
        reader = pypdf.PdfReader(buf)
        self.assertEqual(len(reader.pages), 1, "Long values must wrap safely without spilling to page 2")

        text = reader.pages[0].extract_text()
        self.assertIn("Sharma III", text)
        self.assertIn("74,998.00", text)

    def test_receipt_download_api_endpoint(self):
        app = create_app()
        client = app.test_client()

        # Login as admin to get token
        login_resp = client.post(
            "/api/auth/login",
            json={"email": "gautam@retailmart.dev", "password": "password123"},
        )
        self.assertEqual(login_resp.status_code, 200)
        token = login_resp.get_json()["accessToken"]
        headers = {"Authorization": f"Bearer {token}"}

        # Query paid payments
        payments_resp = client.get("/api/payments?status=Paid", headers=headers)
        self.assertEqual(payments_resp.status_code, 200)
        payments = payments_resp.get_json()
        self.assertGreater(len(payments), 0)

        paid_payment = payments[0]
        receipt_resp = client.get(f"/api/payments/{paid_payment['id']}/receipt", headers=headers)
        self.assertEqual(receipt_resp.status_code, 200)
        self.assertEqual(receipt_resp.mimetype, "application/pdf")
        content_disp = receipt_resp.headers.get("Content-Disposition", "")
        self.assertIn("filename=", content_disp)
        self.assertIn(".pdf", content_disp)
        self.assertIn("RCPT-", content_disp, f"Content-Disposition should contain receipt number (RCPT-), got {content_disp}")

        reader = pypdf.PdfReader(BytesIO(receipt_resp.data))
        self.assertEqual(len(reader.pages), 1)
        text = reader.pages[0].extract_text()
        self.assertIn("Retail Mart", text)
        self.assertIn("PAYMENT RECEIPT — TAX PREVIEW", text)
        self.assertIn(paid_payment["customer"], text)

    def test_tax_reconciliation_exact_decimal_arithmetic(self):
        """Verify Excel Image 1 style reverse tax calculation: Value + Taxes == Total exactly."""
        # Glasses @18% GST: 1199 MRP -> 1016.10 taxable + 182.90 GST = 1199.00
        items = [
            FakeItem("Polarized Aviator Sunglasses", 1, 1199.00),
            FakeItem("Heavy Resistance Loop Bands (5-Pack)", 1, 599.00),
        ]
        payment = FakePayment(amount=1798.00, items=items)
        receipt = FakeReceipt(receipt_no="RCPT-094447", amount=1798.00)

        buf = build_receipt_pdf(payment, receipt)
        reader = pypdf.PdfReader(buf)
        self.assertEqual(len(reader.pages), 1)
        text = reader.pages[0].extract_text()

        self.assertIn("RCPT-094447", text)
        self.assertIn("Polarized Aviator Sunglasses", text)
        self.assertIn("1,016.10", text)
        self.assertIn("182.90", text)
        self.assertIn("1,199.00", text)
        self.assertIn("1,798.00", text)
        self.assertIn("Payment Receipt — Tax Preview", text)

    def test_order_time_tax_snapshot_priority(self):
        """Verify immutable order-time tax snapshot is prioritized when present on the order."""
        fake_snapshot = {
            "items": [
                {
                    "product_name": "Historic Snapshot Product",
                    "quantity": 2,
                    "taxable_value": 800.00,
                    "total_tax": 100.00,
                    "gross_amount": 900.00,
                }
            ],
            "total_taxable": 800.00,
            "total_cgst": 50.00,
            "total_sgst": 50.00,
            "total_igst": 0.00,
            "total_tax": 100.00,
            "total_payable": 900.00,
            "is_intra_state": True,
            "destination_state": "Telangana",
            "discount_amount": 0.00,
            "delivery_fee": 0.00,
        }
        order = FakeOrder(items=[FakeItem("Historic Snapshot Product", 2, 450.00)])
        order.tax_snapshot = fake_snapshot
        payment = FakePayment(amount=900.00)
        payment.order = order
        receipt = FakeReceipt(receipt_no="RCPT-SNAP-12345", amount=900.00)

        buf = build_receipt_pdf(payment, receipt)
        reader = pypdf.PdfReader(buf)
        text = reader.pages[0].extract_text()

        self.assertIn("Historic Snapshot Product", text)
        self.assertIn("800.00", text)
        self.assertIn("100.00", text)
        self.assertIn("900.00", text)


if __name__ == "__main__":
    unittest.main()
