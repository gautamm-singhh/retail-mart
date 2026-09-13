import { request } from "@/services/api/client";
import type { CustomerStats } from "@/types";

/**
 * Fetches purchase statistics for the authenticated customer from
 * GET /api/customer/stats/summary. Only callable with a Customer JWT;
 * Admin/Manager/Staff tokens will receive a 403.
 */
export function fetchCustomerStats(): Promise<CustomerStats> {
  return request<CustomerStats>("/customer/stats/summary");
}
