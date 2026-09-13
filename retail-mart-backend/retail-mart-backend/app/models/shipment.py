from datetime import datetime

from app.extensions import db

SHIPMENT_STATUSES = ("Pending", "Packed", "Shipped", "Out for Delivery", "Delivered")

# Sequential Delivery workflow used to validate PATCH /shipments/<id>/status.
# Mirrors src/types/shipment.ts -> SHIPMENT_STATUS_TRANSITIONS exactly.
SHIPMENT_STATUS_TRANSITIONS = {
    "Pending": ["Packed"],
    "Packed": ["Shipped"],
    "Shipped": ["Out for Delivery"],
    "Out for Delivery": ["Delivered"],
    "Delivered": [],
}


class Shipment(db.Model):
    """ERD: SHIPMENTS"""

    __tablename__ = "shipments"

    id = db.Column(db.String(20), primary_key=True)
    order_id = db.Column(db.String(20), db.ForeignKey("orders.id"), nullable=False)
    # Nullable FK to registered courier. When set, courier (string) is copied
    # from Courier.name so existing serialisation is unchanged for old rows.
    courier_id = db.Column(db.String(20), db.ForeignKey("couriers.id"), nullable=True)
    customer = db.Column(db.String(150), nullable=False)
    courier = db.Column(db.String(80), nullable=False)           # always populated (FK or free-text)
    tracking_number = db.Column(db.String(80), nullable=False)
    status = db.Column(db.String(30), nullable=False, default="Pending")
    expected_delivery = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    order = db.relationship("Order", backref="shipments")
    courier_ref = db.relationship("Courier", lazy="select", foreign_keys=[courier_id])
    tracking_history = db.relationship(
        "ShipmentStatusEvent",
        back_populates="shipment",
        cascade="all, delete-orphan",
        order_by="ShipmentStatusEvent.id",
    )

    def to_dict(self) -> dict:
        """Matches src/types/shipment.ts -> Shipment"""
        return {
            "id": self.id,
            "orderId": self.order_id,
            "customer": self.customer,
            "courierId": self.courier_id,
            "courier": self.courier,
            "trackingNumber": self.tracking_number,
            "status": self.status,
            "expectedDelivery": self.expected_delivery.strftime("%Y-%m-%d") if self.expected_delivery else None,
            "trackingHistory": [ev.to_dict() for ev in self.tracking_history],
        }

    def build_tracking_url(self) -> str | None:
        """
        Returns the external carrier tracking URL for this shipment, or None
        if the courier has no tracking URL template configured.
        Used by GET /api/shipments/<id>/track (customer-facing).
        """
        if self.courier_ref and self.courier_ref.tracking_url_template:
            return self.courier_ref.tracking_url_template.replace(
                "{tracking_number}", self.tracking_number
            )
        return None


class ShipmentStatusEvent(db.Model):
    """ERD: SHIPMENT_STATUS_HIST"""

    __tablename__ = "shipment_status_history"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    shipment_id = db.Column(db.String(20), db.ForeignKey("shipments.id"), nullable=False)
    status = db.Column(db.String(30), nullable=False)
    date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    location = db.Column(db.String(120), nullable=True)
    note = db.Column(db.Text, nullable=True)

    shipment = db.relationship("Shipment", back_populates="tracking_history")

    def to_dict(self) -> dict:
        """
        Matches src/types/shipment.ts -> ShipmentStatusEvent.
        Now includes location and note so the customer tracking endpoint
        can expose the full event detail without a schema change.
        """
        return {
            "status": self.status,
            "date": self.date.strftime("%Y-%m-%d") if self.date else None,
            "location": self.location,
            "note": self.note,
        }
