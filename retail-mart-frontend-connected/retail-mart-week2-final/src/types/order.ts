export type OrderStatus =
  "Pending" | "Processing" | "Shipped" | "Delivered" | "Cancelled";

export type OrderPaymentStatus = "Pending" | "Paid" | "Failed" | "Refunded";

export interface OrderItem {
  productName: string;
  quantity: number;
  price: number;
}

export interface OrderStatusEvent {
  status: OrderStatus;
  date: string;
}

/** Minimal shipment info embedded in each Order response (null when no shipment created yet). */
export interface ShipmentSummary {
  id: string;
  status: string;
  courier: string;
  trackingNumber: string;
  expectedDelivery: string | null;
}

export interface Order {
  id: string;
  customer: string;
  customerEmail: string;
  date: string;
  amount: number;
  paymentStatus: OrderPaymentStatus;
  status: OrderStatus;
  items: OrderItem[];
  statusHistory: OrderStatusEvent[];
  /** The Payment record created alongside this order - used to jump straight into RazorPay checkout. */
  paymentId: string | null;
  /** Shipment linked to this order - null until Admin/Manager creates one. */
  shipment: ShipmentSummary | null;
}

/**
 * Allowed forward transitions for the order status workflow. Kept as
 * data (not scattered if/else) so both the UI and backend
 * validation reference the same source of truth. Cancellation is only
 * offered from states where an order hasn't shipped yet.
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  Pending: ["Processing", "Cancelled"],
  Processing: ["Shipped", "Cancelled"],
  Shipped: ["Delivered"],
  Delivered: [],
  Cancelled: [],
};
