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
    """
    List Receipts
    Get the list of all issued payment receipts, with optional filtering by order ID. Admin, Manager, or Staff access required.
    ---
    tags:
      - Receipts
    security:
      - Bearer: []
    parameters:
      - in: query
        name: orderId
        type: string
        required: false
        description: Filter receipts by order ID.
    responses:
      200:
        description: Request successful. Returns the list of receipts.
        schema:
          type: array
          items:
            $ref: '#/definitions/Receipt'
      401:
        description: Authentication is required or the provided token is invalid.
      403:
        description: You do not have permission to perform this action.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    order_id = request.args.get("orderId")
    query = Receipt.query.join(Payment)
    if order_id:
        query = query.filter(Payment.order_id == order_id)
    receipts = query.order_by(Receipt.issued_at.desc()).all()
    return jsonify([r.to_dict() for r in receipts])


@receipts_bp.get("/<receipt_id>")
@roles_required("Admin", "Manager", "Staff")
def get_receipt(receipt_id):
    """
    Get Receipt by ID
    Get the details of a specific payment receipt using its receipt ID. Admin, Manager, or Staff access required.
    ---
    tags:
      - Receipts
    security:
      - Bearer: []
    parameters:
      - in: path
        name: receipt_id
        type: string
        required: true
        description: Unique receipt ID (e.g. RCT-1001).
    responses:
      200:
        description: Request successful. Returns the requested receipt details.
        schema:
          $ref: '#/definitions/Receipt'
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
    receipt = Receipt.query.get(receipt_id)
    if not receipt:
        return jsonify({"error": "Receipt not found"}), 404
    return jsonify(receipt.to_dict())


@receipts_bp.post("")
@roles_required("Admin", "Manager")
def create_receipt():
    """
    Create Payment Receipt
    Generate an official receipt for a completed payment by sending the payment ID. Admin or Manager access required.
    ---
    tags:
      - Receipts
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        description: Enter the payment ID for which to issue a receipt.
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
      201:
        description: Receipt created successfully.
        schema:
          $ref: '#/definitions/Receipt'
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
      409:
        description: Payment is not Paid or receipt already exists.
        schema:
          $ref: '#/definitions/ErrorResponse'
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
