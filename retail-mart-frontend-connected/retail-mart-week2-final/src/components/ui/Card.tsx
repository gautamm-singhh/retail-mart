import { HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        // Base
        "rounded-2xl border bg-white",
        // Border — subtle warm-slate in light, soft in dark
        "border-slate-200/70 dark:border-slate-800/80",
        // Background — near-white in light, deep slate in dark
        "dark:bg-slate-900",
        // Elevation
        "shadow-sm hover:shadow-md",
        // Smooth transitions
        "transition-all duration-200 ease-out",
        className,
      )}
      {...props}
    />
  );
}
