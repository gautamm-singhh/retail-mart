export type ReportPeriod = "daily" | "monthly" | "yearly";

export interface SalesReportBucket {
  period: string;
  orderCount: number;
  revenue: number;
}

export type SalesReport = SalesReportBucket[];

export interface ProjectionForecastPoint {
  period: string;
  projectedRevenue: number;
}

export interface SalesProjection {
  period: ReportPeriod;
  history: SalesReportBucket[];
  forecast: ProjectionForecastPoint[];
  /** Only present on the AI projections endpoint. */
  narrative?: string;
  aiGenerated?: boolean;
}

export interface AnalyticsSummary {
  executiveTotals: {
    totalRevenue: number;
    totalOrders: number;
    deliveredOrders: number;
    activeOrders: number;
    avgOrderValue: number;
  };
  monthlyTrends: SalesReportBucket[];
  categoryBreakdown: {
    category: string;
    orderCount: number;
    unitsSold: number;
    totalSpent: number;
  }[];
  orderStatusBreakdown: {
    status: string;
    count: number;
    percentage: number;
  }[];
  paymentMethodBreakdown: {
    method: string;
    count: number;
    totalAmount: number;
  }[];
  topProducts: {
    productName: string;
    unitsSold: number;
    totalRevenue: number;
  }[];
}
