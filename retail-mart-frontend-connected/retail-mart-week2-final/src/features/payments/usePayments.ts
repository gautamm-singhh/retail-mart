import { useCallback, useEffect, useMemo, useState } from "react";
import { paymentRepository, isRefund } from "@/features/payments/services/paymentRepository";
import { registerCacheClearer } from "@/services/api/cacheManager";
import type { Payment } from "@/types";

interface PaymentsMemoryCache {
  data: Payment[] | null;
  timestamp: number;
  inFlight: Promise<Payment[]> | null;
  listeners: Set<(payments: Payment[]) => void>;
}

const paymentsCache: PaymentsMemoryCache = {
  data: null,
  timestamp: 0,
  inFlight: null,
  listeners: new Set(),
};

export function clearPaymentsCache(): void {
  paymentsCache.data = null;
  paymentsCache.timestamp = 0;
  paymentsCache.inFlight = null;
}
registerCacheClearer(clearPaymentsCache);

/** Stale time: 60 seconds (data is considered fresh and returned instantly without refetch) */
const STALE_TIME_MS = 60 * 1000;

function notifyListeners(payments: Payment[]) {
  paymentsCache.listeners.forEach((listener) => {
    try {
      listener(payments);
    } catch {
      // Ignore listener error
    }
  });
}

export async function fetchPaymentsDeduplicated(force = false): Promise<Payment[]> {
  const isFresh = paymentsCache.data && Date.now() - paymentsCache.timestamp < STALE_TIME_MS;
  if (!force && isFresh) {
    return paymentsCache.data!;
  }

  // Deduplicate concurrent requests (e.g. PaymentsTabs switching or simultaneous page mounts)
  if (paymentsCache.inFlight) {
    return paymentsCache.inFlight;
  }

  paymentsCache.inFlight = paymentRepository
    .list()
    .then((data) => {
      paymentsCache.data = data;
      paymentsCache.timestamp = Date.now();
      notifyListeners(data);
      return data;
    })
    .finally(() => {
      paymentsCache.inFlight = null;
    });

  return paymentsCache.inFlight;
}

export function usePayments() {
  const [allPayments, setAllPayments] = useState<Payment[]>(() => paymentsCache.data ?? []);
  const [isLoading, setIsLoading] = useState<boolean>(() => !paymentsCache.data);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Register listener for cache updates from any component/mutation
    const handleUpdate = (updatedPayments: Payment[]) => {
      if (!cancelled) {
        setAllPayments(updatedPayments);
        setIsLoading(false);
        setError(null);
      }
    };
    paymentsCache.listeners.add(handleUpdate);

    // If cache already has data, we don't block the UI with a skeleton
    const hasCachedData = Boolean(paymentsCache.data);
    if (!hasCachedData) {
      setIsLoading(true);
    }

    fetchPaymentsDeduplicated()
      .then((data) => {
        if (!cancelled) {
          setAllPayments(data);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled && !paymentsCache.data) {
          setError("We couldn't load payments. Please try again.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
      paymentsCache.listeners.delete(handleUpdate);
    };
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fresh = await fetchPaymentsDeduplicated(true);
      setAllPayments(fresh);
    } catch {
      setError("We couldn't load payments. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markRefunded = useCallback(
    async (id: string) => {
      const currentList = paymentsCache.data ?? allPayments;
      const updated = await paymentRepository.markRefunded(id, currentList);
      if (updated && paymentsCache.data) {
        const nextList = paymentsCache.data.map((p) => (p.id === id ? { ...p, ...updated } : p));
        paymentsCache.data = nextList;
        paymentsCache.timestamp = Date.now();
        notifyListeners(nextList);
      } else {
        refresh();
      }
      return updated;
    },
    [allPayments, refresh],
  );

  const payments = useMemo(() => allPayments.filter((p) => !isRefund(p)), [allPayments]);
  const refunds = useMemo(() => allPayments.filter(isRefund), [allPayments]);

  const downloadReceipt = useCallback((id: string) => paymentRepository.downloadReceipt(id), []);

  return { payments, refunds, allPayments, isLoading, error, refresh, markRefunded, downloadReceipt };
}
