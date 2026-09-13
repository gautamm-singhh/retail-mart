import { request } from "@/services/api/client";
import type { Product, ProductFormValues } from "@/types";

export function fetchProducts(): Promise<Product[]> {
  return request<Product[]>("/products");
}

export function fetchProduct(id: string): Promise<Product> {
  return request<Product>(`/products/${id}`);
}

export function createProduct(values: ProductFormValues): Promise<Product> {
  return request<Product>("/products", { method: "POST", body: JSON.stringify(values) });
}

export function updateProduct(id: string, values: ProductFormValues): Promise<Product> {
  return request<Product>(`/products/${id}`, { method: "PUT", body: JSON.stringify(values) });
}

export function deleteProduct(id: string): Promise<void> {
  return request<void>(`/products/${id}`, { method: "DELETE" });
}
