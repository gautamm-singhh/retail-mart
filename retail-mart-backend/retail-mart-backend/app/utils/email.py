"""
Retail Mart Multi-Sender Email System
Supports three distinct Gmail SMTP sender identities with real SMTP delivery,
STARTTLS encryption on port 587, and professional HTML email templates:

1. Support: retailmart.support@gmail.com
   - Welcome / Signup emails
   - Thank-you after successful delivery
   - Generic customer support communications

2. Orders: retailmart.orders@gmail.com
   - Order confirmation
   - Payment confirmation / Receipt (with PDF attachment)
   - Shipment tracking available
   - Shipped, Arrived, Out for delivery, Delivered status milestones

3. Marketing: retailmart.marketing@gmail.com
   - Festival campaigns, promotional offers, and admin bulk email blasts

All SMTP credentials are read strictly from environment variables.
Never hardcodes or leaks secrets in logs, API responses, or error traces.
"""

import os
import smtplib
import ssl
import socket
import uuid
from email.message import EmailMessage
from typing import Literal

from flask import current_app
from jinja2 import Environment, FileSystemLoader, select_autoescape

EmailSender = Literal["support", "orders", "marketing"]

# Directory where pre-compiled Jinja2 HTML email templates are stored
TEMPLATES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "templates", "email")

_jinja_env = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    autoescape=select_autoescape(["html", "xml"]),
)


def render_email_template(template_name: str, **context) -> str:
    """Renders a Jinja2 email template safely with autoescaping."""
    template = _jinja_env.get_template(template_name)
    return template.render(**context)


SENDER_METADATA: dict[EmailSender, dict[str, str]] = {
    "support": {
        "default_email": "retailmart.support@gmail.com",
        "default_from": "Retail Mart Support <retailmart.support@gmail.com>",
        "username_var": "SMTP_SUPPORT_USERNAME",
        "password_var": "SMTP_SUPPORT_PASSWORD",
        "from_var": "MAIL_SUPPORT_FROM",
    },
    "orders": {
        "default_email": "retailmart.orders@gmail.com",
        "default_from": "Retail Mart Orders <retailmart.orders@gmail.com>",
        "username_var": "SMTP_ORDERS_USERNAME",
        "password_var": "SMTP_ORDERS_PASSWORD",
        "from_var": "MAIL_ORDERS_FROM",
    },
    "marketing": {
        "default_email": "retailmart.marketing@gmail.com",
        "default_from": "Retail Mart Marketing <retailmart.marketing@gmail.com>",
        "username_var": "SMTP_MARKETING_USERNAME",
        "password_var": "SMTP_MARKETING_PASSWORD",
        "from_var": "MAIL_MARKETING_FROM",
    },
}


def _get_sender_config(sender: EmailSender = "support") -> dict:
    """
    Retrieves the active SMTP configuration for the specified sender identity.
    Reads strictly from identity-specific environment variables or current_app.config.
    Does not fall back to legacy single-sender variables.
    Never exposes passwords or sensitive secrets.

    Note: Changes to local .env require restarting the backend process.
    """
    if sender not in SENDER_METADATA:
        raise ValueError(
            f"Invalid sender '{sender}'. Valid identities are: 'support', 'orders', 'marketing'."
        )

    meta = SENDER_METADATA[sender]

    # Shared SMTP host & port across all three accounts
    if "SMTP_HOST" in os.environ:
        host = os.environ.get("SMTP_HOST", "").strip() or None
    elif current_app and current_app.config.get("SMTP_HOST") is not None:
        host = str(current_app.config.get("SMTP_HOST", "")).strip() or None
    else:
        host = "smtp.gmail.com"

    port_raw = os.environ.get("SMTP_PORT") or (
        (current_app.config.get("SMTP_PORT") if current_app else None) or 587
    )
    try:
        port = int(port_raw)
    except (TypeError, ValueError):
        port = 587

    # Identity-specific username and password - strictly from designated sender variables
    if meta["username_var"] in os.environ:
        username = os.environ.get(meta["username_var"], "").strip() or None
    elif current_app and current_app.config.get(meta["username_var"]) is not None:
        username = str(current_app.config.get(meta["username_var"], "")).strip() or None
    else:
        username = None

    if meta["password_var"] in os.environ:
        password = os.environ.get(meta["password_var"], "").strip() or None
    elif current_app and current_app.config.get(meta["password_var"]) is not None:
        password = str(current_app.config.get(meta["password_var"], "")).strip() or None
    else:
        password = None

    mail_from = (
        os.environ.get(meta["from_var"])
        or (current_app.config.get(meta["from_var"]) if current_app else None)
        or ""
    ).strip() or meta["default_from"]

    return {
        "sender": sender,
        "host": host,
        "port": port,
        "username": username,
        "password": password,
        "mail_from": mail_from,
    }


