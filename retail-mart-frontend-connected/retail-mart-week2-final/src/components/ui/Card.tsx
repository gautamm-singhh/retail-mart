import { HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-white",
        "border-slate-200/70 dark:border-slate-800/80",
        "dark:bg-slate-900",
        "shadow-sm hover:shadow-md",
        "transition-all duration-200 ease-out",
        className,
      )}
      {...props}
    />
  );
}
