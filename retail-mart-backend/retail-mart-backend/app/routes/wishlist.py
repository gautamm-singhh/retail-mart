import uuid
from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity

from app.extensions import db
from app.models.wishlist import WishlistItem
from app.models.catalog import Product
from app.utils.decorators import roles_required

wishlist_bp = Blueprint("wishlist", __name__)


@wishlist_bp.get("")
@roles_required("Customer", "Admin", "Manager", "Staff")
def get_wishlist():
    """
    Get Wishlist
    Get all items currently in your personal wishlist. Authentication required.
    ---
    tags:
      - Wishlist
    security:
      - Bearer: []
    responses:
      200:
        description: Request successful. Returns the list of wishlist items.
        schema:
          type: array
          items:
            $ref: '#/definitions/WishlistItem'
      401:
        description: Authentication is required or the provided token is invalid.
        schema:
          $ref: '#/definitions/ErrorResponse'
      403:
        description: You do not have permission to perform this action.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    user_id = get_jwt_identity()
    items = (
        WishlistItem.query.filter_by(user_id=user_id)
        .order_by(WishlistItem.created_at.desc())
        .all()
    )
    return jsonify([item.to_dict() for item in items])


@wishlist_bp.post("")
@roles_required("Customer", "Admin", "Manager", "Staff")
def add_to_wishlist():
    """
    Add Product to Wishlist
    Add a product to your personal wishlist by sending its product ID. Authentication required.
    ---
    tags:
      - Wishlist
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        description: Enter the product ID to add to your wishlist.
        schema:
          type: object
          required:
            - productId
          properties:
            productId:
              type: string
              description: Unique product ID to add.
              example: "prod_uuid_123"
            product_id:
              type: string
              description: Alternative alias for product ID.
              example: "prod_uuid_123"
    responses:
      201:
        description: Product added to wishlist successfully.
        schema:
          type: object
          properties:
            message:
              type: string
              example: "Added to wishlist"
            item:
              $ref: '#/definitions/WishlistItem'
      200:
        description: Product already in wishlist.
        schema:
          type: object
          properties:
            message:
              type: string
              example: "Product already in wishlist"
            item:
              $ref: '#/definitions/WishlistItem'
      400:
        description: Invalid or missing request data. productId is required.
        schema:
          type: object
          properties:
            error:
              type: string
              example: "productId is required"
      401:
        description: Authentication is required or the provided token is invalid.
        schema:
          $ref: '#/definitions/ErrorResponse'
      403:
        description: You do not have permission to perform this action.
        schema:
          $ref: '#/definitions/ErrorResponse'
      404:
        description: The requested product was not found.
        schema:
          type: object
          properties:
            error:
              type: string
              example: "Product not found"
    """
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    product_id = (data.get("productId") or data.get("product_id") or "").strip()

    if not product_id:
        return jsonify({"error": "productId is required"}), 400

    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "Product not found"}), 404

    # Idempotent check
    existing = WishlistItem.query.filter_by(user_id=user_id, product_id=product_id).first()
    if existing:
        return jsonify({
            "message": "Product already in wishlist",
            "item": existing.to_dict(),
        }), 200

    item = WishlistItem(
        id=str(uuid.uuid4()),
        user_id=user_id,
        product_id=product_id,
    )
    db.session.add(item)
    db.session.commit()

    return jsonify({
        "message": "Added to wishlist",
        "item": item.to_dict(),
    }), 201


@wishlist_bp.delete("/<product_id>")
@roles_required("Customer", "Admin", "Manager", "Staff")
def remove_from_wishlist(product_id):
    """
    Remove Product from Wishlist
    Remove a product from your wishlist using its product ID or wishlist item ID. Authentication required.
    ---
    tags:
      - Wishlist
    security:
      - Bearer: []
    parameters:
      - name: product_id
        in: path
        type: string
        required: true
        description: Product ID or wishlist item ID to remove.
        example: "prod_uuid_123"
    responses:
      200:
        description: Request successful. Item removed from wishlist.
        schema:
          type: object
          properties:
            message:
              type: string
              example: "Removed from wishlist"
      401:
        description: Authentication is required or the provided token is invalid.
        schema:
          $ref: '#/definitions/ErrorResponse'
      403:
        description: You do not have permission to perform this action.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    user_id = get_jwt_identity()
    item = WishlistItem.query.filter_by(user_id=user_id, product_id=product_id).first()

    if not item:
        # Also check by wishlist item ID directly if passed
        item = WishlistItem.query.filter_by(user_id=user_id, id=product_id).first()

    if not item:
        return jsonify({"message": "Item not in wishlist"}), 200

    db.session.delete(item)
    db.session.commit()

    return jsonify({"message": "Removed from wishlist"}), 200
