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
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={selectId}
          className={cn("text-sm font-medium text-slate-700 dark:text-slate-200", hideLabel && "sr-only")}
        >
          {label}
        </label>
        <select
          ref={ref}
          id={selectId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "h-11 w-full rounded-xl border px-3.5 text-sm",
            "bg-white text-slate-900",
            "dark:bg-slate-900 dark:text-slate-100",
            "border-slate-200 dark:border-slate-700",
            "shadow-xs",
            "transition-all duration-200 ease-out",
            "focus-visible:outline-none focus-visible:border-brand-500 focus-visible:ring-3 focus-visible:ring-brand-500/20",
            "dark:focus-visible:border-brand-400 dark:focus-visible:ring-brand-500/25",
            error && "border-danger-600 focus-visible:border-danger-600 focus-visible:ring-danger-600/20 dark:border-danger-500",
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
          <p id={errorId} className="text-xs font-medium text-danger-600 dark:text-danger-400">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = "Select";
