import { request } from "@/services/api/client";
import type { CustomerStats } from "@/types";

export function fetchCustomerStats(): Promise<CustomerStats> {
  return request<CustomerStats>("/customer/stats/summary");
}
