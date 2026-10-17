import logging
from datetime import date

from flask import Blueprint, request, jsonify, send_file, current_app
from flask_jwt_extended import get_jwt_identity, get_jwt
from sqlalchemy.orm import selectinload

from app.extensions import db
from app.models.payment import Payment, PaymentStatusEvent, Receipt, PAYMENT_STATUSES, PAYMENT_METHODS
from app.models.order import Order
from app.utils.decorators import roles_required
from app.utils.ids import random_suffix
from app.utils.pdf import build_receipt_pdf
from app.utils.razorpay_client import get_razorpay_client, is_razorpay_live
from app.utils.email import send_email, receipt_email, ensure_delivery_result

payments_bp = Blueprint("payments", __name__)
logger = logging.getLogger(__name__)


def _get_or_create_receipt(payment: Payment) -> Receipt:
    """Shared by the download endpoint and the auto-email-on-payment below - one Receipt per Payment, created lazily."""
    receipt = payment.receipt
    if not receipt:
        receipt = Receipt(
            id=f"RCT-{random_suffix(5)}",
            payment_id=payment.id,
            receipt_no=f"RCPT-{random_suffix(6)}",
            amount=payment.amount,
        )
        db.session.add(receipt)
        db.session.commit()
    return receipt


def _email_receipt(payment: Payment) -> None:
    """
    Automatically emails the customer their receipt (PDF attached) the
    moment a payment succeeds - called from both PATCH /payments/<id>/status
    (admin marks Paid) and POST /payments/razorpay/verify (customer pays via
    RazorPay), so this fires no matter which path a payment succeeded
    through. Best-effort: a failed send is logged, never blocks the
    response (see app/utils/email.py).
    """
    to = (payment.order.customer_email or "").strip() if payment.order and payment.order.customer_email else None
    if not to and payment.order and getattr(payment.order, "user", None) and payment.order.user.email:
        to = payment.order.user.email.strip()

    if not to:
        current_app.logger.warning("[EMAIL TRIGGER] Flow=PAYMENT Event=payment_receipt PaymentId=%s - SKIPPED: No recipient email found", payment.id)
        return

    receipt = _get_or_create_receipt(payment)
    pdf_buffer = build_receipt_pdf(payment, receipt)
    subject, body, html_body = receipt_email(payment)
    current_app.logger.info("[EMAIL TRIGGER] Flow=PAYMENT Event=payment_receipt PaymentId=%s OrderId=%s Amount=%s", payment.id, payment.order_id, payment.amount)
    current_app.logger.info("[EMAIL RECIPIENT] %s", to)
    current_app.logger.info("[EMAIL SENDER] orders")
    raw_result = send_email(
        to,
        subject,
        body,
        html_body=html_body,
        sender="orders",
        attachments=[(f"receipt-{payment.id}.pdf", pdf_buffer.getvalue(), "application/pdf")],
    )
    result = ensure_delivery_result(raw_result)
    current_app.logger.info(
        "[EMAIL RESULT] Success=%s Stage=%s Message=%s Refused=%s MessageId=%s",
        result.get("success"),
        result.get("stage"),
        result.get("message"),
        result.get("refused_recipients"),
        result.get("message_id"),
    )


def _is_payment_owner(payment: Payment) -> bool:
    """True if the current JWT belongs to the Customer who placed this payment's order."""
    return bool(payment.order) and payment.order.user_id == get_jwt_identity()


@payments_bp.get("")
@roles_required("Admin", "Manager", "Staff")
def list_payments():
    """
    List Payments
    Get the list of all payment transactions with their status, amount, and payment method. Admin, Manager, or Staff access required.
    ---
    tags:
      - Payments
    security:
      - Bearer: []
    parameters:
      - in: query
        name: status
        type: string
        required: false
        description: Filter by status (Pending, Paid, Failed, Refunded).
      - in: query
        name: orderId
        type: string
        required: false
        description: Filter by specific order ID.
    responses:
      200:
        description: Request successful. Returns the list of payments.
        schema:
          type: array
          items:
            $ref: '#/definitions/Payment'
      401:
        description: Authentication is required or the provided token is invalid.
      403:
        description: You do not have permission to perform this action.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    query = Payment.query.options(selectinload(Payment.history))
    status = request.args.get("status")
    order_id = request.args.get("orderId")
    if status:
        query = query.filter(Payment.status == status)
    if order_id:
        query = query.filter(Payment.order_id == order_id)
    payments = query.order_by(Payment.created_at.desc()).all()
    return jsonify([p.to_dict() for p in payments])


@payments_bp.get("/<payment_id>")
@roles_required("Admin", "Manager", "Staff", "Customer")
def get_payment(payment_id):
    """
    Get Payment by ID
    Get the details and status history of a specific payment using its payment ID. Authentication is required. Customers can only view their own payments.
    ---
    tags:
      - Payments
    security:
      - Bearer: []
    parameters:
      - in: path
        name: payment_id
        type: string
        required: true
        description: Unique payment ID (e.g. PAY-1001).
    responses:
      200:
        description: Request successful. Returns the requested payment details.
        schema:
          $ref: '#/definitions/Payment'
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
    payment = Payment.query.options(selectinload(Payment.history)).filter_by(id=payment_id).first()
    if not payment:
        return jsonify({"error": "Payment not found"}), 404
    if get_jwt().get("role") == "Customer" and not _is_payment_owner(payment):
        return jsonify({"error": "Forbidden"}), 403
    return jsonify(payment.to_dict())


