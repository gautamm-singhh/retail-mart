from flask import Blueprint, jsonify

from app.utils.decorators import roles_required
from app.utils.reports import generate_sales_report, generate_analytics_summary, PERIODS

reports_bp = Blueprint("reports", __name__)


@reports_bp.get("/analytics-summary")
@roles_required("Admin", "Manager")
def get_analytics_summary():
    """
    Get Analytics Summary
    Get aggregated analytics and business metrics including revenue totals, monthly trends, and top products. Admin or Manager access required.
    ---
    tags:
      - Reports
    security:
      - Bearer: []
    responses:
      200:
        description: Request successful. Returns the analytics summary data.
        schema:
          type: object
          properties:
            executiveTotals:
              type: object
              properties:
                totalRevenue:
                  type: number
                  example: 125400.5
                totalOrders:
                  type: integer
                  example: 450
                deliveredOrders:
                  type: integer
                  example: 380
                activeOrders:
                  type: integer
                  example: 420
                avgOrderValue:
                  type: number
                  example: 298.57
            monthlyTrends:
              type: array
              items:
                type: object
                properties:
                  period:
                    type: string
                    example: "2026-03"
                  orderCount:
                    type: integer
                    example: 45
                  revenue:
                    type: number
                    example: 14500.0
            categoryBreakdown:
              type: array
              items:
                type: object
                properties:
                  category:
                    type: string
                    example: "Electronics"
                  orderCount:
                    type: integer
                    example: 35
                  unitsSold:
                    type: integer
                    example: 80
                  totalSpent:
                    type: number
                    example: 42000.0
            orderStatusBreakdown:
              type: array
              items:
                type: object
                properties:
                  status:
                    type: string
                    example: "Delivered"
                  count:
                    type: integer
                    example: 380
                  percentage:
                    type: number
                    example: 84.4
            paymentMethodBreakdown:
              type: array
              items:
                type: object
                properties:
                  method:
                    type: string
                    example: "Credit Card"
                  count:
                    type: integer
                    example: 210
                  totalAmount:
                    type: number
                    example: 65000.0
            topProducts:
              type: array
              items:
                type: object
                properties:
                  productName:
                    type: string
                    example: "Wireless Headphones"
                  unitsSold:
                    type: integer
                    example: 45
                  totalRevenue:
                    type: number
                    example: 6750.0
      401:
        description: Authentication is required or the provided token is invalid.
        schema:
          $ref: '#/definitions/ErrorResponse'
      403:
        description: You do not have permission to perform this action. Admin or Manager role required.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    return jsonify(generate_analytics_summary())


@reports_bp.get("/<period>")
@roles_required("Admin", "Manager")
def get_report(period):
    """
    Get Periodic Sales Report
    Get a periodic sales report grouped by daily, monthly, or yearly buckets. Admin or Manager access required.
    ---
    tags:
      - Reports
    security:
      - Bearer: []
    parameters:
      - name: period
        in: path
        type: string
        required: true
        enum: [daily, monthly, yearly]
        description: Time aggregation period (daily, monthly, or yearly).
        example: monthly
    responses:
      200:
        description: Request successful. Returns chronological sales report buckets.
        schema:
          type: array
          items:
            type: object
            properties:
              period:
                type: string
                example: "2026-03"
              orderCount:
                type: integer
                example: 42
              revenue:
                type: number
                example: 12450.75
      400:
        description: Invalid or missing request data. Period must be daily, monthly, or yearly.
        schema:
          type: object
          properties:
            error:
              type: string
              example: "period must be one of ('daily', 'monthly', 'yearly')"
      401:
        description: Authentication is required or the provided token is invalid.
        schema:
          $ref: '#/definitions/ErrorResponse'
      403:
        description: You do not have permission to perform this action. Admin or Manager role required.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    if period not in PERIODS:
        return jsonify({"error": f"period must be one of {PERIODS}"}), 400
    return jsonify(generate_sales_report(period))
