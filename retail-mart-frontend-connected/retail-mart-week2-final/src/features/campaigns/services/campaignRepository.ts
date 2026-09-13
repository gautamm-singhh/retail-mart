import { fetchCampaigns, createCampaign, updateCampaign, deleteCampaign, sendCampaign } from "@/services/api/campaigns";
import type { Campaign, CampaignFormValues } from "@/types";

export const campaignRepository = {
  list: (): Promise<Campaign[]> => fetchCampaigns(),
  create: (values: CampaignFormValues): Promise<Campaign> => createCampaign(values),
  update: (id: string, values: CampaignFormValues): Promise<Campaign> => updateCampaign(id, values),
  remove: (id: string): Promise<void> => deleteCampaign(id),
  send: (id: string) => sendCampaign(id),
};
