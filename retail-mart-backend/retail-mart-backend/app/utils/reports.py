"""
Single shared aggregation function behind reporting endpoints.
Provides aggregated metrics for executive charts and analytics.
Strictly aggregates data with zero exposure of customer PII (GDPR/Data Protection compliant).
"""

from collections import OrderedDict, Counter
from datetime import date

from app.extensions import db
from app.models.order import Order, OrderItem
from app.models.catalog import Product
from app.models.payment import Payment

PERIODS = ("daily", "monthly", "yearly")


def _bucket_key(order_date: date, period: str) -> str:
    if period == "daily":
        return order_date.isoformat()
    if period == "monthly":
        return order_date.strftime("%Y-%m")
    return order_date.strftime("%Y")


def generate_sales_report(period: str) -> list[dict]:
    """
    Returns a list of {period, orderCount, revenue} dicts, one per bucket,
    sorted chronologically. Excludes Cancelled orders.
    """
    if period not in PERIODS:
        raise ValueError(f"period must be one of {PERIODS}")

    buckets: "OrderedDict[str, dict]" = OrderedDict()

    orders = (
        Order.query.filter(Order.status != "Cancelled")
        .order_by(Order.date.asc())
        .with_entities(Order.date, Order.amount)
        .all()
    )

    for order_date, amount in orders:
        if not order_date:
            continue
        key = _bucket_key(order_date, period)
        bucket = buckets.setdefault(key, {"period": key, "orderCount": 0, "revenue": 0.0})
        bucket["orderCount"] += 1
        bucket["revenue"] += float(amount)

    return list(buckets.values())


def generate_analytics_summary() -> dict:
    """
    Returns an executive summary containing aggregated metrics for visual charts:
    - periodTrends (monthly sales trend)
    - categoryBreakdown (revenue and units by category)
    - orderStatusBreakdown (count and percentage per status)
    - paymentMethodBreakdown (count and volume per payment method)
    - topProducts (top products by units and revenue)
    - executiveTotals (high-level KPIs)
    """
    all_orders = Order.query.all()
    active_orders = [o for o in all_orders if o.status != "Cancelled"]

    # High-level KPIs
    total_revenue = sum(float(o.amount) for o in active_orders)
    total_orders = len(all_orders)
    delivered_orders = sum(1 for o in all_orders if o.status == "Delivered")
    avg_order_value = round(total_revenue / len(active_orders), 2) if active_orders else 0.0

    # Status Breakdown
    status_counts = Counter(o.status for o in all_orders)
    order_status_breakdown = [
        {
            "status": st,
            "count": count,
            "percentage": round((count / total_orders) * 100, 1) if total_orders else 0,
        }
        for st, count in status_counts.most_common()
    ]

    # Category Breakdown & Top Products
    category_map: dict[str, dict] = {}
    product_map: dict[str, dict] = {}

    for order in active_orders:
        for item in order.items:
            # Aggregate product stats
            p_key = item.product_name.strip()
            prod_stat = product_map.setdefault(p_key, {"productName": p_key, "unitsSold": 0, "totalRevenue": 0.0})
            prod_stat["unitsSold"] += item.quantity
            prod_stat["totalRevenue"] += float(item.price) * item.quantity

            # Resolve Category
            product = Product.query.filter(
                db.func.lower(Product.name) == item.product_name.strip().lower()
            ).first()
            category_name = (
                product.category_ref.name
                if product and product.category_ref
                else "General"
            )
            cat_stat = category_map.setdefault(
                category_name,
                {"category": category_name, "orderCount": 0, "unitsSold": 0, "totalSpent": 0.0},
            )
            cat_stat["orderCount"] += 1
            cat_stat["unitsSold"] += item.quantity
            cat_stat["totalSpent"] += float(item.price) * item.quantity

    top_products = sorted(product_map.values(), key=lambda p: p["unitsSold"], reverse=True)[:5]
    category_breakdown = sorted(category_map.values(), key=lambda c: c["totalSpent"], reverse=True)

    # Payment Methods Breakdown
    payments = Payment.query.all()
    method_map: dict[str, dict] = {}
    for p in payments:
        if p.status == "Failed":
            continue
        m_name = p.method or "Unknown"
        m_stat = method_map.setdefault(m_name, {"method": m_name, "count": 0, "totalAmount": 0.0})
        m_stat["count"] += 1
        m_stat["totalAmount"] += float(p.amount)
    payment_method_breakdown = sorted(method_map.values(), key=lambda m: m["totalAmount"], reverse=True)

    # Monthly Trends for Charting
    monthly_trends = generate_sales_report("monthly")

    return {
        "executiveTotals": {
            "totalRevenue": round(total_revenue, 2),
            "totalOrders": total_orders,
            "deliveredOrders": delivered_orders,
            "activeOrders": len(active_orders),
            "avgOrderValue": avg_order_value,
        },
        "monthlyTrends": monthly_trends,
        "categoryBreakdown": category_breakdown,
        "orderStatusBreakdown": order_status_breakdown,
        "paymentMethodBreakdown": payment_method_breakdown,
        "topProducts": top_products,
    }
