import { useCallback, useEffect, useState } from "react";
import { addressRepository } from "@/features/addresses/services/addressRepository";
import { ApiError } from "@/services/api/client";
import type { Address, AddressFormValues } from "@/types";

export function useAddresses(enabled: boolean = true) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    addressRepository
      .list()
      .then((data) => {
        if (!cancelled) setAddresses(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const msg =
            err instanceof ApiError
              ? err.message
              : (err as Error)?.message || "We couldn't load your addresses. Please try again.";
          setError(msg);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken, enabled]);

  const refresh = useCallback(() => setReloadToken((t) => t + 1), []);

  const addAddress = useCallback(
    async (values: AddressFormValues) => {
      const created = await addressRepository.create(values);
      refresh();
      return created;
    },
    [refresh],
  );

  const editAddress = useCallback(
    async (id: string, values: Partial<AddressFormValues>) => {
      const updated = await addressRepository.update(id, values);
      refresh();
      return updated;
    },
    [refresh],
  );

  const removeAddress = useCallback(
    async (id: string) => {
      await addressRepository.remove(id);
      refresh();
    },
    [refresh],
  );

  return { addresses, isLoading, error, refresh, addAddress, editAddress, removeAddress };
}
