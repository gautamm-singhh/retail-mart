from datetime import datetime

from flask import Blueprint, request, jsonify

from app.extensions import db
from app.models.payment import Payment, Receipt
from app.utils.decorators import roles_required
from app.utils.ids import random_suffix

receipts_bp = Blueprint("receipts", __name__)


@receipts_bp.get("")
@roles_required("Admin", "Manager", "Staff")
def list_receipts():
    order_id = request.args.get("orderId")
    query = Receipt.query.join(Payment)
    if order_id:
        query = query.filter(Payment.order_id == order_id)
    receipts = query.order_by(Receipt.issued_at.desc()).all()
    return jsonify([r.to_dict() for r in receipts])


@receipts_bp.get("/<receipt_id>")
@roles_required("Admin", "Manager", "Staff")
def get_receipt(receipt_id):
    receipt = Receipt.query.get(receipt_id)
    if not receipt:
        return jsonify({"error": "Receipt not found"}), 404
    return jsonify(receipt.to_dict())


@receipts_bp.post("")
@roles_required("Admin", "Manager")
def create_receipt():
    """
    Generates a receipt for a payment. Only valid once the payment's status
    is "Paid" - mirrors real-world behaviour where a receipt proves a
    completed payment, not a pending/failed one.
    """
    data = request.get_json(silent=True) or {}
    payment_id = data.get("paymentId")

    payment = Payment.query.get(payment_id) if payment_id else None
    if not payment:
        return jsonify({"error": "A valid paymentId is required"}), 400
    if payment.status != "Paid":
        return jsonify({"error": "Receipts can only be issued for payments with status 'Paid'"}), 409
    if payment.receipt:
        return jsonify({"error": "A receipt already exists for this payment"}), 409

    receipt = Receipt(
        id=f"RCT-{random_suffix(5)}",
        payment_id=payment.id,
        receipt_no=f"RCPT-{random_suffix(6)}",
        amount=payment.amount,
        issued_at=datetime.utcnow(),
    )
    db.session.add(receipt)
    db.session.commit()
    return jsonify(receipt.to_dict()), 201
