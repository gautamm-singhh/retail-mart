"""
Comprehensive Unit Tests for Retail Mart Multi-Sender Email System
Tests sender routing, authentication error handling, dev fallback,
zero-secret leakage, Jinja2 HTML templates, bulk campaign delivery,
and communications API validation.
Does NOT require live Gmail credentials — uses unittest.mock.
"""

import os
import json
import unittest
from unittest.mock import patch, MagicMock
import smtplib

from app import create_app
from app.utils.email import (
    send_email,
    send_bulk_email,
    test_smtp_connection,
    test_single_sender_smtp,
    _get_sender_config,
    welcome_email,
    order_confirmation_email,
    receipt_email,
    shipment_tracking_email,
    shipment_shipped_email,
    shipment_arrived_email,
    shipment_out_for_delivery_email,
    shipment_delivered_email,
    shipment_thank_you_email,
    campaign_email,
)


class DummyUser:
    def __init__(self, name="Ananya Rao", email="ananya.rao@example.com"):
        self.name = name
        self.email = email


class DummyOrderItem:
    def __init__(self, product_name="Wireless Headphones", quantity=2, price=1499.0):
        self.product_name = product_name
        self.quantity = quantity
        self.price = price


class DummyOrder:
    def __init__(self):
        self.id = "ORD-TEST-001"
        self.customer = "Ananya Rao"
        self.customer_email = "ananya.rao@example.com"
        self.amount = 2998.0
        self.status = "Confirmed"
        self.created_at = None
        self.items = [DummyOrderItem()]


class DummyPayment:
    def __init__(self):
        self.id = "PAY-TEST-001"
        self.order_id = "ORD-TEST-001"
        self.customer = "Ananya Rao"
        self.amount = 2998.0
        self.method = "RazorPay UPI"
        self.date = None


class DummyShipment:
    def __init__(self):
        self.id = "SHP-TEST-001"
        self.order_id = "ORD-TEST-001"
        self.customer = "Ananya Rao"
        self.courier = "BlueDart Express"
        self.tracking_number = "BD987654321"
        self.status = "Shipped"
        self.expected_delivery = None


class DummyCampaign:
    def __init__(self):
        self.id = "CMP-TEST-001"
        self.name = "Diwali Mega Sale"
        self.code = "DIWALI50"
        self.description = "Celebrate with up to 50% off sitewide!"
        self.discount_value = 50
        self.discount_type = "percentage"
        self.min_purchase = 999.0
        self.end_date = None


