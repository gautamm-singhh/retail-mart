import type { Category } from "@/types";

/** Active categories only - a product shouldn't be assignable to a retired category. */
export function getActiveCategoryOptions(
  categories: Category[],
): { label: string; value: string }[] {
  return categories
    .filter((category) => category.status === "active")
    .map((category) => ({ label: category.name, value: category.name }));
}
