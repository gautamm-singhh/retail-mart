import { useCallback, useEffect, useState } from "react";
import { campaignRepository } from "@/features/campaigns/services/campaignRepository";
import type { Campaign, CampaignFormValues } from "@/types";

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    campaignRepository
      .list()
      .then((data) => {
        if (!cancelled) setCampaigns(data);
      })
      .catch(() => {
        if (!cancelled) setError("We couldn't load campaigns. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const refresh = useCallback(() => setReloadToken((t) => t + 1), []);

  const addCampaign = useCallback(
    async (values: CampaignFormValues) => {
      const created = await campaignRepository.create(values);
      refresh();
      return created;
    },
    [refresh],
  );

  const editCampaign = useCallback(
    async (id: string, values: CampaignFormValues) => {
      const updated = await campaignRepository.update(id, values);
      refresh();
      return updated;
    },
    [refresh],
  );

  const removeCampaign = useCallback(
    async (id: string) => {
      await campaignRepository.remove(id);
      refresh();
    },
    [refresh],
  );

  const sendCampaignBlast = useCallback((id: string) => campaignRepository.send(id), []);

  return { campaigns, isLoading, error, refresh, addCampaign, editCampaign, removeCampaign, sendCampaignBlast };
}