def get_all_sender_configs() -> dict[str, dict]:
    """Returns the internal sender configuration mapping for support, orders, and marketing."""
    return {
        "support": _get_sender_config("support"),
        "orders": _get_sender_config("orders"),
        "marketing": _get_sender_config("marketing"),
    }


# Conceptual mapping exported for external introspection
EMAIL_SENDERS = get_all_sender_configs()


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


def test_single_sender_smtp(sender: EmailSender) -> dict:
    """
    Tests SMTP connection and authentication for a specific sender identity.
    Returns safe diagnostic information without leaking passwords or secrets.
    """
    cfg = _get_sender_config(sender)
    host = cfg["host"]
    port = cfg["port"]
    username = cfg["username"]
    password = cfg["password"]
    mail_from = cfg["mail_from"]

    if not host or not username or not password:
        return {
            "configured": bool(host and username and password),
            "connected": False,
            "status": "Dev Mode (Console Logging)",
            "connectionResult": "not_configured",
            "host": host,
            "port": port,
            "encryption": "None" if not host else ("SSL" if port == 465 else "STARTTLS"),
            "usernamePresent": bool(username),
            "mailFrom": mail_from,
            "message": f"{sender.capitalize()} sender credentials not fully configured. Outgoing emails are logged to console.",
            "error": None,
        }

    encryption_mode = "SSL" if port == 465 else "STARTTLS"
    base_report = {
        "configured": True,
        "host": host,
        "port": port,
        "encryption": encryption_mode,
        "usernamePresent": bool(username),
        "mailFrom": mail_from,
    }

    try:
        with _get_smtp_connection(host, port) as server:
            server.login(username, password)
        return {
            **base_report,
            "connected": True,
            "status": "Connected",
            "connectionResult": "success",
            "message": f"SMTP connection and authentication verified for {sender} identity.",
            "error": None,
        }
    except socket.gaierror:
        return {
            **base_report,
            "connected": False,
            "status": "DNS Resolution Failure",
            "connectionResult": "failed",
            "error": f"DNS resolution failure: could not resolve host '{host}'. Verify SMTP_HOST.",
            "message": "DNS resolution failure. Verify SMTP_HOST in .env.",
        }
    except ConnectionRefusedError:
        return {
            **base_report,
            "connected": False,
            "status": "Connection Refused",
            "connectionResult": "failed",
            "error": f"Connection refused by {host}:{port}. Verify SMTP_PORT.",
            "message": "Connection refused by SMTP server.",
        }
    except (TimeoutError, socket.timeout):
        return {
            **base_report,
            "connected": False,
            "status": "Connection Timeout",
            "connectionResult": "failed",
            "error": f"Connection timed out while connecting to {host}:{port}.",
            "message": "Connection timed out. Check network or firewall.",
        }
    except ssl.SSLError as ssl_err:
        return {
            **base_report,
            "connected": False,
            "status": "TLS Failure",
            "connectionResult": "failed",
            "error": f"TLS/SSL handshake negotiation failed: {ssl_err}",
            "message": "TLS failure during secure handshake.",
        }
    except smtplib.SMTPAuthenticationError:
        return {
            **base_report,
            "connected": False,
            "status": "Authentication Failed",
            "connectionResult": "failed",
            "error": "Authentication failed. For Gmail, enable 2-Step Verification and use a 16-character App Password.",
            "message": "SMTP server rejected the credentials.",
        }
    except (smtplib.SMTPConnectError, OSError) as os_err:
        return {
            **base_report,
            "connected": False,
            "status": "Connection Error",
            "connectionResult": "failed",
            "error": f"Could not connect to SMTP server: {os_err}",
            "message": "Network connection error.",
        }
    except Exception as ex:
        return {
            **base_report,
            "connected": False,
            "status": "Connection Error",
            "connectionResult": "failed",
            "error": f"SMTP error: {type(ex).__name__}",
            "message": "Email delivery check failed. Verify backend SMTP configuration.",
        }


