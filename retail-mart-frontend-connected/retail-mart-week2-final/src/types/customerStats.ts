/** One entry in the per-category purchase breakdown. */
export interface CategorySpend {
  category: string;
  orderCount: number;
  totalSpent: number;
}

/**
 * Response shape from GET /api/customer/stats/summary.
 * All figures are for the authenticated customer only.
 */
export interface CustomerStats {
  /** Total number of orders ever placed (including Cancelled). */
  totalOrders: number;
  /** Sum of amount for non-Cancelled orders (Rs). */
  totalSpent: number;
  /** Sum of item quantities across all non-Cancelled orders. */
  totalItemsPurchased: number;
  /** Count of distinct product names across non-Cancelled orders. */
  uniqueProductsPurchased: number;
  /** Shipments linked to customer's orders that are not yet Delivered. */
  activeShipments: number;
  /** Date of the most recent order (YYYY-MM-DD), or null if no orders. */
  lastOrderDate: string | null;
  /** Order count in the last 30 days (non-Cancelled). */
  last30DaysOrders: number;
  /** Total spend in the last 30 days (non-Cancelled), Rs. */
  last30DaysSpent: number;
  /** Per-category breakdown, sorted by totalSpent descending. */
  categoryBreakdown: CategorySpend[];
}
