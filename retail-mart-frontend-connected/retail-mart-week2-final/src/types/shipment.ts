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

/** Sequential status transitions matching the backend's SHIPMENT_STATUS_TRANSITIONS. */
export const SHIPMENT_STATUS_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  Pending: ["Packed"],
  Packed: ["Shipped"],
  Shipped: ["Out for Delivery"],
  "Out for Delivery": ["Delivered"],
  Delivered: [],
};

/** Fields collected by ShipmentForm when creating a new shipment. */
export interface ShipmentFormValues {
  orderId: string;
  courier: string;
  courierId?: string | null;
  trackingNumber?: string;
  expectedDelivery: string;
}
