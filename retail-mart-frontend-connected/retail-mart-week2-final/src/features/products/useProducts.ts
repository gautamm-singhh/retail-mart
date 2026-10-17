import { useCallback, useEffect, useState } from "react";
import { productRepository } from "@/features/products/services/productRepository";
import { productsCache } from "@/services/api/products";
import type { Product, ProductFormValues } from "@/types";

export function useProducts() {
  const [products, setProducts] = useState<Product[]>(() => productsCache.data ?? []);
  const [isLoading, setIsLoading] = useState<boolean>(() => !productsCache.data);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const handleUpdate = (updatedList: Product[]) => {
      if (!cancelled) {
        setProducts(updatedList);
        setIsLoading(false);
      }
    };

    productsCache.listeners.add(handleUpdate);

    const hasCachedData = Boolean(productsCache.data);
    if (!hasCachedData) {
      setIsLoading(true);
    }
    setError(null);

    productRepository
      .list(false)
      .then((data) => {
        if (!cancelled) {
          setProducts(data);
        }
      })
      .catch(() => {
        if (!cancelled && !productsCache.data) {
          setError("We couldn't load products. Please try again.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
      productsCache.listeners.delete(handleUpdate);
    };
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await productRepository.list(true);
      setProducts(data);
    } catch {
      if (!productsCache.data) {
        setError("We couldn't load products. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addProduct = useCallback(
    async (values: ProductFormValues) => {
      const created = await productRepository.create(values);
      return created;
    },
    [],
  );

  const editProduct = useCallback(
    async (id: string, values: ProductFormValues) => {
      const updated = await productRepository.update(id, values);
      return updated;
    },
    [],
  );

  const removeProduct = useCallback(
    async (id: string) => {
      await productRepository.remove(id);
    },
    [],
  );

  return { products, isLoading, error, refresh, addProduct, editProduct, removeProduct };
}
