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
    """
    List Shipping Couriers
    Get the list of shipping courier partners. Admin, Manager, or Staff access required.
    ---
    tags:
      - Couriers
    security:
      - Bearer: []
    parameters:
      - in: query
        name: active
        type: boolean
        required: false
        description: Set to true to return only active courier partners.
    responses:
      200:
        description: Request successful. Returns the list of couriers.
        schema:
          type: array
          items:
            $ref: '#/definitions/Courier'
      401:
        description: Authentication is required or the provided token is invalid.
      403:
        description: You do not have permission to perform this action. Admin, Manager, or Staff role required.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    active_only = request.args.get("active", "").lower() == "true"
    query = Courier.query
    if active_only:
        query = query.filter_by(is_active=True)
    couriers = query.order_by(Courier.name).all()
    return jsonify([c.to_dict() for c in couriers])


@couriers_bp.post("")
@roles_required("Admin", "Manager")
def create_courier():
    """
    Create Courier Partner
    Register a new shipping courier partner with its name, carrier code, and optional tracking URL. Admin or Manager access required.
    ---
    tags:
      - Couriers
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        description: Enter the courier partner details. name and code are required.
        schema:
          type: object
          required:
            - name
            - code
          properties:
            name:
              type: string
              description: Courier company name.
              example: Blue Dart Express
            code:
              type: string
              description: Unique uppercase carrier code.
              example: BLUEDART
            contactEmail:
              type: string
              description: Support or dispatch contact email.
              example: support@bluedart.com
            trackingUrlTemplate:
              type: string
              description: Tracking URL pattern containing {tracking_number} placeholder.
              example: https://www.bluedart.com/track?numbers={tracking_number}
            isActive:
              type: boolean
              description: Whether this courier partner is currently active.
              example: true
    responses:
      201:
        description: Courier created successfully.
        schema:
          $ref: '#/definitions/Courier'
      400:
        description: Invalid or missing request data. name and code are required.
        schema:
          $ref: '#/definitions/ErrorResponse'
      401:
        description: Authentication is required or the provided token is invalid.
      403:
        description: You do not have permission to perform this action. Admin or Manager role required.
        schema:
          $ref: '#/definitions/ErrorResponse'
      409:
        description: A courier with this name or code already exists.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
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
    """
    Get Courier Details
    Get details of a specific shipping courier partner using its courier ID. Admin, Manager, or Staff access required.
    ---
    tags:
      - Couriers
    security:
      - Bearer: []
    parameters:
      - in: path
        name: courier_id
        type: string
        required: true
        description: Unique courier ID (e.g. CUR-BLUDT).
    responses:
      200:
        description: Request successful. Returns the courier partner details.
        schema:
          $ref: '#/definitions/Courier'
      401:
        description: Authentication is required or the provided token is invalid.
      403:
        description: You do not have permission to perform this action. Admin, Manager, or Staff role required.
        schema:
          $ref: '#/definitions/ErrorResponse'
      404:
        description: The requested courier was not found.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    courier = Courier.query.get(courier_id)
    if not courier:
        return jsonify({"error": "Courier not found"}), 404
    return jsonify(courier.to_dict())


@couriers_bp.put("/<courier_id>")
@roles_required("Admin", "Manager")
def update_courier(courier_id):
    """
    Update Courier Partner
    Update an existing shipping courier partner using its courier ID. Admin or Manager access required.
    ---
    tags:
      - Couriers
    security:
      - Bearer: []
    parameters:
      - in: path
        name: courier_id
        type: string
        required: true
        description: Unique courier ID.
      - in: body
        name: body
        required: true
        description: Enter the updated courier partner details. name and code are required.
        schema:
          type: object
          required:
            - name
            - code
          properties:
            name:
              type: string
              description: Updated courier company name.
              example: Blue Dart Express
            code:
              type: string
              description: Updated unique carrier code.
              example: BLUEDART
            contactEmail:
              type: string
              description: Updated support contact email.
              example: dispatch@bluedart.com
            trackingUrlTemplate:
              type: string
              description: Updated tracking URL pattern with {tracking_number}.
              example: https://www.bluedart.com/track?numbers={tracking_number}
            isActive:
              type: boolean
              description: Updated active status.
              example: true
    responses:
      200:
        description: Courier updated successfully.
        schema:
          $ref: '#/definitions/Courier'
      400:
        description: Invalid or missing request data. name and code are required.
        schema:
          $ref: '#/definitions/ErrorResponse'
      401:
        description: Authentication is required or the provided token is invalid.
      403:
        description: You do not have permission to perform this action. Admin or Manager role required.
        schema:
          $ref: '#/definitions/ErrorResponse'
      404:
        description: The requested courier was not found.
        schema:
          $ref: '#/definitions/ErrorResponse'
      409:
        description: Courier name or code conflicts with another partner.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
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
    """
    Toggle Courier Status
    Enable or disable a shipping courier partner using its courier ID. Admin or Manager access required.
    ---
    tags:
      - Couriers
    security:
      - Bearer: []
    parameters:
      - in: path
        name: courier_id
        type: string
        required: true
        description: Unique courier ID.
      - in: body
        name: body
        required: true
        description: Enter the new active status for the courier.
        schema:
          type: object
          required:
            - isActive
          properties:
            isActive:
              type: boolean
              description: Set to true to activate or false to deactivate.
              example: false
    responses:
      200:
        description: Courier status updated successfully.
        schema:
          $ref: '#/definitions/Courier'
      400:
        description: Invalid or missing request data. isActive (boolean) is required.
        schema:
          $ref: '#/definitions/ErrorResponse'
      401:
        description: Authentication is required or the provided token is invalid.
      403:
        description: You do not have permission to perform this action. Admin or Manager role required.
        schema:
          $ref: '#/definitions/ErrorResponse'
      404:
        description: The requested courier was not found.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
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
    """
    Delete Courier Partner
    Delete a shipping courier partner using its courier ID. Admin access required.
    ---
    tags:
      - Couriers
    security:
      - Bearer: []
    parameters:
      - in: path
        name: courier_id
        type: string
        required: true
        description: Unique courier ID to delete.
    responses:
      204:
        description: Courier deleted successfully.
      401:
        description: Authentication is required or the provided token is invalid.
      403:
        description: You do not have permission to perform this action. Admin role required.
        schema:
          $ref: '#/definitions/ErrorResponse'
      404:
        description: The requested courier was not found.
        schema:
          $ref: '#/definitions/ErrorResponse'
      409:
        description: Cannot delete courier because existing shipments are linked to it.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
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
