import os
from datetime import timedelta
from dotenv import load_dotenv

BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)


class BaseConfig:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-me")

    # Default to SQLite so the API runs with zero setup. Point
    # DATABASE_URL at MySQL to match the ERD/production schema, e.g.
    # mysql+pymysql://user:password@localhost:3306/retail_mart
    _raw_db_url = (os.environ.get("DATABASE_URL") or "").strip()
    if _raw_db_url.startswith("mysql://"):
        _raw_db_url = "mysql+pymysql://" + _raw_db_url[len("mysql://"):]
    elif _raw_db_url.startswith("postgres://"):
        _raw_db_url = "postgresql://" + _raw_db_url[len("postgres://"):]
    SQLALCHEMY_DATABASE_URI = _raw_db_url or f"sqlite:///{os.path.join(BASE_DIR, 'retail_mart.db')}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-jwt-secret-change-me")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)
    JWT_TOKEN_LOCATION = ["headers"]

    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")

    # --- Email (see app/utils/email.py) ---------------------------------
    # If SMTP_HOST is unset, emails are just logged to the console instead
    # of sent - the app works out of the box, and wiring up real email is
    # purely an env-var change (no code change).
    SMTP_HOST = os.environ.get("SMTP_HOST")
    _raw_smtp_port = (os.environ.get("SMTP_PORT") or "").strip()
    SMTP_PORT = int(_raw_smtp_port) if _raw_smtp_port.isdigit() else 587
    SMTP_USERNAME = os.environ.get("SMTP_USERNAME")
    SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD")
    MAIL_FROM = os.environ.get("MAIL_FROM", "no-reply@retailmart.dev")

    # --- RazorPay (see app/utils/razorpay_client.py) --------------------
    # If unset, a mock client simulates RazorPay's API so checkout still
    # works end-to-end in dev. Real integration is just setting these two.
    RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID")
    RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET")

    # --- OTP / SMS (see app/utils/sms.py) -------------------------------
    # If unset, OTPs are logged to the console instead of texted - the
    # mobile-OTP login/signup flow still works end to end in dev.
    TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID")
    TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
    TWILIO_FROM_NUMBER = os.environ.get("TWILIO_FROM_NUMBER")

    # --- AI projections (see app/utils/projections.py) ------------------
    # If unset, projections fall back to a plain statistical forecast with
    # a templated narrative instead of an LLM-written one.
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
    # Override if "gemini-2.0-flash" isn't available for your API key/tier
    # (e.g. a newer/older model name) - no code change needed either way.
    GEMINI_MODEL = os.environ.get("GEMINI_MODEL")


class DevelopmentConfig(BaseConfig):
    DEBUG = True


class TestingConfig(BaseConfig):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)


class ProductionConfig(BaseConfig):
    DEBUG = False


_CONFIGS = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}


def get_config(name: str | None):
    name = name or os.environ.get("FLASK_ENV", "development")
    return _CONFIGS.get(name, DevelopmentConfig)
