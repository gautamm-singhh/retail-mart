"""
Customer-facing statistics endpoint.

GET /api/customer/stats/summary — returns purchase stats for the
authenticated Customer only, derived from live Order / OrderItem /
Product data. Customers can only see their own numbers; Admin /
Manager / Staff are blocked (403).
"""

from datetime import date, timedelta

from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity
from sqlalchemy.orm import joinedload, selectinload

from app.extensions import db
from app.models.order import Order, OrderItem
from app.models.catalog import Product
from app.utils.decorators import roles_required

customer_stats_bp = Blueprint("customer_stats", __name__)


@customer_stats_bp.get("/summary")
@roles_required("Customer")
def customer_summary():
    """
    Get Customer Statistics
    Get purchase statistics for your customer account, including total orders, total amount spent, and category breakdown. Customer authentication required.
    ---
    tags:
      - Customer Statistics
    security:
      - Bearer: []
    responses:
      200:
        description: Request successful. Returns customer purchase statistics.
        schema:
          type: object
          properties:
            totalOrders:
              type: integer
              example: 4
            totalSpent:
              type: number
              example: 12499.50
            totalItemsPurchased:
              type: integer
              example: 8
            uniqueProductsPurchased:
              type: integer
              example: 5
            activeShipments:
              type: integer
              example: 1
            lastOrderDate:
              type: string
              example: 2026-09-22
            last30DaysOrders:
              type: integer
              example: 2
            last30DaysSpent:
              type: number
              example: 4999.0
            categoryBreakdown:
              type: array
              items:
                type: object
                properties:
                  category:
                    type: string
                    example: Electronics
                  orderCount:
                    type: integer
                    example: 3
                  totalSpent:
                    type: number
                    example: 8999.0
      401:
        description: Authentication is required or the provided token is invalid.
      403:
        description: You do not have permission to perform this action. Customer role required.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    user_id = get_jwt_identity()
    thirty_days_ago = date.today() - timedelta(days=30)

    # All orders for this customer (eager load items to prevent N+1 queries)
    all_orders = (
        Order.query.options(selectinload(Order.items))
        .filter_by(user_id=user_id)
        .all()
    )

    total_orders = len(all_orders)
    last_order_date = None

    # Only non-Cancelled orders count toward money/items
    active_orders = [o for o in all_orders if o.status != "Cancelled"]

    total_spent = sum(float(o.amount) for o in active_orders)

    total_items = 0
    unique_products: set[str] = set()
    for order in active_orders:
        for item in order.items:
            total_items += item.quantity
            unique_products.add(item.product_name.strip().lower())

    # Last order date (including Cancelled — "last time they placed an order")
    if all_orders:
        dates = [o.date for o in all_orders if o.date]
        if dates:
            last_order_date = max(dates).strftime("%Y-%m-%d")

    # Active shipments: shipments linked to this customer's orders, not yet Delivered
    from app.models.shipment import Shipment

    active_order_ids = [o.id for o in active_orders]
    active_shipments = 0
    if active_order_ids:
        active_shipments = Shipment.query.filter(
            Shipment.order_id.in_(active_order_ids),
            Shipment.status != "Delivered",
        ).count()

    # Last-30-days metrics
    recent_orders = [o for o in active_orders if o.date and o.date >= thirty_days_ago]
    last30_orders = len(recent_orders)
    last30_spent = sum(float(o.amount) for o in recent_orders)

    # Category breakdown — join OrderItem -> Product -> Category (best-effort)
    # Pre-fetch products once with category_ref to avoid nested SQL queries per item
    all_catalog_products = Product.query.options(joinedload(Product.category_ref)).all()
    product_category_by_lower_name = {
        p.name.strip().lower(): (p.category_ref.name if p.category_ref else "Unknown")
        for p in all_catalog_products
    }

    category_map: dict[str, dict] = {}
    for order in active_orders:
        for item in order.items:
            category = product_category_by_lower_name.get(
                item.product_name.strip().lower(), "Unknown"
            )
            if category not in category_map:
                category_map[category] = {"category": category, "orderCount": 0, "totalSpent": 0.0}
            category_map[category]["orderCount"] += 1
            category_map[category]["totalSpent"] += float(item.price) * item.quantity

    category_breakdown = sorted(
        category_map.values(), key=lambda x: x["totalSpent"], reverse=True
    )

    return jsonify({
        "totalOrders": total_orders,
        "totalSpent": round(total_spent, 2),
        "totalItemsPurchased": total_items,
        "uniqueProductsPurchased": len(unique_products),
        "activeShipments": active_shipments,
        "lastOrderDate": last_order_date,
        "last30DaysOrders": last30_orders,
        "last30DaysSpent": round(last30_spent, 2),
        "categoryBreakdown": category_breakdown,
    })
