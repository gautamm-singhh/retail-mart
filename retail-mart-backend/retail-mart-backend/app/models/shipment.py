from datetime import datetime
from app.extensions import db

SHIPMENT_STATUSES = ("Pending", "Packed", "Shipped", "Out for Delivery", "Delivered")
SHIPMENT_STATUS_TRANSITIONS = {
    "Pending": ["Packed"],
    "Packed": ["Shipped"],
    "Shipped": ["Out for Delivery"],
    "Out for Delivery": ["Delivered"],
    "Delivered": [],
}

class Shipment(db.Model):
    __tablename__ = "shipments"

    id = db.Column(db.String(20), primary_key=True)
    order_id = db.Column(db.String(20), db.ForeignKey("orders.id"), nullable=False)
    courier_id = db.Column(db.String(20), db.ForeignKey("couriers.id"), nullable=True)
    customer = db.Column(db.String(150), nullable=False)
    courier = db.Column(db.String(80), nullable=False)          
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
        if self.courier_ref and self.courier_ref.tracking_url_template:
            return self.courier_ref.tracking_url_template.replace(
                "{tracking_number}", self.tracking_number
            )
        return None

class ShipmentStatusEvent(db.Model):
    __tablename__ = "shipment_status_history"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    shipment_id = db.Column(db.String(20), db.ForeignKey("shipments.id"), nullable=False)
    status = db.Column(db.String(30), nullable=False)
    date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    location = db.Column(db.String(120), nullable=True)
    note = db.Column(db.Text, nullable=True)

    shipment = db.relationship("Shipment", back_populates="tracking_history")

    def to_dict(self) -> dict:
        return {
            "status": self.status,
            "date": self.date.strftime("%Y-%m-%d") if self.date else None,
            "location": self.location,
            "note": self.note,
        }
