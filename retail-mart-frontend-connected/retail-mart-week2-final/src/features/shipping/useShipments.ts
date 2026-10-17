import { useCallback, useEffect, useState } from "react";
import { shipmentRepository } from "@/features/shipping/services/shipmentRepository";
import { registerCacheClearer } from "@/services/api/cacheManager";
import type { Shipment, ShipmentFormValues } from "@/types";

interface ShipmentsMemoryCache {
  data: Shipment[] | null;
  timestamp: number;
  inFlight: Promise<Shipment[]> | null;
  listeners: Set<(shipments: Shipment[]) => void>;
}

const shipmentsCache: ShipmentsMemoryCache = {
  data: null,
  timestamp: 0,
  inFlight: null,
  listeners: new Set(),
};

export function clearShipmentsCache(): void {
  shipmentsCache.data = null;
  shipmentsCache.timestamp = 0;
  shipmentsCache.inFlight = null;
}
registerCacheClearer(clearShipmentsCache);

/** Stale time: 60 seconds */
const STALE_TIME_MS = 60 * 1000;

function notifyListeners(shipments: Shipment[]) {
  shipmentsCache.listeners.forEach((listener) => {
    try {
      listener(shipments);
    } catch {
      // Ignore
    }
  });
}

export async function fetchShipmentsDeduplicated(force = false): Promise<Shipment[]> {
  const isFresh = shipmentsCache.data && Date.now() - shipmentsCache.timestamp < STALE_TIME_MS;
  if (!force && isFresh) {
    return shipmentsCache.data!;
  }

  if (shipmentsCache.inFlight) {
    return shipmentsCache.inFlight;
  }

  shipmentsCache.inFlight = shipmentRepository
    .list()
    .then((data) => {
      shipmentsCache.data = data;
      shipmentsCache.timestamp = Date.now();
      notifyListeners(data);
      return data;
    })
    .finally(() => {
      shipmentsCache.inFlight = null;
    });

  return shipmentsCache.inFlight;
}

interface UseShipmentsResult {
  shipments: Shipment[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  addShipment: (values: ShipmentFormValues) => Promise<Shipment>;
  updateStatus: (id: string, status: string, location?: string, note?: string) => Promise<Shipment>;
}

export function useShipments(): UseShipmentsResult {
  const [shipments, setShipments] = useState<Shipment[]>(() => shipmentsCache.data ?? []);
  const [isLoading, setIsLoading] = useState<boolean>(() => !shipmentsCache.data);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const handleUpdate = (updatedList: Shipment[]) => {
      if (!cancelled) {
        setShipments(updatedList);
        setIsLoading(false);
      }
    };

    shipmentsCache.listeners.add(handleUpdate);

    const hasCachedData = Boolean(shipmentsCache.data);
    if (!hasCachedData) {
      setIsLoading(true);
    }
    setError(null);

    fetchShipmentsDeduplicated(false)
      .then((data) => {
        if (!cancelled) {
          setShipments(data);
        }
      })
      .catch(() => {
        if (!cancelled && !shipmentsCache.data) {
          setError("We couldn't load shipments. Please try again.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
      shipmentsCache.listeners.delete(handleUpdate);
    };
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchShipmentsDeduplicated(true);
      setShipments(data);
    } catch {
      if (!shipmentsCache.data) {
        setError("We couldn't load shipments. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addShipment = useCallback(
    async (values: ShipmentFormValues) => {
      const created = await shipmentRepository.create(values);
      if (shipmentsCache.data) {
        const nextList = [...shipmentsCache.data, created];
        shipmentsCache.data = nextList;
        shipmentsCache.timestamp = Date.now();
        notifyListeners(nextList);
      } else {
        refresh();
      }
      return created;
    },
    [refresh],
  );

  const updateStatus = useCallback(
    async (id: string, status: string, location?: string, note?: string) => {
      const updated = await shipmentRepository.updateStatus(id, status, location, note);
      if (shipmentsCache.data) {
        const nextList = shipmentsCache.data.map((s) => (s.id === id ? { ...s, ...updated } : s));
        shipmentsCache.data = nextList;
        shipmentsCache.timestamp = Date.now();
        notifyListeners(nextList);
      } else {
        refresh();
      }
      return updated;
    },
    [refresh],
  );

  return { shipments, isLoading, error, refresh, addShipment, updateStatus };
}
