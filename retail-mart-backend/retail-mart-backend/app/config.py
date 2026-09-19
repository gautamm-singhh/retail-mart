import os
import tempfile
import urllib.parse
from datetime import timedelta
from dotenv import load_dotenv

BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)


def _configure_database():
    raw_url = (os.environ.get("DATABASE_URL") or "").strip()

    # If DATABASE_URL is not set directly, assemble from individual DB_* / MYSQL_* env vars if present
    if not raw_url:
        host = (
            os.environ.get("DB_HOST")
            or os.environ.get("MYSQL_HOST")
            or os.environ.get("MYSQLHOST")
            or os.environ.get("AIVEN_HOST")
            or ""
        ).strip()
        if host:
            user = (
                os.environ.get("DB_USER")
                or os.environ.get("MYSQL_USER")
                or os.environ.get("MYSQLUSER")
                or os.environ.get("AIVEN_USER")
                or "avnadmin"
            ).strip()
            password = (
                os.environ.get("DB_PASSWORD")
                or os.environ.get("MYSQL_PASSWORD")
                or os.environ.get("MYSQLPASSWORD")
                or os.environ.get("AIVEN_PASSWORD")
                or ""
            ).strip()
            port = (
                os.environ.get("DB_PORT")
                or os.environ.get("MYSQL_PORT")
                or os.environ.get("MYSQLPORT")
                or os.environ.get("AIVEN_PORT")
                or "3306"
            ).strip()
            dbname = (
                os.environ.get("DB_NAME")
                or os.environ.get("MYSQL_DATABASE")
                or os.environ.get("MYSQLDATABASE")
                or os.environ.get("AIVEN_DATABASE")
                or "retail_mart"
            ).strip()
            quoted_password = urllib.parse.quote_plus(password)
            raw_url = f"mysql+pymysql://{user}:{quoted_password}@{host}:{port}/{dbname}"

    if not raw_url:
        return f"sqlite:///{os.path.join(BASE_DIR, 'retail_mart.db')}", {}

    if raw_url.startswith("mysql://"):
        raw_url = "mysql+pymysql://" + raw_url[len("mysql://"):]
    elif raw_url.startswith("postgres://"):
        raw_url = "postgresql://" + raw_url[len("postgres://"):]

    engine_options = {
        "pool_pre_ping": True,
        "pool_recycle": 280,
    }

    # In serverless environments (e.g. Vercel), NullPool prevents stale pooled sockets
    is_serverless = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))
    if is_serverless:
        from sqlalchemy.pool import NullPool
        engine_options["poolclass"] = NullPool

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

        connect_args = {"connect_timeout": 10}

        if ssl_requested:
            import ssl
            ca_content = (
                os.environ.get("MYSQL_CA_CERT")
                or os.environ.get("AIVEN_CA_CERT")
                or os.environ.get("CA_CERT")
                or ""
            ).strip()

            ssl_ctx = ssl.create_default_context()
            if ca_content:
                ca_content = ca_content.replace("\\n", "\n")
                try:
                    ssl_ctx.load_verify_locations(cadata=ca_content)
                    ssl_ctx.check_hostname = True
                    ssl_ctx.verify_mode = ssl.CERT_REQUIRED
                except Exception:
                    ssl_ctx.check_hostname = False
                    ssl_ctx.verify_mode = ssl.CERT_NONE
            else:
                ssl_ctx.check_hostname = False
                ssl_ctx.verify_mode = ssl.CERT_NONE

            connect_args["ssl"] = ssl_ctx

        engine_options["connect_args"] = connect_args
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

    _cors_raw = os.environ.get(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5174,http://127.0.0.1:5173,https://retail-mart-frontend.vercel.app"
    )
    _parsed_origins = {o.strip() for o in _cors_raw.split(",") if o.strip()}
    # Always allow standard local Vite ports (5173, 5174) and production frontend
    CORS_ORIGINS = list(
        _parsed_origins
        | {
            "http://localhost:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
            "http://127.0.0.1:5173",
            "https://retail-mart-frontend.vercel.app",
        }
    )

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
