from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity

from app.extensions import db
from app.models.address import Address
from app.utils.decorators import roles_required
from app.utils.ids import random_suffix

addresses_bp = Blueprint("addresses", __name__)


@addresses_bp.get("")
@roles_required("Customer")
def list_addresses():
    """
    List Saved Addresses
    Get all saved shipping and billing addresses for your customer account. Customer authentication required.
    ---
    tags:
      - Addresses
    security:
      - Bearer: []
    responses:
      200:
        description: Request successful. Returns the list of saved addresses.
        schema:
          type: array
          items:
            $ref: '#/definitions/Address'
      401:
        description: Authentication is required or the provided token is invalid.
      403:
        description: You do not have permission to perform this action. Customer role required.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    addresses = Address.query.filter_by(user_id=get_jwt_identity()).order_by(Address.created_at).all()
    return jsonify([a.to_dict() for a in addresses])


@addresses_bp.post("")
@roles_required("Customer")
def create_address():
    """
    Create New Address
    Save a new shipping or billing address to your account. Customer authentication required.
    ---
    tags:
      - Addresses
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        description: Enter the address details. line1, city, state, and postalCode are required.
        schema:
          type: object
          required:
            - line1
            - city
            - state
            - postalCode
          properties:
            label:
              type: string
              description: Friendly label for the address (e.g. Home, Work).
              example: Home
            line1:
              type: string
              description: Primary street address or building details.
              example: Flat 402, Lotus Residency
            line2:
              type: string
              description: Apartment, suite, unit, or landmark details.
              example: Indiranagar 100ft Road
            city:
              type: string
              description: City name.
              example: Bengaluru
            state:
              type: string
              description: State or province name.
              example: Karnataka
            postalCode:
              type: string
              description: Postal or PIN code.
              example: "560038"
            phone:
              type: string
              description: Contact phone number for delivery.
              example: "+919876543210"
            isDefault:
              type: boolean
              description: Set to true to make this your default address.
              example: true
    responses:
      201:
        description: Address created successfully.
        schema:
          $ref: '#/definitions/Address'
      400:
        description: Invalid or missing request data. line1, city, state, and postalCode are required.
        schema:
          $ref: '#/definitions/ErrorResponse'
      401:
        description: Authentication is required or the provided token is invalid.
      403:
        description: You do not have permission to perform this action. Customer role required.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    data = request.get_json(silent=True) or {}
    line1 = (data.get("line1") or "").strip()
    city = (data.get("city") or "").strip()
    state = (data.get("state") or "").strip()
    postal_code = (data.get("postalCode") or "").strip()

    if not line1 or not city or not state or not postal_code:
        return jsonify({"error": "line1, city, state and postalCode are required"}), 400

    user_id = get_jwt_identity()
    is_default = bool(data.get("isDefault")) or Address.query.filter_by(user_id=user_id).count() == 0

    if is_default:
        Address.query.filter_by(user_id=user_id).update({"is_default": False})

    address = Address(
        id=f"ADDR-{random_suffix(5)}",
        user_id=user_id,
        label=data.get("label") or "Home",
        line1=line1,
        line2=data.get("line2"),
        city=city,
        state=state,
        postal_code=postal_code,
        phone=data.get("phone"),
        is_default=is_default,
    )
    db.session.add(address)
    db.session.commit()
    return jsonify(address.to_dict()), 201


@addresses_bp.put("/<address_id>")
@roles_required("Customer")
def update_address(address_id):
    """
    Update Address
    Update an existing address using its address ID. Customer authentication required.
    ---
    tags:
      - Addresses
    security:
      - Bearer: []
    parameters:
      - in: path
        name: address_id
        type: string
        required: true
        description: Unique address ID.
      - in: body
        name: body
        required: true
        description: Enter one or more address fields to update.
        schema:
          type: object
          properties:
            label:
              type: string
              description: Updated label for the address.
              example: Office
            line1:
              type: string
              description: Updated primary street address.
              example: Suite 1201, Tech Park
            line2:
              type: string
              description: Updated landmark or suite details.
              example: Whitefield
            city:
              type: string
              description: Updated city name.
              example: Bengaluru
            state:
              type: string
              description: Updated state or province name.
              example: Karnataka
            postalCode:
              type: string
              description: Updated postal or PIN code.
              example: "560066"
            phone:
              type: string
              description: Updated contact phone number.
              example: "+919876543210"
            isDefault:
              type: boolean
              description: Set to true to make this the default address.
              example: true
    responses:
      200:
        description: Address updated successfully.
        schema:
          $ref: '#/definitions/Address'
      401:
        description: Authentication is required or the provided token is invalid.
      403:
        description: You do not have permission to perform this action. Customer role required.
        schema:
          $ref: '#/definitions/ErrorResponse'
      404:
        description: The requested address was not found.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    user_id = get_jwt_identity()
    address = Address.query.filter_by(id=address_id, user_id=user_id).first()
    if not address:
        return jsonify({"error": "Address not found"}), 404

    data = request.get_json(silent=True) or {}
    for field, column in (
        ("label", "label"), ("line1", "line1"), ("line2", "line2"),
        ("city", "city"), ("state", "state"), ("postalCode", "postal_code"), ("phone", "phone"),
    ):
        if field in data:
            setattr(address, column, data[field])

    if data.get("isDefault"):
        Address.query.filter_by(user_id=user_id).update({"is_default": False})
        address.is_default = True

    db.session.commit()
    return jsonify(address.to_dict())


@addresses_bp.delete("/<address_id>")
@roles_required("Customer")
def delete_address(address_id):
    """
    Delete Address
    Delete a saved address using its address ID. Customer authentication required.
    ---
    tags:
      - Addresses
    security:
      - Bearer: []
    parameters:
      - in: path
        name: address_id
        type: string
        required: true
        description: Unique address ID to delete.
    responses:
      204:
        description: Address deleted successfully.
      401:
        description: Authentication is required or the provided token is invalid.
      403:
        description: You do not have permission to perform this action. Customer role required.
        schema:
          $ref: '#/definitions/ErrorResponse'
      404:
        description: The requested address was not found.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    address = Address.query.filter_by(id=address_id, user_id=get_jwt_identity()).first()
    if not address:
        return jsonify({"error": "Address not found"}), 404
    db.session.delete(address)
    db.session.commit()
    return "", 204
