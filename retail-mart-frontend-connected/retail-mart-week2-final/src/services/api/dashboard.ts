import { request } from "@/services/api/client";
import type { SummaryCard } from "@/features/dashboard/data/summary";

export function fetchDashboardSummary(): Promise<SummaryCard[]> {
  return request<SummaryCard[]>("/dashboard/summary");
}
