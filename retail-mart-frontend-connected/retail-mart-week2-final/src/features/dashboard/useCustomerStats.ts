import { useEffect, useState } from "react";
import { fetchCustomerStats } from "@/services/api/customerStats";
import type { CustomerStats } from "@/types";

interface UseCustomerStatsResult {
  stats: CustomerStats | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Fetches and caches the authenticated customer's purchase statistics.
 * Mirrors the pattern used by useShipments, useAddresses, etc.
 * Only mounts a real request when rendered inside a Customer-role session.
 */
export function useCustomerStats(): UseCustomerStatsResult {
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, []);

  return { stats, isLoading, error };
}
