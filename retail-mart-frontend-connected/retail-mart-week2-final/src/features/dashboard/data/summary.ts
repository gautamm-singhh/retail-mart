import { mockProducts } from "@/features/products/data/products";
import { mockOrders } from "@/features/orders/data/orders";
import { mockPayments } from "@/features/payments/data/payments";
import { mockShipments } from "@/features/shipping/data/shipments";
import { mockUsers } from "@/features/users/data/users";

export interface SummaryCard {
  label: string;
  value: string;
  hint: string;
}

// Derived from the other features' mock data rather than hardcoded twice,
// so the dashboard numbers stay consistent with the tables underneath them.
export const dashboardSummary: SummaryCard[] = [
  {
    label: "Active Users",
    value: String(mockUsers.filter((u) => u.status === "active").length),
    hint: `${mockUsers.length} total accounts`,
  },
  {
    label: "Total Products",
    value: String(mockProducts.length),
    hint: `${mockProducts.filter((p) => p.status === "out-of-stock").length} out of stock`,
  },
  {
    label: "Pending Orders",
    value: String(
      mockOrders.filter((o) => o.status === "Pending" || o.status === "Processing")
        .length,
    ),
    hint: `${mockOrders.length} orders total`,
  },
  {
    label: "Total Payments",
    value: String(mockPayments.filter((p) => p.status === "Paid").length),
    hint: `${mockPayments.filter((p) => p.status === "Failed").length} failed`,
  },
  {
    label: "Pending Shipments",
    value: String(mockShipments.filter((s) => s.status !== "Delivered").length),
    hint: `${mockShipments.filter((s) => s.status === "Delivered").length} delivered`,
  },
];

export const recentOrders = mockOrders.slice(0, 5);
