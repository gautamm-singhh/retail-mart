import { request } from "@/services/api/client";
import type { ReportPeriod, SalesProjection } from "@/types";

export function fetchProjections(period: ReportPeriod, periodsAhead = 3): Promise<SalesProjection> {
  return request<SalesProjection>(`/analytics/projections?period=${period}&periodsAhead=${periodsAhead}`);
}

export function fetchAiProjections(period: ReportPeriod, periodsAhead = 3): Promise<SalesProjection> {
  return request<SalesProjection>(`/analytics/ai-projections?period=${period}&periodsAhead=${periodsAhead}`);
}
