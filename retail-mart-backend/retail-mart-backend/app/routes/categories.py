from datetime import datetime

from flask import Blueprint, request, jsonify
from sqlalchemy.orm import selectinload

from app.extensions import db
from app.models.catalog import Category, CATEGORY_STATUSES
from app.utils.decorators import roles_required
from app.utils.ids import next_sequential_id

categories_bp = Blueprint("categories", __name__)


def _slugify(name: str) -> str:
    return "-".join(name.strip().lower().split())


@categories_bp.get("")
def list_categories():
    """
    List All Categories
    Get the list of all product categories with their product count and status. Public API — no login required.
    ---
    tags:
      - Categories
    responses:
      200:
        description: Request successful. Returns the list of categories.
        schema:
          type: array
          items:
            $ref: '#/definitions/Category'
    """
    # Public/read for any logged-out storefront use later; write ops are protected below.
    categories = Category.query.options(selectinload(Category.products)).order_by(Category.created_at).all()
    return jsonify([c.to_dict() for c in categories])


@categories_bp.get("/<category_id>")
def get_category(category_id):
    """
    Get Category by ID
    Get the details of a specific category using its category ID. Public API — no login required.
    ---
    tags:
      - Categories
    parameters:
      - in: path
        name: category_id
        type: string
        required: true
        description: Unique category ID (e.g. c-01).
    responses:
      200:
        description: Request successful. Returns the requested category details.
        schema:
          $ref: '#/definitions/Category'
      404:
        description: The requested resource was not found.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    category = Category.query.options(selectinload(Category.products)).filter_by(id=category_id).first()
    if not category:
        return jsonify({"error": "Category not found"}), 404
    return jsonify(category.to_dict())


@categories_bp.post("")
@roles_required("Admin", "Manager")
def create_category():
    """
    Create Category
    Create a new product category by sending its name and status in the request body. Admin or Manager access required.
    ---
    tags:
      - Categories
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        description: Enter category details including name and optional status.
        schema:
          type: object
          required:
            - name
          properties:
            name:
              type: string
              description: Category display name.
              example: Electronics
            status:
              type: string
              description: Category status (active or inactive).
              example: active
              enum: [active, inactive]
    responses:
      201:
        description: Category created successfully.
        schema:
          $ref: '#/definitions/Category'
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
        description: A category with this name already exists.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
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
    """
    Update Category
    Update an existing category's name or status using its category ID. Admin or Manager access required.
    ---
    tags:
      - Categories
    security:
      - Bearer: []
    parameters:
      - in: path
        name: category_id
        type: string
        required: true
        description: Unique category ID.
      - in: body
        name: body
        required: true
        description: Enter the category fields to update.
        schema:
          type: object
          properties:
            name:
              type: string
              description: Updated category name.
              example: Consumer Electronics
            status:
              type: string
              description: Updated category status.
              example: active
              enum: [active, inactive]
    responses:
      200:
        description: Category updated successfully.
        schema:
          $ref: '#/definitions/Category'
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
    """
    Delete Category
    Delete a category using its category ID. Categories with linked products cannot be deleted. Admin access required.
    ---
    tags:
      - Categories
    security:
      - Bearer: []
    parameters:
      - in: path
        name: category_id
        type: string
        required: true
        description: Unique category ID to delete.
    responses:
      204:
        description: Category deleted successfully.
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
      409:
        description: Cannot delete a category that still has products.
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    category = Category.query.get(category_id)
    if not category:
        return jsonify({"error": "Category not found"}), 404
    if category.products:
        return jsonify({"error": "Cannot delete a category that still has products"}), 409
    db.session.delete(category)
    db.session.commit()
    return "", 204
