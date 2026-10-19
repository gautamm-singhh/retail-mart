"""
Retail Mart - Backend API
Application factory. Wires together config, extensions and blueprints.


Matches: Retail_Mart_ERD.pdf (Users, Categories, Products, Product_Variants,
Orders, Order_Items, Payments, Receipts, Shipments, Shipment_Status_Hist,
Order_Status_Hist) and the JSON shapes already coded into the Week-2
frontend's src/types/*.ts so the React app can be pointed at this API by
just implementing services/api/client.ts's `request()` with fetch().
"""

import logging
import time
import uuid

from flask import Flask, jsonify, g, request
from flask_cors import CORS

from app.config import get_config
from app.extensions import db, jwt

# Module-level logger — used by the error handlers and request hooks below.
# The 'retail_mart' logger is configured in configure_logging(); all child
# loggers (logging.getLogger(__name__) in route modules) inherit from it.
logger = logging.getLogger("retail_mart")


def create_app(config_name: str | None = None) -> Flask:
    import os

    # Under Vercel serverless execution, ensure production configuration is active
    if not config_name and os.environ.get("VERCEL"):
        config_name = "production"

    app = Flask(__name__)
    app.config.from_object(get_config(config_name))

    from app.utils.logging_config import configure_logging
    configure_logging(app)

    db.init_app(app)
    jwt.init_app(app)
    CORS(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        # Cross-origin fetch() only exposes a small safelist of response
        # headers to JS by default - Content-Disposition isn't in it. The
        # invoice/receipt PDF downloads rely on reading this header
        # client-side to get the suggested filename, so it must be listed
        # here explicitly or every download falls back to a generic name.
        # X-Request-ID is also exposed so clients can trace failed requests.
        expose_headers=["Content-Disposition", "X-Request-ID"],
    )

    from app.routes.auth import auth_bp
    from app.routes.users import users_bp
    from app.routes.categories import categories_bp
    from app.routes.products import products_bp
    from app.routes.orders import orders_bp
    from app.routes.payments import payments_bp
    from app.routes.receipts import receipts_bp
    from app.routes.shipments import shipments_bp
    from app.routes.dashboard import dashboard_bp
    from app.routes.campaigns import campaigns_bp
    from app.routes.communications import communications_bp
    from app.routes.reports import reports_bp
    from app.routes.analytics import analytics_bp
    from app.routes.addresses import addresses_bp
    from app.routes.customer_stats import customer_stats_bp
    from app.routes.couriers import couriers_bp
    from app.routes.wishlist import wishlist_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(users_bp, url_prefix="/api/users")
    app.register_blueprint(categories_bp, url_prefix="/api/categories")
    app.register_blueprint(products_bp, url_prefix="/api/products")
    app.register_blueprint(orders_bp, url_prefix="/api/orders")
    app.register_blueprint(payments_bp, url_prefix="/api/payments")
    app.register_blueprint(receipts_bp, url_prefix="/api/receipts")
    app.register_blueprint(shipments_bp, url_prefix="/api/shipments")
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")
    app.register_blueprint(campaigns_bp, url_prefix="/api/campaigns")
    app.register_blueprint(communications_bp, url_prefix="/api/communications")
    app.register_blueprint(reports_bp, url_prefix="/api/reports")
    app.register_blueprint(analytics_bp, url_prefix="/api/analytics")
    app.register_blueprint(addresses_bp, url_prefix="/api/addresses")
    app.register_blueprint(customer_stats_bp, url_prefix="/api/customer/stats")
    app.register_blueprint(couriers_bp, url_prefix="/api/couriers")
    app.register_blueprint(wishlist_bp, url_prefix="/api/wishlist")

    @app.before_request
    def _before_request():
        """
        Assign a correlation / request ID for the lifetime of this request.

        Priority:
          1. Honour an incoming ``X-Request-ID`` header (allows upstream
             load-balancers or clients to supply their own trace ID).
          2. Otherwise generate a new UUID4 (short 8-char prefix for readability).

        The ID is stored on Flask's ``g`` object so:
          - The ``RequestIdFilter`` in logging_config.py can embed it in every
            log line for this request.
          - ``_after_request`` can echo it back in the response header.
        """
        incoming = request.headers.get("X-Request-ID", "").strip()
        g.request_id = incoming if incoming else uuid.uuid4().hex[:8]
        g._start_time = time.monotonic()

    @app.after_request
    def _after_request(response):
        """
        Attach ``X-Request-ID`` to every response and emit a structured
        request log line.

        Log format:
            INFO  retail_mart [req=8f21] GET /api/products 200 42ms
        """
        request_id = getattr(g, "request_id", "-")
        response.headers["X-Request-ID"] = request_id

        duration_ms = 0
        if hasattr(g, "_start_time"):
            duration_ms = int((time.monotonic() - g._start_time) * 1000)

        status_code = response.status_code
        log_level = (
            logging.WARNING if status_code >= 400 else logging.INFO
        )
        logger.log(
            log_level,
            "%s %s %s %dms",
            request.method,
            request.path,
            status_code,
            duration_ms,
        )
        return response

    @app.teardown_request
    def _teardown_request(exc):
        """Log unhandled exceptions that bypass the error handlers (rare)."""
        if exc is not None:
            logger.exception(
                "Unhandled exception during teardown: %s", exc
            )

    @app.get("/api/health")
    def health():
        """
        API Health Check
        Check the operational status of the Retail Mart API backend and database connection. Returns service status and database connectivity. Public API — no login required.
        ---
        tags:
          - System
        responses:
          200:
            description: Request successful. Service is healthy and database connection status is returned.
            schema:
              type: object
              properties:
                status:
                  type: string
                  example: ok
                service:
                  type: string
                  example: retail-mart-backend
                database:
                  type: string
                  example: connected
                  enum: [connected, disconnected]
                db_error:
                  type: string
                  example: OperationalError
        """
        res = {"status": "ok", "service": "retail-mart-backend"}
        try:
            db.session.execute(db.text("SELECT 1"))
            res["database"] = "connected"
        except Exception as exc:
            res["database"] = "disconnected"
            res["db_error"] = type(exc).__name__
        return jsonify(res)

    @app.get("/api/db-diagnostics")
    def db_diagnostics():
        """
        Database Connectivity & Schema Diagnostics
        Check detailed database connection information, active database dialect, and existing tables. Returns database diagnostics and total user count. Public API — no login required.
        ---
        tags:
          - System
        responses:
          200:
            description: Request successful. Returns database diagnostics and connection details.
            schema:
              type: object
              properties:
                status:
                  type: string
                  example: healthy
                database_configured:
                  type: boolean
                  example: true
                dialect:
                  type: string
                  example: sqlite
                driver:
                  type: string
                  example: pysqlite
                select_1:
                  type: string
                  example: ok
                tables_found:
                  type: array
                  items:
                    type: string
                  example: ["campaigns", "categories", "couriers", "orders", "payments", "products", "shipments", "users", "wishlist_items"]
                expected_tables_present:
                  type: boolean
                  example: true
                user_count:
                  type: integer
                  example: 10
          500:
            description: Database connection error or diagnostic failure.
            schema:
              type: object
              properties:
                status:
                  type: string
                  example: error
                error_type:
                  type: string
                  example: OperationalError
                error_message:
                  type: string
                  example: could not connect to server
        """
        from sqlalchemy import inspect
        report = {
            "status": "testing",
            "database_configured": bool(os.environ.get("DATABASE_URL") or os.environ.get("DB_HOST") or os.environ.get("MYSQL_HOST")),
            "dialect": db.engine.dialect.name,
            "driver": db.engine.driver,
        }
        try:
            # 1. Simple connection and SELECT 1 check
            db.session.execute(db.text("SELECT 1"))
            report["select_1"] = "ok"

            # 2. Schema inspection
            insp = inspect(db.engine)
            tables = sorted(insp.get_table_names())
            report["tables_found"] = tables
            expected = ["users", "products", "categories", "orders", "payments", "shipments", "couriers", "campaigns", "wishlist_items"]
            report["expected_tables_present"] = all(t in tables for t in expected)

            # 3. Simple table read
            from app.models.user import User
            report["user_count"] = User.query.count()
            report["status"] = "healthy"
            return jsonify(report), 200
        except Exception as exc:
            report["status"] = "error"
            report["error_type"] = type(exc).__name__
            report["error_message"] = str(exc).split("\n")[0]
            return jsonify(report), 500

    try:
        from app.swagger import init_swagger
        init_swagger(app)
    except Exception as exc:
        logger.warning("Swagger documentation failed to initialise: %s", exc)

    @app.errorhandler(404)
    def not_found(_e):
        logger.debug("404 Not found: %s %s", request.method, request.path)
        return jsonify({"error": "Not found"}), 404

    @app.errorhandler(400)
    def bad_request(e):
        logger.debug(
            "400 Bad request: %s %s - %s",
            request.method,
            request.path,
            e.description if hasattr(e, "description") else e,
        )
        return jsonify({"error": str(e.description) if hasattr(e, "description") else "Bad request"}), 400

    @app.errorhandler(500)
    def server_error(e):
        logger.exception("500 Internal server error on %s %s: %s", request.method, request.path, e)
        return jsonify({
            "error": "Internal server error",
            "message": str(e) if app.config.get("DEBUG") else "An internal server error occurred."
        }), 500

    @app.errorhandler(Exception)
    def handle_unhandled_exception(e):
        logger.exception("Unhandled exception on %s %s: %s", request.method, request.path, e)
        return jsonify({
            "error": "Internal server error",
            "message": str(e) if app.config.get("DEBUG") else "An internal server error occurred."
        }), 500

    return app


def __getattr__(name):
    if name == "app":
        from run import app as running_app
        return running_app
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
