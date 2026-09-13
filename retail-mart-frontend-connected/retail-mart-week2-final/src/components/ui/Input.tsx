import { InputHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "@/utils/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hideLabel?: boolean;
  /** Validation error message. When set, renders below the field and marks it invalid for assistive tech. */
  error?: string;
}

/**
 * Text input that always renders a real <label>. When the surrounding
 * layout already communicates the input's purpose visually (e.g. a search
 * box next to a "Search" heading), pass hideLabel to keep it available to
 * screen readers without showing it twice.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hideLabel, id, className, error, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className={cn("text-sm font-medium text-ink-800 dark:text-slate-200", hideLabel && "sr-only")}
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
            "h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-ink-900 shadow-sm transition-colors",
            "placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500",
            "focus-visible:border-brand-500 dark:focus-visible:border-brand-400",
            error && "border-danger-600 dark:border-rose-500",
            className,
          )}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-xs text-danger-600">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
