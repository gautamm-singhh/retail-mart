from datetime import datetime

from app.extensions import db

ORDER_STATUSES = ("Pending", "Processing", "Shipped", "Delivered", "Cancelled")
ORDER_PAYMENT_STATUSES = ("Pending", "Paid", "Failed", "Refunded")

# Mirrors src/types/order.ts -> ORDER_STATUS_TRANSITIONS exactly, so the
# API enforces the same workflow the UI already assumes.
ORDER_STATUS_TRANSITIONS = {
    "Pending": ["Processing", "Cancelled"],
    "Processing": ["Shipped", "Cancelled"],
    "Shipped": ["Delivered"],
    "Delivered": [],
    "Cancelled": [],
}


class Order(db.Model):
    """ERD: ORDERS"""

    __tablename__ = "orders"

    id = db.Column(db.String(20), primary_key=True)
    user_id = db.Column(db.String(20), db.ForeignKey("users.id"), nullable=True, index=True)
    customer = db.Column(db.String(150), nullable=False)
    customer_email = db.Column(db.String(150), nullable=False)
    date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    amount = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    payment_status = db.Column(db.String(20), nullable=False, default="Pending")
    status = db.Column(db.String(20), nullable=False, default="Pending")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items = db.relationship(
        "OrderItem", back_populates="order", cascade="all, delete-orphan", order_by="OrderItem.id"
    )
    status_history = db.relationship(
        "OrderStatusEvent", back_populates="order", cascade="all, delete-orphan", order_by="OrderStatusEvent.id"
    )

    def to_dict(self) -> dict:
        """Matches src/types/order.ts -> Order"""
        payments = getattr(self, "payments", None) or []
        # Include the first linked shipment's summary so the storefront
        # "My Orders" page can show tracking status without a second API call.
        shipments = getattr(self, "shipments", None) or []
        shipment_summary = None
        if shipments:
            s = shipments[0]
            shipment_summary = {
                "id": s.id,
                "status": s.status,
                "courier": s.courier,
                "trackingNumber": s.tracking_number,
                "expectedDelivery": s.expected_delivery.strftime("%Y-%m-%d") if s.expected_delivery else None,
            }
        return {
            "id": self.id,
            "customer": self.customer,
            "customerEmail": self.customer_email,
            "date": self.date.strftime("%Y-%m-%d") if self.date else None,
            "amount": float(self.amount),
            "paymentStatus": self.payment_status,
            "status": self.status,
            "items": [item.to_dict() for item in self.items],
            "statusHistory": [ev.to_dict() for ev in self.status_history],
            "paymentId": payments[0].id if payments else None,
            "shipment": shipment_summary,
        }


class OrderItem(db.Model):
    """ERD: ORDER_ITEMS (denormalized product name/price for the response shape)"""

    __tablename__ = "order_items"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    order_id = db.Column(db.String(20), db.ForeignKey("orders.id"), nullable=False)
    product_name = db.Column(db.String(200), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    price = db.Column(db.Numeric(10, 2), nullable=False, default=0)

    order = db.relationship("Order", back_populates="items")

    def to_dict(self) -> dict:
        """Matches src/types/order.ts -> OrderItem"""
        return {
            "productName": self.product_name,
            "quantity": self.quantity,
            "price": float(self.price),
        }


class OrderStatusEvent(db.Model):
    """ERD: ORDER_STATUS_HIST"""

    __tablename__ = "order_status_history"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    order_id = db.Column(db.String(20), db.ForeignKey("orders.id"), nullable=False)
    status = db.Column(db.String(20), nullable=False)
    date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    note = db.Column(db.Text, nullable=True)
    changed_by = db.Column(db.String(20), db.ForeignKey("users.id"), nullable=True)

    order = db.relationship("Order", back_populates="status_history")

    def to_dict(self) -> dict:
        """Matches src/types/order.ts -> OrderStatusEvent"""
        return {"status": self.status, "date": self.date.strftime("%Y-%m-%d") if self.date else None}
