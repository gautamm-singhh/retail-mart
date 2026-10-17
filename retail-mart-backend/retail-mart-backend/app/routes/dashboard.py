from flask import Blueprint, jsonify
from sqlalchemy import case, func

from app.extensions import db
from app.models.user import User
from app.models.catalog import Product
from app.models.order import Order
from app.models.payment import Payment
from app.models.shipment import Shipment
from app.utils.decorators import roles_required

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.get("/summary")
@roles_required("Admin", "Manager", "Staff")
def summary():
    """
    Get Dashboard Summary
    Get operational dashboard metrics including counts for active users, total products, pending orders, payments, and shipments. Admin, Manager, or Staff access required.
    ---
    tags:
      - Dashboard
    security:
      - Bearer: []
    responses:
      200:
        description: Request successful. Returns dashboard KPI summary cards.
        schema:
          type: array
          items:
            type: object
            properties:
              label:
                type: string
                example: Active Users
              value:
                type: string
                example: "12"
              hint:
                type: string
                example: 15 total accounts
      401:
        description: Authentication is required or the provided token is invalid.
      403:
        description: You do not have permission to perform this action. Admin, Manager, or Staff role required.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    user_counts = db.session.query(
        func.count(User.id),
        func.sum(case((User.status == "active", 1), else_=0)),
    ).first()
    total_users = (user_counts[0] if user_counts else 0) or 0
    active_users = int((user_counts[1] if user_counts else 0) or 0)

    product_counts = db.session.query(
        func.count(Product.id),
        func.sum(case((Product.status == "out-of-stock", 1), else_=0)),
    ).first()
    total_products = (product_counts[0] if product_counts else 0) or 0
    out_of_stock_products = int((product_counts[1] if product_counts else 0) or 0)

    order_counts = db.session.query(
        func.count(Order.id),
        func.sum(case((Order.status.in_(("Pending", "Processing")), 1), else_=0)),
    ).first()
    total_orders = (order_counts[0] if order_counts else 0) or 0
    pending_orders = int((order_counts[1] if order_counts else 0) or 0)

    payment_counts = db.session.query(
        func.sum(case((Payment.status == "Paid", 1), else_=0)),
        func.sum(case((Payment.status == "Failed", 1), else_=0)),
    ).first()
    paid_payments = int((payment_counts[0] if payment_counts else 0) or 0)
    failed_payments = int((payment_counts[1] if payment_counts else 0) or 0)

    shipment_counts = db.session.query(
        func.count(Shipment.id),
        func.sum(case((Shipment.status != "Delivered", 1), else_=0)),
    ).first()
    total_shipments = (shipment_counts[0] if shipment_counts else 0) or 0
    pending_shipments = int((shipment_counts[1] if shipment_counts else 0) or 0)

    cards = [
        {
            "label": "Active Users",
            "value": str(active_users),
            "hint": f"{total_users} total accounts",
        },
        {
            "label": "Total Products",
            "value": str(total_products),
            "hint": f"{out_of_stock_products} out of stock",
        },
        {
            "label": "Pending Orders",
            "value": str(pending_orders),
            "hint": f"{total_orders} orders total",
        },
        {
            "label": "Total Payments",
            "value": str(paid_payments),
            "hint": f"{failed_payments} failed",
        },
        {
            "label": "Pending Shipments",
            "value": str(pending_shipments),
            "hint": f"{total_shipments} shipments total",
        },
    ]
    return jsonify(cards)
