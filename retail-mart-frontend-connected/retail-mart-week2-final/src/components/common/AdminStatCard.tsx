import { ReactNode } from "react";
import { cn } from "@/utils/cn";

interface AdminStatCardProps {
  label: string;
  value: string | number;
  subtext?: ReactNode;
  icon: ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  accentColor?: "emerald" | "blue" | "amber" | "purple" | "rose" | "teal";
}

const colorStyles = {
  emerald: {
    iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/40",
    glow: "group-hover:border-emerald-500/30",
  },
  blue: {
    iconBg: "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-100 dark:border-blue-800/40",
    glow: "group-hover:border-blue-500/30",
  },
  amber: {
    iconBg: "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-100 dark:border-amber-800/40",
    glow: "group-hover:border-amber-500/30",
  },
  purple: {
    iconBg: "bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-100 dark:border-purple-800/40",
    glow: "group-hover:border-purple-500/30",
  },
  rose: {
    iconBg: "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-100 dark:border-rose-800/40",
    glow: "group-hover:border-rose-500/30",
  },
  teal: {
    iconBg: "bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400 border border-teal-100 dark:border-teal-800/40",
    glow: "group-hover:border-teal-500/30",
  },
};

export function AdminStatCard({
  label,
  value,
  subtext,
  icon,
  trend,
  accentColor = "emerald",
}: AdminStatCardProps) {
  const styles = colorStyles[accentColor];

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900",
        styles.glow,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl shadow-xs", styles.iconBg)}>
          {icon}
        </div>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {value}
        </span>
        {trend && (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
              trend.isPositive
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
            )}
          >
            {trend.value}
          </span>
        )}
      </div>
      {subtext && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          {subtext}
        </div>
      )}
    </div>
  );
}
