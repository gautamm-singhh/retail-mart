import random
from datetime import datetime

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

from app.extensions import db
from app.models.user import User, Role
from app.models.otp import OtpVerification, OTP_TTL_MINUTES
from app.utils.ids import next_sequential_id
from app.utils.sms import send_sms, otp_message

auth_bp = Blueprint("auth", __name__)


def _issue_token(user: User) -> str:
    role_name = user.role.role_name if user.role else "Customer"
    return create_access_token(
        identity=user.id,
        additional_claims={"role": role_name, "email": user.email, "name": user.name},
    )


def _get_or_create_role(role_name: str) -> Role:
    role = Role.query.filter_by(role_name=role_name).first()
    if not role:
        role = Role(role_name=role_name)
        db.session.add(role)
        db.session.flush()
    return role


def _create_account(*, name: str, role_name: str, email: str | None = None, phone: str | None = None,
                     password: str | None = None) -> User:
    """
    Shared by /auth/register (Staff), /auth/signup (Customer, email+password),
    and the OTP flow (Customer, phone-only, no password). One place creates
    a User row correctly regardless of which door someone came in through.
    """
    role = _get_or_create_role(role_name)
    user = User(
        id=next_sequential_id(User, "u-", 3, 1),
        name=name,
        email=email,
        phone=phone,
        role_id=role.role_id,
        status="active",
    )
    if password:
        user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return user


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    user = User.query.filter(db.func.lower(User.email) == email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password"}), 401

    if user.status != "active":
        return jsonify({"error": "This account is inactive"}), 403

    return jsonify({"accessToken": _issue_token(user), "user": user.to_dict()})


@auth_bp.post("/register")
def register():
    """Self-service registration for the admin console, defaults to "Staff"."""
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not name or not email or not password:
        return jsonify({"error": "name, email and password are required"}), 400
    if len(password) < 6:
        return jsonify({"error": "password must be at least 6 characters"}), 400
    if User.query.filter(db.func.lower(User.email) == email).first():
        return jsonify({"error": "An account with this email already exists"}), 409

    user = _create_account(name=name, role_name="Staff", email=email, password=password)
    return jsonify({"accessToken": _issue_token(user), "user": user.to_dict()}), 201


@auth_bp.post("/signup")
def signup():
    """
    Customer-facing signup (storefront) - same validation shape as
    /register, just a different role and audience. See _create_account for
    the shared account-creation logic.
    """
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    phone = (data.get("phone") or "").strip() or None

    if not name or not email or not password:
        return jsonify({"error": "name, email and password are required"}), 400
    if len(password) < 6:
        return jsonify({"error": "password must be at least 6 characters"}), 400
    if User.query.filter(db.func.lower(User.email) == email).first():
        return jsonify({"error": "An account with this email already exists"}), 409
    if phone and User.query.filter_by(phone=phone).first():
        return jsonify({"error": "An account with this phone number already exists"}), 409

    user = _create_account(name=name, role_name="Customer", email=email, phone=phone, password=password)

    # Send welcome email (best-effort, never blocks account creation or exposes secrets)
    if user.email:
        from app.utils.email import send_email, welcome_email
        subject, body = welcome_email(user)
        send_email(user.email, subject, body)

    return jsonify({"accessToken": _issue_token(user), "user": user.to_dict()}), 201


@auth_bp.post("/otp/request")
def request_otp():
    """
    Step 1 of mobile OTP auth: generates a 6-digit code, texts it (or logs
    it in dev - see app/utils/sms.py), and stores it for /otp/verify to
    check. Works the same whether the phone belongs to an existing user
    (OTP login) or a brand-new one (OTP signup) - that distinction is only
    resolved at verify time.
    """
    data = request.get_json(silent=True) or {}
    phone = (data.get("phone") or "").strip()
    if not phone:
        return jsonify({"error": "phone is required"}), 400

    code = f"{random.randint(0, 999999):06d}"
    otp = OtpVerification(phone=phone, otp_code=code, purpose="login", expires_at=OtpVerification.new_expiry())
    db.session.add(otp)
    db.session.commit()

    send_sms(phone, otp_message(code))
    return jsonify({"phone": phone, "expiresInMinutes": OTP_TTL_MINUTES})


@auth_bp.post("/otp/verify")
def verify_otp():
    """
    Step 2: checks the code, then either logs in the existing user with
    this phone, or creates a brand-new Customer account for it (OTP-based
    signup, name defaults to "Customer" and can be edited later from the
    account page) - one endpoint covers both login and signup by phone.
    """
    data = request.get_json(silent=True) or {}
    phone = (data.get("phone") or "").strip()
    code = (data.get("code") or "").strip()
    name = (data.get("name") or "").strip()

    if not phone or not code:
        return jsonify({"error": "phone and code are required"}), 400

    otp = (
        OtpVerification.query.filter_by(phone=phone, otp_code=code, verified_at=None)
        .order_by(OtpVerification.id.desc())
        .first()
    )
    if not otp:
        return jsonify({"error": "Invalid code"}), 401
    if otp.is_expired:
        return jsonify({"error": "This code has expired - request a new one"}), 401

    otp.verified_at = datetime.utcnow()

    user = User.query.filter_by(phone=phone).first()
    is_new_user = user is None
    if user is None:
        user = _create_account(name=name or "Customer", role_name="Customer", phone=phone)
    user.phone_verified_at = datetime.utcnow()
    db.session.commit()

    return jsonify({"accessToken": _issue_token(user), "user": user.to_dict(), "isNewUser": is_new_user})


@auth_bp.get("/me")
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user.to_dict())
