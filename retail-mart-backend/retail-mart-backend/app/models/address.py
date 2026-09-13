from datetime import datetime

from app.extensions import db


class Address(db.Model):
    """ERD: ADDRESSES + ADDRESS_DETAILS, merged into one row per address for simplicity."""

    __tablename__ = "addresses"

    id = db.Column(db.String(20), primary_key=True)
    user_id = db.Column(db.String(20), db.ForeignKey("users.id"), nullable=False)
    label = db.Column(db.String(40), nullable=True)  # "Home", "Work", etc.
    line1 = db.Column(db.String(200), nullable=False)
    line2 = db.Column(db.String(200), nullable=True)
    city = db.Column(db.String(100), nullable=False)
    state = db.Column(db.String(100), nullable=False)
    postal_code = db.Column(db.String(20), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    is_default = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "label": self.label or "Address",
            "line1": self.line1,
            "line2": self.line2 or "",
            "city": self.city,
            "state": self.state,
            "postalCode": self.postal_code,
            "phone": self.phone or "",
            "isDefault": self.is_default,
        }
