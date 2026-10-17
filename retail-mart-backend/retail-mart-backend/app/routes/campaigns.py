from datetime import date, datetime

from flask import Blueprint, request, jsonify, current_app

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
    """
    List Marketing Campaigns
    Get a list of marketing campaigns with their discount codes, dates, and statuses. Admin, Manager, or Staff access required.
    ---
    tags:
      - Campaigns
    security:
      - Bearer: []
    parameters:
      - in: query
        name: status
        type: string
        required: false
        description: Filter campaigns by status (scheduled, active, completed, or cancelled).
    responses:
      200:
        description: Request successful. Returns the list of marketing campaigns.
        schema:
          type: array
          items:
            $ref: '#/definitions/Campaign'
      401:
        description: Authentication is required or the provided token is invalid.
      403:
        description: You do not have permission to perform this action. Admin, Manager, or Staff role required.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    status = request.args.get("status")
    query = Campaign.query
    if status:
        query = query.filter(Campaign.status == status)
    campaigns = query.order_by(Campaign.start_date.desc()).all()
    return jsonify([c.to_dict() for c in campaigns])


@campaigns_bp.get("/<campaign_id>")
@roles_required("Admin", "Manager", "Staff")
def get_campaign(campaign_id):
    """
    Get Campaign Details
    Get details of a specific marketing campaign using its campaign ID. Admin, Manager, or Staff access required.
    ---
    tags:
      - Campaigns
    security:
      - Bearer: []
    parameters:
      - in: path
        name: campaign_id
        type: string
        required: true
        description: Unique campaign ID (e.g. CMP-1001).
    responses:
      200:
        description: Request successful. Returns the campaign details.
        schema:
          $ref: '#/definitions/Campaign'
      401:
        description: Authentication is required or the provided token is invalid.
      403:
        description: You do not have permission to perform this action. Admin, Manager, or Staff role required.
        schema:
          $ref: '#/definitions/ErrorResponse'
      404:
        description: The requested campaign was not found.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    campaign = Campaign.query.get(campaign_id)
    if not campaign:
        return jsonify({"error": "Campaign not found"}), 404
    return jsonify(campaign.to_dict())


