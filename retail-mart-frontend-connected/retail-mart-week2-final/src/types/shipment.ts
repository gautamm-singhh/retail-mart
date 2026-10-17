export type ShipmentStatus =
  "Pending" | "Packed" | "Shipped" | "Out for Delivery" | "Delivered";

export interface ShipmentStatusEvent {
  status: ShipmentStatus;
  date: string;
}

export interface Shipment {
  id: string;
  orderId: string;
  customer: string;
  courier: string;
  courierId?: string | null;
  trackingNumber: string;
  status: ShipmentStatus;
  expectedDelivery: string;
  trackingHistory: ShipmentStatusEvent[];
}

export const SHIPMENT_STATUS_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  Pending: ["Packed"],
  Packed: ["Shipped"],
  Shipped: ["Out for Delivery"],
  "Out for Delivery": ["Delivered"],
  Delivered: [],
};

export interface ShipmentFormValues {
  orderId: string;
  courier: string;
  courierId?: string | null;
  trackingNumber?: string;
  expectedDelivery: string;
}
