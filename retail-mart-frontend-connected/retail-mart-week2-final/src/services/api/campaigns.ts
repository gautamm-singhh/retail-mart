import { request } from "@/services/api/client";
import type { Campaign, CampaignFormValues } from "@/types";

export function fetchCampaigns(): Promise<Campaign[]> {
  return request<Campaign[]>("/campaigns");
}

export function createCampaign(values: CampaignFormValues): Promise<Campaign> {
  return request<Campaign>("/campaigns", { method: "POST", body: JSON.stringify(values) });
}

export function updateCampaign(id: string, values: CampaignFormValues): Promise<Campaign> {
  return request<Campaign>(`/campaigns/${id}`, { method: "PUT", body: JSON.stringify(values) });
}

export function deleteCampaign(id: string): Promise<void> {
  return request<void>(`/campaigns/${id}`, { method: "DELETE" });
}

export function sendCampaign(id: string): Promise<{ campaignId: string; recipients: number; sent: number }> {
  return request(`/campaigns/${id}/send`, { method: "POST" });
}
