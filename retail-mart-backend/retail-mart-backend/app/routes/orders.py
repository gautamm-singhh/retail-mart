import logging
from datetime import datetime, date
from decimal import Decimal

from flask import Blueprint, request, jsonify, send_file, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt, verify_jwt_in_request

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
    query = query.order_by(Order.created_at.desc())
    limit = request.args.get("limit", type=int)
    if limit and limit > 0:
        query = query.limit(limit)
    orders = query.all()
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
    items = data.get("items") or []

    # Check for authoritative tax quote mode (without saving order, guest-accessible)
    if request.args.get("quote") or data.get("quoteOnly"):
        if not items:
            return jsonify({"error": "at least one item is required"}), 400
        from app.utils.tax import calculate_order_tax_breakdown
        breakdown = calculate_order_tax_breakdown(
            items=items,
            destination_state=(data.get("destinationState") or data.get("state") or "").strip(),
            discount_amount=Decimal(str(data.get("discount", 0))),
            delivery_fee=Decimal(str(data.get("deliveryFee", 0))),
        )
        return jsonify(breakdown), 200

    # Real order placement requires verified JWT with permitted role
    verify_jwt_in_request()
    claims = get_jwt()
    allowed_roles = ("Admin", "Manager", "Staff", "Customer")
    if allowed_roles and claims.get("role") not in allowed_roles:
        logger.warning(
            "Unauthorized access attempt: user_id=%s role=%s endpoint=create_order required_roles=%s",
            claims.get("sub"),
            claims.get("role"),
            allowed_roles,
        )
        return jsonify({"error": "Forbidden: insufficient role"}), 403

    customer = (data.get("customer") or "").strip()
    customer_email = (data.get("customerEmail") or "").strip()

    if not customer or not customer_email:
        return jsonify({"error": "customer and customerEmail are required"}), 400
    if not items:
        return jsonify({"error": "at least one item is required"}), 400

    from app.models.catalog import Product
    from app.utils.tax import calculate_order_tax_breakdown

    # Independent server-side validation against real MySQL product catalog
    validated_order_items = []
    for item in items:
        if not isinstance(item, dict):
            return jsonify({"error": "Each item must be an object with product details"}), 400

        product_id = (item.get("productId") or item.get("id") or "").strip()
        product_name = (item.get("productName") or item.get("name") or "").strip()
        is_demo = bool(item.get("isDemo", False))

        # 1. Independent rejection of demo products and demo product IDs
        if is_demo or product_id.startswith("demo-"):
            logger.warning("Order creation rejected: demo item detected id=%s name=%s", product_id, product_name)
            return jsonify({"error": f"Demo product '{product_name or product_id}' cannot be purchased or ordered."}), 400

        # 2. Lookup product in live MySQL database with row-level lock
        prod_query = None
        if product_id:
            prod_query = Product.query.filter_by(id=product_id)
        elif product_name:
            prod_query = Product.query.filter_by(name=product_name)

        if prod_query is not None:
            if db.engine.name != "sqlite":
                prod_query = prod_query.with_for_update()
            product = prod_query.first()
        else:
            product = None

        if not product:
            logger.warning("Order creation rejected: product not found in inventory id=%s name=%s", product_id, product_name)
            return jsonify({"error": f"Product '{product_id or product_name}' not found in live inventory."}), 400

        if product.id.startswith("demo-"):
            return jsonify({"error": f"Demo product '{product.name}' is not real inventory."}), 400

        # 3. Check product status (reject draft / inactive / unapproved products)
        if product.status != "active":
            logger.warning("Order creation rejected: inactive product id=%s status=%s", product.id, product.status)
            return jsonify({"error": f"Product '{product.name}' is not currently available for purchase (status: {product.status})."}), 400

        # 4. Validate quantity (must be positive integer)
        raw_quantity = item.get("quantity")
        try:
            quantity = int(raw_quantity)
            if quantity <= 0:
                raise ValueError()
        except (TypeError, ValueError):
            return jsonify({"error": f"Invalid quantity for '{product.name}'. Quantity must be a positive integer."}), 400

        # 5. Check real inventory stock (reject zero-stock and insufficient stock)
        if product.stock <= 0:
            logger.warning("Order creation rejected: zero stock for product id=%s", product.id)
            return jsonify({"error": f"Product '{product.name}' is out of stock (available: 0)."}), 400
        if quantity > product.stock:
            logger.warning("Order creation rejected: requested quantity %d exceeds stock %d for product id=%s",
                           quantity, product.stock, product.id)
            return jsonify({"error": f"Requested quantity {quantity} for '{product.name}' exceeds available stock ({product.stock})."}), 400

        # 6. Reject price tampering / manipulation
        expected_price = Decimal(str(product.price))
        if "price" in item and item["price"] is not None:
            try:
                submitted_price = Decimal(str(item["price"]))
                if abs(submitted_price - expected_price) > Decimal("0.01"):
                    logger.warning("Order creation rejected: price tampering detected for product id=%s submitted=%.2f expected=%.2f",
                                   product.id, submitted_price, expected_price)
                    return jsonify({"error": f"Price mismatch for '{product.name}'. Expected ₹{expected_price:.2f}, got ₹{submitted_price:.2f}."}), 400
            except (TypeError, ValueError):
                return jsonify({"error": f"Invalid price format for '{product.name}'."}), 400

        validated_order_items.append({
            "productId": product.id,
            "productName": product.name,
            "sku": product.sku,
            "quantity": quantity,
            "price": float(expected_price),
        })

    # Server-side authoritative tax & total validation using validated catalog items
    tax_breakdown = calculate_order_tax_breakdown(
        items=validated_order_items,
        destination_state=data.get("destinationState") or "",
    )
    amount = tax_breakdown["total_payable"]

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
    # Store immutable order-time tax snapshot if column exists in database
    try:
        from sqlalchemy import inspect
        insp = inspect(db.engine)
        if "tax_snapshot" in {c["name"] for c in insp.get_columns("orders")}:
            order.tax_snapshot = tax_breakdown
    except Exception:
        pass

    for i in validated_order_items:
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
