from datetime import date

from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity

from app.extensions import db
from app.models.shipment import Shipment, ShipmentStatusEvent, SHIPMENT_STATUS_TRANSITIONS, SHIPMENT_STATUSES
from app.models.order import Order
from app.utils.decorators import roles_required
from app.utils.ids import random_suffix

shipments_bp = Blueprint("shipments", __name__)


@shipments_bp.get("")
@roles_required("Admin", "Manager", "Staff")
def list_shipments():
    query = Shipment.query
    status = request.args.get("status")
    order_id = request.args.get("orderId")
    if status:
        query = query.filter(Shipment.status == status)
    if order_id:
        query = query.filter(Shipment.order_id == order_id)
    shipments = query.order_by(Shipment.created_at.desc()).all()
    return jsonify([s.to_dict() for s in shipments])


@shipments_bp.get("/<shipment_id>")
@roles_required("Admin", "Manager", "Staff")
def get_shipment(shipment_id):
    shipment = Shipment.query.get(shipment_id)
    if not shipment:
        return jsonify({"error": "Shipment not found"}), 404
    return jsonify(shipment.to_dict())


@shipments_bp.post("")
@roles_required("Admin", "Manager")
def create_shipment():
    data = request.get_json(silent=True) or {}
    order_id = data.get("orderId")
    courier_id = (data.get("courierId") or "").strip() or None
    courier_name = (data.get("courier") or "").strip()
    tracking_number = (data.get("trackingNumber") or "").strip()
    expected_delivery = data.get("expectedDelivery")

    order = Order.query.get(order_id) if order_id else None
    if not order:
        return jsonify({"error": "A valid orderId is required"}), 400

    # Resolve courier: registered courier takes precedence over free-text name.
    from app.models.courier import Courier
    from app.utils.courier_tracker import generate_carrier_tracking_number
    resolved_courier_id = None
    carrier_code = "DEFAULT"
    if courier_id:
        courier_obj = Courier.query.get(courier_id)
        if not courier_obj:
            return jsonify({"error": f"Courier '{courier_id}' not found"}), 400
        if not courier_obj.is_active:
            return jsonify({"error": f"Courier '{courier_obj.name}' is inactive"}), 400
        courier_name = courier_obj.name
        carrier_code = courier_obj.code
        resolved_courier_id = courier_obj.id
    elif courier_name:
        courier_obj = Courier.query.filter(db.func.lower(Courier.name) == courier_name.lower()).first()
        if courier_obj:
            resolved_courier_id = courier_obj.id
            carrier_code = courier_obj.code
        else:
            carrier_code = courier_name[:4].upper()
    else:
        return jsonify({"error": "courier or courierId is required"}), 400

    # Automatic AWB tracking number generation:
    # If the user does not provide a manual tracking number, automatically obtain/generate
    # an authentic carrier-spec AWB tracking number (e.g. BD..., DEL..., EKT..., D...).
    if not tracking_number:
        awb_result = generate_carrier_tracking_number(carrier_code, order.id)
        tracking_number = awb_result["trackingNumber"]

    parsed_delivery = None
    if expected_delivery:
        try:
            parsed_delivery = date.fromisoformat(expected_delivery)
        except ValueError:
            pass

    shipment = Shipment(
        id=f"SHP-{random_suffix(5)}",
        order_id=order.id,
        customer=order.customer,
        courier_id=resolved_courier_id,
        courier=courier_name,
        tracking_number=tracking_number,
        status="Pending",
        expected_delivery=parsed_delivery,
    )
    shipment.tracking_history.append(ShipmentStatusEvent(status="Pending", date=date.today()))
    db.session.add(shipment)
    db.session.commit()
    return jsonify(shipment.to_dict()), 201


