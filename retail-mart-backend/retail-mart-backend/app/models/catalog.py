from datetime import datetime

from app.extensions import db

PRODUCT_STATUSES = ("active", "draft", "out-of-stock")
CATEGORY_STATUSES = ("active", "inactive")


class Category(db.Model):
    """ERD: CATEGORIES"""

    __tablename__ = "categories"

    id = db.Column(db.String(20), primary_key=True)
    name = db.Column(db.String(150), unique=True, nullable=False)
    slug = db.Column(db.String(150), unique=True, nullable=False)
    status = db.Column(db.String(20), nullable=False, default="active")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    products = db.relationship("Product", back_populates="category_ref")

    def to_dict(self) -> dict:
        """Matches src/types/category.ts -> Category"""
        return {
            "id": self.id,
            "name": self.name,
            "productCount": len(self.products),
            "status": self.status,
            "createdAt": self.created_at.strftime("%Y-%m-%d") if self.created_at else None,
        }


class Product(db.Model):
    """
    ERD: PRODUCTS + PRODUCT_VARIANTS + INVENTORY_STOCKS, flattened into a
    single row (single-variant, single-warehouse simplification) so this
    serializes 1:1 with src/types/product.ts -> Product. See README.
    """

    __tablename__ = "products"

    id = db.Column(db.String(20), primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    sku = db.Column(db.String(80), unique=True, nullable=False)
    category_id = db.Column(db.String(20), db.ForeignKey("categories.id"), nullable=False)
    description = db.Column(db.Text, nullable=True, default="")
    price = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    stock = db.Column(db.Integer, nullable=False, default=0)
    status = db.Column(db.String(20), nullable=False, default="active")
    image_url = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    category_ref = db.relationship("Category", back_populates="products")

    def to_dict(self) -> dict:
        """Matches src/types/product.ts -> Product"""
        return {
            "id": self.id,
            "name": self.name,
            "sku": self.sku,
            "category": self.category_ref.name if self.category_ref else None,
            "description": self.description or "",
            "price": float(self.price),
            "stock": self.stock,
            "status": self.status,
            "imageUrl": self.image_url,
        }

    def sync_status_with_stock(self) -> None:
        """Keep status/stock consistent: 0 stock always reads as out-of-stock."""
        if self.stock <= 0:
            self.status = "out-of-stock"
        elif self.status == "out-of-stock" and self.stock > 0:
            self.status = "active"
