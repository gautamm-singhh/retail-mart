from datetime import date, datetime

from flask import Blueprint, request, jsonify

from app.extensions import db
from app.models.campaign import Campaign, CAMPAIGN_DISCOUNT_TYPES, CAMPAIGN_STATUSES
from app.models.user import User
from app.utils.decorators import roles_required
from app.utils.ids import random_suffix
from app.utils.email import send_email, campaign_email

campaigns_bp = Blueprint("campaigns", __name__)


@campaigns_bp.get("")
@roles_required("Admin", "Manager", "Staff")
def list_campaigns():
    status = request.args.get("status")
    query = Campaign.query
    if status:
        query = query.filter(Campaign.status == status)
    campaigns = query.order_by(Campaign.start_date.desc()).all()
    return jsonify([c.to_dict() for c in campaigns])


@campaigns_bp.get("/<campaign_id>")
@roles_required("Admin", "Manager", "Staff")
def get_campaign(campaign_id):
    campaign = Campaign.query.get(campaign_id)
    if not campaign:
        return jsonify({"error": "Campaign not found"}), 404
    return jsonify(campaign.to_dict())


@campaigns_bp.post("")
@roles_required("Admin", "Manager")
def create_campaign():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    discount_type = data.get("discountType", "percentage")
    discount_value = data.get("discountValue")
    start_date_str = data.get("startDate")

    if not name:
        return jsonify({"error": "name is required"}), 400
    if discount_type not in CAMPAIGN_DISCOUNT_TYPES:
        return jsonify({"error": f"discountType must be one of {CAMPAIGN_DISCOUNT_TYPES}"}), 400
    if discount_value is None or float(discount_value) < 0:
        return jsonify({"error": "discountValue must be a non-negative number"}), 400
    if not start_date_str:
        return jsonify({"error": "startDate is required"}), 400

    campaign = Campaign(
        id=f"CMP-{random_suffix(5)}",
        name=name,
        code=(data.get("code") or f"{name[:4].upper()}{random_suffix(3)}").replace(" ", ""),
        description=data.get("description", ""),
        discount_type=discount_type,
        discount_value=discount_value,
        min_purchase=data.get("minPurchase"),
        start_date=date.fromisoformat(start_date_str),
        end_date=date.fromisoformat(data["endDate"]) if data.get("endDate") else None,
        status=data.get("status", "scheduled"),
    )
    db.session.add(campaign)
    db.session.commit()
    return jsonify(campaign.to_dict()), 201


@campaigns_bp.put("/<campaign_id>")
@roles_required("Admin", "Manager")
def update_campaign(campaign_id):
    campaign = Campaign.query.get(campaign_id)
    if not campaign:
        return jsonify({"error": "Campaign not found"}), 404

    data = request.get_json(silent=True) or {}
    if "name" in data:
        campaign.name = data["name"]
    if "description" in data:
        campaign.description = data["description"]
    if "discountType" in data:
        if data["discountType"] not in CAMPAIGN_DISCOUNT_TYPES:
            return jsonify({"error": f"discountType must be one of {CAMPAIGN_DISCOUNT_TYPES}"}), 400
        campaign.discount_type = data["discountType"]
    if "discountValue" in data:
        campaign.discount_value = data["discountValue"]
    if "minPurchase" in data:
        campaign.min_purchase = data["minPurchase"]
    if "startDate" in data:
        campaign.start_date = date.fromisoformat(data["startDate"])
    if "endDate" in data:
        campaign.end_date = date.fromisoformat(data["endDate"]) if data["endDate"] else None
    if "status" in data:
        if data["status"] not in CAMPAIGN_STATUSES:
            return jsonify({"error": f"status must be one of {CAMPAIGN_STATUSES}"}), 400
        campaign.status = data["status"]

    campaign.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(campaign.to_dict())


@campaigns_bp.delete("/<campaign_id>")
@roles_required("Admin")
def delete_campaign(campaign_id):
    campaign = Campaign.query.get(campaign_id)
    if not campaign:
        return jsonify({"error": "Campaign not found"}), 404
    db.session.delete(campaign)
    db.session.commit()
    return "", 204


@campaigns_bp.post("/<campaign_id>/send")
@roles_required("Admin", "Manager")
def send_campaign(campaign_id):
    """
    Emails every active user about this campaign.
    Uses send_bulk_email() to reuse a single authenticated SMTP session,
    preventing socket churn and avoiding Gmail rate-limits.
    """
    campaign = Campaign.query.get(campaign_id)
    if not campaign:
        return jsonify({"error": "Campaign not found"}), 404

    users = User.query.filter_by(status="active").all()
    # Extract valid recipient email addresses from database
    recipients = [u.email.strip() for u in users if u.email and u.email.strip()]
    subject, body = campaign_email(campaign)

    from app.utils.email import send_bulk_email
    sent = send_bulk_email(recipients, subject, body)

    # If campaign was scheduled, transition it to active upon send
    if campaign.status == "scheduled":
        campaign.status = "active"
        db.session.commit()

    return jsonify({"campaignId": campaign.id, "recipients": len(recipients), "sent": sent})
