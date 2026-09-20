import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 hover:shadow-brand-sm active:bg-emerald-800 active:shadow-none dark:bg-emerald-600 dark:hover:bg-emerald-500 focus-visible:ring-emerald-500",
  secondary:
    "bg-white text-slate-800 border border-slate-200 shadow-xs hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm active:bg-slate-100 active:shadow-none dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-750 dark:hover:border-slate-600 focus-visible:ring-brand-500",
  ghost:
    "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200/80 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white focus-visible:ring-brand-500",
  outline:
    "bg-transparent text-brand-600 border border-brand-500 hover:bg-brand-50 hover:border-brand-600 active:bg-brand-100 dark:text-brand-400 dark:border-brand-600 dark:hover:bg-brand-950/40 focus-visible:ring-brand-500",
  danger:
    "bg-danger-600 text-white shadow-xs hover:bg-danger-700 hover:shadow-md active:bg-danger-800 active:shadow-none focus-visible:ring-danger-600",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs font-semibold rounded-lg gap-1.5",
  md: "h-10 px-4 text-sm font-semibold rounded-xl gap-2",
  lg: "h-12 px-6 text-[0.9375rem] font-semibold rounded-xl gap-2",
};

/**
 * Standard button implementation with physical lift micro-interactions,
 * accessible keyboard focus states, and full design system tokens.
 * Variants: primary | secondary | ghost | outline | danger
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center font-medium select-none",
          "transition-all duration-200 ease-out will-change-transform",
          "hover:-translate-y-px active:translate-y-px active:scale-[0.98]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none",
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