def test_smtp_connection(sender: EmailSender | None = None) -> dict:
    """
    Tests SMTP credentials and connectivity for support, orders, and marketing identities independently.
    Returns complete diagnostics without exposing passwords, app passwords, or sensitive secrets.
    """
    if sender in ("support", "orders", "marketing"):
        return test_single_sender_smtp(sender)

    support_status = test_single_sender_smtp("support")
    orders_status = test_single_sender_smtp("orders")
    marketing_status = test_single_sender_smtp("marketing")

    all_configured = any(s["configured"] for s in (support_status, orders_status, marketing_status))
    all_connected = any(s["connected"] for s in (support_status, orders_status, marketing_status))

    # Determine overall status text
    if all_connected:
        overall_status = "Connected"
        overall_message = "All configured SMTP sender connections successfully verified with Gmail server."
    elif all_configured:
        overall_status = "Authentication / Connection Failed"
        overall_message = "One or more SMTP sender configurations failed authentication or connection."
    else:
        overall_status = "Dev Mode (Console Logging)"
        overall_message = "SMTP sender credentials are not fully set. Outgoing emails are safely logged to console."

    return {
        "support": support_status,
        "orders": orders_status,
        "marketing": marketing_status,
        # Top-level backward compatibility for existing verification scripts
        "configured": all_configured,
        "connected": all_connected,
        "status": overall_status,
        "message": overall_message,
        "host": support_status.get("host") or orders_status.get("host") or "smtp.gmail.com",
        "port": support_status.get("port") or orders_status.get("port") or 587,
        "encryption": "STARTTLS",
        "requiredEnvVars": [
            "SMTP_HOST",
            "SMTP_PORT",
            "SMTP_SUPPORT_USERNAME",
            "SMTP_SUPPORT_PASSWORD",
            "MAIL_SUPPORT_FROM",
            "SMTP_ORDERS_USERNAME",
            "SMTP_ORDERS_PASSWORD",
            "MAIL_ORDERS_FROM",
            "SMTP_MARKETING_USERNAME",
            "SMTP_MARKETING_PASSWORD",
            "MAIL_MARKETING_FROM",
        ],
    }


class EmailDeliveryResult(dict):
    """
    Structured delivery result returned by send_email().
    Inherits from dict so it can be serialized directly with jsonify(result)
    or accessed with result["stage"], while implementing __bool__() so that:
        bool(result) == True if and only if success is True.
    This preserves 100% backward compatibility with legacy `if send_email(...)` checks.
    """

    def __init__(
        self,
        success: bool,
        stage: str,
        message: str,
        sender: str,
        recipient: str,
        refused_recipients: list[str] | None = None,
        message_id: str | None = None,
        error: str | None = None,
    ):
        super().__init__(
            success=success,
            sent=success,  # alias for backward compatibility with frontend consumers
            stage=stage,
            message=message,
            sender=sender,
            recipient=recipient,
            refused_recipients=refused_recipients or [],
            message_id=message_id,
            error=error,
        )

    def __bool__(self) -> bool:
        return bool(self.get("success", False))

    @property
    def success(self) -> bool:
        return bool(self.get("success", False))


def ensure_delivery_result(result) -> dict:
    """Safely normalizes any result (EmailDeliveryResult, dict, or bool) into a diagnostic dictionary."""
    if isinstance(result, dict):
        return dict(result)
    return {
        "success": bool(result),
        "sent": bool(result),
        "stage": "send" if result else "unknown",
        "message": "Message dispatched successfully" if result else "Message delivery failed",
        "refused_recipients": [],
        "message_id": None,
        "error": None if result else "DeliveryFailed",
    }


