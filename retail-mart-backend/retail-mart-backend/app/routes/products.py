from flask import Blueprint, request, jsonify

from app.extensions import db
from app.models.catalog import Product, Category, PRODUCT_STATUSES
from app.utils.decorators import roles_required
from app.utils.ids import next_sequential_id

products_bp = Blueprint("products", __name__)


@products_bp.get("")
def list_products():
    query = Product.query
    category = request.args.get("category")
    status = request.args.get("status")
    search = request.args.get("search")

    if category:
        query = query.join(Category).filter(Category.name == category)
    if status:
        query = query.filter(Product.status == status)
    if search:
        like = f"%{search}%"
        query = query.filter(db.or_(Product.name.ilike(like), Product.sku.ilike(like)))

    products = query.order_by(Product.created_at).all()
    return jsonify([p.to_dict() for p in products])


@products_bp.get("/<product_id>")
def get_product(product_id):
    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    return jsonify(product.to_dict())


@products_bp.post("")
@roles_required("Admin", "Manager")
def create_product():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    sku = (data.get("sku") or "").strip()
    category_name = data.get("category")
    description = data.get("description", "")
    price = data.get("price")
    stock = data.get("stock", 0)
    status = data.get("status", "active")

    if not name or not sku or not category_name:
        return jsonify({"error": "name, sku and category are required"}), 400
    if price is None or float(price) < 0:
        return jsonify({"error": "price must be a non-negative number"}), 400
    if status not in PRODUCT_STATUSES:
        return jsonify({"error": f"status must be one of {PRODUCT_STATUSES}"}), 400

    category = Category.query.filter_by(name=category_name).first()
    if not category:
        return jsonify({"error": f"Unknown category '{category_name}'"}), 400
    if Product.query.filter_by(sku=sku).first():
        return jsonify({"error": "A product with this SKU already exists"}), 409

    product = Product(
        id=next_sequential_id(Product, "p-", 4, 1001),
        name=name,
        sku=sku,
        category_id=category.id,
        description=description,
        price=price,
        stock=int(stock),
        image_url=data.get("imageUrl"),
        status=status,
    )
    product.sync_status_with_stock()
    db.session.add(product)
    db.session.commit()
    return jsonify(product.to_dict()), 201


@products_bp.put("/<product_id>")
@roles_required("Admin", "Manager")
def update_product(product_id):
    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "Product not found"}), 404

    data = request.get_json(silent=True) or {}
    if "name" in data:
        product.name = data["name"]
    if "sku" in data:
        product.sku = data["sku"]
    if "category" in data:
        category = Category.query.filter_by(name=data["category"]).first()
        if not category:
            return jsonify({"error": f"Unknown category '{data['category']}'"}), 400
        product.category_id = category.id
    if "description" in data:
        product.description = data["description"]
    if "price" in data:
        if float(data["price"]) < 0:
            return jsonify({"error": "price must be a non-negative number"}), 400
        product.price = data["price"]
    if "stock" in data:
        product.stock = int(data["stock"])
    if "status" in data:
        if data["status"] not in PRODUCT_STATUSES:
            return jsonify({"error": f"status must be one of {PRODUCT_STATUSES}"}), 400
        product.status = data["status"]
    if "imageUrl" in data:
        product.image_url = data["imageUrl"]

    product.sync_status_with_stock()
    db.session.commit()
    return jsonify(product.to_dict())


@products_bp.delete("/<product_id>")
@roles_required("Admin")
def delete_product(product_id):
    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    db.session.delete(product)
    db.session.commit()
    return "", 204
