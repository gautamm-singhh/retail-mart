"""
One reusable send_sms() used only by the OTP flow (app/routes/auth.py).
Mirrors app/utils/email.py's shape on purpose: same "log to console if not
configured, real provider if it is" pattern, so anyone who's read one has
already read the other.

Without TWILIO_* configured, the OTP is logged to the console instead of
texted, so the whole signup/login-by-phone flow is testable with zero
account setup. Wiring up a real SMS provider later is an environment
variable change, not a code change.
"""

from flask import current_app


def send_sms(to: str, message: str) -> bool:
    account_sid = current_app.config.get("TWILIO_ACCOUNT_SID")
    auth_token = current_app.config.get("TWILIO_AUTH_TOKEN")
    from_number = current_app.config.get("TWILIO_FROM_NUMBER")

    if not (account_sid and auth_token and from_number):
        # Dev fallback: no SMS provider configured, just log what would have sent.
        current_app.logger.info("[DEV SMS] to=%s message=%r", to, message)
        return True

    try:
        from twilio.rest import Client  # imported lazily - only required when SMS is turned on

        client = Client(account_sid, auth_token)
        client.messages.create(to=to, from_=from_number, body=message)
        return True
    except Exception:  # noqa: BLE001 - a failed OTP send must never crash the request
        current_app.logger.exception("Failed to send SMS to %s", to)
        return False


def otp_message(code: str) -> str:
    """One place to edit the OTP SMS copy."""
    return f"Your Retail Mart verification code is {code}. It expires in 10 minutes."
