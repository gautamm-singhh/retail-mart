import { NavLink } from "react-router-dom";
import { cn } from "@/utils/cn";
import { ROUTES } from "@/constants/routes";

export function PaymentsTabs() {
  const tabClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200",
      isActive
        ? "bg-white text-emerald-700 shadow-sm dark:bg-slate-900 dark:text-emerald-400 ring-1 ring-slate-200/50 dark:ring-slate-700/50"
        : "text-slate-500 hover:text-slate-900 hover:bg-white/50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50",
    );

  return (
    <nav
      aria-label="Payments views"
      className="inline-flex gap-1.5 rounded-2xl border border-slate-200/70 bg-slate-100/90 p-1.5 shadow-xs dark:border-slate-800 dark:bg-slate-800/80"
    >
      <NavLink to={ROUTES.payments} end className={tabClass}>
        💳 Payments
      </NavLink>
      <NavLink to={ROUTES.refunds} className={tabClass}>
        🔄 Refunds
      </NavLink>
    </nav>
  );
}
