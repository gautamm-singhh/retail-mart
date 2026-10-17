from flask import Blueprint, request, jsonify

from app.extensions import db
from app.models.user import User, Role, ROLE_NAMES, USER_STATUSES
from app.utils.decorators import roles_required
from app.utils.ids import next_sequential_id

users_bp = Blueprint("users", __name__)


@users_bp.get("")
@roles_required("Admin", "Manager")
def list_users():
    """
    List Administrative Users
    Get the list of administrative and operations staff accounts with their roles and status. Admin or Manager access required.
    ---
    tags:
      - Users
    security:
      - Bearer: []
    responses:
      200:
        description: Request successful. Returns the list of administrative users.
        schema:
          type: array
          items:
            $ref: '#/definitions/User'
      401:
        description: Authentication is required or the provided token is invalid.
      403:
        description: You do not have permission to perform this action.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    # User management is restricted to administrative and staff roles (excludes customers)
    users = User.query.join(Role).filter(Role.role_name != "Customer").order_by(User.created_at).all()
    return jsonify([u.to_dict() for u in users])


@users_bp.get("/<user_id>")
@roles_required("Admin", "Manager")
def get_user(user_id):
    """
    Get User by ID
    Get the profile details of a specific user using their user ID. Admin or Manager access required.
    ---
    tags:
      - Users
    security:
      - Bearer: []
    parameters:
      - in: path
        name: user_id
        type: string
        required: true
        description: Unique user ID (e.g. u-001).
    responses:
      200:
        description: Request successful. Returns the requested user details.
        schema:
          $ref: '#/definitions/User'
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
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user.to_dict())


@users_bp.post("")
@roles_required("Admin")
def create_user():
    """
    Create New User
    Create a new staff or administrative user by sending their account details in the request body. Admin access required.
    ---
    tags:
      - Users
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        description: Enter user details including name, email, role, status, and password.
        schema:
          type: object
          required:
            - name
            - email
            - role
          properties:
            name:
              type: string
              description: Full name of the user.
              example: Sorav Sharma
            email:
              type: string
              description: Email address of the user.
              example: sorav@retailmart.dev
            role:
              type: string
              description: Role assigned to the user.
              example: Staff
              enum: [Admin, Manager, Staff, Customer]
            status:
              type: string
              description: Initial account status.
              example: active
              enum: [active, inactive]
            password:
              type: string
              description: Account password.
              example: changeme123
    responses:
      201:
        description: User created successfully.
        schema:
          $ref: '#/definitions/User'
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
        description: An account with this email already exists.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
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
    """
    Update User
    Update an existing user's name, email, role, or active status using their user ID. Admin access required.
    ---
    tags:
      - Users
    security:
      - Bearer: []
    parameters:
      - in: path
        name: user_id
        type: string
        required: true
        description: Unique user ID.
      - in: body
        name: body
        required: true
        description: Enter the user fields you want to update.
        schema:
          type: object
          properties:
            name:
              type: string
              description: Updated full name.
              example: Sorav Sharma
            email:
              type: string
              description: Updated email address.
              example: sorav.updated@retailmart.dev
            role:
              type: string
              description: Updated user role.
              example: Manager
              enum: [Admin, Manager, Staff, Customer]
            status:
              type: string
              description: Updated account status.
              example: active
              enum: [active, inactive]
    responses:
      200:
        description: User updated successfully.
        schema:
          $ref: '#/definitions/User'
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
    """
    Toggle User Active Status
    Activate or deactivate a user account by providing their user ID and target status. Admin access required.
    ---
    tags:
      - Users
    security:
      - Bearer: []
    parameters:
      - in: path
        name: user_id
        type: string
        required: true
        description: Unique user ID.
      - in: body
        name: body
        required: true
        description: Enter the new account status.
        schema:
          type: object
          required:
            - status
          properties:
            status:
              type: string
              description: Target account status (active or inactive).
              example: inactive
              enum: [active, inactive]
    responses:
      200:
        description: User status updated successfully.
        schema:
          $ref: '#/definitions/User'
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
    """
    Delete User
    Permanently delete a user account using their user ID. Admin access required.
    ---
    tags:
      - Users
    security:
      - Bearer: []
    parameters:
      - in: path
        name: user_id
        type: string
        required: true
        description: Unique user ID to delete.
    responses:
      204:
        description: User deleted successfully.
        schema:
          type: string
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
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    db.session.delete(user)
    db.session.commit()
    return "", 204
