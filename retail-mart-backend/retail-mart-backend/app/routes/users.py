from flask import Blueprint, request, jsonify

from app.extensions import db
from app.models.user import User, Role, ROLE_NAMES, USER_STATUSES
from app.utils.decorators import roles_required
from app.utils.ids import next_sequential_id

users_bp = Blueprint("users", __name__)


@users_bp.get("")
@roles_required("Admin", "Manager")
def list_users():
    # Admin console's Users page manages admin/staff access, not storefront
    # customers - Customer accounts have their own profile/orders under
    # /shop/account and don't belong in this list.
    users = User.query.join(Role).filter(Role.role_name != "Customer").order_by(User.created_at).all()
    return jsonify([u.to_dict() for u in users])


@users_bp.get("/<user_id>")
@roles_required("Admin", "Manager")
def get_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user.to_dict())


@users_bp.post("")
@roles_required("Admin")
def create_user():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    role_name = data.get("role")
    status = data.get("status", "active")
    password = data.get("password") or "changeme123"

    if not name or not email:
        return jsonify({"error": "name and email are required"}), 400
    if role_name not in ROLE_NAMES:
        return jsonify({"error": f"role must be one of {ROLE_NAMES}"}), 400
    if status not in USER_STATUSES:
        return jsonify({"error": f"status must be one of {USER_STATUSES}"}), 400
    if User.query.filter(db.func.lower(User.email) == email).first():
        return jsonify({"error": "An account with this email already exists"}), 409

    role = Role.query.filter_by(role_name=role_name).first()
    if not role:
        role = Role(role_name=role_name)
        db.session.add(role)
        db.session.flush()

    user = User(id=next_sequential_id(User, "u-", 3, 1), name=name, email=email, role_id=role.role_id, status=status)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201


@users_bp.put("/<user_id>")
@roles_required("Admin")
def update_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json(silent=True) or {}
    if "name" in data:
        user.name = data["name"]
    if "email" in data:
        user.email = data["email"].strip().lower()
    if "role" in data:
        if data["role"] not in ROLE_NAMES:
            return jsonify({"error": f"role must be one of {ROLE_NAMES}"}), 400
        role = Role.query.filter_by(role_name=data["role"]).first()
        if not role:
            role = Role(role_name=data["role"])
            db.session.add(role)
            db.session.flush()
        user.role_id = role.role_id
    if "status" in data:
        if data["status"] not in USER_STATUSES:
            return jsonify({"error": f"status must be one of {USER_STATUSES}"}), 400
        user.status = data["status"]

    db.session.commit()
    return jsonify(user.to_dict())


@users_bp.patch("/<user_id>/status")
@roles_required("Admin")
def toggle_user_status(user_id):
    """Convenience endpoint for the Users page's activate/deactivate action."""
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    data = request.get_json(silent=True) or {}
    status = data.get("status")
    if status not in USER_STATUSES:
        return jsonify({"error": f"status must be one of {USER_STATUSES}"}), 400
    user.status = status
    db.session.commit()
    return jsonify(user.to_dict())


@users_bp.delete("/<user_id>")
@roles_required("Admin")
def delete_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    db.session.delete(user)
    db.session.commit()
    return "", 204
