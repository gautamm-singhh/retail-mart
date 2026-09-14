"""
One reusable send_email() used by every feature that needs to notify a
person: order confirmations (orders.py), campaign blasts (campaigns.py),
shipment status notifications (shipments.py), customer welcome (auth.py),
and the generic POST /communications/send endpoint.

Supports both:
  - Port 465 (SMTPS / SSL)
  - Port 587 / 25 (STARTTLS)
  - Zero-config dev fallback (logs to console when SMTP_HOST is unset)
"""

import os
import smtplib
import ssl
import socket
from email.message import EmailMessage

from flask import current_app


def _get_active_email_config():
    """
    Safely retrieves the active SMTP configuration, giving priority to live environment
    variables while falling back to current_app.config. Never exposes passwords or secrets.
    """
    host = (os.environ.get("SMTP_HOST") or (current_app.config.get("SMTP_HOST") if current_app else None) or "").strip() or None
    port_raw = os.environ.get("SMTP_PORT") or ((current_app.config.get("SMTP_PORT") if current_app else None) or 587)
    try:
        port = int(port_raw)
    except (TypeError, ValueError):
        port = 587

    username = (os.environ.get("SMTP_USERNAME") or (current_app.config.get("SMTP_USERNAME") if current_app else None) or "").strip() or None
    password = (os.environ.get("SMTP_PASSWORD") or (current_app.config.get("SMTP_PASSWORD") if current_app else None) or "").strip() or None
    mail_from = (os.environ.get("MAIL_FROM") or (current_app.config.get("MAIL_FROM") if current_app else None) or "").strip() or "no-reply@retailmart.dev"

    return {
        "host": host,
        "port": port,
        "username": username,
        "password": password,
        "mail_from": mail_from,
    }


def _get_smtp_connection(host: str, port: int, timeout: int = 7):
    """
    Returns an active, secured SMTP connection for either SSL (465) or STARTTLS (587/25).
    Correctly executes EHLO handshakes and uses default SSL context for full RFC 3207 and Gmail compliance.
    Default timeout of 7s ensures connection timeouts are caught gracefully within serverless execution limits.
    """
    context = ssl.create_default_context()
    if port == 465:
        server = smtplib.SMTP_SSL(host, port, timeout=timeout, context=context)
        server.ehlo()
        return server
    server = smtplib.SMTP(host, port, timeout=timeout)
    server.ehlo()
    server.starttls(context=context)
    server.ehlo()
    return server


def test_smtp_connection() -> dict:
    """
    Tests the configured SMTP credentials and returns status diagnostics
    WITHOUT exposing passwords or sensitive secrets.
    """
    cfg = _get_active_email_config()
    host = cfg["host"]
    port = cfg["port"]
    username = cfg["username"]
    password = cfg["password"]
    mail_from = cfg["mail_from"]

    if not host:
        return {
            "configured": False,
            "status": "Dev Mode (Console Logging)",
            "connectionResult": "not_configured",
            "host": None,
            "port": port,
            "encryption": "None",
            "usernamePresent": bool(username),
            "mailFrom": mail_from,
            "message": "SMTP_HOST is not set. Outgoing emails are safely logged to the server console.",
            "requiredEnvVars": ["SMTP_HOST", "SMTP_PORT", "SMTP_USERNAME", "SMTP_PASSWORD", "MAIL_FROM"],
        }

    encryption_mode = "SSL" if port == 465 else "STARTTLS"
    base_report = {
        "configured": True,
        "host": host,
        "port": port,
        "encryption": encryption_mode,
        "usernamePresent": bool(username),
        "mailFrom": mail_from,
        "requiredEnvVars": ["SMTP_HOST", "SMTP_PORT", "SMTP_USERNAME", "SMTP_PASSWORD", "MAIL_FROM"],
    }

    try:
        with _get_smtp_connection(host, port) as server:
            if username and password:
                server.login(username, password)
        return {
            **base_report,
            "status": "Connected",
            "connectionResult": "success",
            "message": "SMTP connection successfully verified with server.",
            "error": None,
        }
    except socket.gaierror:
        return {
            **base_report,
            "status": "DNS Resolution Failure",
            "connectionResult": "failed",
            "error": f"DNS resolution failure: could not resolve host '{host}'. Verify SMTP_HOST.",
            "message": "DNS resolution failure. Verify SMTP_HOST in .env.",
        }
    except ConnectionRefusedError:
        return {
            **base_report,
            "status": "Connection Refused",
            "connectionResult": "failed",
            "error": f"Connection refused by {host}:{port}. Verify SMTP_PORT.",
            "message": "Connection refused by SMTP server.",
        }
    except (TimeoutError, socket.timeout):
        return {
            **base_report,
            "status": "Connection Timeout",
            "connectionResult": "failed",
            "error": f"Connection timed out while connecting to {host}:{port}.",
            "message": "Connection timed out. Check network or firewall.",
        }
    except ssl.SSLError as ssl_err:
        return {
            **base_report,
            "status": "TLS Failure",
            "connectionResult": "failed",
            "error": f"TLS/SSL handshake negotiation failed: {ssl_err}",
            "message": "TLS failure during secure handshake.",
        }
    except smtplib.SMTPAuthenticationError:
        return {
            **base_report,
            "status": "Authentication Failed",
            "connectionResult": "failed",
            "error": "Authentication failed. For Gmail, enable 2-Step Verification and use a 16-character App Password.",
            "message": "SMTP server rejected the credentials.",
        }
    except (smtplib.SMTPConnectError, OSError) as os_err:
        return {
            **base_report,
            "status": "Connection Error",
            "connectionResult": "failed",
            "error": f"Could not connect to SMTP server: {os_err}",
            "message": "Network connection error.",
        }
    except Exception as ex:
        return {
            **base_report,
            "status": "Connection Error",
            "connectionResult": "failed",
            "error": f"SMTP error: {type(ex).__name__}",
            "message": "Email could not be delivered. Check backend SMTP configuration.",
        }


