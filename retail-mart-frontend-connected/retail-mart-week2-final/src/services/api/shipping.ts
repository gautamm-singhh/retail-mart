import { request } from "@/services/api/client";
import type { Shipment, ShipmentFormValues } from "@/types";

export function fetchShipments(): Promise<Shipment[]> {
  return request<Shipment[]>("/shipments");
}

export function createShipment(values: ShipmentFormValues): Promise<Shipment> {
  return request<Shipment>("/shipments", {
    method: "POST",
    body: JSON.stringify(values),
  });
}

export function updateShipmentStatus(
  id: string,
  status: string,
  location?: string,
  note?: string,
): Promise<Shipment> {
  return request<Shipment>(`/shipments/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, location, note }),
  });
}

export function trackShipment(id: string): Promise<{
  shipmentId: string;
  status: string;
  courier: string;
  courierId?: string | null;
  trackingNumber: string;
  expectedDelivery: string | null;
  trackingHistory: any[];
  trackingUrl: string | null;
  externalTracking?: any;
}> {
  return request(`/shipments/${id}/track`);
}

export function syncTracking(id: string): Promise<{
  synced: boolean;
  previousStatus: string;
  currentStatus: string;
  externalStatus: string;
  mappedStatus: string;
  externalTracking: any;
}> {
  return request(`/shipments/${id}/sync-tracking`, {
    method: "POST",
  });
}
