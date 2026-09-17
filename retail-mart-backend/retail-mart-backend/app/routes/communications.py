from flask import Blueprint, request, jsonify

from app.models.order import Order
from app.utils.decorators import roles_required
from app.utils.email import send_email, order_confirmation_email, test_smtp_connection

communications_bp = Blueprint("communications", __name__)

ALLOWED_SENDERS = ("support", "orders", "marketing")


@communications_bp.post("/send")
@roles_required("Admin", "Manager", "Staff")
def send_generic_email():
    """
    Generic escape hatch: send any {to, subject, body} through the email pipeline.
    Validates explicit sender against: 'support', 'orders', 'marketing' (defaults to 'support').
    Does not allow arbitrary usernames from the client.
    """
    data = request.get_json(silent=True) or {}
    to = (data.get("to") or "").strip()
    subject = (data.get("subject") or "").strip()
    body = (data.get("body") or "").strip()
    sender = (data.get("sender") or "support").strip().lower()

    if not to or not subject or not body:
        return jsonify({"error": "to, subject, and body are required"}), 400

    if sender not in ALLOWED_SENDERS:
        return jsonify({"error": f"sender must be one of: {', '.join(ALLOWED_SENDERS)}"}), 400

    html_body = data.get("htmlBody")
    sent = send_email(to, subject, body, html_body=html_body, sender=sender)
    return jsonify({"sent": sent, "sender": sender})


@communications_bp.post("/orders/<order_id>/confirmation")
@roles_required("Admin", "Manager", "Staff")
def send_order_confirmation(order_id):
    """Re-sends (or sends) the order confirmation email for an order via the orders sender identity."""
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404

    recipient_email = order.customer_email
    if not recipient_email and order.user:
        recipient_email = order.user.email

    if not recipient_email:
        return jsonify({"error": "Order has no recipient email address", "sent": False}), 400

    subject, body, html_body = order_confirmation_email(order)
    sent = send_email(recipient_email, subject, body, html_body=html_body, sender="orders")
    return jsonify({"sent": sent})


@communications_bp.get("/smtp-status")
@roles_required("Admin", "Manager", "Staff")
def get_smtp_status():
    """Checks and reports multi-sender SMTP server connection status without exposing secrets."""
    sender_arg = request.args.get("sender")
    return jsonify(test_smtp_connection(sender=sender_arg))