def send_email(
    to: str,
    subject: str,
    body: str,
    html_body: str | None = None,
    attachments: list[tuple[str, bytes, str]] | None = None,
) -> bool:
    """
    Sends a single email. Returns True if it was sent (or logged, in dev
    mode) successfully, False if a real send attempt failed - callers
    should treat False as "log and move on", not "fail the whole request",
    since a bounced notification shouldn't roll back a completed order.

    `attachments` is a list of (filename, bytes, mimetype) tuples.
    """
    cfg = _get_active_email_config()
    host = cfg["host"]
    port = cfg["port"]
    username = cfg["username"]
    password = cfg["password"]
    mail_from = cfg["mail_from"]

    if not host:
        # Dev fallback: no SMTP configured, just log what would have sent.
        attachment_note = f" (+{len(attachments)} attachment(s))" if attachments else ""
        if current_app:
            current_app.logger.info("[DEV EMAIL] to=%s subject=%r%s\n%s", to, subject, attachment_note, body)
        return True

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = mail_from
    message["To"] = to
    message.set_content(body)
    if html_body:
        message.add_alternative(html_body, subtype="html")
    for filename, file_bytes, mimetype in attachments or []:
        maintype, _, subtype = mimetype.partition("/")
        message.add_attachment(file_bytes, maintype=maintype, subtype=subtype or "octet-stream", filename=filename)

    try:
        with _get_smtp_connection(host, port) as server:
            if username and password:
                server.login(username, password)
            server.send_message(message)
        return True
    except Exception as ex:  # noqa: BLE001 - a failed notification must never crash the request
        if current_app:
            current_app.logger.warning("Failed to send email to %s: [%s] %s", to, type(ex).__name__, ex)
        return False


def send_bulk_email(
    recipients: list[str],
    subject: str,
    body: str,
    html_body: str | None = None,
) -> int:
    """
    Sends an email to multiple recipients in a single authenticated SMTP session.
    Avoids opening and closing the socket for each recipient, preventing rate limits
    and connection timeouts during campaign blasts.
    Returns the number of successfully delivered emails.
    """
    if not recipients:
        return 0

    cfg = _get_active_email_config()
    host = cfg["host"]
    port = cfg["port"]
    username = cfg["username"]
    password = cfg["password"]
    mail_from = cfg["mail_from"]

    if not host:
        # Dev fallback: log to console
        for to in recipients:
            if current_app:
                current_app.logger.info("[DEV BULK EMAIL] to=%s subject=%r\n%s", to, subject, body)
        return len(recipients)

    sent_count = 0
    try:
        with _get_smtp_connection(host, port) as server:
            if username and password:
                server.login(username, password)
            for to in recipients:
                if not to or not to.strip():
                    continue
                try:
                    message = EmailMessage()
                    message["Subject"] = subject
                    message["From"] = mail_from
                    message["To"] = to.strip()
                    message.set_content(body)
                    if html_body:
                        message.add_alternative(html_body, subtype="html")
                    server.send_message(message)
                    sent_count += 1
                except Exception as send_err:
                    if current_app:
                        current_app.logger.warning("Failed delivery to recipient %s: %s", to, send_err)
    except Exception as ex:
        if current_app:
            current_app.logger.exception("Bulk campaign delivery failed: %s", ex)

    return sent_count


def welcome_email(user) -> tuple[str, str]:
    """Returns (subject, body) for a new customer registration welcome email."""
    first_name = (user.name or "Valued Customer").split(" ")[0]
    body = (
        f"Hi {first_name},\n\n"
        "Welcome to Retail Mart! We're excited to have you join our community.\n\n"
        f"Account details:\n"
        f"  - Name: {user.name}\n"
        f"  - Registered Email: {user.email}\n\n"
        "Security Note: We will never ask you for your password or OTP code. "
        "Keep your account credentials private at all times.\n\n"
        "Start exploring thousands of quality products, track your orders, and enjoy "
        "exclusive member promotions at Retail Mart.\n\n"
        "Happy Shopping!\n\n"
        "— Retail Mart Team"
    )
    return "Welcome to Retail Mart! Your account is ready", body


