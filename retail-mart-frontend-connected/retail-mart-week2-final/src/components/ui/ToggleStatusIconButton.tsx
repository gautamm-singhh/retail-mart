import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/utils/cn";

export interface ToggleStatusIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Current active status. If true, button will prompt to "Deactivate". If false, button will prompt to "Activate". */
  isActive: boolean;
  /** Optional custom tooltip text. If omitted, defaults to "Deactivate" (if active) or "Activate" (if inactive). */
  tooltip?: string;
  /** Size variant: "sm" (default, 32x32px matching table action buttons) or "md" (36x36px) */
  size?: "sm" | "md";
}

/**
 * Modern, professional Activate/Deactivate Action Button with animated outline Power icon,
 * dynamic amber (deactivate) or green (activate) hover glow, and accessible dark tooltip.
 */
export const ToggleStatusIconButton = forwardRef<HTMLButtonElement, ToggleStatusIconButtonProps>(
  (
    {
      isActive,
      tooltip,
      size = "sm",
      className,
      type = "button",
      "aria-label": ariaLabel,
      disabled,
      ...props
    },
    ref,
  ) => {
    const resolvedTooltip = tooltip ?? (isActive ? "Deactivate" : "Activate");

    return (
      <div className="relative inline-flex items-center justify-center group">
        <button
          ref={ref}
          type={type}
          aria-label={ariaLabel || resolvedTooltip}
          disabled={disabled}
          className={cn(
            "relative inline-flex items-center justify-center rounded-lg select-none",
            size === "sm" ? "h-8 w-8" : "h-9 w-9",
            "border border-transparent bg-transparent",
            "text-slate-500 dark:text-slate-400",
            "transition-all duration-200 ease-in-out will-change-transform",
            "motion-safe:hover:scale-105 motion-safe:active:scale-95",
            isActive
              ? "hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50/90 dark:hover:bg-amber-950/40 hover:border-amber-200/90 dark:hover:border-amber-900/60 hover:shadow-[0_2px_10px_rgba(245,158,11,0.18)] dark:hover:shadow-[0_2px_10px_rgba(245,158,11,0.28)] focus-visible:ring-amber-500"
              : "hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/90 dark:hover:bg-emerald-950/40 hover:border-emerald-200/90 dark:hover:border-emerald-900/60 hover:shadow-[0_2px_10px_rgba(16,185,129,0.18)] dark:hover:shadow-[0_2px_10px_rgba(16,185,129,0.28)] focus-visible:ring-emerald-500",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-900",
            "disabled:cursor-not-allowed disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100",
            className,
          )}
          {...props}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn(
              "transition-colors duration-200",
              size === "sm" ? "h-4 w-4" : "h-4.5 w-4.5",
            )}
            aria-hidden="true"
          >
            <path d="M12 2v10" />
            <path d="M18.4 6.6a9 9 0 1 1-12.8 0" />
          </svg>
        </button>

        {resolvedTooltip && !disabled && (
          <div
            role="tooltip"
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-30",
              "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
              "transition-all duration-200 ease-out",
              "translate-y-1 group-hover:translate-y-0 group-focus-within:translate-y-0",
            )}
          >
            <div className="relative rounded bg-slate-900 px-2 py-0.5 text-[11px] font-medium tracking-wide text-white shadow-md dark:bg-slate-800 border border-slate-800/80 dark:border-slate-700/80 whitespace-nowrap">
              {resolvedTooltip}
              <div
                className="absolute left-1/2 top-full -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-900 dark:border-t-slate-800"
                aria-hidden="true"
              />
            </div>
          </div>
        )}
      </div>
    );
  },
);

ToggleStatusIconButton.displayName = "ToggleStatusIconButton";
