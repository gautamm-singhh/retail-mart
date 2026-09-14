"""
Retail Mart - Backend API
Application factory. Wires together config, extensions and blueprints.

Owner: Sorav (BackEnd) - Week 2 / API Development
Matches: Retail_Mart_ERD.pdf (Users, Categories, Products, Product_Variants,
Orders, Order_Items, Payments, Receipts, Shipments, Shipment_Status_Hist,
Order_Status_Hist) and the JSON shapes already coded into the Week-2
frontend's src/types/*.ts so the React app can be pointed at this API by
just implementing services/api/client.ts's `request()` with fetch().
"""

from flask import Flask, jsonify
from flask_cors import CORS

from app.config import get_config
from app.extensions import db, jwt


def create_app(config_name: str | None = None) -> Flask:
    app = Flask(__name__)
    app.config.from_object(get_config(config_name))

    # --- extensions -------------------------------------------------
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
        expose_headers=["Content-Disposition"],
    )

    # --- blueprints ---------------------------------------------------
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

    # --- health check ---------------------------------------------------
    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "service": "retail-mart-backend"})

    # --- error handlers ---------------------------------------------------
    @app.errorhandler(404)
    def not_found(_e):
        return jsonify({"error": "Not found"}), 404

    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"error": str(e.description) if hasattr(e, "description") else "Bad request"}), 400

    @app.errorhandler(500)
    def server_error(_e):
        return jsonify({"error": "Internal server error"}), 500

    return app


def __getattr__(name):
    if name == "app":
        from run import app as running_app
        return running_app
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
