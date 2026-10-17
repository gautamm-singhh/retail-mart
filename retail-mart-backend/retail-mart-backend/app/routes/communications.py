from flask import Blueprint, request, jsonify, current_app

from app.models.order import Order
from app.utils.decorators import roles_required
from app.utils.email import send_email, order_confirmation_email, test_smtp_connection, ensure_delivery_result

communications_bp = Blueprint("communications", __name__)

ALLOWED_SENDERS = ("support", "orders", "marketing")


@communications_bp.post("/send")
@roles_required("Admin", "Manager", "Staff")
def send_generic_email():
    """
    Send Custom Email
    Send a custom email message using a designated sender identity (support, orders, or marketing). Admin, Manager, or Staff access required.
    ---
    tags:
      - Communications
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        description: Enter the email details. to, subject, and body are required.
        schema:
          type: object
          required:
            - to
            - subject
            - body
          properties:
            to:
              type: string
              description: Recipient email address.
              example: customer@example.com
            subject:
              type: string
              description: Email subject line.
              example: Important Update Regarding Your Account
            body:
              type: string
              description: Plain text email body.
              example: Hello, this is an official message from Retail Mart.
            htmlBody:
              type: string
              description: Optional HTML formatted email content.
              example: "<p>Hello, this is an official message from <strong>Retail Mart</strong>.</p>"
            sender:
              type: string
              description: Outgoing sender identity to use (support, orders, or marketing).
              example: support
              enum: [support, orders, marketing]
    responses:
      200:
        description: Request successful. Returns email delivery status and message ID.
        schema:
          type: object
          properties:
            success:
              type: boolean
              example: true
            sent:
              type: boolean
              example: true
            sender:
              type: string
              example: support
            messageId:
              type: string
              example: <abc123xyz@smtp.gmail.com>
            stage:
              type: string
              example: sent
            message:
              type: string
              example: Email delivered successfully
      400:
        description: Invalid or missing request data. to, subject, and body are required.
        schema:
          $ref: '#/definitions/ErrorResponse'
      401:
        description: Authentication is required or the provided token is invalid.
      403:
        description: You do not have permission to perform this action. Admin, Manager, or Staff role required.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    data = request.get_json(silent=True) or {}
    to = (data.get("to") or "").strip()
    subject = (data.get("subject") or "").strip()
    body = (data.get("body") or "").strip()
    sender = (data.get("sender") or "support").strip().lower()

    if not to or not subject or not body:
        return jsonify({"error": "to, subject, and body are required"}), 400

    if sender not in ALLOWED_SENDERS:
        return jsonify({"error": f"sender must be one of: {', '.join(ALLOWED_SENDERS)}"}), 400

    html_body = data.get("htmlBody")
    current_app.logger.info("[EMAIL TRIGGER] Flow=COMMUNICATIONS Event=send_manual Sender=%s Recipient=%s Subject=%s", sender, to, subject)
    current_app.logger.info("[EMAIL RECIPIENT] %s", to)
    current_app.logger.info("[EMAIL SENDER] %s", sender)
    raw_result = send_email(to, subject, body, html_body=html_body, sender=sender)
    result = ensure_delivery_result(raw_result)
    current_app.logger.info(
        "[EMAIL RESULT] Success=%s Stage=%s Message=%s Refused=%s MessageId=%s",
        result.get("success"),
        result.get("stage"),
        result.get("message"),
        result.get("refused_recipients"),
        result.get("message_id"),
    )
    response_data = dict(result)
    response_data["sent"] = bool(response_data.get("success", False))
    response_data["sender"] = sender
    return jsonify(response_data)


@communications_bp.post("/orders/<order_id>/confirmation")
@roles_required("Admin", "Manager", "Staff")
def send_order_confirmation(order_id):
    """
    Resend Order Confirmation
    Resend an automated order confirmation email to the customer using its order ID. Admin, Manager, or Staff access required.
    ---
    tags:
      - Communications
    security:
      - Bearer: []
    parameters:
      - in: path
        name: order_id
        type: string
        required: true
        description: Unique order ID.
    responses:
      200:
        description: Request successful. Returns order confirmation email dispatch status.
        schema:
          type: object
          properties:
            success:
              type: boolean
              example: true
            sent:
              type: boolean
              example: true
            messageId:
              type: string
              example: <ord123@smtp.gmail.com>
      400:
        description: Invalid or missing request data. Order has no recipient email address.
        schema:
          $ref: '#/definitions/ErrorResponse'
      401:
        description: Authentication is required or the provided token is invalid.
      403:
        description: You do not have permission to perform this action. Admin, Manager, or Staff role required.
        schema:
          $ref: '#/definitions/ErrorResponse'
      404:
        description: The requested order was not found.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404

    recipient_email = order.customer_email
    if not recipient_email and order.user:
        recipient_email = order.user.email

    if not recipient_email:
        return jsonify({"error": "Order has no recipient email address", "sent": False}), 400

    subject, body, html_body = order_confirmation_email(order)
    current_app.logger.info("[EMAIL TRIGGER] Flow=COMMUNICATIONS Event=order_confirmation_resend OrderId=%s Recipient=%s", order_id, recipient_email)
    current_app.logger.info("[EMAIL RECIPIENT] %s", recipient_email)
    current_app.logger.info("[EMAIL SENDER] orders")
    raw_result = send_email(recipient_email, subject, body, html_body=html_body, sender="orders")
    result = ensure_delivery_result(raw_result)
    current_app.logger.info(
        "[EMAIL RESULT] Success=%s Stage=%s Message=%s Refused=%s MessageId=%s",
        result.get("success"),
        result.get("stage"),
        result.get("message"),
        result.get("refused_recipients"),
        result.get("message_id"),
    )
    response_data = dict(result)
    response_data["sent"] = bool(response_data.get("success", False))
    return jsonify(response_data)


@communications_bp.get("/smtp-status")
@roles_required("Admin", "Manager", "Staff")
def get_smtp_status():
    """
    Check SMTP Status
    Check SMTP server connectivity and authentication status for configured sender accounts. Admin, Manager, or Staff access required.
    ---
    tags:
      - Communications
    security:
      - Bearer: []
    parameters:
      - in: query
        name: sender
        type: string
        required: false
        description: Specific sender identity to test (support, orders, marketing).
        enum: [support, orders, marketing]
    responses:
      200:
        description: Request successful. Returns SMTP connection and authentication status.
        schema:
          type: object
          properties:
            host:
              type: string
              example: smtp.gmail.com
            port:
              type: integer
              example: 587
            connected:
              type: boolean
              example: true
            authenticated:
              type: boolean
              example: true
      401:
        description: Authentication is required or the provided token is invalid.
      403:
        description: You do not have permission to perform this action. Admin, Manager, or Staff role required.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    sender_arg = request.args.get("sender")
    return jsonify(test_smtp_connection(sender=sender_arg))