def order_confirmation_email(order) -> tuple[str, str]:
    """Returns (subject, body) for an order confirmation - one place to edit the copy."""
    lines = [f"  - {item.product_name} x{item.quantity}: Rs. {item.price * item.quantity:,.2f}" for item in order.items]
    body = (
        f"Hi {order.customer},\n\n"
        f"Thanks for your order {order.id}! Here's a summary:\n\n"
        + "\n".join(lines)
        + f"\n\nTotal: Rs. {float(order.amount):,.2f}\n"
        f"Status: {order.status}\n\n— Retail Mart"
    )
    return f"Your Retail Mart order {order.id} is confirmed", body


def receipt_email(payment) -> tuple[str, str]:
    """Returns (subject, body) for the payment-receipt email - sent with the receipt PDF attached."""
    body = (
        f"Hi {payment.customer},\n\n"
        f"We've received your payment for order {payment.order_id}. Your receipt is attached.\n\n"
        f"Amount paid: Rs. {float(payment.amount):,.2f}\n"
        f"Payment method: {payment.method}\n"
        f"Payment ID: {payment.id}\n\n"
        "— Retail Mart"
    )
    return f"Receipt for your payment on order {payment.order_id}", body


def campaign_email(campaign) -> tuple[str, str]:
    """Returns (subject, body) for a campaign blast - one place to edit the copy."""
    body = (
        f"{campaign.description}\n\n"
        f"Use code {campaign.code} for {campaign.discount_value}"
        f"{'%' if campaign.discount_type == 'percentage' else ' Rs.'} off"
        f"{' (min. purchase Rs. ' + format(float(campaign.min_purchase), ',.2f') + ')' if campaign.min_purchase else ''}.\n"
        f"Valid until {campaign.end_date.strftime('%d %b %Y') if campaign.end_date else 'further notice'}.\n\n"
        "— Retail Mart"
    )
    return campaign.name, body


def shipment_shipped_email(shipment) -> tuple[str, str]:
    """Returns (subject, body) sent to the customer when a shipment transitions to 'Shipped'."""
    delivery_line = (
        f"Expected delivery: {shipment.expected_delivery.strftime('%d %b %Y')}\n"
        if shipment.expected_delivery
        else ""
    )
    body = (
        f"Hi {shipment.customer},\n\n"
        f"Great news! Your order {shipment.order_id} has been shipped via {shipment.courier}.\n\n"
        f"Tracking number: {shipment.tracking_number}\n"
        + delivery_line
        + "\nYou can track your order from your Retail Mart account under 'My Orders'.\n\n"
        "— Retail Mart"
    )
    return f"Your Retail Mart order {shipment.order_id} is on its way!", body


def shipment_arrived_email(shipment, location: str | None = None) -> tuple[str, str]:
    """Returns (subject, body) sent when a shipment arrives at the destination city/hub."""
    loc_str = f" at {location}" if location else ""
    body = (
        f"Hi {shipment.customer},\n\n"
        f"Your shipment for order {shipment.order_id} has arrived{loc_str} "
        f"via {shipment.courier} (Tracking #: {shipment.tracking_number}).\n\n"
        "It will be dispatched for final doorstep delivery shortly.\n\n"
        "— Retail Mart"
    )
    return f"Your Retail Mart order {shipment.order_id} has arrived at destination hub", body


def shipment_out_for_delivery_email(shipment) -> tuple[str, str]:
    """Returns (subject, body) sent when a shipment reaches 'Out for Delivery'."""
    body = (
        f"Hi {shipment.customer},\n\n"
        f"Your order {shipment.order_id} ({shipment.courier} / {shipment.tracking_number}) "
        f"is out for delivery today! Please ensure someone is available to receive it.\n\n"
        "— Retail Mart"
    )
    return f"Your Retail Mart order {shipment.order_id} is out for delivery today!", body


def shipment_delivered_email(shipment) -> tuple[str, str]:
    """Returns (subject, body) sent when a shipment reaches 'Delivered'."""
    body = (
        f"Hi {shipment.customer},\n\n"
        f"Your order {shipment.order_id} has been delivered successfully!\n\n"
        f"Delivered via: {shipment.courier}\n"
        f"Tracking number: {shipment.tracking_number}\n\n"
        "If you have any questions or feedback regarding your delivery, our support team is here to assist.\n\n"
        "— Retail Mart"
    )
    return f"Your Retail Mart order {shipment.order_id} has been delivered!", body


def shipment_thank_you_email(shipment) -> tuple[str, str]:
    """Returns (subject, body) sent as a dedicated delivery thank-you message."""
    first_name = (shipment.customer or "Valued Customer").split(" ")[0]
    body = (
        f"Dear {first_name},\n\n"
        f"Thank you for shopping with Retail Mart! Your package for order {shipment.order_id} "
        "has been completed.\n\n"
        "We are honored to have you as a customer and hope you thoroughly enjoy your purchase. "
        "Please feel free to share your product reviews or reach out if you need any post-delivery support.\n\n"
        "We look forward to serving you again soon!\n\n"
        "Warm regards,\n"
        "— Gautam Singh & The Retail Mart Team"
    )
    return f"Thank you for your Retail Mart order {shipment.order_id}!", body