class TestMultiSenderEmailSystem(unittest.TestCase):

    def setUp(self):
        self.app = create_app("testing")
        self.app_context = self.app.app_context()
        self.app_context.push()

    def tearDown(self):
        self.app_context.pop()

    @patch("app.utils.email._get_smtp_connection")
    @patch.dict(os.environ, {
        "SMTP_HOST": "smtp.gmail.com",
        "SMTP_PORT": "587",
        "SMTP_SUPPORT_USERNAME": "support.user@gmail.com",
        "SMTP_SUPPORT_PASSWORD": "support-secret-app-pwd",
        "MAIL_SUPPORT_FROM": "Retail Mart Support <retailmart.support@gmail.com>",
    })
    def test_support_sender_selection(self, mock_get_conn):
        mock_server = MagicMock()
        mock_get_conn.return_value.__enter__.return_value = mock_server

        success = send_email(
            to="customer@example.com",
            subject="Welcome Test",
            body="Welcome text body",
            sender="support",
        )

        self.assertTrue(success)
        mock_server.login.assert_called_once_with("support.user@gmail.com", "support-secret-app-pwd")
        sent_msg = mock_server.send_message.call_args[0][0]
        self.assertEqual(sent_msg["From"], "Retail Mart Support <retailmart.support@gmail.com>")
        self.assertEqual(sent_msg["To"], "customer@example.com")
        self.assertEqual(sent_msg["Subject"], "Welcome Test")

    @patch("app.utils.email._get_smtp_connection")
    @patch.dict(os.environ, {
        "SMTP_HOST": "smtp.gmail.com",
        "SMTP_PORT": "587",
        "SMTP_ORDERS_USERNAME": "orders.user@gmail.com",
        "SMTP_ORDERS_PASSWORD": "orders-secret-app-pwd",
        "MAIL_ORDERS_FROM": "Retail Mart Orders <retailmart.orders@gmail.com>",
    })
    def test_orders_sender_selection(self, mock_get_conn):
        mock_server = MagicMock()
        mock_get_conn.return_value.__enter__.return_value = mock_server

        success = send_email(
            to="customer@example.com",
            subject="Order Confirmed",
            body="Your order is confirmed",
            sender="orders",
        )

        self.assertTrue(success)
        mock_server.login.assert_called_once_with("orders.user@gmail.com", "orders-secret-app-pwd")
        sent_msg = mock_server.send_message.call_args[0][0]
        self.assertEqual(sent_msg["From"], "Retail Mart Orders <retailmart.orders@gmail.com>")
        self.assertEqual(sent_msg["To"], "customer@example.com")

    @patch("app.utils.email._get_smtp_connection")
    @patch.dict(os.environ, {
        "SMTP_HOST": "smtp.gmail.com",
        "SMTP_PORT": "587",
        "SMTP_MARKETING_USERNAME": "marketing.user@gmail.com",
        "SMTP_MARKETING_PASSWORD": "marketing-secret-app-pwd",
        "MAIL_MARKETING_FROM": "Retail Mart Marketing <retailmart.marketing@gmail.com>",
    })
    def test_marketing_sender_selection(self, mock_get_conn):
        mock_server = MagicMock()
        mock_get_conn.return_value.__enter__.return_value = mock_server

        success = send_email(
            to="customer@example.com",
            subject="Mega Sale",
            body="Promotional blast",
            sender="marketing",
        )

        self.assertTrue(success)
        mock_server.login.assert_called_once_with("marketing.user@gmail.com", "marketing-secret-app-pwd")
        sent_msg = mock_server.send_message.call_args[0][0]
        self.assertEqual(sent_msg["From"], "Retail Mart Marketing <retailmart.marketing@gmail.com>")

    @patch("app.utils.email._get_smtp_connection")
    @patch.dict(os.environ, {
        "SMTP_HOST": "smtp.gmail.com",
        "SMTP_PORT": "587",
        "SMTP_MARKETING_USERNAME": "marketing.user@gmail.com",
        "SMTP_MARKETING_PASSWORD": "marketing-secret-app-pwd",
        "MAIL_MARKETING_FROM": "Retail Mart Marketing <retailmart.marketing@gmail.com>",
    })
    def test_campaign_bulk_sender_routing(self, mock_get_conn):
        mock_server = MagicMock()
        mock_get_conn.return_value.__enter__.return_value = mock_server

        recipients = ["cust1@example.com", "cust2@example.com", "cust3@example.com"]
        sent_count = send_bulk_email(
            recipients=recipients,
            subject="Festival Blast",
            body="Enjoy 50% discount",
            sender="marketing",
        )

        self.assertEqual(sent_count, 3)
        mock_server.login.assert_called_once_with("marketing.user@gmail.com", "marketing-secret-app-pwd")
        self.assertEqual(mock_server.send_message.call_count, 3)

    def test_missing_sender_configuration_dev_fallback(self):
        # When unconfigured, send_email returns failure with stage='unconfigured' without crashing
        with patch.dict(os.environ, {
            "SMTP_HOST": "",
            "SMTP_SUPPORT_USERNAME": "",
            "SMTP_SUPPORT_PASSWORD": "",
            "SMTP_ORDERS_USERNAME": "",
            "SMTP_ORDERS_PASSWORD": "",
            "SMTP_MARKETING_USERNAME": "",
            "SMTP_MARKETING_PASSWORD": "",
            "SMTP_USERNAME": "",
            "SMTP_PASSWORD": "",
        }, clear=True):
            self.app.config["SMTP_HOST"] = None
            self.app.config["SMTP_USERNAME"] = None
            self.app.config["SMTP_PASSWORD"] = None
            self.app.config["SMTP_SUPPORT_USERNAME"] = None
            self.app.config["SMTP_SUPPORT_PASSWORD"] = None
            self.app.config["SMTP_ORDERS_USERNAME"] = None
            self.app.config["SMTP_ORDERS_PASSWORD"] = None
            self.app.config["SMTP_MARKETING_USERNAME"] = None
            self.app.config["SMTP_MARKETING_PASSWORD"] = None

            res = send_email("test@example.com", "Dev Subj", "Dev Body", sender="support")
            self.assertFalse(res)
            self.assertEqual(res["stage"], "unconfigured")
            self.assertFalse(res["success"])
            self.assertFalse(res["sent"])

            bulk_sent = send_bulk_email(["a@test.com", "b@test.com"], "Subj", "Body", sender="marketing")
            self.assertEqual(bulk_sent, 0)

            # Status check gracefully indicates dev mode
            status = test_smtp_connection()
            self.assertFalse(status["configured"])
            self.assertFalse(status["connected"])
            self.assertEqual(status["status"], "Dev Mode (Console Logging)")

    @patch("app.utils.email._get_smtp_connection")
    @patch.dict(os.environ, {
        "SMTP_HOST": "smtp.gmail.com",
        "SMTP_PORT": "587",
        "SMTP_SUPPORT_USERNAME": "support@retailmart.dev",
        "SMTP_SUPPORT_PASSWORD": "wrong-password",
    })
    def test_smtp_authentication_failure_handled_gracefully(self, mock_get_conn):
        mock_server = MagicMock()
        mock_server.login.side_effect = smtplib.SMTPAuthenticationError(535, b"Authentication failed")
        mock_get_conn.return_value.__enter__.return_value = mock_server

        # send_email must return False and capture stage='login' without unhandled exception
        result = send_email("test@example.com", "Subj", "Body", sender="support")
        self.assertFalse(result)
        self.assertFalse(result["success"])
        self.assertEqual(result["stage"], "login")
        self.assertIn("SMTPAuthenticationError", result["error"])

        # Diagnostics must capture auth failure without exposing passwords
        diag = test_single_sender_smtp("support")
        self.assertTrue(diag["configured"])
        self.assertFalse(diag["connected"])
        self.assertEqual(diag["status"], "Authentication Failed")
        self.assertEqual(diag["connectionResult"], "failed")

    @patch("app.utils.email._get_smtp_connection")
    @patch.dict(os.environ, {
        "SMTP_HOST": "smtp.gmail.com",
        "SMTP_PORT": "587",
        "SMTP_SUPPORT_USERNAME": "support@retailmart.dev",
        "SMTP_SUPPORT_PASSWORD": "valid-password",
    })
    def test_successful_smtp_submission_returns_structured_result(self, mock_get_conn):
        mock_server = MagicMock()
        mock_server.send_message.return_value = {}  # Empty dict indicates all recipients accepted
        mock_get_conn.return_value.__enter__.return_value = mock_server

        result = send_email("customer@example.com", "Subject", "Body", sender="support")
        self.assertTrue(result)
        self.assertTrue(result["success"])
        self.assertTrue(result["sent"])
        self.assertEqual(result["stage"], "send")
        self.assertEqual(result["refused_recipients"], [])
        self.assertTrue(result["message_id"].startswith("<") and result["message_id"].endswith(">"))
        self.assertIn("accepted", result["message"].lower())

    @patch("app.utils.email._get_smtp_connection")
    @patch.dict(os.environ, {
        "SMTP_HOST": "smtp.gmail.com",
        "SMTP_PORT": "587",
        "SMTP_SUPPORT_USERNAME": "support@retailmart.dev",
        "SMTP_SUPPORT_PASSWORD": "valid-password",
    })
    def test_refused_recipient_detected_in_result(self, mock_get_conn):
        mock_server = MagicMock()
        # Mock send_message returning refused recipient dict
        mock_server.send_message.return_value = {"bad_recipient@example.com": (550, b"User not found")}
        mock_get_conn.return_value.__enter__.return_value = mock_server

        result = send_email("bad_recipient@example.com", "Subject", "Body", sender="support")
        self.assertFalse(result)
        self.assertFalse(result["success"])
        self.assertFalse(result["sent"])
        self.assertEqual(result["stage"], "send")
        self.assertEqual(result["refused_recipients"], ["bad_recipient@example.com"])
        self.assertEqual(result["error"], "RecipientsRefused")

    @patch.dict(os.environ, {
        "SMTP_HOST": "smtp.gmail.com",
        "SMTP_PORT": "587",
        "SMTP_SUPPORT_USERNAME": "support@retailmart.dev",
        "SMTP_SUPPORT_PASSWORD": "SUPER_SECRET_APP_PASSWORD_ABC_123",
        "SMTP_ORDERS_USERNAME": "orders@retailmart.dev",
        "SMTP_ORDERS_PASSWORD": "SUPER_SECRET_APP_PASSWORD_DEF_456",
        "SMTP_MARKETING_USERNAME": "marketing@retailmart.dev",
        "SMTP_MARKETING_PASSWORD": "SUPER_SECRET_APP_PASSWORD_GHI_789",
    })
    def test_no_secret_leakage_in_diagnostics(self):
        # Diagnostic report must NEVER leak passwords
        with patch("app.utils.email._get_smtp_connection") as mock_conn:
            mock_server = MagicMock()
            mock_conn.return_value.__enter__.return_value = mock_server

            report = test_smtp_connection()
            serialized = json.dumps(report)

            self.assertNotIn("SUPER_SECRET_APP_PASSWORD_ABC_123", serialized)
            self.assertNotIn("SUPER_SECRET_APP_PASSWORD_DEF_456", serialized)
            self.assertNotIn("SUPER_SECRET_APP_PASSWORD_GHI_789", serialized)
            self.assertIn("support", report)
            self.assertIn("orders", report)
            self.assertIn("marketing", report)

    def test_html_and_text_template_generation_all_templates(self):
        user = DummyUser()
        order = DummyOrder()
        payment = DummyPayment()
        shipment = DummyShipment()
        campaign = DummyCampaign()

        templates = [
            ("welcome_email", welcome_email(user)),
            ("order_confirmation_email", order_confirmation_email(order)),
            ("receipt_email", receipt_email(payment)),
            ("shipment_tracking_email", shipment_tracking_email(shipment)),
            ("shipment_shipped_email", shipment_shipped_email(shipment)),
            ("shipment_arrived_email", shipment_arrived_email(shipment, "Bengaluru Hub")),
            ("shipment_out_for_delivery_email", shipment_out_for_delivery_email(shipment)),
            ("shipment_delivered_email", shipment_delivered_email(shipment)),
            ("shipment_thank_you_email", shipment_thank_you_email(shipment)),
            ("campaign_email", campaign_email(campaign)),
        ]

        for name, result in templates:
            self.assertEqual(len(result), 3, f"{name} did not return a 3-tuple")
            subject, text_body, html_body = result

            self.assertTrue(subject and len(subject) > 0, f"{name}: subject is empty")
            self.assertTrue(text_body and len(text_body) > 0, f"{name}: text_body is empty")
            self.assertTrue(html_body and len(html_body) > 0, f"{name}: html_body is empty")

            self.assertIn("<!DOCTYPE html>", html_body, f"{name}: missing DOCTYPE")
            self.assertIn("Retail", html_body, f"{name}: missing Retail branding")
            self.assertIn("</html>", html_body, f"{name}: missing closing html tag")

            # Check no password or OTP leak in template outputs
            self.assertNotIn("password123", html_body.lower())
            self.assertNotIn("otp_code", html_body.lower())

        # Specific assertion for thank_you_email: must NOT contain developer names
        _, ty_text, ty_html = shipment_thank_you_email(shipment)
        self.assertNotIn("Gautam Singh", ty_text, "Developer name found in thank-you email text!")
        self.assertNotIn("Gautam Singh", ty_html, "Developer name found in thank-you email HTML!")
        self.assertIn("Retail Mart Support Team", ty_text)
        self.assertIn("Retail Mart Support Team", ty_html)


