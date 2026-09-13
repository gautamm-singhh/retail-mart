import { request } from "@/services/api/client";
import type { Courier, CourierFormValues } from "@/types";

export function fetchCouriers(activeOnly = false): Promise<Courier[]> {
  const qs = activeOnly ? "?active=true" : "";
  return request<Courier[]>(`/couriers${qs}`);
}

export function createCourier(values: CourierFormValues): Promise<Courier> {
  return request<Courier>("/couriers", { method: "POST", body: JSON.stringify(values) });
}

export function updateCourier(id: string, values: CourierFormValues): Promise<Courier> {
  return request<Courier>(`/couriers/${id}`, { method: "PUT", body: JSON.stringify(values) });
}

export function toggleCourierStatus(id: string, isActive: boolean): Promise<Courier> {
  return request<Courier>(`/couriers/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}

export function deleteCourier(id: string): Promise<void> {
  return request<void>(`/couriers/${id}`, { method: "DELETE" });
}
