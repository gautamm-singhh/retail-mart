import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/utils/cn";

export interface EditIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Optional custom tooltip text, defaults to "Edit" */
  tooltip?: string;
  /** Size variant: "sm" (default, 32x32px matching table action buttons) or "md" (36x36px) */
  size?: "sm" | "md";
}

/**
 * Modern, professional Edit Action Button with animated outline Pencil icon,
 * soft blue glow/hover effect, and accessible dark tooltip.
 */
export const EditIconButton = forwardRef<HTMLButtonElement, EditIconButtonProps>(
  (
    {
      tooltip = "Edit",
      size = "sm",
      className,
      type = "button",
      "aria-label": ariaLabel,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <div className="relative inline-flex items-center justify-center group">
        <button
          ref={ref}
          type={type}
          aria-label={ariaLabel || tooltip}
          disabled={disabled}
          className={cn(
            // Sizing & Alignment
            "relative inline-flex items-center justify-center rounded-lg select-none",
            size === "sm" ? "h-8 w-8" : "h-9 w-9",
            // Base border & background
            "border border-transparent bg-transparent",
            // Default color: subtle dark-gray outline
            "text-slate-500 dark:text-slate-400",
            // Transitions & motion (respects reduced motion)
            "transition-all duration-200 ease-in-out will-change-transform",
            "motion-safe:hover:scale-105 motion-safe:active:scale-95",
            // Hover states: soft light-blue bg, blue icon, subtle blue border, soft blue glow
            "hover:text-blue-600 dark:hover:text-blue-400",
            "hover:bg-blue-50/90 dark:hover:bg-blue-950/40",
            "hover:border-blue-200/90 dark:hover:border-blue-900/60",
            "hover:shadow-[0_2px_10px_rgba(59,130,246,0.18)] dark:hover:shadow-[0_2px_10px_rgba(59,130,246,0.28)]",
            // Accessible Keyboard Focus
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-900",
            // Disabled state
            "disabled:cursor-not-allowed disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100",
            className,
          )}
          {...props}
        >
          {/* Modern Outline Pencil Icon (Lucide Pencil) */}
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
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
          </svg>
        </button>

        {/* Small dark tooltip displayed above the icon */}
        {tooltip && !disabled && (
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
              {tooltip}
              {/* Tooltip triangle arrow */}
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

EditIconButton.displayName = "EditIconButton";
