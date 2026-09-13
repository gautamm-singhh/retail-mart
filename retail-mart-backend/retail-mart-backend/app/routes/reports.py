from flask import Blueprint, jsonify

from app.utils.decorators import roles_required
from app.utils.reports import generate_sales_report, generate_analytics_summary, PERIODS

reports_bp = Blueprint("reports", __name__)


@reports_bp.get("/analytics-summary")
@roles_required("Admin", "Manager")
def get_analytics_summary():
    """Returns aggregated executive metrics for charts and dashboards without PII."""
    return jsonify(generate_analytics_summary())


@reports_bp.get("/<period>")
@roles_required("Admin", "Manager")
def get_report(period):
    """
    period is one of "daily", "monthly", "yearly" - covers Daily Sales,
    Monthly Sales, and Year End Sales with one route and one function
    (see app/utils/reports.py).
    """
    if period not in PERIODS:
        return jsonify({"error": f"period must be one of {PERIODS}"}), 400
    return jsonify(generate_sales_report(period))
