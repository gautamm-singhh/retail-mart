import { InputHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "@/utils/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hideLabel?: boolean;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hideLabel, id, className, error, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className={cn("text-sm font-medium text-slate-700 dark:text-slate-200", hideLabel && "sr-only")}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "h-11 w-full rounded-xl border px-3.5 text-sm",
            "bg-white text-slate-900 placeholder:text-slate-400",
            "dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500",
            "border-slate-200 dark:border-slate-700",
            "shadow-xs",
            "transition-all duration-200 ease-out",
            "focus-visible:outline-none focus-visible:border-brand-500 focus-visible:ring-3 focus-visible:ring-brand-500/20",
            "dark:focus-visible:border-brand-400 dark:focus-visible:ring-brand-500/25",
            error && "border-danger-600 focus-visible:border-danger-600 focus-visible:ring-danger-600/20 dark:border-danger-500",
            className,
          )}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-xs font-medium text-danger-600 dark:text-danger-400">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
