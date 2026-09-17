import os
import tempfile
import urllib.parse
from datetime import timedelta
from dotenv import load_dotenv

BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)


def _configure_database():
    raw_url = (os.environ.get("DATABASE_URL") or "").strip()
    if not raw_url:
        return f"sqlite:///{os.path.join(BASE_DIR, 'retail_mart.db')}", {}

    if raw_url.startswith("mysql://"):
        raw_url = "mysql+pymysql://" + raw_url[len("mysql://"):]
    elif raw_url.startswith("postgres://"):
        raw_url = "postgresql://" + raw_url[len("postgres://"):]

    engine_options = {}

    if "mysql" in raw_url:
        parsed = urllib.parse.urlparse(raw_url)
        query_params = urllib.parse.parse_qs(parsed.query)

        # Detect SSL intent from query string (?ssl-mode=REQUIRED), host (Aiven), or env var
        ssl_mode_keys = ["ssl-mode", "ssl_mode", "sslmode", "ssl"]
        ssl_requested = (
            any(k in query_params for k in ssl_mode_keys)
            or "aivencloud.com" in (parsed.hostname or "")
            or os.environ.get("MYSQL_SSL", "").lower() in ("true", "1", "required")
        )

        # PyMySQL does not accept ssl-mode/ssl_mode/sslmode as connection kwargs; strip them from URL
        filtered_params = {
            k: v for k, v in query_params.items()
            if k not in ["ssl-mode", "ssl_mode", "sslmode"]
        }
        new_query = urllib.parse.urlencode(filtered_params, doseq=True)
        cleaned_url = urllib.parse.urlunparse(parsed._replace(query=new_query))

        if ssl_requested:
            ca_content = (
                os.environ.get("MYSQL_CA_CERT")
                or os.environ.get("AIVEN_CA_CERT")
                or os.environ.get("CA_CERT")
                or ""
            ).strip()

            if ca_content:
                ca_path = os.path.join(tempfile.gettempdir(), "aiven_ca.pem")
                with open(ca_path, "w", encoding="utf-8") as f:
                    f.write(ca_content)
                engine_options["connect_args"] = {
                    "ssl": {
                        "ca": ca_path,
                        "check_hostname": True,
                        "verify_mode": "required",
                    }
                }
            else:
                # SSL encrypted TLS connection (fallback for self-signed Aiven Project CA when CA cert not mounted)
                engine_options["connect_args"] = {
                    "ssl": {
                        "check_hostname": False,
                        "verify_mode": "none",
                    }
                }

        return cleaned_url, engine_options

    return raw_url, engine_options


_DB_URI, _DB_ENGINE_OPTIONS = _configure_database()


class BaseConfig:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-me")

    # Default to SQLite so the API runs with zero setup. Point
    # DATABASE_URL at MySQL to match the ERD/production schema, e.g.
    # mysql+pymysql://user:password@localhost:3306/retail_mart
    SQLALCHEMY_DATABASE_URI = _DB_URI
    SQLALCHEMY_ENGINE_OPTIONS = _DB_ENGINE_OPTIONS
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-jwt-secret-change-me")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)
    JWT_TOKEN_LOCATION = ["headers"]

    _cors_raw = os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5174,http://127.0.0.1:5173")
    _parsed_origins = {o.strip() for o in _cors_raw.split(",") if o.strip()}
    # Always allow standard local Vite ports (5173, 5174) for seamless local dev
    CORS_ORIGINS = list(_parsed_origins | {"http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5174", "http://127.0.0.1:5173"})

    # --- Email (see app/utils/email.py) ---------------------------------
    # Multi-sender Gmail SMTP configuration (support, orders, marketing).
    # All 3 senders share SMTP_HOST (default smtp.gmail.com) and SMTP_PORT (default 587).
    SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    _raw_smtp_port = (os.environ.get("SMTP_PORT") or "").strip()
    SMTP_PORT = int(_raw_smtp_port) if _raw_smtp_port.isdigit() else 587

    # Support Sender (Signups, Post-delivery thank-you, General support)
    SMTP_SUPPORT_USERNAME = os.environ.get("SMTP_SUPPORT_USERNAME")
    SMTP_SUPPORT_PASSWORD = os.environ.get("SMTP_SUPPORT_PASSWORD")
    MAIL_SUPPORT_FROM = os.environ.get("MAIL_SUPPORT_FROM", "Retail Mart Support <retailmart.support@gmail.com>")

    # Orders Sender (Order confirmations, Receipts, Shipment tracking/dispatches)
    SMTP_ORDERS_USERNAME = os.environ.get("SMTP_ORDERS_USERNAME")
    SMTP_ORDERS_PASSWORD = os.environ.get("SMTP_ORDERS_PASSWORD")
    MAIL_ORDERS_FROM = os.environ.get("MAIL_ORDERS_FROM", "Retail Mart Orders <retailmart.orders@gmail.com>")

    # Marketing Sender (Campaign blasts, Festival promotions, Bulk mail)
    SMTP_MARKETING_USERNAME = os.environ.get("SMTP_MARKETING_USERNAME")
    SMTP_MARKETING_PASSWORD = os.environ.get("SMTP_MARKETING_PASSWORD")
    MAIL_MARKETING_FROM = os.environ.get("MAIL_MARKETING_FROM", "Retail Mart Marketing <retailmart.marketing@gmail.com>")

    # Legacy / Dev fallback settings
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
