import { NavLink } from "react-router-dom";
import { cn } from "@/utils/cn";
import { ROUTES } from "@/constants/routes";

/**
 * Payments and Refunds are separate routes rather than in-page state so the
 * split is real (shareable URL, browser back/forward, own empty state) and
 * not just a client-side toggle. NavLink renders real <a> elements, which
 * gives keyboard access and `aria-current="page"` on the active tab for
 * free - no separate ARIA tablist implementation needed for page-level
 * navigation like this.
 */
export function PaymentsTabs() {
  const tabClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
      isActive
        ? "bg-white text-ink-900 shadow-sm dark:bg-slate-900 dark:text-slate-100"
        : "text-slate-500 hover:text-ink-800 dark:text-slate-400 dark:hover:text-slate-200",
    );

  return (
    <nav
      aria-label="Payments views"
      className="inline-flex gap-1 rounded-lg bg-surface-muted p-1 dark:bg-slate-800"
    >
      <NavLink to={ROUTES.payments} end className={tabClass}>
        Payments
      </NavLink>
      <NavLink to={ROUTES.refunds} className={tabClass}>
        Refunds
      </NavLink>
    </nav>
  );
}
