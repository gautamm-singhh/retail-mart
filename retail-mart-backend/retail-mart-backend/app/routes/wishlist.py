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
    Returns all wishlist items for the authenticated customer.
    User isolation: only items belonging to get_jwt_identity() are returned.
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
    Adds a product to the authenticated customer's wishlist.
    Idempotent: if already in wishlist, returns existing item.
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
    Removes a product from the authenticated customer's wishlist.
    Accepts either the product_id or the wishlist item id.
    Strict user isolation: only deletes item matching user_id.
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
