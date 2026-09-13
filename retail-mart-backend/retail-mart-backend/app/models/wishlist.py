from datetime import datetime
import uuid

from app.extensions import db


class WishlistItem(db.Model):
    """
    Customer Wishlist Item.
    Persists liked/saved products per customer with strict user isolation.
    """

    __tablename__ = "wishlist_items"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(20), db.ForeignKey("users.id"), nullable=False, index=True)
    product_id = db.Column(db.String(20), db.ForeignKey("products.id"), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", backref=db.backref("wishlist_items", cascade="all, delete-orphan"))
    product = db.relationship("Product")

    __table_args__ = (
        db.UniqueConstraint("user_id", "product_id", name="uq_user_product_wishlist"),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "userId": self.user_id,
            "productId": self.product_id,
            "product": self.product.to_dict() if self.product else None,
            "createdAt": self.created_at.strftime("%Y-%m-%d %H:%M:%S") if self.created_at else None,
        }
