import { SelectHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "@/utils/cn";

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hideLabel?: boolean;
  options: SelectOption[];
  /** Validation error message. When set, renders below the field and marks it invalid for assistive tech. */
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, hideLabel, options, id, className, error, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const errorId = `${selectId}-error`;

    return (
      <div className="flex flex-col gap-1">
        <label
          htmlFor={selectId}
          className={cn("text-sm font-medium text-ink-800 dark:text-slate-200", hideLabel && "sr-only")}
        >
          {label}
        </label>
        <select
          ref={ref}
          id={selectId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-ink-900 shadow-sm transition-colors",
            "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
            "focus-visible:border-brand-500 dark:focus-visible:border-brand-400",
            error && "border-danger-600 dark:border-rose-500",
            className,
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p id={errorId} className="text-xs text-danger-600">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = "Select";
