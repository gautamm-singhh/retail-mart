import { request } from "@/services/api/client";
import type { ReportPeriod, SalesReport, AnalyticsSummary } from "@/types";

export function fetchSalesReport(period: ReportPeriod): Promise<SalesReport> {
  return request<SalesReport>(`/reports/${period}`);
}

export function fetchAnalyticsSummary(): Promise<AnalyticsSummary> {
  return request<AnalyticsSummary>("/reports/analytics-summary");
}
