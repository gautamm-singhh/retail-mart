from datetime import datetime, timedelta

from app.extensions import db

OTP_PURPOSES = ("login", "signup")
OTP_TTL_MINUTES = 10


class OtpVerification(db.Model):
    """ERD: OTP_VERIFICATIONS"""

    __tablename__ = "otp_verifications"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    phone = db.Column(db.String(20), nullable=False, index=True)
    otp_code = db.Column(db.String(10), nullable=False)
    purpose = db.Column(db.String(20), nullable=False, default="login")
    expires_at = db.Column(db.DateTime, nullable=False)
    verified_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @staticmethod
    def new_expiry() -> datetime:
        return datetime.utcnow() + timedelta(minutes=OTP_TTL_MINUTES)

    @property
    def is_expired(self) -> bool:
        return datetime.utcnow() > self.expires_at
