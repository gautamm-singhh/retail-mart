from datetime import datetime

from flask import Blueprint, request, jsonify

from app.extensions import db
from app.models.catalog import Category, CATEGORY_STATUSES
from app.utils.decorators import roles_required
from app.utils.ids import next_sequential_id

categories_bp = Blueprint("categories", __name__)


def _slugify(name: str) -> str:
    return "-".join(name.strip().lower().split())


@categories_bp.get("")
def list_categories():
    # Public/read for any logged-out storefront use later; write ops are protected below.
    categories = Category.query.order_by(Category.created_at).all()
    return jsonify([c.to_dict() for c in categories])


@categories_bp.get("/<category_id>")
def get_category(category_id):
    category = Category.query.get(category_id)
    if not category:
        return jsonify({"error": "Category not found"}), 404
    return jsonify(category.to_dict())


@categories_bp.post("")
@roles_required("Admin", "Manager")
def create_category():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    status = data.get("status", "active")

    if not name:
        return jsonify({"error": "name is required"}), 400
    if status not in CATEGORY_STATUSES:
        return jsonify({"error": f"status must be one of {CATEGORY_STATUSES}"}), 400
    if Category.query.filter_by(name=name).first():
        return jsonify({"error": "A category with this name already exists"}), 409

    category = Category(
        id=next_sequential_id(Category, "c-", 2, 1),
        name=name,
        slug=_slugify(name),
        status=status,
    )
    db.session.add(category)
    db.session.commit()
    return jsonify(category.to_dict()), 201


@categories_bp.put("/<category_id>")
@roles_required("Admin", "Manager")
def update_category(category_id):
    category = Category.query.get(category_id)
    if not category:
        return jsonify({"error": "Category not found"}), 404

    data = request.get_json(silent=True) or {}
    if "name" in data and data["name"].strip():
        category.name = data["name"].strip()
        category.slug = _slugify(category.name)
    if "status" in data:
        if data["status"] not in CATEGORY_STATUSES:
            return jsonify({"error": f"status must be one of {CATEGORY_STATUSES}"}), 400
        category.status = data["status"]

    category.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(category.to_dict())


@categories_bp.delete("/<category_id>")
@roles_required("Admin")
def delete_category(category_id):
    category = Category.query.get(category_id)
    if not category:
        return jsonify({"error": "Category not found"}), 404
    if category.products:
        return jsonify({"error": "Cannot delete a category that still has products"}), 409
    db.session.delete(category)
    db.session.commit()
    return "", 204
