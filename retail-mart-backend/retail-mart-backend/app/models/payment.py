from datetime import datetime

from app.extensions import db

PAYMENT_STATUSES = ("Pending", "Paid", "Failed", "Refunded")
PAYMENT_METHODS = ("Card", "UPI", "Net Banking", "Cash on Delivery", "Wallet")


class Payment(db.Model):
    """ERD: PAYMENTS"""

    __tablename__ = "payments"

    id = db.Column(db.String(20), primary_key=True)
    order_id = db.Column(db.String(20), db.ForeignKey("orders.id"), nullable=False)
    customer = db.Column(db.String(150), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    method = db.Column(db.String(30), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="Pending")
    date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    order = db.relationship("Order", backref="payments")
    history = db.relationship(
        "PaymentStatusEvent", back_populates="payment", cascade="all, delete-orphan", order_by="PaymentStatusEvent.id"
    )
    receipt = db.relationship("Receipt", back_populates="payment", uselist=False, cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        """Matches src/types/payment.ts -> Payment"""
        return {
            "id": self.id,
            "orderId": self.order_id,
            "customer": self.customer,
            "amount": float(self.amount),
            "method": self.method,
            "status": self.status,
            "date": self.date.strftime("%Y-%m-%d") if self.date else None,
            "history": [ev.to_dict() for ev in self.history],
        }


class PaymentStatusEvent(db.Model):
    """ERD: PAYMENT_EVENTS (trimmed to status + date for the response shape)"""

    __tablename__ = "payment_status_history"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    payment_id = db.Column(db.String(20), db.ForeignKey("payments.id"), nullable=False)
    status = db.Column(db.String(20), nullable=False)
    date = db.Column(db.Date, nullable=False, default=datetime.utcnow)

    payment = db.relationship("Payment", back_populates="history")

    def to_dict(self) -> dict:
        """Matches src/types/payment.ts -> PaymentStatusEvent"""
        return {"status": self.status, "date": self.date.strftime("%Y-%m-%d") if self.date else None}


class Receipt(db.Model):
    """ERD: RECEIPTS"""

    __tablename__ = "receipts"

    id = db.Column(db.String(20), primary_key=True)
    payment_id = db.Column(db.String(20), db.ForeignKey("payments.id"), unique=True, nullable=False)
    receipt_no = db.Column(db.String(40), unique=True, nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    issued_at = db.Column(db.DateTime, default=datetime.utcnow)

    payment = db.relationship("Payment", back_populates="receipt")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "paymentId": self.payment_id,
            "orderId": self.payment.order_id if self.payment else None,
            "receiptNo": self.receipt_no,
            "amount": float(self.amount),
            "issuedAt": self.issued_at.strftime("%Y-%m-%d") if self.issued_at else None,
        }
