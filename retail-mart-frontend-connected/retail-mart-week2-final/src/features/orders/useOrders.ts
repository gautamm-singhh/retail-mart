import { useCallback, useEffect, useState } from "react";
import { orderRepository } from "@/features/orders/services/orderRepository";
import type { Order, OrderStatus } from "@/types";

interface OrdersMemoryCache {
  data: Order[] | null;
  timestamp: number;
  inFlight: Promise<Order[]> | null;
  listeners: Set<(orders: Order[]) => void>;
}

const ordersCache: OrdersMemoryCache = {
  data: null,
  timestamp: 0,
  inFlight: null,
  listeners: new Set(),
};

/** Stale time: 60 seconds (data is considered fresh and returned instantly without refetch) */
const STALE_TIME_MS = 60 * 1000;

function notifyListeners(orders: Order[]) {
  ordersCache.listeners.forEach((listener) => {
    try {
      listener(orders);
    } catch {
      // Ignore listener error
    }
  });
}

async function fetchOrdersDeduplicated(force = false): Promise<Order[]> {
  const isFresh = ordersCache.data && Date.now() - ordersCache.timestamp < STALE_TIME_MS;
  if (!force && isFresh) {
    return ordersCache.data!;
  }

  // Deduplicate concurrent requests (e.g. Sidebar and OrdersPage mounting together)
  if (ordersCache.inFlight) {
    return ordersCache.inFlight;
  }

  ordersCache.inFlight = orderRepository
    .list()
    .then((data) => {
      ordersCache.data = data;
      ordersCache.timestamp = Date.now();
      notifyListeners(data);
      return data;
    })
    .finally(() => {
      ordersCache.inFlight = null;
    });

  return ordersCache.inFlight;
}

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>(() => ordersCache.data ?? []);
  const [isLoading, setIsLoading] = useState<boolean>(() => !ordersCache.data);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Register listener for cache updates from any component/mutation
    const handleUpdate = (updatedOrders: Order[]) => {
      if (!cancelled) {
        setOrders(updatedOrders);
        setIsLoading(false);
        setError(null);
      }
    };
    ordersCache.listeners.add(handleUpdate);

    // If cache already has data, we don't block the UI with a skeleton
    const hasCachedData = Boolean(ordersCache.data);
    if (!hasCachedData) {
      setIsLoading(true);
    }

    fetchOrdersDeduplicated()
      .then((data) => {
        if (!cancelled) {
          setOrders(data);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled && !ordersCache.data) {
          setError("We couldn't load orders. Please try again.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
      ordersCache.listeners.delete(handleUpdate);
    };
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fresh = await fetchOrdersDeduplicated(true);
      setOrders(fresh);
    } catch {
      setError("We couldn't load orders. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateOrderStatus = useCallback(
    async (id: string, nextStatus: OrderStatus) => {
      const updated = await orderRepository.updateStatus(id, nextStatus);
      // Invalidate and update local cache immediately
      if (ordersCache.data) {
        const nextOrders = ordersCache.data.map((o) => (o.id === id ? { ...o, ...updated } : o));
        ordersCache.data = nextOrders;
        ordersCache.timestamp = Date.now();
        notifyListeners(nextOrders);
      } else {
        refresh();
      }
      return updated;
    },
    [refresh],
  );

  const downloadInvoice = useCallback((id: string) => orderRepository.downloadInvoice(id), []);

  return { orders, isLoading, error, refresh, updateOrderStatus, downloadInvoice };
}
