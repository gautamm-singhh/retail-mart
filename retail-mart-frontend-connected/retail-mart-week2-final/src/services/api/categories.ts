import { request } from "@/services/api/client";
import type { Category } from "@/types";

export function fetchCategories(): Promise<Category[]> {
  return request<Category[]>("/categories");
}
