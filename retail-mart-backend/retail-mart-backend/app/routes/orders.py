import logging
from datetime import datetime, date

from flask import Blueprint, request, jsonify, send_file, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from sqlalchemy.orm import selectinload, configure_mappers

from app.extensions import db
from app.models.order import Order, OrderItem, OrderStatusEvent, ORDER_STATUS_TRANSITIONS, ORDER_STATUSES, ORDER_PAYMENT_STATUSES
from app.models.payment import Payment, PaymentStatusEvent
from app.models.shipment import Shipment
from app.utils.decorators import roles_required
from app.utils.ids import next_sequential_id, random_suffix
from app.utils.pdf import build_invoice_pdf
from app.utils.email import send_email, order_confirmation_email, ensure_delivery_result

orders_bp = Blueprint("orders", __name__)
logger = logging.getLogger(__name__)


def _order_eager_options():
    """
    Eagerly loads items, status_history, payments, and shipments in 5 batch queries
    instead of 1 + (N * 4) sequential queries, eliminating N+1 query latency over remote DB.
    """
    configure_mappers()
    return (
        selectinload(Order.items),
        selectinload(Order.status_history),
        selectinload(Order.payments),
        selectinload(Order.shipments),
    )


@orders_bp.get("")
@roles_required("Admin", "Manager", "Staff")
def list_orders():
    """
    List All Orders
    Get the list of all customer orders with their items, payment status, and delivery status. Admin, Manager, or Staff access required.
    ---
    tags:
      - Orders
    security:
      - Bearer: []
    parameters:
      - in: query
        name: status
        type: string
        required: false
        description: Filter by order status (Pending, Processing, Shipped, Delivered, Cancelled).
      - in: query
        name: paymentStatus
        type: string
        required: false
        description: Filter by payment status (Pending, Paid, Failed, Refunded).
    responses:
      200:
        description: Request successful. Returns the list of orders.
        schema:
          type: array
          items:
            $ref: '#/definitions/Order'
      401:
        description: Authentication is required or the provided token is invalid.
      403:
        description: You do not have permission to perform this action.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    query = Order.query.options(*_order_eager_options())
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
    """
    List Customer Orders
    Get the list of orders placed by the currently logged-in customer. Customer authentication required.
    ---
    tags:
      - Orders
    security:
      - Bearer: []
    responses:
      200:
        description: Request successful. Returns the customer's order history.
        schema:
          type: array
          items:
            $ref: '#/definitions/Order'
      401:
        description: Authentication is required or the provided token is invalid.
      403:
        description: You do not have permission to perform this action.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    orders = (
        Order.query.options(*_order_eager_options())
        .filter_by(user_id=get_jwt_identity())
        .order_by(Order.created_at.desc())
        .all()
    )
    return jsonify([o.to_dict() for o in orders])


@orders_bp.get("/<order_id>")
@roles_required("Admin", "Manager", "Staff")
def get_order(order_id):
    """
    Get Order by ID
    Get the details of a specific order using its order ID. Authentication is required. Admin, Manager, or Staff access required.
    ---
    tags:
      - Orders
    security:
      - Bearer: []
    parameters:
      - in: path
        name: order_id
        type: string
        required: true
        description: Unique order ID (e.g. ORD-1001).
    responses:
      200:
        description: Request successful. Returns the requested order details.
        schema:
          $ref: '#/definitions/Order'
      401:
        description: Authentication is required or the provided token is invalid.
      403:
        description: You do not have permission to perform this action.
        schema:
          $ref: '#/definitions/ErrorResponse'
      404:
        description: The requested resource was not found.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    order = Order.query.options(*_order_eager_options()).filter_by(id=order_id).first()
    if not order:
        return jsonify({"error": "Order not found"}), 404
    return jsonify(order.to_dict())


@orders_bp.post("")
@roles_required("Admin", "Manager", "Staff", "Customer")
def create_order():
    """
    Create Order
    Create a new order by sending the required order and product details. Authentication is required.
    ---
    tags:
      - Orders
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        description: Enter order details including customer name, email, and item list.
        schema:
          type: object
          required:
            - customer
            - customerEmail
            - items
          properties:
            customer:
              type: string
              description: Customer full name.
              example: Ananya Rao
            customerEmail:
              type: string
              description: Customer email address.
              example: ananya.rao@example.com
            items:
              type: array
              description: List of purchased items with product name, quantity, and price.
              items:
                $ref: '#/definitions/OrderItem'
    responses:
      201:
        description: Order created successfully.
        schema:
          $ref: '#/definitions/Order'
      400:
        description: Invalid or missing request data.
        schema:
          $ref: '#/definitions/ErrorResponse'
      401:
        description: Authentication is required or the provided token is invalid.
      403:
        description: You do not have permission to perform this action.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
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
        user_id=get_jwt_identity(),
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
    db.session.flush()

    # Pre-create initial Pending payment record for Razorpay checkout or manual collection
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

    logger.info("Order created order_id=%s user_id=%s amount=%.2f items=%d",
                order.id, order.user_id, amount, len(items))

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
    Update Order Status
    Update the status of an existing order. The allowed status values are shown in the request body. Admin or Manager access required.
    ---
    tags:
      - Orders
    security:
      - Bearer: []
    parameters:
      - in: path
        name: order_id
        type: string
        required: true
        description: Unique order ID.
      - in: body
        name: body
        required: true
        description: Enter the new order status.
        schema:
          type: object
          required:
            - status
          properties:
            status:
              type: string
              description: New order status (Pending, Processing, Shipped, Delivered, Cancelled).
              example: Processing
              enum: [Pending, Processing, Shipped, Delivered, Cancelled]
    responses:
      200:
        description: Order status updated successfully.
        schema:
          $ref: '#/definitions/Order'
      400:
        description: Invalid or missing request data.
        schema:
          $ref: '#/definitions/ErrorResponse'
      401:
        description: Authentication is required or the provided token is invalid.
      403:
        description: You do not have permission to perform this action.
        schema:
          $ref: '#/definitions/ErrorResponse'
      404:
        description: The requested resource was not found.
        schema:
          $ref: '#/definitions/ErrorResponse'
      409:
        description: Status transition not allowed.
        schema:
          $ref: '#/definitions/ErrorResponse'
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

    old_status = order.status
    order.status = new_status
    order.status_history.append(
        OrderStatusEvent(status=new_status, date=date.today(), changed_by=get_jwt_identity())
    )
    db.session.commit()
    logger.info("Order status changed order_id=%s from=%s to=%s", order_id, old_status, new_status)
    return jsonify(order.to_dict())


