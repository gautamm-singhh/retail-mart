import { HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-200 dark:border-slate-800 dark:bg-slate-900",
        className,
      )}
      {...props}
    />
  );
}
