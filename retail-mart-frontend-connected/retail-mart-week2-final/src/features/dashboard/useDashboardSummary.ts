import { useEffect, useState } from "react";
import { fetchDashboardSummary } from "@/services/api/dashboard";
import { registerCacheClearer } from "@/services/api/cacheManager";
import type { SummaryCard } from "@/features/dashboard/data/summary";

interface DashboardMemoryCache {
  data: SummaryCard[] | null;
  timestamp: number;
  inFlight: Promise<SummaryCard[]> | null;
  listeners: Set<(cards: SummaryCard[]) => void>;
}

const dashboardCache: DashboardMemoryCache = {
  data: null,
  timestamp: 0,
  inFlight: null,
  listeners: new Set(),
};

export function clearDashboardCache(): void {
  dashboardCache.data = null;
  dashboardCache.timestamp = 0;
  dashboardCache.inFlight = null;
}
registerCacheClearer(clearDashboardCache);

const STALE_TIME_MS = 60 * 1000;

function notifyListeners(cards: SummaryCard[]) {
  dashboardCache.listeners.forEach((listener) => {
    try {
      listener(cards);
    } catch {
      // Ignore listener error
    }
  });
}

export async function fetchDashboardSummaryDeduplicated(force = false): Promise<SummaryCard[]> {
  const isFresh = dashboardCache.data && Date.now() - dashboardCache.timestamp < STALE_TIME_MS;
  if (!force && isFresh) {
    return dashboardCache.data!;
  }

  if (dashboardCache.inFlight) {
    return dashboardCache.inFlight;
  }

  dashboardCache.inFlight = fetchDashboardSummary()
    .then((data) => {
      dashboardCache.data = data;
      dashboardCache.timestamp = Date.now();
      notifyListeners(data);
      return data;
    })
    .finally(() => {
      dashboardCache.inFlight = null;
    });

  return dashboardCache.inFlight;
}

export function useDashboardSummary() {
  const [summaryCards, setSummaryCards] = useState<SummaryCard[] | null>(() => dashboardCache.data);
  const [isLoading, setIsLoading] = useState<boolean>(() => !dashboardCache.data);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const handleUpdate = (updatedCards: SummaryCard[]) => {
      if (!cancelled) {
        setSummaryCards(updatedCards);
        setIsLoading(false);
      }
    };

    dashboardCache.listeners.add(handleUpdate);

    if (!dashboardCache.data) {
      setIsLoading(true);
    }
    setError(null);

    fetchDashboardSummaryDeduplicated(false)
      .then((data) => {
        if (!cancelled) {
          setSummaryCards(data);
        }
      })
      .catch((err) => {
        if (!cancelled && !dashboardCache.data) {
          setError(err?.message || "Failed to load dashboard summary");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
      dashboardCache.listeners.delete(handleUpdate);
    };
  }, []);

  return { summaryCards, isLoading, error };
}