def send_email(
    to: str,
    subject: str,
    body: str,
    html_body: str | None = None,
    attachments: list[tuple[str, bytes, str]] | None = None,
    sender: EmailSender = "support",
) -> EmailDeliveryResult:
    """
    Sends a single transactional email through the designated sender identity.
    Returns an EmailDeliveryResult object with detailed stage diagnostics:
      - stage: 'unconfigured' | 'connect' | 'login' | 'send'
      - success: bool (and bool(result) evaluates to this)
      - message: human-readable delivery status description
      - refused_recipients: list of rejected recipients
      - message_id: generated RFC 5322 Message-ID
    """
    cfg = _get_sender_config(sender)
    host = cfg["host"]
    port = cfg["port"]
    username = cfg["username"]
    password = cfg["password"]
    mail_from = cfg["mail_from"]

    # STAGE 0: Check required environment configuration
    if not host or not username or not password:
        missing = []
        if not host:
            missing.append("SMTP_HOST")
        if not username:
            missing.append(f"SMTP_{sender.upper()}_USERNAME")
        if not password:
            missing.append(f"SMTP_{sender.upper()}_PASSWORD")
        err_msg = f"SMTP credentials for '{sender}' identity are not configured (missing: {', '.join(missing)})."
        if current_app:
            current_app.logger.warning(
                "[SMTP UNCONFIGURED][%s] Cannot deliver email to %s: %s",
                sender.upper(),
                to,
                err_msg,
            )
        return EmailDeliveryResult(
            success=False,
            stage="unconfigured",
            message=err_msg,
            sender=sender,
            recipient=to,
            error="Missing SMTP credentials",
        )

    # Generate standard RFC 5322 Message-ID
    domain = host if (host and "." in host and not host.startswith("127.")) else "retailmart.dev"
    message_id = f"<{uuid.uuid4()}@{domain}>"

    message = EmailMessage()
    message["Message-ID"] = message_id
    message["Subject"] = subject
    message["From"] = mail_from
    message["To"] = to
    message.set_content(body)
    if html_body:
        message.add_alternative(html_body, subtype="html")
    for filename, file_bytes, mimetype in attachments or []:
        maintype, _, subtype = mimetype.partition("/")
        message.add_attachment(file_bytes, maintype=maintype, subtype=subtype or "octet-stream", filename=filename)

    # STAGE 1, 2, 3: Connect, Login, Send
    stage = "connect"
    if current_app:
        current_app.logger.info(
            "[SMTP CONNECT][%s] Connecting to %s:%s (STARTTLS)...",
            sender.upper(),
            host,
            port,
        )

    try:
        with _get_smtp_connection(host, port) as server:
            stage = "login"
            if current_app:
                current_app.logger.info("[SMTP LOGIN][%s] Authenticating as %s...", sender.upper(), username)
            server.login(username, password)
            if current_app:
                current_app.logger.info("[SMTP LOGIN SUCCESS][%s] Authentication accepted.", sender.upper())

            stage = "send"
            if current_app:
                current_app.logger.info(
                    "[SMTP SEND][%s] Transmitting message to %s (Message-ID: %s)...",
                    sender.upper(),
                    to,
                    message_id,
                )
            refused = server.send_message(message)

            # Inspect refused recipients dictionary returned by send_message
            if isinstance(refused, dict) and len(refused) > 0:
                refused_list = list(refused.keys())
                msg = f"SMTP server rejected recipient(s): {refused}"
                if current_app:
                    current_app.logger.warning("[SMTP REFUSED RECIPIENTS][%s] %s", sender.upper(), msg)
                return EmailDeliveryResult(
                    success=False,
                    stage="send",
                    message=msg,
                    sender=sender,
                    recipient=to,
                    refused_recipients=refused_list,
                    message_id=message_id,
                    error="RecipientsRefused",
                )

            if current_app:
                current_app.logger.info(
                    "[SMTP SEND SUCCESS][%s] Message accepted by SMTP server for %s (Message-ID: %s)",
                    sender.upper(),
                    to,
                    message_id,
                )
            return EmailDeliveryResult(
                success=True,
                stage="send",
                message="Message accepted by SMTP server for delivery.",
                sender=sender,
                recipient=to,
                refused_recipients=[],
                message_id=message_id,
            )

    except smtplib.SMTPAuthenticationError as auth_err:
        err_str = f"Authentication failed for {username}: (code {auth_err.smtp_code})"
        if current_app:
            current_app.logger.warning("[SMTP LOGIN FAILED][%s] %s", sender.upper(), err_str)
        return EmailDeliveryResult(
            success=False,
            stage="login",
            message="SMTP authentication failed. Verify 16-character App Password.",
            sender=sender,
            recipient=to,
            message_id=message_id,
            error=f"SMTPAuthenticationError: {auth_err.smtp_code}",
        )
    except smtplib.SMTPRecipientsRefused as rec_err:
        refused_list = list(rec_err.recipients.keys())
        err_str = f"All recipients refused by SMTP server: {rec_err.recipients}"
        if current_app:
            current_app.logger.warning("[SMTP REFUSED RECIPIENTS][%s] %s", sender.upper(), err_str)
        return EmailDeliveryResult(
            success=False,
            stage="send",
            message=err_str,
            sender=sender,
            recipient=to,
            refused_recipients=refused_list,
            message_id=message_id,
            error="SMTPRecipientsRefused",
        )
    except Exception as ex:
        err_str = f"Failed at {stage} stage during SMTP delivery to {to}: {type(ex).__name__} - {ex}"
        if current_app:
            current_app.logger.warning("[SMTP %s FAILED][%s] %s", stage.upper(), sender.upper(), err_str)
        return EmailDeliveryResult(
            success=False,
            stage=stage,
            message=f"SMTP {stage} failed: {type(ex).__name__}",
            sender=sender,
            recipient=to,
            message_id=message_id,
            error=type(ex).__name__,
        )