@shipments_bp.patch("/<shipment_id>/status")
@roles_required("Admin", "Manager", "Staff")
def update_shipment_status(shipment_id):
    """
    Delivery workflow: enforces the sequential Pending -> Packed -> Shipped
    -> Out for Delivery -> Delivered flow and appends to trackingHistory.
    When a shipment reaches "Delivered", the parent order's status is
    advanced too (if the order's own workflow allows it).
    """
    shipment = Shipment.query.get(shipment_id)
    if not shipment:
        return jsonify({"error": "Shipment not found"}), 404

    data = request.get_json(silent=True) or {}
    new_status = data.get("status")
    location = data.get("location")
    note = data.get("note")

    if new_status not in SHIPMENT_STATUSES:
        return jsonify({"error": f"status must be one of {SHIPMENT_STATUSES}"}), 400

    allowed = SHIPMENT_STATUS_TRANSITIONS.get(shipment.status, [])
    if new_status not in allowed:
        return jsonify(
            {"error": f"Cannot move a shipment from '{shipment.status}' to '{new_status}'. Allowed: {allowed}"}
        ), 409

    shipment.status = new_status
    shipment.tracking_history.append(
        ShipmentStatusEvent(status=new_status, date=date.today(), location=location, note=note)
    )

    if new_status == "Delivered" and shipment.order:
        from app.models.order import OrderStatusEvent

        order = shipment.order
        if order.status not in ("Delivered", "Cancelled"):
            order.status = "Delivered"
            order.status_history.append(OrderStatusEvent(status="Delivered", date=date.today()))
    elif new_status in ("Shipped", "Out for Delivery") and shipment.order:
        from app.models.order import OrderStatusEvent

        order = shipment.order
        if order.status in ("Pending", "Processing"):
            order.status = "Shipped"
            order.status_history.append(OrderStatusEvent(status="Shipped", date=date.today()))
    elif new_status == "Packed" and shipment.order:
        from app.models.order import OrderStatusEvent

        order = shipment.order
        if order.status == "Pending":
            order.status = "Processing"
            order.status_history.append(OrderStatusEvent(status="Processing", date=date.today()))

    db.session.commit()

    # Best-effort shipment status emails — same pattern as _email_receipt() in payments.py.
    # A failed send is logged but never prevents the status update from completing.
    # Packed is intentionally excluded (internal warehouse step, not customer-facing).
    if new_status in ("Shipped", "Out for Delivery", "Delivered") and shipment.order:
        customer_email = getattr(shipment.order, "customer_email", None) or (shipment.order.user.email if getattr(shipment.order, "user", None) else None)
        if customer_email:
            from app.utils.email import (
                send_email,
                shipment_shipped_email,
                shipment_arrived_email,
                shipment_out_for_delivery_email,
                shipment_delivered_email,
                shipment_thank_you_email,
            )
            if new_status == "Shipped":
                subject, body = shipment_shipped_email(shipment)
                send_email(customer_email, subject, body)
                if location:
                    arr_sub, arr_body = shipment_arrived_email(shipment, location)
                    send_email(customer_email, arr_sub, arr_body)
            elif new_status == "Out for Delivery":
                subject, body = shipment_out_for_delivery_email(shipment)
                send_email(customer_email, subject, body)
            elif new_status == "Delivered":
                subject, body = shipment_delivered_email(shipment)
                send_email(customer_email, subject, body)
                # Send dedicated delivery thank-you email
                ty_sub, ty_body = shipment_thank_you_email(shipment)
                send_email(customer_email, ty_sub, ty_body)

    return jsonify(shipment.to_dict())


@shipments_bp.get("/<shipment_id>/track")
@roles_required("Customer", "Admin", "Manager", "Staff")
def track_shipment(shipment_id):
    """
    Customer & Staff shipment tracking. Returns the full local tracking history
    plus external live courier API tracking with status mapping.
    """
    from flask_jwt_extended import get_jwt
    claims = get_jwt() or {}
    role = claims.get("role")
    user_id = get_jwt_identity()

    shipment = Shipment.query.get(shipment_id)
    if not shipment:
        return jsonify({"error": "Shipment not found"}), 404

    # If caller is Customer, verify ownership
    if role == "Customer":
        if not shipment.order or shipment.order.user_id != user_id:
            return jsonify({"error": "Access denied"}), 403

    tracking_url = shipment.build_tracking_url()

    # Call external courier provider API
    from app.utils.courier_tracker import fetch_external_tracking
    carrier_code = shipment.courier_ref.code if shipment.courier_ref else shipment.courier
    external_tracking = fetch_external_tracking(carrier_code, shipment.tracking_number)

    return jsonify({
        "shipmentId": shipment.id,
        "status": shipment.status,
        "courier": shipment.courier,
        "courierId": shipment.courier_id,
        "trackingNumber": shipment.tracking_number,
        "expectedDelivery": (
            shipment.expected_delivery.strftime("%Y-%m-%d") if shipment.expected_delivery else None
        ),
        "trackingHistory": [ev.to_dict() for ev in shipment.tracking_history],
        "trackingUrl": tracking_url,
        "externalTracking": external_tracking,
    })


@shipments_bp.post("/<shipment_id>/sync-tracking")
@roles_required("Admin", "Manager", "Staff")
def sync_tracking(shipment_id):
    """
    Syncs the shipment status with the external carrier API.
    If external status has advanced, updates shipment status and appends history.
    """
    shipment = Shipment.query.get(shipment_id)
    if not shipment:
        return jsonify({"error": "Shipment not found"}), 404

    from app.utils.courier_tracker import fetch_external_tracking
    carrier_code = shipment.courier_ref.code if shipment.courier_ref else shipment.courier
    ext_data = fetch_external_tracking(carrier_code, shipment.tracking_number)
    ext_mapped_status = ext_data.get("mappedStatus")

    # If external status is different and is in allowed transitions
    allowed_transitions = SHIPMENT_STATUS_TRANSITIONS.get(shipment.status, [])
    updated = False
    if ext_mapped_status in allowed_transitions:
        shipment.status = ext_mapped_status
        checkpoints = ext_data.get("checkpoints", [])
        latest_location = checkpoints[-1].get("location") if checkpoints else None
        shipment.tracking_history.append(
            ShipmentStatusEvent(
                status=ext_mapped_status,
                date=date.today(),
                location=latest_location,
                note=f"Auto-synced via external carrier tracking ({ext_data.get('provider')})",
            )
        )
        # Advance parent order if Delivered
        if ext_mapped_status == "Delivered" and shipment.order:
            shipment.order.status = "Delivered"
        elif ext_mapped_status == "Shipped" and shipment.order:
            shipment.order.status = "Shipped"

        db.session.commit()
        updated = True

    return jsonify({
        "synced": updated,
        "previousStatus": shipment.status,
        "currentStatus": shipment.status,
        "externalStatus": ext_data.get("externalStatus"),
        "mappedStatus": ext_mapped_status,
        "externalTracking": ext_data,
    })

