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

from app.extensions import db
from app.models.order import Order, OrderItem
from app.models.catalog import Product
from app.utils.decorators import roles_required

customer_stats_bp = Blueprint("customer_stats", __name__)


@customer_stats_bp.get("/summary")
@roles_required("Customer")
def customer_summary():
    """
    Returns aggregated purchase statistics for the logged-in customer.

    Response shape (matches src/types/customerStats.ts -> CustomerStats):
      totalOrders             int   — all orders ever placed
      totalSpent              float — sum of non-Cancelled order amounts
      totalItemsPurchased     int   — sum of item quantities across non-Cancelled orders
      uniqueProductsPurchased int   — distinct product names across non-Cancelled orders
      activeShipments         int   — shipments not yet Delivered
      lastOrderDate           str|null — most recent order date (YYYY-MM-DD)
      last30DaysOrders        int
      last30DaysSpent         float
      categoryBreakdown       list[{ category, orderCount, totalSpent }]
    """
    user_id = get_jwt_identity()
    thirty_days_ago = date.today() - timedelta(days=30)

    # All orders for this customer
    all_orders = Order.query.filter_by(user_id=user_id).all()

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
    # Products deleted after order placement show as "Unknown".
    category_map: dict[str, dict] = {}
    for order in active_orders:
        for item in order.items:
            product = Product.query.filter(
                db.func.lower(Product.name) == item.product_name.strip().lower()
            ).first()
            category = (
                product.category_ref.name
                if product and product.category_ref
                else "Unknown"
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