class TestCommunicationsEndpoints(unittest.TestCase):

    def setUp(self):
        self.app = create_app("testing")
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()

        # Generate a test admin token
        from flask_jwt_extended import create_access_token
        with self.app.app_context():
            self.admin_token = create_access_token(
                identity="admin-test-id",
                additional_claims={"role": "Admin", "email": "admin@retailmart.dev"},
            )

    def tearDown(self):
        self.app_context.pop()

    def test_send_generic_email_rejects_invalid_sender(self):
        headers = {"Authorization": f"Bearer {self.admin_token}", "Content-Type": "application/json"}
        res = self.client.post(
            "/api/communications/send",
            headers=headers,
            json={"to": "test@example.com", "subject": "Hi", "body": "Msg", "sender": "unauthorized_sender"},
        )
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertIn("sender must be one of", data["error"])

    @patch("app.routes.communications.send_email", return_value=True)
    def test_send_generic_email_accepts_valid_sender(self, mock_send):
        headers = {"Authorization": f"Bearer {self.admin_token}", "Content-Type": "application/json"}
        for valid_sender in ("support", "orders", "marketing"):
            res = self.client.post(
                "/api/communications/send",
                headers=headers,
                json={"to": "test@example.com", "subject": "Hi", "body": "Msg", "sender": valid_sender},
            )
            self.assertEqual(res.status_code, 200)
            data = res.get_json()
            self.assertTrue(data["sent"])
            self.assertEqual(data["sender"], valid_sender)

    @patch("app.utils.email._get_smtp_connection")
    def test_get_smtp_status_endpoint(self, mock_conn):
        mock_server = MagicMock()
        mock_conn.return_value.__enter__.return_value = mock_server

        headers = {"Authorization": f"Bearer {self.admin_token}"}
        res = self.client.get("/api/communications/smtp-status", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()

        self.assertIn("support", data)
        self.assertIn("orders", data)
        self.assertIn("marketing", data)
        self.assertIn("configured", data)
        self.assertIn("connected", data)
        self.assertIn("requiredEnvVars", data)

        # Zero passwords anywhere in response
        serialized = json.dumps(data)
        self.assertNotIn("password", serialized.lower().replace("requiredenvvars", "").replace("smtp_support_password", "").replace("smtp_orders_password", "").replace("smtp_marketing_password", ""))


if __name__ == "__main__":
    unittest.main()
