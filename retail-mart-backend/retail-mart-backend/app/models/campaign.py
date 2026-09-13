from datetime import datetime

from app.extensions import db

CAMPAIGN_DISCOUNT_TYPES = ("percentage", "flat")
CAMPAIGN_STATUSES = ("scheduled", "active", "ended")


class Campaign(db.Model):
    """ERD: PROMOTIONS, trimmed to what the Campaign Management UI needs."""

    __tablename__ = "campaigns"

    id = db.Column(db.String(20), primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    code = db.Column(db.String(40), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True, default="")
    discount_type = db.Column(db.String(20), nullable=False, default="percentage")
    discount_value = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    min_purchase = db.Column(db.Numeric(10, 2), nullable=True)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=True)
    status = db.Column(db.String(20), nullable=False, default="scheduled")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "code": self.code,
            "description": self.description or "",
            "discountType": self.discount_type,
            "discountValue": float(self.discount_value),
            "minPurchase": float(self.min_purchase) if self.min_purchase is not None else None,
            "startDate": self.start_date.strftime("%Y-%m-%d") if self.start_date else None,
            "endDate": self.end_date.strftime("%Y-%m-%d") if self.end_date else None,
            "status": self.status,
        }