@payments_bp.post("")
@roles_required("Admin", "Manager", "Staff")
def create_payment():
    """
    Create Payment Record
    Record a new payment attempt for an existing order by sending the order ID, method, and amount. Admin, Manager, or Staff access required.
    ---
    tags:
      - Payments
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        description: Enter payment details including order ID, payment method, and amount.
        schema:
          type: object
          required:
            - orderId
            - method
          properties:
            orderId:
              type: string
              description: Associated order ID.
              example: ORD-1001
            method:
              type: string
              description: Payment method used.
              example: UPI
              enum: [RazorPay, UPI, Card, COD, Pending]
            amount:
              type: number
              description: Total payment amount.
              example: 3499.0
    responses:
      201:
        description: Payment recorded successfully.
        schema:
          $ref: '#/definitions/Payment'
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
    order_id = data.get("orderId")
    method = data.get("method")

    order = Order.query.get(order_id) if order_id else None
    if not order:
        return jsonify({"error": "A valid orderId is required"}), 400
    if method not in PAYMENT_METHODS:
        return jsonify({"error": f"method must be one of {PAYMENT_METHODS}"}), 400

    payment = Payment(
        id=f"PAY-{random_suffix(5)}",
        order_id=order.id,
        customer=order.customer,
        amount=data.get("amount", order.amount),
        method=method,
        status="Pending",
        date=date.today(),
    )
    payment.history.append(PaymentStatusEvent(status="Pending", date=date.today()))
    db.session.add(payment)
    db.session.commit()
    logger.info("Payment record created payment_id=%s order_id=%s method=%s amount=%.2f",
                payment.id, order.id, method, payment.amount)
    return jsonify(payment.to_dict()), 201


@payments_bp.patch("/<payment_id>/status")
@roles_required("Admin", "Manager")
def update_payment_status(payment_id):
    """
    Update Payment Status
    Update the payment status of an existing transaction using its payment ID. Admin or Manager access required.
    ---
    tags:
      - Payments
    security:
      - Bearer: []
    parameters:
      - in: path
        name: payment_id
        type: string
        required: true
        description: Unique payment ID.
      - in: body
        name: body
        required: true
        description: Enter the new payment status.
        schema:
          type: object
          required:
            - status
          properties:
            status:
              type: string
              description: Target payment status (Pending, Paid, Failed, Refunded).
              example: Paid
              enum: [Pending, Paid, Failed, Refunded]
    responses:
      200:
        description: Payment status updated successfully.
        schema:
          $ref: '#/definitions/Payment'
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
    payment = Payment.query.get(payment_id)
    if not payment:
        return jsonify({"error": "Payment not found"}), 404

    data = request.get_json(silent=True) or {}
    new_status = data.get("status")
    if new_status not in PAYMENT_STATUSES:
        return jsonify({"error": f"status must be one of {PAYMENT_STATUSES}"}), 400

    was_paid_already = payment.status == "Paid"
    old_status = payment.status
    payment.status = new_status
    payment.history.append(PaymentStatusEvent(status=new_status, date=date.today()))

    # Keep the parent order's paymentStatus in sync, same statuses reused.
    if payment.order:
        payment.order.payment_status = new_status

    db.session.commit()

    logger.info("Payment status changed payment_id=%s order_id=%s from=%s to=%s",
                payment_id, payment.order_id, old_status, new_status)

    if new_status == "Paid" and not was_paid_already:
        _email_receipt(payment)  # best-effort, see _email_receipt()

    return jsonify(payment.to_dict())


