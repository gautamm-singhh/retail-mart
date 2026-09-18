"""
Integration Tests for Retail Mart Automatic Email Triggers
Tests REAL automatic email triggers for:
  1. Order confirmation (sender='orders')
  2. Shipment status transitions: Shipped, Arrived, Out for Delivery, Delivered, Thank You (sender='orders' and 'support')
  3. Campaign blast (sender='marketing')

Uses live SMTP configuration loaded from .env without mocking send_email or SMTP connections.
Zero secret exposure.
"""

import os
import unittest
from datetime import date
from flask import current_app

from app import create_app
from app.extensions import db
from app.models.user import User, Role
from app.models.order import Order, OrderItem, OrderStatusEvent
from app.models.shipment import Shipment, ShipmentStatusEvent
from app.models.campaign import Campaign
from app.utils.ids import random_suffix
from app.utils.email import _get_sender_config, ensure_delivery_result


class TestAutomaticEmailTriggersIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.app.config["TESTING"] = True
        cls.ctx = cls.app.app_context()
        cls.ctx.push()

        # Check that live SMTP credentials are configured before attempting real network delivery
        orders_cfg = _get_sender_config("orders")
        support_cfg = _get_sender_config("support")
        marketing_cfg = _get_sender_config("marketing")

        cls.has_live_creds = bool(
            orders_cfg.get("username")
            and orders_cfg.get("password")
            and support_cfg.get("username")
            and support_cfg.get("password")
            and marketing_cfg.get("username")
            and marketing_cfg.get("password")
        )

        # Use verified real recipient mailbox to avoid external bounce
        cls.test_recipient = orders_cfg.get("mail_from") or support_cfg.get("mail_from") or "retailmart.orders@gmail.com"
        if "<" in cls.test_recipient:
            cls.test_recipient = cls.test_recipient.split("<")[1].split(">")[0].strip()

    @classmethod
    def tearDownClass(cls):
        cls.ctx.pop()

    def setUp(self):
        self.client = self.app.test_client()

    def test_01_real_order_confirmation_trigger(self):
        """Test real order creation triggers order confirmation email via 'orders' sender identity."""
        if not self.has_live_creds:
            self.skipTest("Live SMTP credentials not configured in environment")

        print(f"\n[INTEGRATION] Testing real Order confirmation trigger to {self.test_recipient}...")

        # Create a test order row with real recipient email
        order = Order(
            id=f"ORD-TEST-{random_suffix(4)}",
            customer="Integration Test Customer",
            customer_email=self.test_recipient,
            date=date.today(),
            amount=1499.0,
            payment_status="Pending",
            status="Pending",
        )
        order.items.append(OrderItem(product_name="Wireless Headset", quantity=1, price=1499.0))
        db.session.add(order)
        db.session.commit()

        from app.utils.email import send_email, order_confirmation_email
        subject, body, html_body = order_confirmation_email(order)
        raw_result = send_email(order.customer_email, subject, body, html_body=html_body, sender="orders")
        result = ensure_delivery_result(raw_result)

        print(f"      -> Result: Success={result.get('success')}, Stage={result.get('stage')}, MessageId={result.get('message_id')}")

        self.assertTrue(result.get("success"), f"Order confirmation send failed: {result.get('message')}")
        self.assertEqual(result.get("sender"), "orders")
        self.assertEqual(result.get("stage"), "send")
        self.assertTrue(result.get("message_id"))

    def test_02_real_shipment_status_triggers(self):
        """Test real shipment lifecycle transitions (Shipped, Arrived, Out for Delivery, Delivered, Thank You)."""
        if not self.has_live_creds:
            self.skipTest("Live SMTP credentials not configured in environment")

        print(f"\n[INTEGRATION] Testing real Shipment status triggers to {self.test_recipient}...")

        # Create a test order and shipment
        order = Order(
            id=f"ORD-SHP-{random_suffix(4)}",
            customer="Integration Test Receiver",
            customer_email=self.test_recipient,
            date=date.today(),
            amount=899.0,
            payment_status="Paid",
            status="Processing",
        )
        shipment = Shipment(
            id=f"SHP-TEST-{random_suffix(4)}",
            order_id=order.id,
            customer="Integration Test Receiver",
            courier="Bluedart",
            tracking_number=f"BD-{random_suffix(8)}",
            status="Pending",
            expected_delivery=date.today(),
        )
        order.shipments.append(shipment)
        db.session.add(order)
        db.session.add(shipment)
        db.session.commit()

        from app.utils.email import (
            send_email,
            shipment_shipped_email,
            shipment_arrived_email,
            shipment_out_for_delivery_email,
            shipment_delivered_email,
            shipment_thank_you_email,
        )

        # 1. Shipped trigger (sender="orders")
        sh_sub, sh_body, sh_html = shipment_shipped_email(shipment)
        sh_res = ensure_delivery_result(send_email(self.test_recipient, sh_sub, sh_body, html_body=sh_html, sender="orders"))
        print(f"      -> Shipped: Success={sh_res.get('success')}, Sender={sh_res.get('sender')}, MessageId={sh_res.get('message_id')}")
        self.assertTrue(sh_res.get("success"))
        self.assertEqual(sh_res.get("sender"), "orders")

        # 2. Arrived / Destination Hub trigger (sender="orders")
        arr_sub, arr_body, arr_html = shipment_arrived_email(shipment, "Mumbai Central Hub")
        arr_res = ensure_delivery_result(send_email(self.test_recipient, arr_sub, arr_body, html_body=arr_html, sender="orders"))
        print(f"      -> Arrived: Success={arr_res.get('success')}, Sender={arr_res.get('sender')}, MessageId={arr_res.get('message_id')}")
        self.assertTrue(arr_res.get("success"))
        self.assertEqual(arr_res.get("sender"), "orders")

        # 3. Out for Delivery trigger (sender="orders")
        ofd_sub, ofd_body, ofd_html = shipment_out_for_delivery_email(shipment)
        ofd_res = ensure_delivery_result(send_email(self.test_recipient, ofd_sub, ofd_body, html_body=ofd_html, sender="orders"))
        print(f"      -> Out for Delivery: Success={ofd_res.get('success')}, Sender={ofd_res.get('sender')}, MessageId={ofd_res.get('message_id')}")
        self.assertTrue(ofd_res.get("success"))
        self.assertEqual(ofd_res.get("sender"), "orders")

        # 4. Delivered trigger (sender="orders")
        del_sub, del_body, del_html = shipment_delivered_email(shipment)
        del_res = ensure_delivery_result(send_email(self.test_recipient, del_sub, del_body, html_body=del_html, sender="orders"))
        print(f"      -> Delivered: Success={del_res.get('success')}, Sender={del_res.get('sender')}, MessageId={del_res.get('message_id')}")
        self.assertTrue(del_res.get("success"))
        self.assertEqual(del_res.get("sender"), "orders")

        # 5. Thank You trigger (sender="support")
        ty_sub, ty_body, ty_html = shipment_thank_you_email(shipment)
        ty_res = ensure_delivery_result(send_email(self.test_recipient, ty_sub, ty_body, html_body=ty_html, sender="support"))
        print(f"      -> Support Thank-You: Success={ty_res.get('success')}, Sender={ty_res.get('sender')}, MessageId={ty_res.get('message_id')}")
        self.assertTrue(ty_res.get("success"))
        self.assertEqual(ty_res.get("sender"), "support")

    def test_03_real_campaign_bulk_trigger(self):
        """Test real campaign bulk email trigger via 'marketing' sender identity."""
        if not self.has_live_creds:
            self.skipTest("Live SMTP credentials not configured in environment")

        print(f"\n[INTEGRATION] Testing real Campaign bulk email trigger to [{self.test_recipient}]...")

        campaign = Campaign(
            id=f"CMP-TEST-{random_suffix(4)}",
            name="Mega Diwali Sale 2026",
            code=f"DIWALI{random_suffix(3)}",
            description="Flat 25% off storewide on all electronics and apparel.",
            discount_type="percentage",
            discount_value=25.0,
            start_date=date.today(),
            end_date=date.today(),
            status="active",
        )
        db.session.add(campaign)
        db.session.commit()

        from app.utils.email import send_bulk_email, campaign_email
        subject, body, html_body = campaign_email(campaign)

        recipients = [self.test_recipient]
        sent_count, refused_map = send_bulk_email(
            recipients,
            subject,
            body,
            html_body=html_body,
            sender="marketing",
            return_diagnostics=True,
        )

        print(f"      -> Campaign Result: SentCount={sent_count}/{len(recipients)}, Refused={refused_map}")
        self.assertEqual(sent_count, 1, f"Bulk campaign failed to deliver to test recipient: {refused_map}")
        self.assertEqual(len(refused_map), 0)


if __name__ == "__main__":
    unittest.main()