@campaigns_bp.post("")
@roles_required("Admin", "Manager")
def create_campaign():
    """
    Create Marketing Campaign
    Create a new marketing campaign with a discount code, discount value, and date range. Admin or Manager access required.
    ---
    tags:
      - Campaigns
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        description: Enter the campaign details. name, startDate, and discountValue are required.
        schema:
          type: object
          required:
            - name
            - startDate
            - discountValue
          properties:
            name:
              type: string
              description: Marketing campaign name.
              example: Diwali Mega Sale
            code:
              type: string
              description: Promotional coupon code.
              example: DIWALI26
            description:
              type: string
              description: Overview of the promotion or terms.
              example: Festive discounts on electronics and fashion.
            discountType:
              type: string
              description: Discount calculation type (percentage or fixed).
              example: percentage
              enum: [percentage, fixed]
            discountValue:
              type: number
              description: Discount percentage or fixed deduction amount.
              example: 20.0
            minPurchase:
              type: number
              description: Minimum order amount required to use the code.
              example: 999.0
            startDate:
              type: string
              description: Campaign start date in YYYY-MM-DD format.
              example: 2026-10-15
            endDate:
              type: string
              description: Optional campaign end date in YYYY-MM-DD format.
              example: 2026-10-25
            status:
              type: string
              description: Initial status of the campaign.
              example: scheduled
              enum: [scheduled, active, completed, cancelled]
    responses:
      201:
        description: Campaign created successfully.
        schema:
          $ref: '#/definitions/Campaign'
      400:
        description: Invalid or missing request data. name, startDate, and discountValue are required.
        schema:
          $ref: '#/definitions/ErrorResponse'
      401:
        description: Authentication is required or the provided token is invalid.
      403:
        description: You do not have permission to perform this action. Admin or Manager role required.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
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
    """
    Update Marketing Campaign
    Update details, discount terms, or status of an existing campaign. Admin or Manager access required.
    ---
    tags:
      - Campaigns
    security:
      - Bearer: []
    parameters:
      - in: path
        name: campaign_id
        type: string
        required: true
        description: Unique campaign ID.
      - in: body
        name: body
        required: true
        description: Enter one or more campaign fields to update.
        schema:
          type: object
          properties:
            name:
              type: string
              description: Updated campaign name.
              example: Diwali Mega Sale 2026
            description:
              type: string
              description: Updated promotional description.
              example: Updated festive discounts.
            discountType:
              type: string
              description: Updated discount calculation type.
              example: percentage
              enum: [percentage, fixed]
            discountValue:
              type: number
              description: Updated discount percentage or fixed amount.
              example: 25.0
            minPurchase:
              type: number
              description: Updated minimum order amount required.
              example: 1499.0
            startDate:
              type: string
              description: Updated start date in YYYY-MM-DD format.
              example: 2026-10-15
            endDate:
              type: string
              description: Updated end date in YYYY-MM-DD format.
              example: 2026-10-28
            status:
              type: string
              description: Updated status.
              example: active
              enum: [scheduled, active, completed, cancelled]
    responses:
      200:
        description: Campaign updated successfully.
        schema:
          $ref: '#/definitions/Campaign'
      400:
        description: Invalid or missing request data.
        schema:
          $ref: '#/definitions/ErrorResponse'
      401:
        description: Authentication is required or the provided token is invalid.
      403:
        description: You do not have permission to perform this action. Admin or Manager role required.
        schema:
          $ref: '#/definitions/ErrorResponse'
      404:
        description: The requested campaign was not found.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
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
    """
    Delete Marketing Campaign
    Delete a marketing campaign using its campaign ID. Admin access required.
    ---
    tags:
      - Campaigns
    security:
      - Bearer: []
    parameters:
      - in: path
        name: campaign_id
        type: string
        required: true
        description: Unique campaign ID to delete.
    responses:
      204:
        description: Campaign deleted successfully.
      401:
        description: Authentication is required or the provided token is invalid.
      403:
        description: You do not have permission to perform this action. Admin role required.
        schema:
          $ref: '#/definitions/ErrorResponse'
      404:
        description: The requested campaign was not found.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
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
    Send Campaign Email
    Broadcast promotional emails for this campaign to all active registered users. Admin or Manager access required.
    ---
    tags:
      - Campaigns
    security:
      - Bearer: []
    parameters:
      - in: path
        name: campaign_id
        type: string
        required: true
        description: Unique campaign ID to send emails for.
    responses:
      200:
        description: Request successful. Returns the email delivery report.
        schema:
          type: object
          properties:
            campaignId:
              type: string
              example: CMP-1001
            recipients:
              type: integer
              example: 45
            sent:
              type: integer
              example: 44
            refused:
              type: object
            invalidRecipients:
              type: array
              items:
                type: string
      400:
        description: Invalid or missing request data. No valid active user emails found.
        schema:
          $ref: '#/definitions/ErrorResponse'
      401:
        description: Authentication is required or the provided token is invalid.
      403:
        description: You do not have permission to perform this action. Admin or Manager role required.
        schema:
          $ref: '#/definitions/ErrorResponse'
      404:
        description: The requested campaign was not found.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    campaign = Campaign.query.get(campaign_id)
    if not campaign:
        return jsonify({"error": "Campaign not found"}), 404

    users = User.query.filter_by(status="active").all()
    valid_recipients = []
    invalid_recipients = []
    for u in users:
        raw_email = (u.email or "").strip()
        if not raw_email:
            continue
        if "@" in raw_email and "." in raw_email.split("@")[-1] and not raw_email.startswith("@"):
            valid_recipients.append(raw_email)
        else:
            invalid_recipients.append(raw_email)

    if not valid_recipients:
        current_app.logger.warning(
            "[EMAIL TRIGGER] Flow=CAMPAIGNS Event=send_campaign CampaignId=%s - ABORTED: No valid active user emails found (invalid=%s)",
            campaign.id,
            invalid_recipients,
        )
        return jsonify({
            "error": "No valid recipient email addresses found among active users",
            "campaignId": campaign.id,
            "recipients": 0,
            "sent": 0,
            "invalidRecipients": invalid_recipients,
        }), 400

    subject, body, html_body = campaign_email(campaign)

    current_app.logger.info(
        "[EMAIL TRIGGER] Flow=CAMPAIGNS Event=send_campaign CampaignId=%s TotalActive=%d ValidRecipients=%d InvalidRecipients=%d",
        campaign.id,
        len(users),
        len(valid_recipients),
        len(invalid_recipients),
    )
    current_app.logger.info("[EMAIL RECIPIENT] Count=%d List=%s", len(valid_recipients), valid_recipients)
    current_app.logger.info("[EMAIL SENDER] marketing")

    from app.utils.email import send_bulk_email
    sent, refused_map = send_bulk_email(
        valid_recipients,
        subject,
        body,
        html_body=html_body,
        sender="marketing",
        return_diagnostics=True,
    )

    current_app.logger.info(
        "[EMAIL RESULT] SentCount=%d RefusedCount=%d RefusedDetails=%s",
        sent,
        len(refused_map),
        refused_map,
    )

    # If campaign was scheduled, transition it to active upon send
    if campaign.status == "scheduled":
        campaign.status = "active"
        db.session.commit()

    return jsonify({
        "campaignId": campaign.id,
        "recipients": len(valid_recipients),
        "sent": sent,
        "refused": refused_map,
        "invalidRecipients": invalid_recipients,
    })
