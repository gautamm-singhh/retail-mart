/**
 * Joins conditional class names, filtering out falsy values.
 * Kept as a plain utility instead of pulling in `clsx`/`tailwind-merge`
 * since the project's class lists are small and rarely conflict.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
