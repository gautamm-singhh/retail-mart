from datetime import date

from flask import Blueprint, request, jsonify, send_file, current_app
from flask_jwt_extended import get_jwt_identity, get_jwt

from app.extensions import db
from app.models.payment import Payment, PaymentStatusEvent, Receipt, PAYMENT_STATUSES, PAYMENT_METHODS
from app.models.order import Order
from app.utils.decorators import roles_required
from app.utils.ids import random_suffix
from app.utils.pdf import build_receipt_pdf
from app.utils.razorpay_client import get_razorpay_client, is_razorpay_live
from app.utils.email import send_email, receipt_email

payments_bp = Blueprint("payments", __name__)


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
    to = payment.order.customer_email if payment.order else None
    if not to:
        return
    receipt = _get_or_create_receipt(payment)
    pdf_buffer = build_receipt_pdf(payment, receipt)
    subject, body, html_body = receipt_email(payment)
    send_email(
        to,
        subject,
        body,
        html_body=html_body,
        sender="orders",
        attachments=[(f"receipt-{payment.id}.pdf", pdf_buffer.getvalue(), "application/pdf")],
    )


def _is_payment_owner(payment: Payment) -> bool:
    """True if the current JWT belongs to the Customer who placed this payment's order."""
    return bool(payment.order) and payment.order.user_id == get_jwt_identity()


@payments_bp.get("")
@roles_required("Admin", "Manager", "Staff")
def list_payments():
    query = Payment.query
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
    payment = Payment.query.get(payment_id)
    if not payment:
        return jsonify({"error": "Payment not found"}), 404
    if get_jwt().get("role") == "Customer" and not _is_payment_owner(payment):
        return jsonify({"error": "Forbidden"}), 403
    return jsonify(payment.to_dict())


@payments_bp.post("")
@roles_required("Admin", "Manager", "Staff")
def create_payment():
    """Records a payment attempt against an existing order. Storefront checkout doesn't use this - see create_order(), which creates one automatically."""
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
    return jsonify(payment.to_dict()), 201


@payments_bp.patch("/<payment_id>/status")
@roles_required("Admin", "Manager")
def update_payment_status(payment_id):
    payment = Payment.query.get(payment_id)
    if not payment:
        return jsonify({"error": "Payment not found"}), 404

    data = request.get_json(silent=True) or {}
    new_status = data.get("status")
    if new_status not in PAYMENT_STATUSES:
        return jsonify({"error": f"status must be one of {PAYMENT_STATUSES}"}), 400

    was_paid_already = payment.status == "Paid"
    payment.status = new_status
    payment.history.append(PaymentStatusEvent(status=new_status, date=date.today()))

    # Keep the parent order's paymentStatus in sync, same statuses reused.
    if payment.order:
        payment.order.payment_status = new_status

    db.session.commit()

    if new_status == "Paid" and not was_paid_already:
        _email_receipt(payment)  # best-effort, see _email_receipt()

    return jsonify(payment.to_dict())


@payments_bp.get("/<payment_id>/receipt")
@roles_required("Admin", "Manager", "Staff", "Customer")
def download_payment_receipt(payment_id):
    """
    Streams a PDF receipt for a payment, generating (and persisting) the
    Receipt record on first download if one doesn't exist yet - so the
    button just works without a separate "generate receipt" step, while
    still leaving a real Receipt row behind (ERD: RECEIPTS) for the record.
    Only available once the payment's status is "Paid".
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
    RazorPay integration, step 1: create a RazorPay order for an existing
    Payment record. Returns what the frontend's RazorPay Checkout widget
    needs to open. Works against a mock RazorPay client when no real keys
    are configured (see app/utils/razorpay_client.py) - the checkout flow
    is fully testable before a real account exists. Used by both the
    storefront checkout (Customer role) and the admin's payment detail
    page (Admin/Manager/Staff).
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
    RazorPay integration, step 2: verify RazorPay's signature and, if
    valid, mark the Payment "Paid" - reusing the exact same status-history/
    order-sync code path as PATCH /payments/<id>/status, so receipts,
    invoices, and the order's paymentStatus all just work once this
    succeeds. Also triggers the automatic receipt email (_email_receipt).
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
        return jsonify({"error": "Payment signature verification failed"}), 400

    payment.status = "Paid"
    payment.method = "RazorPay"
    payment.history.append(PaymentStatusEvent(status="Paid", date=date.today()))
    if payment.order:
        payment.order.payment_status = "Paid"
    db.session.commit()

    _email_receipt(payment)  # best-effort, see _email_receipt()

    return jsonify(payment.to_dict())
