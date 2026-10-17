from flask import Blueprint, request, jsonify

from app.extensions import db
from app.models.catalog import Product, Category, PRODUCT_STATUSES
from app.utils.decorators import roles_required
from app.utils.ids import next_sequential_id

products_bp = Blueprint("products", __name__)


@products_bp.get("")
def list_products():
    """
    List Products
    Get the list of available products with their basic details such as name, price, category, and availability. Public API — no login required.
    ---
    tags:
      - Products
    parameters:
      - in: query
        name: category
        type: string
        required: false
        description: Filter products by category name (e.g. Electronics).
      - in: query
        name: status
        type: string
        required: false
        description: Filter by status (active, inactive, out-of-stock).
      - in: query
        name: search
        type: string
        required: false
        description: Search query matching product name or SKU.
    responses:
      200:
        description: Request successful. Returns the list of products matching the filters.
        schema:
          type: array
          items:
            $ref: '#/definitions/Product'
    """
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
    """
    Get Product by ID
    Get the details of a specific product using its product ID. Public API — no login required.
    ---
    tags:
      - Products
    parameters:
      - in: path
        name: product_id
        type: string
        required: true
        description: Unique product ID (e.g. p-1001).
    responses:
      200:
        description: Request successful. Returns the requested product details.
        schema:
          $ref: '#/definitions/Product'
      404:
        description: The requested resource was not found.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    return jsonify(product.to_dict())


@products_bp.post("")
@roles_required("Admin", "Manager")
def create_product():
    """
    Create Product
    Create a new product by sending its details in the request body. Admin or Manager access required.
    ---
    tags:
      - Products
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        description: Enter product details including name, SKU, category, price, and initial stock.
        schema:
          type: object
          required:
            - name
            - sku
            - category
            - price
          properties:
            name:
              type: string
              description: Product display name.
              example: Wireless Noise-Canceling Headphones
            sku:
              type: string
              description: Unique product inventory SKU code.
              example: ELEC-WNC-001
            category:
              type: string
              description: Category name (e.g. Electronics).
              example: Electronics
            description:
              type: string
              description: Product description.
              example: Premium over-ear headphones with active noise cancellation.
            price:
              type: number
              description: Product price.
              example: 2999.0
            stock:
              type: integer
              description: Available inventory quantity.
              example: 45
            status:
              type: string
              description: Product availability status.
              example: active
              enum: [active, inactive, out-of-stock]
            imageUrl:
              type: string
              description: Product image URL.
              example: https://images.unsplash.com/photo-1505740420928-5e560c06d30e
    responses:
      201:
        description: Product created successfully.
        schema:
          $ref: '#/definitions/Product'
      400:
        description: Invalid or missing request data.
        schema:
          $ref: '#/definitions/ErrorResponse'
      401:
        description: Authentication is required or the provided token is invalid.
      403:
        description: You do not have permission to perform this action.
        schema:
          $ref: '#/definitions/ErrorResponse'
      409:
        description: A product with this SKU already exists.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
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
    """
    Update Product
    Update an existing product's details such as price, stock, or status using its product ID. Admin or Manager access required.
    ---
    tags:
      - Products
    security:
      - Bearer: []
    parameters:
      - in: path
        name: product_id
        type: string
        required: true
        description: Unique product ID.
      - in: body
        name: body
        required: true
        description: Enter the product fields you want to update.
        schema:
          type: object
          properties:
            name:
              type: string
              description: Updated product name.
              example: Wireless Noise-Canceling Headphones Gen 2
            sku:
              type: string
              description: Updated SKU code.
              example: ELEC-WNC-001
            category:
              type: string
              description: Updated category name.
              example: Electronics
            description:
              type: string
              description: Updated product description.
              example: Upgraded drivers and 40h battery life.
            price:
              type: number
              description: Updated price.
              example: 3299.0
            stock:
              type: integer
              description: Updated inventory stock.
              example: 50
            status:
              type: string
              description: Updated product status.
              example: active
              enum: [active, inactive, out-of-stock]
            imageUrl:
              type: string
              description: Updated image URL.
              example: https://images.unsplash.com/photo-1505740420928-5e560c06d30e
    responses:
      200:
        description: Product updated successfully.
        schema:
          $ref: '#/definitions/Product'
      400:
        description: Invalid or missing request data.
        schema:
          $ref: '#/definitions/ErrorResponse'
      401:
        description: Authentication is required or the provided token is invalid.
      403:
        description: You do not have permission to perform this action.
        schema:
          $ref: '#/definitions/ErrorResponse'
      404:
        description: The requested resource was not found.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
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
    """
    Delete Product
    Delete a product using its product ID. Admin access required.
    ---
    tags:
      - Products
    security:
      - Bearer: []
    parameters:
      - in: path
        name: product_id
        type: string
        required: true
        description: Unique product ID to delete.
    responses:
      204:
        description: Product deleted successfully.
        schema:
          type: string
      401:
        description: Authentication is required or the provided token is invalid.
      403:
        description: You do not have permission to perform this action.
        schema:
          $ref: '#/definitions/ErrorResponse'
      404:
        description: The requested resource was not found.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    db.session.delete(product)
    db.session.commit()
    return "", 204