@orders_bp.patch("/<order_id>/payment-status")
@roles_required("Admin", "Manager")
def update_order_payment_status(order_id):
    """
    Update Order Payment Status
    Update the payment status of an existing order using its order ID. Admin or Manager access required.
    ---
    tags:
      - Orders
    security:
      - Bearer: []
    parameters:
      - in: path
        name: order_id
        type: string
        required: true
        description: Unique order ID.
      - in: body
        name: body
        required: true
        description: Enter the target payment status.
        schema:
          type: object
          required:
            - paymentStatus
          properties:
            paymentStatus:
              type: string
              description: New payment status (Pending, Paid, Failed, Refunded).
              example: Paid
              enum: [Pending, Paid, Failed, Refunded]
    responses:
      200:
        description: Order payment status updated successfully.
        schema:
          $ref: '#/definitions/Order'
      400:
        description: Invalid or missing request data.
        schema:
          $ref: '#/definitions/ErrorResponse'
      401:
        description: Authentication is required or the provided token is invalid.
      403:
        description: You do not have permission to perform this action.
        schema:
          $ref: '#/definitions/ErrorResponse'
      404:
        description: The requested resource was not found.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404
    data = request.get_json(silent=True) or {}
    status = data.get("paymentStatus")
    if status not in ORDER_PAYMENT_STATUSES:
        return jsonify({"error": f"paymentStatus must be one of {ORDER_PAYMENT_STATUSES}"}), 400
    old_pay_status = order.payment_status
    order.payment_status = status
    db.session.commit()
    logger.info("Order payment status changed order_id=%s from=%s to=%s", order_id, old_pay_status, status)
    return jsonify(order.to_dict())


@orders_bp.get("/<order_id>/invoice")
@roles_required("Admin", "Manager", "Staff", "Customer")
def download_order_invoice(order_id):
    """
    Download Order Invoice PDF
    Download the official PDF invoice for a specific order using its order ID. Authentication is required. Customers can only download their own invoices.
    ---
    tags:
      - Orders
    security:
      - Bearer: []
    produces:
      - application/pdf
    parameters:
      - in: path
        name: order_id
        type: string
        required: true
        description: Unique order ID.
    responses:
      200:
        description: Request successful. Returns the invoice PDF file.
        schema:
          type: file
      401:
        description: Authentication is required or the provided token is invalid.
      403:
        description: You do not have permission to perform this action.
        schema:
          $ref: '#/definitions/ErrorResponse'
      404:
        description: The requested resource was not found.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404
    if get_jwt().get("role") == "Customer" and order.user_id != get_jwt_identity():
        return jsonify({"error": "Forbidden"}), 403

    logger.info("Invoice downloaded order_id=%s", order_id)
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
    """
    Delete Order
    Permanently delete an order and associated records using the order ID. Admin access required.
    ---
    tags:
      - Orders
    security:
      - Bearer: []
    parameters:
      - in: path
        name: order_id
        type: string
        required: true
        description: Unique order ID to delete.
    responses:
      204:
        description: Order deleted successfully.
        schema:
          type: string
      401:
        description: Authentication is required or the provided token is invalid.
      403:
        description: You do not have permission to perform this action.
        schema:
          $ref: '#/definitions/ErrorResponse'
      404:
        description: The requested resource was not found.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404
    db.session.delete(order)
    db.session.commit()
    logger.info("Order deleted order_id=%s", order_id)
    return "", 204
