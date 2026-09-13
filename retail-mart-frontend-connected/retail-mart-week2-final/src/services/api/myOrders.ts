import { request } from "@/services/api/client";
import type { Order } from "@/types";

export function fetchMyOrders(): Promise<Order[]> {
  return request<Order[]>("/orders/mine");
}
