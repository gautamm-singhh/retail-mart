export interface CategorySpend {
  category: string;
  orderCount: number;
  totalSpent: number;
}

export interface CustomerStats {
  totalOrders: number;
  totalSpent: number;
  totalItemsPurchased: number;
  uniqueProductsPurchased: number;
  activeShipments: number;
  lastOrderDate: string | null;
  last30DaysOrders: number;
  last30DaysSpent: number;
  categoryBreakdown: CategorySpend[];
}
