import { useCallback, useEffect, useState } from "react";
import {
  fetchCouriers,
  createCourier,
  updateCourier,
  toggleCourierStatus,
  deleteCourier,
} from "@/services/api/couriers";
import type { Courier, CourierFormValues } from "@/types";

interface UseCouriersResult {
  couriers: Courier[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  addCourier: (values: CourierFormValues) => Promise<Courier>;
  editCourier: (id: string, values: CourierFormValues) => Promise<Courier>;
  toggleStatus: (id: string, isActive: boolean) => Promise<Courier>;
  removeCourier: (id: string) => Promise<void>;
}

/**
 * Data hook for registered couriers — mirrors the pattern of useCampaigns,
 * useShipments, etc. Used by CouriersPage for the admin management table.
 */
export function useCouriers(): UseCouriersResult {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchCouriers()
      .then((data) => {
        if (!cancelled) setCouriers(data);
      })
      .catch(() => {
        if (!cancelled) setError("We couldn't load couriers. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const refresh = useCallback(() => setReloadToken((t) => t + 1), []);

  const addCourier = useCallback(
    async (values: CourierFormValues) => {
      const created = await createCourier(values);
      refresh();
      return created;
    },
    [refresh],
  );

  const editCourier = useCallback(
    async (id: string, values: CourierFormValues) => {
      const updated = await updateCourier(id, values);
      refresh();
      return updated;
    },
    [refresh],
  );

  const toggleStatus = useCallback(
    async (id: string, isActive: boolean) => {
      const updated = await toggleCourierStatus(id, isActive);
      refresh();
      return updated;
    },
    [refresh],
  );

  const removeCourier = useCallback(
    async (id: string) => {
      await deleteCourier(id);
      refresh();
    },
    [refresh],
  );

  return { couriers, isLoading, error, refresh, addCourier, editCourier, toggleStatus, removeCourier };
}
