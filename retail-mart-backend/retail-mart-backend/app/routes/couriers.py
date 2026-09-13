"""
Registered Courier / Shipping Partner management.

GET    /api/couriers           — list active couriers (Admin/Manager/Staff)
POST   /api/couriers           — create courier        (Admin/Manager)
GET    /api/couriers/<id>      — single courier detail  (Admin/Manager/Staff)
PUT    /api/couriers/<id>      — full update           (Admin/Manager)
PATCH  /api/couriers/<id>/status — toggle is_active    (Admin/Manager)
DELETE /api/couriers/<id>      — delete courier        (Admin only)

Staff can read couriers (needed so ShipmentForm dropdown works for Staff
who create shipments), but cannot create, edit, or delete courier records.
"""

from flask import Blueprint, request, jsonify

from app.extensions import db
from app.models.courier import Courier
from app.utils.decorators import roles_required
from app.utils.ids import random_suffix

couriers_bp = Blueprint("couriers", __name__)


@couriers_bp.get("")
@roles_required("Admin", "Manager", "Staff")
def list_couriers():
    """Returns all couriers.  ?active=true returns only is_active=True ones."""
    active_only = request.args.get("active", "").lower() == "true"
    query = Courier.query
    if active_only:
        query = query.filter_by(is_active=True)
    couriers = query.order_by(Courier.name).all()
    return jsonify([c.to_dict() for c in couriers])


@couriers_bp.post("")
@roles_required("Admin", "Manager")
def create_courier():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    code = (data.get("code") or "").strip().upper()
    contact_email = (data.get("contactEmail") or "").strip() or None
    tracking_url = (data.get("trackingUrlTemplate") or "").strip() or None
    is_active = data.get("isActive", True)

    if not name:
        return jsonify({"error": "name is required"}), 400
    if not code:
        return jsonify({"error": "code is required"}), 400

    # Uniqueness checks
    if Courier.query.filter_by(name=name).first():
        return jsonify({"error": f"A courier named '{name}' already exists"}), 409
    if Courier.query.filter_by(code=code).first():
        return jsonify({"error": f"Courier code '{code}' is already taken"}), 409

    courier = Courier(
        id=f"CUR-{random_suffix(5)}",
        name=name,
        code=code,
        contact_email=contact_email,
        tracking_url_template=tracking_url,
        is_active=bool(is_active),
    )
    db.session.add(courier)
    db.session.commit()
    return jsonify(courier.to_dict()), 201


@couriers_bp.get("/<courier_id>")
@roles_required("Admin", "Manager", "Staff")
def get_courier(courier_id):
    courier = Courier.query.get(courier_id)
    if not courier:
        return jsonify({"error": "Courier not found"}), 404
    return jsonify(courier.to_dict())


@couriers_bp.put("/<courier_id>")
@roles_required("Admin", "Manager")
def update_courier(courier_id):
    courier = Courier.query.get(courier_id)
    if not courier:
        return jsonify({"error": "Courier not found"}), 404

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    code = (data.get("code") or "").strip().upper()

    if not name:
        return jsonify({"error": "name is required"}), 400
    if not code:
        return jsonify({"error": "code is required"}), 400

    # Check uniqueness against other records (allow same-courier update)
    dup_name = Courier.query.filter(Courier.name == name, Courier.id != courier_id).first()
    if dup_name:
        return jsonify({"error": f"A courier named '{name}' already exists"}), 409
    dup_code = Courier.query.filter(Courier.code == code, Courier.id != courier_id).first()
    if dup_code:
        return jsonify({"error": f"Courier code '{code}' is already taken"}), 409

    courier.name = name
    courier.code = code
    courier.contact_email = (data.get("contactEmail") or "").strip() or None
    courier.tracking_url_template = (data.get("trackingUrlTemplate") or "").strip() or None
    if "isActive" in data:
        courier.is_active = bool(data["isActive"])

    db.session.commit()
    return jsonify(courier.to_dict())


@couriers_bp.patch("/<courier_id>/status")
@roles_required("Admin", "Manager")
def toggle_courier_status(courier_id):
    courier = Courier.query.get(courier_id)
    if not courier:
        return jsonify({"error": "Courier not found"}), 404

    data = request.get_json(silent=True) or {}
    is_active = data.get("isActive")
    if is_active is None:
        return jsonify({"error": "isActive (boolean) is required"}), 400

    courier.is_active = bool(is_active)
    db.session.commit()
    return jsonify(courier.to_dict())


@couriers_bp.delete("/<courier_id>")
@roles_required("Admin")
def delete_courier(courier_id):
    courier = Courier.query.get(courier_id)
    if not courier:
        return jsonify({"error": "Courier not found"}), 404

    # Prevent deletion if shipments reference this courier
    from app.models.shipment import Shipment
    linked = Shipment.query.filter_by(courier_id=courier_id).count()
    if linked > 0:
        return jsonify({
            "error": f"Cannot delete: {linked} shipment(s) reference this courier. Deactivate it instead."
        }), 409

    db.session.delete(courier)
    db.session.commit()
    return "", 204
