import { request } from "@/services/api/client";
import type { Product, ProductFormValues } from "@/types";

interface ProductsMemoryCache {
  data: Product[] | null;
  timestamp: number;
  inFlight: Promise<Product[]> | null;
  listeners: Set<(products: Product[]) => void>;
}

export const productsCache: ProductsMemoryCache = {
  data: null,
  timestamp: 0,
  inFlight: null,
  listeners: new Set(),
};

const STALE_TIME_MS = 60 * 1000;

export function notifyProductListeners(products: Product[]): void {
  productsCache.listeners.forEach((listener) => {
    try {
      listener(products);
    } catch {
      // Ignore listener error
    }
  });
}

export function clearProductsCache(): void {
  productsCache.data = null;
  productsCache.timestamp = 0;
  productsCache.inFlight = null;
}
// Note: We do NOT register clearProductsCache with user-session registerCacheClearer
// so that public catalog items remain available immediately when switching or logging in.

export function fetchProducts(force = false): Promise<Product[]> {
  const isFresh = productsCache.data && Date.now() - productsCache.timestamp < STALE_TIME_MS;
  if (!force && isFresh) {
    return Promise.resolve(productsCache.data!);
  }

  if (productsCache.inFlight) {
    return productsCache.inFlight;
  }

  productsCache.inFlight = request<Product[]>("/products")
    .then((data) => {
      productsCache.data = data;
      productsCache.timestamp = Date.now();
      notifyProductListeners(data);
      return data;
    })
    .finally(() => {
      productsCache.inFlight = null;
    });

  return productsCache.inFlight;
}

export function fetchProduct(id: string): Promise<Product> {
  // If we already have the product in cache, return it if available
  if (productsCache.data) {
    const cached = productsCache.data.find((p) => p.id === id);
    if (cached) {
      return Promise.resolve(cached);
    }
  }
  return request<Product>(`/products/${id}`);
}

export async function createProduct(values: ProductFormValues): Promise<Product> {
  const created = await request<Product>("/products", {
    method: "POST",
    body: JSON.stringify(values),
  });
  if (productsCache.data) {
    const nextList = [...productsCache.data, created];
    productsCache.data = nextList;
    productsCache.timestamp = Date.now();
    notifyProductListeners(nextList);
  }
  return created;
}

export async function updateProduct(id: string, values: ProductFormValues): Promise<Product> {
  const updated = await request<Product>(`/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(values),
  });
  if (productsCache.data) {
    const nextList = productsCache.data.map((p) => (p.id === id ? { ...p, ...updated } : p));
    productsCache.data = nextList;
    productsCache.timestamp = Date.now();
    notifyProductListeners(nextList);
  }
  return updated;
}

export async function deleteProduct(id: string): Promise<void> {
  await request<void>(`/products/${id}`, { method: "DELETE" });
  if (productsCache.data) {
    const nextList = productsCache.data.filter((p) => p.id !== id);
    productsCache.data = nextList;
    productsCache.timestamp = Date.now();
    notifyProductListeners(nextList);
  }
}
