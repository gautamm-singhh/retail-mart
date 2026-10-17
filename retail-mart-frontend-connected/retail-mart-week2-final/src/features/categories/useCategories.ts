import { useCallback, useEffect, useState } from "react";
import { categoryRepository } from "@/features/categories/services/categoryRepository";
import { categoriesCache } from "@/services/api/categories";
import type { Category } from "@/types";

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>(() => categoriesCache.data ?? []);
  const [isLoading, setIsLoading] = useState<boolean>(() => !categoriesCache.data);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const handleUpdate = (updatedList: Category[]) => {
      if (!cancelled) {
        setCategories(updatedList);
        setIsLoading(false);
      }
    };

    categoriesCache.listeners.add(handleUpdate);

    const hasCachedData = Boolean(categoriesCache.data);
    if (!hasCachedData) {
      setIsLoading(true);
    }
    setError(null);

    categoryRepository
      .list(false)
      .then((data) => {
        if (!cancelled) {
          setCategories(data);
        }
      })
      .catch(() => {
        if (!cancelled && !categoriesCache.data) {
          setError("We couldn't load categories. Please try again.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
      categoriesCache.listeners.delete(handleUpdate);
    };
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await categoryRepository.list(true);
      setCategories(data);
    } catch {
      if (!categoriesCache.data) {
        setError("We couldn't load categories. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { categories, isLoading, error, refresh };
}
