import { useCallback, useEffect, useState } from "react";
import { addressRepository } from "@/features/addresses/services/addressRepository";
import type { Address, AddressFormValues } from "@/types";

export function useAddresses() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    addressRepository
      .list()
      .then((data) => {
        if (!cancelled) setAddresses(data);
      })
      .catch(() => {
        if (!cancelled) setError("We couldn't load your addresses. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

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
