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
    addresses = Address.query.filter_by(user_id=get_jwt_identity()).order_by(Address.created_at).all()
    return jsonify([a.to_dict() for a in addresses])


@addresses_bp.post("")
@roles_required("Customer")
def create_address():
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
    address = Address.query.filter_by(id=address_id, user_id=get_jwt_identity()).first()
    if not address:
        return jsonify({"error": "Address not found"}), 404
    db.session.delete(address)
    db.session.commit()
    return "", 204
