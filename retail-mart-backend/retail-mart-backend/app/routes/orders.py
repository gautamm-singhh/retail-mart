from datetime import datetime, date

from flask import Blueprint, request, jsonify, send_file, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from app.extensions import db
from app.models.order import Order, OrderItem, OrderStatusEvent, ORDER_STATUS_TRANSITIONS, ORDER_STATUSES, ORDER_PAYMENT_STATUSES
from app.models.payment import Payment, PaymentStatusEvent
from app.utils.decorators import roles_required
from app.utils.ids import next_sequential_id, random_suffix
from app.utils.pdf import build_invoice_pdf
from app.utils.email import send_email, order_confirmation_email, ensure_delivery_result

orders_bp = Blueprint("orders", __name__)


@orders_bp.get("")
@roles_required("Admin", "Manager", "Staff")
def list_orders():
    query = Order.query
    status = request.args.get("status")
    payment_status = request.args.get("paymentStatus")
    if status:
        query = query.filter(Order.status == status)
    if payment_status:
        query = query.filter(Order.payment_status == payment_status)
    orders = query.order_by(Order.created_at.desc()).all()
    return jsonify([o.to_dict() for o in orders])


@orders_bp.get("/mine")
@roles_required("Customer")
def list_my_orders():
    """Storefront "My Orders" page - the customer analogue of the admin's GET /orders."""
    orders = (
        Order.query.filter_by(user_id=get_jwt_identity()).order_by(Order.created_at.desc()).all()
    )
    return jsonify([o.to_dict() for o in orders])


@orders_bp.get("/<order_id>")
@roles_required("Admin", "Manager", "Staff")
def get_order(order_id):
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404
    return jsonify(order.to_dict())


@orders_bp.post("")
@roles_required("Admin", "Manager", "Staff", "Customer")
def create_order():
    """Used by both the admin console (manual order entry) and the storefront checkout."""
    data = request.get_json(silent=True) or {}
    customer = (data.get("customer") or "").strip()
    customer_email = (data.get("customerEmail") or "").strip()
    items = data.get("items") or []

    if not customer or not customer_email:
        return jsonify({"error": "customer and customerEmail are required"}), 400
    if not items:
        return jsonify({"error": "at least one item is required"}), 400

    amount = sum(float(i["price"]) * int(i["quantity"]) for i in items)
    order = Order(
        id=f"ORD-{random_suffix(5)}",
        user_id=get_jwt_identity(),  # ties the order to whoever's logged in, for GET /orders/mine
        customer=customer,
        customer_email=customer_email,
        date=date.today(),
        amount=amount,
        payment_status="Pending",
        status="Pending",
    )
    for i in items:
        order.items.append(OrderItem(product_name=i["productName"], quantity=i["quantity"], price=i["price"]))
    order.status_history.append(OrderStatusEvent(status="Pending", date=date.today()))

    db.session.add(order)
    db.session.flush()  # assigns order.id before the Payment below references it

    # Every order gets a Payment record up front, in "Pending" status - this
    # is what the storefront checkout immediately hands to RazorPay (see
    # POST /payments/razorpay/order), and what an admin can later collect
    # via PATCH /payments/<id>/status. One Payment per Order, created here
    # rather than as a separate step, means the checkout flow never has to
    # ask "does a payment exist yet?" - it always does.
    payment = Payment(
        id=f"PAY-{random_suffix(5)}",
        order_id=order.id,
        customer=customer,
        amount=amount,
        method="Pending",
        status="Pending",
        date=date.today(),
    )
    payment.history.append(PaymentStatusEvent(status="Pending", date=date.today()))
    db.session.add(payment)
    db.session.commit()

    recipient_email = (order.customer_email or "").strip() or (order.user.email.strip() if getattr(order, "user", None) and order.user.email else None)
    if recipient_email:
        subject, body, html_body = order_confirmation_email(order)
        current_app.logger.info("[EMAIL TRIGGER] Flow=ORDER Event=order_created OrderId=%s", order.id)
        current_app.logger.info("[EMAIL RECIPIENT] %s", recipient_email)
        current_app.logger.info("[EMAIL SENDER] orders")
        raw_result = send_email(recipient_email, subject, body, html_body=html_body, sender="orders")
        result = ensure_delivery_result(raw_result)
        current_app.logger.info(
            "[EMAIL RESULT] Success=%s Stage=%s Message=%s Refused=%s MessageId=%s",
            result.get("success"),
            result.get("stage"),
            result.get("message"),
            result.get("refused_recipients"),
            result.get("message_id"),
        )
    else:
        current_app.logger.warning("[EMAIL TRIGGER] Flow=ORDER Event=order_created OrderId=%s - SKIPPED: No recipient email found", order.id)

    return jsonify(order.to_dict()), 201


@orders_bp.patch("/<order_id>/status")
@roles_required("Admin", "Manager")
@jwt_required()
def update_order_status(order_id):
    """
    Enforces the same forward-only workflow as ORDER_STATUS_TRANSITIONS in
    src/types/order.ts, and appends a row to statusHistory.
    """
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404

    data = request.get_json(silent=True) or {}
    new_status = data.get("status")
    if new_status not in ORDER_STATUSES:
        return jsonify({"error": f"status must be one of {ORDER_STATUSES}"}), 400

    allowed = ORDER_STATUS_TRANSITIONS.get(order.status, [])
    if new_status not in allowed:
        return jsonify(
            {"error": f"Cannot move an order from '{order.status}' to '{new_status}'. Allowed: {allowed}"}
        ), 409

    order.status = new_status
    order.status_history.append(
        OrderStatusEvent(status=new_status, date=date.today(), changed_by=get_jwt_identity())
    )
    db.session.commit()
    return jsonify(order.to_dict())


@orders_bp.patch("/<order_id>/payment-status")
@roles_required("Admin", "Manager")
def update_order_payment_status(order_id):
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404
    data = request.get_json(silent=True) or {}
    status = data.get("paymentStatus")
    if status not in ORDER_PAYMENT_STATUSES:
        return jsonify({"error": f"paymentStatus must be one of {ORDER_PAYMENT_STATUSES}"}), 400
    order.payment_status = status
    db.session.commit()
    return jsonify(order.to_dict())


@orders_bp.get("/<order_id>/invoice")
@roles_required("Admin", "Manager", "Staff", "Customer")
def download_order_invoice(order_id):
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404
    if get_jwt().get("role") == "Customer" and order.user_id != get_jwt_identity():
        return jsonify({"error": "Forbidden"}), 403

    pdf_buffer = build_invoice_pdf(order)
    return send_file(
        pdf_buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"invoice-{order.id}.pdf",
    )


@orders_bp.delete("/<order_id>")
@roles_required("Admin")
def delete_order(order_id):
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404
    db.session.delete(order)
    db.session.commit()
    return "", 204