def send_bulk_email(
    recipients: list[str],
    subject: str,
    body: str,
    html_body: str | None = None,
    sender: EmailSender = "marketing",
    return_diagnostics: bool = False,
) -> int | tuple[int, dict]:
    """
    Sends an email to multiple recipients in a single authenticated SMTP session
    using the designated sender identity (default: 'marketing').
    Avoids opening and closing the socket for each recipient, preventing rate limits
    and connection timeouts during campaign blasts.
    Returns the number of successfully delivered emails (or (sent_count, refused_dict) if return_diagnostics=True).
    """
    if not recipients:
        return (0, {}) if return_diagnostics else 0

    cfg = _get_sender_config(sender)
    host = cfg["host"]
    port = cfg["port"]
    username = cfg["username"]
    password = cfg["password"]
    mail_from = cfg["mail_from"]

    if not host or not username or not password:
        if current_app:
            current_app.logger.warning(
                "[SMTP BULK UNCONFIGURED][%s] Missing credentials. Cannot deliver campaign to %d recipients.",
                sender.upper(),
                len(recipients),
            )
        return (0, {}) if return_diagnostics else 0

    sent_count = 0
    refused_map = {}

    if current_app:
        current_app.logger.info(
            "[EMAIL TRIGGER] Flow=BULK_EMAIL Event=batch_send Sender=%s TotalRecipients=%d",
            sender,
            len(recipients),
        )

    try:
        with _get_smtp_connection(host, port) as server:
            server.login(username, password)
            for to in recipients:
                if not to or not to.strip():
                    continue
                clean_to = to.strip()

                # Basic email sanity check to prevent SMTP command corruption
                if "@" not in clean_to or "." not in clean_to.split("@")[-1]:
                    refused_map[clean_to] = "InvalidEmailFormat"
                    if current_app:
                        current_app.logger.warning("[EMAIL RECIPIENT] %s (INVALID FORMAT)", clean_to)
                        current_app.logger.info("[EMAIL SENDER] %s", sender)
                        current_app.logger.warning("[EMAIL RESULT] Success=False Recipient=%s Reason=InvalidFormat", clean_to)
                    continue

                if current_app:
                    current_app.logger.info("[EMAIL RECIPIENT] %s", clean_to)
                    current_app.logger.info("[EMAIL SENDER] %s", sender)

                try:
                    message = EmailMessage()
                    message["Subject"] = subject
                    message["From"] = mail_from
                    message["To"] = clean_to
                    domain = host if (host and "." in host and not host.startswith("127.")) else "retailmart.dev"
                    message["Message-ID"] = f"<{uuid.uuid4()}@{domain}>"
                    message.set_content(body)
                    if html_body:
                        message.add_alternative(html_body, subtype="html")
                    refused = server.send_message(message)
                    if isinstance(refused, dict) and len(refused) > 0:
                        refused_map[clean_to] = refused
                        if current_app:
                            current_app.logger.warning(
                                "[EMAIL RESULT] Success=False Recipient=%s Refused=%s",
                                clean_to,
                                refused,
                            )
                    else:
                        sent_count += 1
                        if current_app:
                            current_app.logger.info(
                                "[EMAIL RESULT] Success=True Recipient=%s Message=Delivered to SMTP server",
                                clean_to,
                            )
                except Exception as send_err:
                    refused_map[clean_to] = str(send_err)
                    if current_app:
                        current_app.logger.warning(
                            "[EMAIL RESULT] Success=False Recipient=%s Error=%s",
                            clean_to,
                            send_err,
                        )
    except Exception as ex:
        if current_app:
            current_app.logger.exception("Bulk campaign delivery session failed [%s]: %s", sender, ex)

    if return_diagnostics:
        return sent_count, refused_map
    return sent_count



# ==============================================================================
# EMAIL TEMPLATE FUNCTIONS
# Each template function returns: (subject, text_body, html_body)
# ==============================================================================


def welcome_email(user) -> tuple[str, str, str]:
    """
    Returns (subject, text_body, html_body) for a new customer registration welcome email.
    Sender: Retail Mart Support (retailmart.support@gmail.com).
    """
    user_name = getattr(user, "name", "") or "Valued Customer"
    first_name = user_name.split(" ")[0]
    user_email = getattr(user, "email", "")
    subject = "Welcome to Retail Mart — Your Account Is Ready"

    text_body = (
        f"Hi {first_name},\n\n"
        "Welcome to Retail Mart! We're excited to have you join our community.\n\n"
        "Account details:\n"
        f"  - Name: {user_name}\n"
        f"  - Registered Email: {user_email}\n"
        "  - Status: Active & Verified\n\n"
        "Security Note: We will never ask you for your password or OTP code. "
        "Keep your account credentials private at all times.\n\n"
        "Start exploring thousands of quality products, track your orders, and enjoy "
        "exclusive member promotions at Retail Mart.\n\n"
        "Happy Shopping!\n\n"
        "— Retail Mart Support Team"
    )

    html_body = render_email_template(
        "welcome.html",
        subject=subject,
        header_badge="Welcome",
        first_name=first_name,
        user_name=user_name,
        user_email=user_email,
    )
    return subject, text_body, html_body


