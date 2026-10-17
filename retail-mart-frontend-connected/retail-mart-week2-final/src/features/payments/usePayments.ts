import { useCallback, useEffect, useMemo, useState } from "react";
import { paymentRepository, isRefund } from "@/features/payments/services/paymentRepository";
import type { Payment } from "@/types";

export function usePayments() {
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    paymentRepository
      .list()
      .then((data) => {
        if (!cancelled) setAllPayments(data);
      })
      .catch(() => {
        if (!cancelled) setError("We couldn't load payments. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const refresh = useCallback(() => setReloadToken((t) => t + 1), []);

  const markRefunded = useCallback(
    async (id: string) => {
      const updated = await paymentRepository.markRefunded(id, allPayments);
      refresh();
      return updated;
    },
    [allPayments, refresh],
  );

  const payments = useMemo(() => allPayments.filter((p) => !isRefund(p)), [allPayments]);
  const refunds = useMemo(() => allPayments.filter(isRefund), [allPayments]);

  const downloadReceipt = useCallback((id: string) => paymentRepository.downloadReceipt(id), []);

  return { payments, refunds, allPayments, isLoading, error, refresh, markRefunded, downloadReceipt };
}
