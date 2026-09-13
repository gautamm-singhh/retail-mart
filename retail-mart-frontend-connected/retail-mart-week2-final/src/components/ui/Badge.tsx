import { HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const toneStyles: Record<BadgeTone, string> = {
  neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  brand: "bg-brand-50 text-brand-700 dark:bg-teal-950/60 dark:text-teal-300 dark:border dark:border-teal-800/60",
  success: "bg-success-50 text-success-600 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border dark:border-emerald-800/60",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 dark:border dark:border-amber-800/60",
  danger: "bg-danger-50 text-danger-600 dark:bg-rose-950/60 dark:text-rose-300 dark:border dark:border-rose-800/60",
};

const dotStyles: Record<BadgeTone, string> = {
  neutral: "bg-slate-400 dark:bg-slate-500",
  brand: "bg-teal-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
};

/** Generic colored pill. For domain statuses (order/payment/shipment), use StatusBadge instead. */
export function Badge({ tone = "neutral", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide shadow-sm",
        toneStyles[tone],
        className,
      )}
      {...props}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotStyles[tone])} aria-hidden="true" />
      {children}
    </span>
  );
}
