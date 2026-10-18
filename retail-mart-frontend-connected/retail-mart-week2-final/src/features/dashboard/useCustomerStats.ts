import { useEffect, useState } from "react";
import { fetchCustomerStats } from "@/services/api/customerStats";
import type { CustomerStats } from "@/types";

interface UseCustomerStatsResult {
  stats: CustomerStats | null;
  isLoading: boolean;
  error: string | null;
}

export function useCustomerStats(enabled: boolean = true): UseCustomerStatsResult {
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchCustomerStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setError("We couldn't load your purchase summary. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { stats, isLoading, error };
}
