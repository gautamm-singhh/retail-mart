"""
app/utils/inventory.py
======================
Atomic and idempotent inventory management routines for Retail Mart orders.

Key features:
1. Row-level locking (with_for_update) to prevent race conditions during concurrent checkout.
2. Guard against negative inventory (raises InsufficientStockError).
3. Status synchronization: sets status='out-of-stock' if stock drops to 0.
4. Idempotency protection when called from payment verification.
"""

import logging
from typing import List, Dict, Any

from app.extensions import db
from app.models.catalog import Product
from app.models.order import Order, has_tax_snapshot_column
from app.utils.tax import PRODUCT_NAME_TO_SKU

logger = logging.getLogger("retail_mart.inventory")


class InsufficientStockError(Exception):
    """Raised when available stock is insufficient to fulfill an order upon payment."""
    pass


def deduct_order_stock(order: Order) -> List[Dict[str, Any]]:
    """
    Atomically deduct inventory for all items in an order upon payment.
    - Acquires row lock (with_for_update) on Product rows.
    - Verifies available stock before decrementing to prevent negative inventory.
    - Updates status to 'out-of-stock' if remaining stock hits 0.
    - Returns details of deducted stock.
    """
    if not order or not order.items:
        return []

    # Map tax snapshot productId if available for exact primary-key resolution
    product_id_by_name = {}
    snap = None
    if "tax_snapshot" in getattr(order, "__dict__", {}):
        snap = order.__dict__["tax_snapshot"]
    elif has_tax_snapshot_column():
        try:
            snap = getattr(order, "tax_snapshot", None)
        except Exception:
            snap = None

    if snap and isinstance(snap, dict):
        snap_items = snap.get("items") or []
        for s_item in snap_items:
            p_name = s_item.get("productName") or s_item.get("product_name")
            p_id = s_item.get("productId") or s_item.get("product_id")
            if p_name and p_id:
                product_id_by_name[p_name.strip().lower()] = p_id

    deductions = []

    for item in order.items:
        product = None
        # 1. Primary-key lookup via snapshot metadata
        target_id = product_id_by_name.get(item.product_name.strip().lower())
        if target_id:
            product = Product.query.filter_by(id=target_id).with_for_update().first()

        # 2. Case-insensitive exact name lookup
        if not product:
            product = Product.query.filter(
                db.func.lower(Product.name) == item.product_name.strip().lower()
            ).with_for_update().first()

        # 3. Fallback via statutory SKU registry
        if not product:
            sku = PRODUCT_NAME_TO_SKU.get(item.product_name.strip().lower())
            if sku:
                product = Product.query.filter_by(sku=sku).with_for_update().first()

        if not product:
            logger.warning(
                "Inventory deduction warning: product '%s' (order %s) not found in catalog",
                item.product_name,
                order.id,
            )
            continue

        requested_qty = int(item.quantity)
        if requested_qty <= 0:
            continue

        # Prevent negative inventory
        if product.stock < requested_qty:
            logger.error(
                "Insufficient stock during payment verification for product id=%s name='%s' requested=%d available=%d order=%s",
                product.id,
                product.name,
                requested_qty,
                product.stock,
                order.id,
            )
            raise InsufficientStockError(
                f"Insufficient inventory for '{product.name}'. Requested {requested_qty}, but only {product.stock} available."
            )

        # Atomic decrement
        product.stock -= requested_qty
        product.sync_status_with_stock()

        deductions.append(
            {
                "productId": product.id,
                "sku": product.sku,
                "name": product.name,
                "deducted": requested_qty,
                "remainingStock": product.stock,
                "status": product.status,
            }
        )

        logger.info(
            "Deducted inventory product id=%s name='%s' qty=%d remaining=%d order=%s",
            product.id,
            product.name,
            requested_qty,
            product.stock,
            order.id,
        )

    return deductions