def order_confirmation_email(order) -> tuple[str, str, str]:
    """
    Returns (subject, text_body, html_body) for an order confirmation.
    Sender: Retail Mart Orders (retailmart.orders@gmail.com).
    """
    customer_name = getattr(order, "customer", "") or "Customer"
    order_id = getattr(order, "id", "")
    order_amount = float(getattr(order, "amount", 0))
    order_status = getattr(order, "status", "Pending")
    order_date = getattr(order, "created_at", None) or getattr(order, "date", None)
    order_date_str = order_date.strftime("%d %b %Y") if hasattr(order_date, "strftime") else str(order_date or "Today")

    raw_items = getattr(order, "items", []) or []
    items_summary = []
    text_lines = []

    for item in raw_items:
        p_name = getattr(item, "product_name", None) or (item.get("productName") if isinstance(item, dict) else "Product")
        qty = getattr(item, "quantity", 1) if not isinstance(item, dict) else item.get("quantity", 1)
        unit_price = float(getattr(item, "price", 0) if not isinstance(item, dict) else item.get("price", 0))
        total_price = unit_price * qty

        items_summary.append({
            "name": p_name,
            "quantity": qty,
            "price": f"{unit_price:,.2f}",
            "total": f"{total_price:,.2f}",
        })
        text_lines.append(f"  - {p_name} x{qty}: Rs. {total_price:,.2f}")

    subject = f"Your Retail Mart Order {order_id} Is Confirmed"

    text_body = (
        f"Hi {customer_name},\n\n"
        f"Thanks for your order {order_id}! Here is a summary of your items:\n\n"
        + "\n".join(text_lines)
        + f"\n\nTotal: Rs. {order_amount:,.2f}\n"
        f"Order Date: {order_date_str}\n"
        f"Status: {order_status}\n\n"
        "— Retail Mart Orders Team"
    )

    html_body = render_email_template(
        "order_confirmation.html",
        subject=subject,
        header_badge="Order Confirmed",
        customer_name=customer_name,
        order_id=order_id,
        order_date=order_date_str,
        order_status=order_status,
        order_total=f"{order_amount:,.2f}",
        items=items_summary,
    )
    return subject, text_body, html_body


def receipt_email(payment) -> tuple[str, str, str]:
    """
    Returns (subject, text_body, html_body) for payment confirmation / receipt.
    Sender: Retail Mart Orders (retailmart.orders@gmail.com).
    Sent with the PDF receipt attached.
    """
    customer_name = getattr(payment, "customer", "") or "Valued Customer"
    order_id = getattr(payment, "order_id", "")
    payment_id = getattr(payment, "id", "")
    amount = float(getattr(payment, "amount", 0))
    method = getattr(payment, "method", "Online")
    payment_date = getattr(payment, "date", None)
    payment_date_str = payment_date.strftime("%d %b %Y") if hasattr(payment_date, "strftime") else str(payment_date or "")

    subject = f"Payment Confirmed for Order {order_id}"

    text_body = (
        f"Hi {customer_name},\n\n"
        f"We have received your payment for order {order_id}. Your receipt is attached.\n\n"
        f"Amount paid: Rs. {amount:,.2f}\n"
        f"Payment method: {method}\n"
        f"Payment ID: {payment_id}\n"
        + (f"Payment Date: {payment_date_str}\n" if payment_date_str else "")
        + "\n— Retail Mart Orders Team"
    )

    html_body = render_email_template(
        "payment_confirmation.html",
        subject=subject,
        header_badge="Receipt",
        customer_name=customer_name,
        order_id=order_id,
        payment_id=payment_id,
        amount=f"{amount:,.2f}",
        method=method,
        payment_date=payment_date_str,
    )
    return subject, text_body, html_body


