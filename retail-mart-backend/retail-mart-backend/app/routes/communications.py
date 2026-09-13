from flask import Blueprint, request, jsonify

from app.models.order import Order
from app.utils.decorators import roles_required
from app.utils.email import send_email, order_confirmation_email

communications_bp = Blueprint("communications", __name__)


@communications_bp.post("/send")
@roles_required("Admin", "Manager", "Staff")
def send_generic_email():
    """Generic escape hatch: send any {to, subject, body} through the same email pipeline."""
    data = request.get_json(silent=True) or {}
    to = data.get("to")
    subject = data.get("subject")
    body = data.get("body")

    if not to or not subject or not body:
        return jsonify({"error": "to, subject, and body are required"}), 400

    sent = send_email(to, subject, body)
    return jsonify({"sent": sent})


@communications_bp.post("/orders/<order_id>/confirmation")
@roles_required("Admin", "Manager", "Staff")
def send_order_confirmation(order_id):
    """Re-sends (or sends) the order confirmation email for an order - reuses order_confirmation_email()."""
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404

    recipient_email = order.customer_email
    if not recipient_email and order.user:
        recipient_email = order.user.email

    if not recipient_email:
        return jsonify({"error": "Order has no recipient email address", "sent": False}), 400

    subject, body = order_confirmation_email(order)
    sent = send_email(recipient_email, subject, body)
    return jsonify({"sent": sent})


@communications_bp.get("/smtp-status")
@roles_required("Admin", "Manager", "Staff")
def get_smtp_status():
    """Checks and reports the SMTP server connection status without exposing secrets."""
    from app.utils.email import test_smtp_connection
    return jsonify(test_smtp_connection())
