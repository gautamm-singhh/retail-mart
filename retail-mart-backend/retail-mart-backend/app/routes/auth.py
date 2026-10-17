import logging
import random
from datetime import datetime

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

from app.extensions import db
from app.models.user import User, Role
from app.models.otp import OtpVerification, OTP_TTL_MINUTES
from app.utils.ids import next_sequential_id
from app.utils.sms import send_sms, otp_message

auth_bp = Blueprint("auth", __name__)
logger = logging.getLogger(__name__)


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
    """
    User Login
    Log in using your email and password to get a JWT token. Use this token to access protected APIs. Public API — no login required.
    ---
    tags:
      - Authentication
    parameters:
      - in: body
        name: body
        required: true
        description: Enter the user's email and password.
        schema:
          type: object
          required:
            - email
            - password
          properties:
            email:
              type: string
              description: Registered email address.
              example: gautam@retailmart.dev
            password:
              type: string
              description: Account password.
              example: password123
    responses:
      200:
        description: Request successful. Returns a JWT access token and user profile.
        schema:
          type: object
          properties:
            accessToken:
              type: string
              example: eyJhbGciOi...
            user:
              $ref: '#/definitions/User'
      400:
        description: Invalid or missing request data.
        schema:
          $ref: '#/definitions/ErrorResponse'
      401:
        description: Invalid email or password.
        schema:
          $ref: '#/definitions/ErrorResponse'
      403:
        description: Account is inactive.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    user = User.query.filter(db.func.lower(User.email) == email).first()
    if not user or not user.check_password(password):
        logger.warning("Login failed: invalid credentials for email=%s", email)
        return jsonify({"error": "Invalid email or password"}), 401

    if user.status != "active":
        logger.warning("Login blocked: inactive account user_id=%s", user.id)
        return jsonify({"error": "This account is inactive"}), 403

    logger.info("Login successful user_id=%s role=%s", user.id, user.role.role_name if user.role else "unknown")
    return jsonify({"accessToken": _issue_token(user), "user": user.to_dict()})


@auth_bp.post("/register")
def register():
    """
    Staff Registration
    Register a new staff member account with their name, email, and password. Returns a JWT access token and the created user profile. Public API — no login required.
    ---
    tags:
      - Authentication
    parameters:
      - in: body
        name: body
        required: true
        description: Enter staff registration details.
        schema:
          type: object
          required:
            - name
            - email
            - password
          properties:
            name:
              type: string
              description: Full name of the staff member.
              example: Rahul Sharma
            email:
              type: string
              description: Work email address.
              example: rahul.staff@example.com
            password:
              type: string
              description: Account password (minimum 6 characters).
              example: password123
    responses:
      201:
        description: Staff account created successfully.
        schema:
          type: object
          properties:
            accessToken:
              type: string
            user:
              $ref: '#/definitions/User'
      400:
        description: Invalid or missing request data.
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
    password = data.get("password") or ""

    if not name or not email or not password:
        return jsonify({"error": "name, email and password are required"}), 400
    if len(password) < 6:
        return jsonify({"error": "password must be at least 6 characters"}), 400
    if User.query.filter(db.func.lower(User.email) == email).first():
        return jsonify({"error": "An account with this email already exists"}), 409

    user = _create_account(name=name, role_name="Staff", email=email, password=password)
    logger.info("Staff registered user_id=%s", user.id)
    return jsonify({"accessToken": _issue_token(user), "user": user.to_dict()}), 201


