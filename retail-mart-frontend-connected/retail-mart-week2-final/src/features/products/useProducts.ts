import { useCallback, useEffect, useState } from "react";
import { productRepository } from "@/features/products/services/productRepository";
import type { Product, ProductFormValues } from "@/types";

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    productRepository
      .list()
      .then((data) => {
        if (!cancelled) setProducts(data);
      })
      .catch(() => {
        if (!cancelled) setError("We couldn't load products. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const refresh = useCallback(() => setReloadToken((t) => t + 1), []);

  const addProduct = useCallback(
    async (values: ProductFormValues) => {
      const created = await productRepository.create(values);
      refresh();
      return created;
    },
    [refresh],
  );

  const editProduct = useCallback(
    async (id: string, values: ProductFormValues) => {
      const updated = await productRepository.update(id, values);
      refresh();
      return updated;
    },
    [refresh],
  );

  const removeProduct = useCallback(
    async (id: string) => {
      await productRepository.remove(id);
      refresh();
    },
    [refresh],
  );

  return { products, isLoading, error, refresh, addProduct, editProduct, removeProduct };
}
