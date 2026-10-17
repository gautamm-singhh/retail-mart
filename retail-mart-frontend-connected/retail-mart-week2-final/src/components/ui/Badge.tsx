import { HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const toneStyles: Record<BadgeTone, string> = {
  neutral: "bg-slate-100 text-slate-600 dark:bg-slate-800/80 dark:text-slate-300",
  brand:
    "bg-brand-50 text-brand-700 ring-1 ring-brand-200/60 dark:bg-brand-950/50 dark:text-brand-300 dark:ring-brand-800/50",
  success:
    "bg-success-50 text-success-600 ring-1 ring-success-200/60 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800/50",
  warning:
    "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800/50",
  danger:
    "bg-danger-50 text-danger-600 ring-1 ring-danger-200/60 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-800/50",
};

const dotStyles: Record<BadgeTone, string> = {
  neutral: "bg-slate-400 dark:bg-slate-500",
  brand: "bg-brand-500",
  success: "bg-success-600",
  warning: "bg-amber-500",
  danger: "bg-danger-600",
};

export function Badge({ tone = "neutral", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium tracking-wide",
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
