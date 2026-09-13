import { useCallback, useEffect, useState } from "react";
import { shipmentRepository } from "@/features/shipping/services/shipmentRepository";
import type { Shipment, ShipmentFormValues } from "@/types";

interface UseShipmentsResult {
  shipments: Shipment[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  addShipment: (values: ShipmentFormValues) => Promise<Shipment>;
  updateStatus: (id: string, status: string, location?: string, note?: string) => Promise<Shipment>;
}

/**
 * Async data-fetching hook backed by GET /shipments (see
 * services/api/shipping.ts). ShippingPage and ShipmentDetailsPage render
 * loading/error/empty states from this hook.
 */
export function useShipments(): UseShipmentsResult {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    shipmentRepository
      .list()
      .then((data) => {
        if (!cancelled) setShipments(data);
      })
      .catch(() => {
        if (!cancelled) setError("We couldn't load shipments. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const refresh = useCallback(() => setReloadToken((token) => token + 1), []);

  const addShipment = useCallback(
    async (values: ShipmentFormValues) => {
      const created = await shipmentRepository.create(values);
      refresh();
      return created;
    },
    [refresh],
  );

  const updateStatus = useCallback(
    async (id: string, status: string, location?: string, note?: string) => {
      const updated = await shipmentRepository.updateStatus(id, status, location, note);
      refresh();
      return updated;
    },
    [refresh],
  );

  return { shipments, isLoading, error, refresh, addShipment, updateStatus };
}