def shipment_tracking_email(shipment) -> tuple[str, str, str]:
    """
    Returns (subject, text_body, html_body) for dedicated shipment tracking availability.
    Sender: Retail Mart Orders (retailmart.orders@gmail.com).
    """
    customer_name = getattr(shipment, "customer", "") or "Customer"
    order_id = getattr(shipment, "order_id", "")
    courier = getattr(shipment, "courier", "Courier Partner")
    tracking_number = getattr(shipment, "tracking_number", "")
    status = getattr(shipment, "status", "Pending")
    expected_delivery = getattr(shipment, "expected_delivery", None)
    delivery_str = expected_delivery.strftime("%d %b %Y") if hasattr(expected_delivery, "strftime") and expected_delivery else ""

    subject = f"Your Retail Mart Order {order_id} Is Ready to Track"

    text_body = (
        f"Hi {customer_name},\n\n"
        f"Your shipment for order {order_id} is registered and ready to track!\n\n"
        f"Courier: {courier}\n"
        f"Tracking / AWB Number: {tracking_number}\n"
        f"Current Status: {status}\n"
        + (f"Expected Delivery: {delivery_str}\n" if delivery_str else "")
        + "\nYou can track your shipment live at any time on Retail Mart under 'My Orders'.\n\n"
        "— Retail Mart Orders Team"
    )

    html_body = render_email_template(
        "shipment_tracking.html",
        subject=subject,
        header_badge="Live Tracking",
        customer_name=customer_name,
        order_id=order_id,
        courier=courier,
        tracking_number=tracking_number,
        status=status,
        expected_delivery=delivery_str,
    )
    return subject, text_body, html_body


def shipment_shipped_email(shipment) -> tuple[str, str, str]:
    """
    Returns (subject, text_body, html_body) when shipment transitions to 'Shipped'.
    Sender: Retail Mart Orders (retailmart.orders@gmail.com).
    """
    customer_name = getattr(shipment, "customer", "") or "Customer"
    order_id = getattr(shipment, "order_id", "")
    courier = getattr(shipment, "courier", "Courier")
    tracking_number = getattr(shipment, "tracking_number", "")
    expected_delivery = getattr(shipment, "expected_delivery", None)
    delivery_str = expected_delivery.strftime("%d %b %Y") if hasattr(expected_delivery, "strftime") and expected_delivery else ""

    subject = f"Your Order {order_id} Has Been Shipped"

    delivery_line = f"Expected delivery: {delivery_str}\n" if delivery_str else ""
    text_body = (
        f"Hi {customer_name},\n\n"
        f"Great news! Your order {order_id} has been shipped via {courier}.\n\n"
        f"Tracking number: {tracking_number}\n"
        + delivery_line
        + "\nYou can track your order from your Retail Mart account under 'My Orders'.\n\n"
        "— Retail Mart Orders Team"
    )

    html_body = render_email_template(
        "shipment_shipped.html",
        subject=subject,
        header_badge="Shipped",
        customer_name=customer_name,
        order_id=order_id,
        courier=courier,
        tracking_number=tracking_number,
        expected_delivery=delivery_str,
    )
    return subject, text_body, html_body


def shipment_arrived_email(shipment, location: str | None = None) -> tuple[str, str, str]:
    """
    Returns (subject, text_body, html_body) when shipment reaches destination hub/city.
    Sender: Retail Mart Orders (retailmart.orders@gmail.com).
    """
    customer_name = getattr(shipment, "customer", "") or "Customer"
    order_id = getattr(shipment, "order_id", "")
    courier = getattr(shipment, "courier", "Courier")
    tracking_number = getattr(shipment, "tracking_number", "")
    loc_str = f" at {location}" if location else ""

    subject = f"Your Order {order_id} Has Reached Its Destination"

    text_body = (
        f"Hi {customer_name},\n\n"
        f"Your shipment for order {order_id} has arrived{loc_str} "
        f"via {courier} (Tracking #: {tracking_number}).\n\n"
        "It will be dispatched for final doorstep delivery shortly.\n\n"
        "— Retail Mart Orders Team"
    )

    html_body = render_email_template(
        "shipment_arrived.html",
        subject=subject,
        header_badge="Hub Arrival",
        customer_name=customer_name,
        order_id=order_id,
        courier=courier,
        tracking_number=tracking_number,
        location=location,
    )
    return subject, text_body, html_body


