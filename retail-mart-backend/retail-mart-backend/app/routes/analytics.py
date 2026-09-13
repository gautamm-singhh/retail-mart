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
    """Task 35 (Analytics -> Projections): plain statistical forecast."""
    period, periods_ahead, err, status = _parse_args()
    if err:
        return err, status
    return jsonify(simple_projection(period, periods_ahead))


@analytics_bp.get("/ai-projections")
@roles_required("Admin", "Manager")
def get_ai_projections():
    """
    Task 36 (AI Projection): same numbers as /projections, plus an LLM
    narrative when GEMINI_API_KEY is set (see app/utils/projections.py
    for the fallback behaviour when it isn't).
    """
    period, periods_ahead, err, status = _parse_args()
    if err:
        return err, status
    return jsonify(ai_projection(period, periods_ahead))
