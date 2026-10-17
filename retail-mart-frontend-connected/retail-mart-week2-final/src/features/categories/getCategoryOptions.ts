import type { Category } from "@/types";

export function getActiveCategoryOptions(
  categories: Category[],
): { label: string; value: string }[] {
  return categories
    .filter((category) => category.status === "active")
    .map((category) => ({ label: category.name, value: category.name }));
}