def shipment_out_for_delivery_email(shipment) -> tuple[str, str, str]:
    """
    Returns (subject, text_body, html_body) when shipment reaches 'Out for Delivery'.
    Sender: Retail Mart Orders (retailmart.orders@gmail.com).
    """
    customer_name = getattr(shipment, "customer", "") or "Customer"
    order_id = getattr(shipment, "order_id", "")
    courier = getattr(shipment, "courier", "Courier")
    tracking_number = getattr(shipment, "tracking_number", "")

    subject = f"Your Order {order_id} Is Out for Delivery"

    text_body = (
        f"Hi {customer_name},\n\n"
        f"Your order {order_id} ({courier} / {tracking_number}) "
        "is out for delivery today! Please ensure someone is available to receive it.\n\n"
        "— Retail Mart Orders Team"
    )

    html_body = render_email_template(
        "out_for_delivery.html",
        subject=subject,
        header_badge="Out For Delivery",
        customer_name=customer_name,
        order_id=order_id,
        courier=courier,
        tracking_number=tracking_number,
    )
    return subject, text_body, html_body


def shipment_delivered_email(shipment) -> tuple[str, str, str]:
    """
    Returns (subject, text_body, html_body) when shipment reaches 'Delivered'.
    Sender: Retail Mart Orders (retailmart.orders@gmail.com).
    """
    customer_name = getattr(shipment, "customer", "") or "Customer"
    order_id = getattr(shipment, "order_id", "")
    courier = getattr(shipment, "courier", "Courier")
    tracking_number = getattr(shipment, "tracking_number", "")

    subject = f"Your Order {order_id} Has Been Delivered"

    text_body = (
        f"Hi {customer_name},\n\n"
        f"Your order {order_id} has been delivered successfully!\n\n"
        f"Delivered via: {courier}\n"
        f"Tracking number: {tracking_number}\n\n"
        "If you have any questions or feedback regarding your delivery, our support team is here to assist.\n\n"
        "— Retail Mart Orders Team"
    )

    html_body = render_email_template(
        "delivered.html",
        subject=subject,
        header_badge="Delivered",
        customer_name=customer_name,
        order_id=order_id,
        courier=courier,
        tracking_number=tracking_number,
    )
    return subject, text_body, html_body


def shipment_thank_you_email(shipment) -> tuple[str, str, str]:
    """
    Returns (subject, text_body, html_body) as a dedicated post-delivery appreciation email.
    Sender: Retail Mart Support (retailmart.support@gmail.com).
    Must NOT contain any individual developer/student names.
    """
    customer_name = getattr(shipment, "customer", "") or "Valued Customer"
    first_name = customer_name.split(" ")[0]
    order_id = getattr(shipment, "order_id", "")

    subject = "Thank You for Shopping with Retail Mart"

    text_body = (
        f"Dear {first_name},\n\n"
        f"Thank you for shopping with Retail Mart! Your package for order {order_id} "
        "has been completed.\n\n"
        "We are honored to have you as a customer and hope you thoroughly enjoy your purchase. "
        "Please feel free to share your product reviews or reach out if you need any post-delivery support.\n\n"
        "We look forward to serving you again soon!\n\n"
        "Warm regards,\n"
        "— Retail Mart Support Team"
    )

    html_body = render_email_template(
        "thank_you.html",
        subject=subject,
        header_badge="Thank You",
        first_name=first_name,
        order_id=order_id,
    )
    return subject, text_body, html_body


def campaign_email(campaign) -> tuple[str, str, str]:
    """
    Returns (subject, text_body, html_body) for marketing campaign blasts.
    Sender: Retail Mart Marketing (retailmart.marketing@gmail.com).
    """
    name = getattr(campaign, "name", "Promotional Offer")
    code = getattr(campaign, "code", "SAVE")
    description = getattr(campaign, "description", "")
    discount_val = getattr(campaign, "discount_value", 10)
    discount_type = getattr(campaign, "discount_type", "percentage")
    discount_text = f"{discount_val}%" if discount_type == "percentage" else f"Rs. {discount_val}"
    min_purchase = getattr(campaign, "min_purchase", None)
    end_date = getattr(campaign, "end_date", None)
    validity_str = end_date.strftime("%d %b %Y") if hasattr(end_date, "strftime") and end_date else "further notice"

    subject = name

    min_purch_line = f" (min. purchase Rs. {float(min_purchase):,.2f})" if min_purchase else ""
    text_body = (
        f"{description}\n\n"
        f"Use code {code} for {discount_text} off{min_purch_line}.\n"
        f"Valid until {validity_str}.\n\n"
        "— Retail Mart Marketing"
    )

    html_body = render_email_template(
        "campaign.html",
        subject=subject,
        header_badge="Promotion",
        is_marketing=True,
        campaign_name=name,
        promo_code=code,
        description=description,
        discount_text=discount_text,
        min_purchase=f"{float(min_purchase):,.2f}" if min_purchase else None,
        validity_date=validity_str,
    )
    return subject, text_body, html_body