@auth_bp.post("/signup")
def signup():
    """
    Customer Signup
    Register a new customer account using your name, email, password, and optional phone number. Returns a JWT access token and user profile. Public API — no login required.
    ---
    tags:
      - Authentication
    parameters:
      - in: body
        name: body
        required: true
        description: Enter customer registration details.
        schema:
          type: object
          required:
            - name
            - email
            - password
          properties:
            name:
              type: string
              description: Full name of the customer.
              example: Priya Patel
            email:
              type: string
              description: Customer email address.
              example: priya.patel@example.com
            password:
              type: string
              description: Account password (minimum 6 characters).
              example: password123
            phone:
              type: string
              description: Customer mobile phone number.
              example: "+919876543210"
    responses:
      201:
        description: Customer account created successfully.
        schema:
          type: object
          properties:
            accessToken:
              type: string
            user:
              $ref: '#/definitions/User'
      400:
        description: Invalid or missing request data.
        schema:
          $ref: '#/definitions/ErrorResponse'
      409:
        description: An account with this email or phone number already exists.
        schema:
          $ref: '#/definitions/ErrorResponse'
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
    logger.info("Customer signup successful user_id=%s", user.id)

    # Send welcome email (best-effort, never blocks account creation or exposes secrets)
    if user.email:
        from app.utils.email import send_email, welcome_email, ensure_delivery_result
        subject, body, html_body = welcome_email(user)
        current_app.logger.info("[EMAIL TRIGGER] Flow=AUTH Event=welcome_signup UserId=%s", user.id)
        current_app.logger.info("[EMAIL RECIPIENT] %s", user.email)
        current_app.logger.info("[EMAIL SENDER] support")
        welcome_res = ensure_delivery_result(send_email(user.email, subject, body, html_body=html_body, sender="support"))
        current_app.logger.info(
            "[EMAIL RESULT] Success=%s Stage=%s Message=%s Refused=%s MessageId=%s",
            welcome_res.get("success"),
            welcome_res.get("stage"),
            welcome_res.get("message"),
            welcome_res.get("refused_recipients"),
            welcome_res.get("message_id"),
        )

    return jsonify({"accessToken": _issue_token(user), "user": user.to_dict()}), 201


@auth_bp.post("/otp/request")
def request_otp():
    """
    Request Mobile OTP
    Send a 6-digit one-time password (OTP) via SMS for mobile login or signup. Public API — no login required.
    ---
    tags:
      - Authentication
    parameters:
      - in: body
        name: body
        required: true
        description: Enter the phone number to receive the OTP.
        schema:
          type: object
          required:
            - phone
          properties:
            phone:
              type: string
              description: Mobile phone number with country code.
              example: "+919876543210"
    responses:
      200:
        description: Request successful. OTP sent via SMS.
        schema:
          type: object
          properties:
            phone:
              type: string
              example: "+919876543210"
            expiresInMinutes:
              type: integer
              example: 10
      400:
        description: Invalid or missing request data.
        schema:
          $ref: '#/definitions/ErrorResponse'
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
    logger.info("OTP requested phone_suffix=***%s", phone[-4:] if len(phone) >= 4 else "****")
    return jsonify({"phone": phone, "expiresInMinutes": OTP_TTL_MINUTES})


@auth_bp.post("/otp/verify")
def verify_otp():
    """
    Verify Mobile OTP
    Verify the received SMS code to log in or automatically create a Customer account. Returns a JWT access token and user profile. Public API — no login required.
    ---
    tags:
      - Authentication
    parameters:
      - in: body
        name: body
        required: true
        description: Enter the mobile phone number and 6-digit OTP code.
        schema:
          type: object
          required:
            - phone
            - code
          properties:
            phone:
              type: string
              description: Mobile phone number.
              example: "+919876543210"
            code:
              type: string
              description: 6-digit OTP code received via SMS.
              example: "123456"
            name:
              type: string
              description: Optional display name for new accounts.
              example: "Priya"
    responses:
      200:
        description: Request successful. Returns a JWT access token and user profile.
        schema:
          type: object
          properties:
            accessToken:
              type: string
            user:
              $ref: '#/definitions/User'
            isNewUser:
              type: boolean
              example: false
      400:
        description: Invalid or missing request data.
        schema:
          $ref: '#/definitions/ErrorResponse'
      401:
        description: Invalid or expired OTP code.
        schema:
          $ref: '#/definitions/ErrorResponse'
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
        logger.warning("OTP verification failed: invalid code phone_suffix=***%s", phone[-4:] if len(phone) >= 4 else "****")
        return jsonify({"error": "Invalid code"}), 401
    if otp.is_expired:
        logger.warning("OTP verification failed: expired code phone_suffix=***%s", phone[-4:] if len(phone) >= 4 else "****")
        return jsonify({"error": "This code has expired - request a new one"}), 401

    otp.verified_at = datetime.utcnow()

    user = User.query.filter_by(phone=phone).first()
    is_new_user = user is None
    if user is None:
        user = _create_account(name=name or "Customer", role_name="Customer", phone=phone)
    user.phone_verified_at = datetime.utcnow()
    db.session.commit()

    logger.info("OTP verification successful user_id=%s is_new_user=%s", user.id, is_new_user)
    return jsonify({"accessToken": _issue_token(user), "user": user.to_dict(), "isNewUser": is_new_user})


@auth_bp.get("/me")
@jwt_required()
def me():
    """
    Get Current User Profile
    Get the profile details of the currently logged-in user. Authentication is required.
    ---
    tags:
      - Authentication
    security:
      - Bearer: []
    responses:
      200:
        description: Request successful. Returns the current user profile.
        schema:
          $ref: '#/definitions/User'
      401:
        description: Authentication is required or the provided token is invalid.
      404:
        description: The requested resource was not found.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user.to_dict())
