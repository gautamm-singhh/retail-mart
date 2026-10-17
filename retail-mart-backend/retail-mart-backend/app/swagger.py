"""
Swagger/OpenAPI Configuration for Retail Mart API.
Provides Swagger UI at /api/docs and OpenAPI JSON specification at /api/docs.json.
Configured for Flasgger with JWT Bearer authentication and full model definitions.
"""

from flasgger import Swagger
from flask import redirect


SWAGGER_CONFIG = {
    "headers": [],
    "specs": [
        {
            "endpoint": "apispec",
            "route": "/api/docs.json",
            "rule_filter": lambda rule: not rule.rule.startswith("/static") and not rule.rule.startswith("/flasgger_static"),
            "model_filter": lambda tag: True,
        }
    ],
    "static_url_path": "/flasgger_static",
    "swagger_ui": True,
    "specs_route": "/api/docs/",
    "title": "Retail Mart API",
}

SWAGGER_TEMPLATE = {
    "swagger": "2.0",
    "info": {
        "title": "Retail Mart API",
        "description": (
            "## Retail Mart API Guide\n\n"
            "Welcome to the Retail Mart API documentation. Use this interactive guide to test and integrate with our backend services.\n\n"
            "### Authentication Guide\n"
            "Some APIs are protected and require login. First log in with your email and password to receive a JWT token. "
            "Click **Authorize** at the top right and enter `Bearer <your_token>` to call protected APIs.\n\n"
            "JWT is a temporary access token that proves you are logged in.\n\n"
            "### Roles & Permissions\n"
            "- **Public:** No login required.\n"
            "- **Customer:** Storefront customer account for orders, addresses, and wishlist.\n"
            "- **Staff:** Store operations staff for order fulfillment and shipments.\n"
            "- **Manager:** Inventory, categories, campaigns, and orders manager.\n"
            "- **Admin:** Full administrative access across all resources.\n"
        ),
        "version": "1.0.0",
        "contact": {
            "name": "Retail Mart Engineering Team",
            "email": "support@retailmart.dev",
        },
    },
    "basePath": "/",
    "schemes": ["http", "https"],
    "consumes": ["application/json"],
    "produces": ["application/json"],
    "securityDefinitions": {
        "Bearer": {
            "type": "apiKey",
            "name": "Authorization",
            "in": "header",
            "description": "Enter your JWT token in the format: Bearer <token>",
        }
    },
    "tags": [
        {"name": "Authentication", "description": "User login, registration, OTP verification, and profile management"},
        {"name": "Users", "description": "Staff and administrative user accounts and roles"},
        {"name": "Products", "description": "Product catalog, pricing, inventory stock, and availability"},
        {"name": "Categories", "description": "Product categories and grouping"},
        {"name": "Orders", "description": "Order placement, order tracking, status workflows, and PDF invoices"},
        {"name": "Payments", "description": "Payment records, Razorpay checkout, status updates, and PDF receipts"},
        {"name": "Shipments", "description": "Package fulfillment, carrier dispatch, tracking sync, and live courier tracking"},
        {"name": "Addresses", "description": "Customer shipping and billing address book"},
        {"name": "Campaigns", "description": "Discount campaigns, promotional codes, and marketing email blasts"},
        {"name": "Couriers", "description": "Integrated courier partners and tracking links"},
        {"name": "Analytics", "description": "Sales forecasting, revenue trends, and AI-powered projections"},
        {"name": "Reports", "description": "Executive sales reports and business performance summaries"},
        {"name": "Dashboard", "description": "Key business metrics and summary counters"},
        {"name": "Customer Statistics", "description": "Customer lifetime spend and purchase summary"},
        {"name": "Communications", "description": "Transactional emails, order confirmations, and email server status"},
        {"name": "Receipts", "description": "Official payment receipts and audit history"},
        {"name": "Wishlist", "description": "Customer saved favorite products"},
        {"name": "System", "description": "API health check and database connectivity status"},
    ],
    "definitions": {
        "User": {
            "type": "object",
            "properties": {
                "id": {"type": "string", "example": "u-001"},
                "name": {"type": "string", "example": "Gautam Singh"},
                "email": {"type": "string", "example": "gautam@retailmart.dev"},
                "phone": {"type": "string", "example": "+919876543210"},
                "role": {"type": "string", "example": "Admin", "enum": ["Admin", "Manager", "Staff", "Customer"]},
                "status": {"type": "string", "example": "active", "enum": ["active", "inactive"]},
                "createdAt": {"type": "string", "example": "2026-09-20"},
            },
        },
        "Product": {
            "type": "object",
            "properties": {
                "id": {"type": "string", "example": "p-1001"},
                "name": {"type": "string", "example": "Wireless Noise-Canceling Headphones"},
                "sku": {"type": "string", "example": "ELEC-WNC-001"},
                "category": {"type": "string", "example": "Electronics"},
                "description": {"type": "string", "example": "Premium over-ear wireless headphones."},
                "price": {"type": "number", "example": 2999.0},
                "stock": {"type": "integer", "example": 45},
                "status": {"type": "string", "example": "active", "enum": ["active", "inactive", "out-of-stock"]},
                "imageUrl": {"type": "string", "example": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e"},
            },
        },
        "Category": {
            "type": "object",
            "properties": {
                "id": {"type": "string", "example": "c-01"},
                "name": {"type": "string", "example": "Electronics"},
                "productCount": {"type": "integer", "example": 12},
                "status": {"type": "string", "example": "active", "enum": ["active", "inactive"]},
                "createdAt": {"type": "string", "example": "2026-09-18"},
            },
        },
        "OrderItem": {
            "type": "object",
            "properties": {
                "productName": {"type": "string", "example": "Wireless Noise-Canceling Headphones"},
                "quantity": {"type": "integer", "example": 1},
                "price": {"type": "number", "example": 2999.0},
            },
        },
        "OrderStatusEvent": {
            "type": "object",
            "properties": {
                "status": {"type": "string", "example": "Pending"},
                "date": {"type": "string", "example": "2026-09-22"},
            },
        },
        "Order": {
            "type": "object",
            "properties": {
                "id": {"type": "string", "example": "ORD-A1B2C"},
                "customer": {"type": "string", "example": "Ananya Rao"},
                "customerEmail": {"type": "string", "example": "ananya.rao@example.com"},
                "date": {"type": "string", "example": "2026-09-22"},
                "amount": {"type": "number", "example": 3499.0},
                "paymentStatus": {"type": "string", "example": "Paid", "enum": ["Pending", "Paid", "Failed", "Refunded"]},
                "status": {"type": "string", "example": "Processing", "enum": ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"]},
                "items": {"type": "array", "items": {"$ref": "#/definitions/OrderItem"}},
                "statusHistory": {"type": "array", "items": {"$ref": "#/definitions/OrderStatusEvent"}},
                "paymentId": {"type": "string", "example": "PAY-X9Y8Z"},
                "shipment": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string", "example": "SHP-K4L5M"},
                        "status": {"type": "string", "example": "Shipped"},
                        "courier": {"type": "string", "example": "Blue Dart Express"},
                        "trackingNumber": {"type": "string", "example": "BD882194012IN"},
                        "expectedDelivery": {"type": "string", "example": "2026-09-26"},
                    },
                },
            },
        },
        "PaymentStatusEvent": {
            "type": "object",
            "properties": {
                "status": {"type": "string", "example": "Paid"},
                "date": {"type": "string", "example": "2026-09-22"},
            },
        },
        "Payment": {
            "type": "object",
            "properties": {
                "id": {"type": "string", "example": "PAY-X9Y8Z"},
                "orderId": {"type": "string", "example": "ORD-A1B2C"},
                "customer": {"type": "string", "example": "Ananya Rao"},
                "amount": {"type": "number", "example": 3499.0},
                "method": {"type": "string", "example": "RazorPay", "enum": ["RazorPay", "UPI", "Card", "COD", "Pending"]},
                "status": {"type": "string", "example": "Paid", "enum": ["Pending", "Paid", "Failed", "Refunded"]},
                "date": {"type": "string", "example": "2026-09-22"},
                "history": {"type": "array", "items": {"$ref": "#/definitions/PaymentStatusEvent"}},
            },
        },
        "Receipt": {
            "type": "object",
            "properties": {
                "id": {"type": "string", "example": "RCT-P1Q2R"},
                "paymentId": {"type": "string", "example": "PAY-X9Y8Z"},
                "orderId": {"type": "string", "example": "ORD-A1B2C"},
                "receiptNo": {"type": "string", "example": "RCPT-882211"},
                "amount": {"type": "number", "example": 3499.0},
                "issuedAt": {"type": "string", "example": "2026-09-22"},
            },
        },
        "ShipmentStatusEvent": {
            "type": "object",
            "properties": {
                "status": {"type": "string", "example": "In Transit"},
                "date": {"type": "string", "example": "2026-09-23"},
                "location": {"type": "string", "example": "Bengaluru Hub"},
                "note": {"type": "string", "example": "Package sorted and dispatched to delivery center"},
            },
        },
        "Shipment": {
            "type": "object",
            "properties": {
                "id": {"type": "string", "example": "SHP-K4L5M"},
                "orderId": {"type": "string", "example": "ORD-A1B2C"},
                "customer": {"type": "string", "example": "Ananya Rao"},
                "courierId": {"type": "string", "example": "CUR-BLUDT"},
                "courier": {"type": "string", "example": "Blue Dart Express"},
                "trackingNumber": {"type": "string", "example": "BD882194012IN"},
                "status": {"type": "string", "example": "Shipped", "enum": ["Pending", "Packed", "Shipped", "Out for Delivery", "Delivered"]},
                "expectedDelivery": {"type": "string", "example": "2026-09-26"},
                "trackingHistory": {"type": "array", "items": {"$ref": "#/definitions/ShipmentStatusEvent"}},
            },
        },
        "Address": {
            "type": "object",
            "properties": {
                "id": {"type": "string", "example": "ADDR-1A2B3"},
                "label": {"type": "string", "example": "Home"},
                "line1": {"type": "string", "example": "Flat 402, Lotus Residency"},
                "line2": {"type": "string", "example": "Indiranagar 100ft Road"},
                "city": {"type": "string", "example": "Bengaluru"},
                "state": {"type": "string", "example": "Karnataka"},
                "postalCode": {"type": "string", "example": "560038"},
                "phone": {"type": "string", "example": "+919876543210"},
                "isDefault": {"type": "boolean", "example": True},
            },
        },
        "Campaign": {
            "type": "object",
            "properties": {
                "id": {"type": "string", "example": "CMP-DIW26"},
                "name": {"type": "string", "example": "Diwali Mega Sale"},
                "code": {"type": "string", "example": "DIWALI26"},
                "description": {"type": "string", "example": "Special festive discounts across all categories."},
                "discountType": {"type": "string", "example": "percentage", "enum": ["percentage", "fixed"]},
                "discountValue": {"type": "number", "example": 20.0},
                "minPurchase": {"type": "number", "example": 999.0},
                "startDate": {"type": "string", "example": "2026-10-15"},
                "endDate": {"type": "string", "example": "2026-10-25"},
                "status": {"type": "string", "example": "active", "enum": ["scheduled", "active", "completed", "cancelled"]},
            },
        },
        "Courier": {
            "type": "object",
            "properties": {
                "id": {"type": "string", "example": "CUR-BLUDT"},
                "name": {"type": "string", "example": "Blue Dart Express"},
                "code": {"type": "string", "example": "BLUEDART"},
                "contactEmail": {"type": "string", "example": "track@bluedart.com"},
                "trackingUrlTemplate": {"type": "string", "example": "https://www.bluedart.com/track?handler=tifi&numbers={tracking_number}"},
                "isActive": {"type": "boolean", "example": True},
            },
        },
        "WishlistItem": {
            "type": "object",
            "properties": {
                "id": {"type": "string", "example": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"},
                "userId": {"type": "string", "example": "u-003"},
                "productId": {"type": "string", "example": "p-1002"},
                "product": {"$ref": "#/definitions/Product"},
                "createdAt": {"type": "string", "example": "2026-09-24 15:30:00"},
            },
        },
        "ErrorResponse": {
            "type": "object",
            "properties": {
                "error": {"type": "string", "example": "Description of the error"},
            },
        },
    },
}


def init_swagger(app) -> Swagger:
    """Initialize Flasgger Swagger documentation on the Flask application."""
    swagger = Swagger(app, config=SWAGGER_CONFIG, template=SWAGGER_TEMPLATE)

    # Ensure /api/docs redirects cleanly to /api/docs/ without 404
    @app.route("/api/docs")
    def docs_redirect():
        return redirect("/api/docs/", code=308)

    return swagger
