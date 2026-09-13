import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 hover:shadow-md active:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 focus-visible:ring-emerald-500",
  secondary:
    "bg-white text-slate-800 border border-slate-300/90 shadow-xs hover:bg-slate-50 hover:border-slate-400/90 hover:shadow-sm active:bg-slate-100 dark:bg-slate-800/90 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800 dark:hover:border-slate-600 focus-visible:ring-slate-400",
  ghost:
    "bg-transparent text-slate-700 hover:bg-slate-100/90 hover:text-slate-900 active:bg-slate-200/80 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white focus-visible:ring-slate-400",
  danger:
    "bg-rose-600 text-white shadow-xs hover:bg-rose-700 hover:shadow-md active:bg-rose-800 focus-visible:ring-rose-500",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs font-semibold rounded-lg",
  md: "h-10 px-4 text-sm font-semibold rounded-xl",
  lg: "h-12 px-6 text-base font-semibold rounded-xl",
};

/**
 * Standard button implementation with physical lift micro-interactions,
 * accessible keyboard focus states, and full design system tokens.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium select-none transition-all duration-200 ease-out",
          "hover:-translate-y-0.5 active:translate-y-0.5 active:scale-[0.99]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:active:scale-100 disabled:shadow-none",
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
