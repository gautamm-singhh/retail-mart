"""
Registered courier / shipping partner entity.

Instead of free-text courier names on every shipment, Admin/Manager
users maintain a canonical list of courier partners here. The
ShipmentForm dropdown is populated from GET /api/couriers (active only).

Backward compatibility: Shipment.courier (string) is still the
serialized courier name used in all responses. When a shipment is
created with a courierId, we store both the FK and copy the name into
the string field — old shipments without a courier_id continue to
serialize correctly.
"""

from datetime import datetime

from app.extensions import db


class Courier(db.Model):
    """Registered delivery / courier partner."""

    __tablename__ = "couriers"

    id = db.Column(db.String(20), primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)
    code = db.Column(db.String(40), unique=True, nullable=False)          # e.g. "BLUEDART"
    contact_email = db.Column(db.String(150), nullable=True)
    # Template for building an external tracking link.
    # Use the literal placeholder {tracking_number} in the URL.
    # Example: "https://track.bluedart.com/?id={tracking_number}"
    tracking_url_template = db.Column(db.String(500), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self) -> dict:
        """Matches src/types/courier.ts -> Courier"""
        return {
            "id": self.id,
            "name": self.name,
            "code": self.code,
            "contactEmail": self.contact_email,
            "trackingUrlTemplate": self.tracking_url_template,
            "isActive": self.is_active,
        }
