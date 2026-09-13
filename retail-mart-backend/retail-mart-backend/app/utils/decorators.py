from functools import wraps

from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt


def roles_required(*allowed_roles):
    """
    Usage: @roles_required("Admin", "Manager")
    Requires a valid JWT (see auth.py) whose `role` claim is one of
    allowed_roles. Apply *after* @jwt_required-style protection is implied,
    since this calls verify_jwt_in_request() itself.
    """

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if allowed_roles and claims.get("role") not in allowed_roles:
                return jsonify({"error": "Forbidden: insufficient role"}), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator
