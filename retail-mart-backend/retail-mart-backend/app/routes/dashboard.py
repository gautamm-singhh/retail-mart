from flask import Blueprint, jsonify

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
    users = User.query.all()
    products = Product.query.all()
    orders = Order.query.all()
    payments = Payment.query.all()
    shipments = Shipment.query.all()

    cards = [
        {
            "label": "Active Users",
            "value": str(len([u for u in users if u.status == "active"])),
            "hint": f"{len(users)} total accounts",
        },
        {
            "label": "Total Products",
            "value": str(len(products)),
            "hint": f"{len([p for p in products if p.status == 'out-of-stock'])} out of stock",
        },
        {
            "label": "Pending Orders",
            "value": str(len([o for o in orders if o.status in ('Pending', 'Processing')])),
            "hint": f"{len(orders)} orders total",
        },
        {
            "label": "Total Payments",
            "value": str(len([p for p in payments if p.status == 'Paid'])),
            "hint": f"{len([p for p in payments if p.status == 'Failed'])} failed",
        },
        {
            "label": "Pending Shipments",
            "value": str(len([s for s in shipments if s.status != 'Delivered'])),
            "hint": f"{len(shipments)} shipments total",
        },
    ]
    return jsonify(cards)