@payments_bp.get("/<payment_id>/receipt")
@roles_required("Admin", "Manager", "Staff", "Customer")
def download_payment_receipt(payment_id):
    """
    Download Payment Receipt PDF
    Download the official PDF receipt for a paid transaction using its payment ID. Authentication is required. Customers can only download their own receipts.
    ---
    tags:
      - Payments
    security:
      - Bearer: []
    produces:
      - application/pdf
    parameters:
      - in: path
        name: payment_id
        type: string
        required: true
        description: Unique payment ID.
    responses:
      200:
        description: Request successful. Returns the payment receipt PDF file.
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
      409:
        description: Receipt is only available for Paid payments.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    payment = Payment.query.get(payment_id)
    if not payment:
        return jsonify({"error": "Payment not found"}), 404
    if get_jwt().get("role") == "Customer" and not _is_payment_owner(payment):
        return jsonify({"error": "Forbidden"}), 403
    if payment.status != "Paid":
        return jsonify({"error": "Receipts can only be issued for payments with status 'Paid'"}), 409

    receipt = _get_or_create_receipt(payment)
    pdf_buffer = build_receipt_pdf(payment, receipt)
    return send_file(
        pdf_buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"receipt-{payment.id}.pdf",
    )


@payments_bp.post("/razorpay/order")
@roles_required("Admin", "Manager", "Staff", "Customer")
def create_razorpay_order():
    """
    Create Razorpay Order
    Create a Razorpay order for online checkout using the payment ID. Returns checkout order credentials. Authentication is required.
    ---
    tags:
      - Payments
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        description: Enter the payment ID to initialize Razorpay checkout.
        schema:
          type: object
          required:
            - paymentId
          properties:
            paymentId:
              type: string
              description: Target payment ID.
              example: PAY-1001
    responses:
      200:
        description: Request successful. Returns Razorpay order details for checkout.
        schema:
          type: object
          properties:
            razorpayOrderId:
              type: string
              example: order_mock_123456
            amount:
              type: integer
              description: Amount in paise (1 INR = 100 paise)
              example: 349900
            currency:
              type: string
              example: INR
            keyId:
              type: string
              example: rzp_test_mock
            paymentId:
              type: string
              example: PAY-1001
            live:
              type: boolean
              example: false
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
    payment_id = data.get("paymentId")

    payment = Payment.query.get(payment_id) if payment_id else None
    if not payment:
        return jsonify({"error": "A valid paymentId is required"}), 400
    if get_jwt().get("role") == "Customer" and not _is_payment_owner(payment):
        return jsonify({"error": "Forbidden"}), 403

    client = get_razorpay_client()
    amount_paise = int(round(float(payment.amount) * 100))
    razorpay_order = client.order.create({"amount": amount_paise, "currency": "INR", "receipt": payment.id})

    logger.info("Razorpay order created payment_id=%s amount_paise=%d live=%s",
                payment.id, amount_paise, is_razorpay_live())

    return jsonify(
        {
            "razorpayOrderId": razorpay_order["id"],
            "amount": amount_paise,
            "currency": razorpay_order.get("currency", "INR"),
            "keyId": current_app.config.get("RAZORPAY_KEY_ID") or "rzp_test_mock",
            "paymentId": payment.id,
            "live": is_razorpay_live(),
        }
    )


@payments_bp.post("/razorpay/verify")
@roles_required("Admin", "Manager", "Staff", "Customer")
def verify_razorpay_payment():
    """
    Verify Razorpay Payment Signature
    Verify the cryptographic payment signature returned by Razorpay after checkout. Marks payment as Paid upon success. Authentication is required.
    ---
    tags:
      - Payments
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        description: Enter the payment ID, Razorpay order ID, payment ID, and HMAC signature.
        schema:
          type: object
          required:
            - paymentId
            - razorpayOrderId
            - razorpayPaymentId
            - razorpaySignature
          properties:
            paymentId:
              type: string
              description: Associated payment ID.
              example: PAY-1001
            razorpayOrderId:
              type: string
              description: Order ID generated by Razorpay.
              example: order_mock_123456
            razorpayPaymentId:
              type: string
              description: Payment transaction ID generated by Razorpay.
              example: pay_mock_654321
            razorpaySignature:
              type: string
              description: Cryptographic signature received from Razorpay.
              example: mock_signature_abc123
    responses:
      200:
        description: Request successful. Payment verified and marked as Paid.
        schema:
          $ref: '#/definitions/Payment'
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
    payment_id = data.get("paymentId")
    payment = Payment.query.get(payment_id) if payment_id else None
    if not payment:
        return jsonify({"error": "A valid paymentId is required"}), 400
    if get_jwt().get("role") == "Customer" and not _is_payment_owner(payment):
        return jsonify({"error": "Forbidden"}), 403

    required = ("razorpayOrderId", "razorpayPaymentId", "razorpaySignature")
    if not all(data.get(f) for f in required):
        return jsonify({"error": f"{', '.join(required)} are required"}), 400

    client = get_razorpay_client()
    is_valid = client.utility.verify_payment_signature(
        {
            "razorpay_order_id": data["razorpayOrderId"],
            "razorpay_payment_id": data["razorpayPaymentId"],
            "razorpay_signature": data["razorpaySignature"],
        }
    )
    if not is_valid:
        logger.warning("Razorpay signature verification failed payment_id=%s", payment_id)
        return jsonify({"error": "Payment signature verification failed"}), 400

    payment.status = "Paid"
    payment.method = "RazorPay"
    payment.history.append(PaymentStatusEvent(status="Paid", date=date.today()))
    if payment.order:
        payment.order.payment_status = "Paid"
    db.session.commit()

    logger.info("Razorpay payment verified and marked Paid payment_id=%s order_id=%s",
                payment_id, payment.order_id)

    _email_receipt(payment)  # best-effort, see _email_receipt()

    return jsonify(payment.to_dict())
