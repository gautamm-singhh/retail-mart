import { useCallback, useEffect, useState } from "react";
import { orderRepository } from "@/features/orders/services/orderRepository";
import type { Order, OrderStatus } from "@/types";

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    orderRepository
      .list()
      .then((data) => {
        if (!cancelled) setOrders(data);
      })
      .catch(() => {
        if (!cancelled) setError("We couldn't load orders. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const refresh = useCallback(() => setReloadToken((t) => t + 1), []);

  const updateOrderStatus = useCallback(
    async (id: string, nextStatus: OrderStatus) => {
      const updated = await orderRepository.updateStatus(id, nextStatus);
      refresh();
      return updated;
    },
    [refresh],
  );

  const downloadInvoice = useCallback((id: string) => orderRepository.downloadInvoice(id), []);

  return { orders, isLoading, error, refresh, updateOrderStatus, downloadInvoice };
}
