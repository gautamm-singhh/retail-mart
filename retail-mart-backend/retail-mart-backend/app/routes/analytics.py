from flask import Blueprint, request, jsonify

from app.utils.decorators import roles_required
from app.utils.reports import PERIODS
from app.utils.projections import simple_projection, ai_projection

analytics_bp = Blueprint("analytics", __name__)


def _parse_args():
    period = request.args.get("period", "monthly")
    periods_ahead = request.args.get("periodsAhead", "3")
    if period not in PERIODS:
        return None, None, jsonify({"error": f"period must be one of {PERIODS}"}), 400
    try:
        periods_ahead = max(1, min(12, int(periods_ahead)))
    except ValueError:
        periods_ahead = 3
    return period, periods_ahead, None, None


@analytics_bp.get("/projections")
@roles_required("Admin", "Manager")
def get_projections():
    """
    Get Statistical Sales Projections
    Get statistical sales revenue projections based on historical sales data. Admin or Manager access required.
    ---
    tags:
      - Analytics
    security:
      - Bearer: []
    parameters:
      - in: query
        name: period
        type: string
        required: false
        default: monthly
        description: Time grouping period (daily, weekly, monthly, quarterly, or yearly).
        enum: [daily, weekly, monthly, quarterly, yearly]
      - in: query
        name: periodsAhead
        type: integer
        required: false
        default: 3
        description: Number of future periods to forecast (between 1 and 12).
    responses:
      200:
        description: Request successful. Returns statistical sales projections.
        schema:
          type: object
          properties:
            period:
              type: string
              example: monthly
            history:
              type: array
              items:
                type: object
            forecast:
              type: array
              items:
                type: object
                properties:
                  period:
                    type: string
                    example: "+1"
                  projectedRevenue:
                    type: number
                    example: 45200.0
      400:
        description: Invalid or missing query parameters. Period must be daily, weekly, monthly, quarterly, or yearly.
        schema:
          $ref: '#/definitions/ErrorResponse'
      401:
        description: Authentication is required or the provided token is invalid.
      403:
        description: You do not have permission to perform this action. Admin or Manager role required.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    period, periods_ahead, err, status = _parse_args()
    if err:
        return err, status
    return jsonify(simple_projection(period, periods_ahead))


@analytics_bp.get("/ai-projections")
@roles_required("Admin", "Manager")
def get_ai_projections():
    """
    Get AI Sales Projections
    Get AI-powered sales projections and an executive summary narrative based on historical data. Admin or Manager access required.
    ---
    tags:
      - Analytics
    security:
      - Bearer: []
    parameters:
      - in: query
        name: period
        type: string
        required: false
        default: monthly
        description: Time grouping period (daily, weekly, monthly, quarterly, or yearly).
        enum: [daily, weekly, monthly, quarterly, yearly]
      - in: query
        name: periodsAhead
        type: integer
        required: false
        default: 3
        description: Number of future periods to forecast (between 1 and 12).
    responses:
      200:
        description: Request successful. Returns AI sales projections with an executive summary narrative.
        schema:
          type: object
          properties:
            period:
              type: string
              example: monthly
            history:
              type: array
              items:
                type: object
            forecast:
              type: array
              items:
                type: object
                properties:
                  period:
                    type: string
                    example: "+1"
                  projectedRevenue:
                    type: number
                    example: 45200.0
            narrative:
              type: string
              example: Based on recent monthly growth trends, revenue is expected to rise by 8.4%...
            model:
              type: string
              example: gemini-2.0-flash
      400:
        description: Invalid or missing query parameters. Period must be daily, weekly, monthly, quarterly, or yearly.
        schema:
          $ref: '#/definitions/ErrorResponse'
      401:
        description: Authentication is required or the provided token is invalid.
      403:
        description: You do not have permission to perform this action. Admin or Manager role required.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    period, periods_ahead, err, status = _parse_args()
    if err:
        return err, status
    return jsonify(ai_projection(period, periods_ahead))
