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
  paymentId: string | null;
  shipment: ShipmentSummary | null;
}

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  Pending: ["Processing", "Cancelled"],
  Processing: ["Shipped", "Cancelled"],
  Shipped: ["Delivered"],
  Delivered: [],
  Cancelled: [],
};
