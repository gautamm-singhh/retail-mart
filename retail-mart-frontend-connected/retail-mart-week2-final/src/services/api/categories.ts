import { request } from "@/services/api/client";
import type { Category } from "@/types";

interface CategoriesMemoryCache {
  data: Category[] | null;
  timestamp: number;
  inFlight: Promise<Category[]> | null;
  listeners: Set<(categories: Category[]) => void>;
}

export const categoriesCache: CategoriesMemoryCache = {
  data: null,
  timestamp: 0,
  inFlight: null,
  listeners: new Set(),
};

const STALE_TIME_MS = 60 * 1000;

export function notifyCategoryListeners(categories: Category[]): void {
  categoriesCache.listeners.forEach((listener) => {
    try {
      listener(categories);
    } catch {
      // Ignore
    }
  });
}

export function clearCategoriesCache(): void {
  categoriesCache.data = null;
  categoriesCache.timestamp = 0;
  categoriesCache.inFlight = null;
}
// Note: We do NOT register clearCategoriesCache with user-session registerCacheClearer
// so that public catalog categories remain available immediately when switching or logging in.

export function fetchCategories(force = false): Promise<Category[]> {
  const isFresh = categoriesCache.data && Date.now() - categoriesCache.timestamp < STALE_TIME_MS;
  if (!force && isFresh) {
    return Promise.resolve(categoriesCache.data!);
  }

  if (categoriesCache.inFlight) {
    return categoriesCache.inFlight;
  }

  categoriesCache.inFlight = request<Category[]>("/categories")
    .then((data) => {
      categoriesCache.data = data;
      categoriesCache.timestamp = Date.now();
      notifyCategoryListeners(data);
      return data;
    })
    .finally(() => {
      categoriesCache.inFlight = null;
    });

  return categoriesCache.inFlight;
}
