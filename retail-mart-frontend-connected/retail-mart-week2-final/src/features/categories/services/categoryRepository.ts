import { fetchCategories } from "@/services/api/categories";
import type { Category } from "@/types";

export const categoryRepository = {
  list: (): Promise<Category[]> => fetchCategories(),
};
