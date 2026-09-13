import { TextareaHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "@/utils/cn";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hideLabel?: boolean;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hideLabel, id, className, error, rows = 3, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const errorId = `${textareaId}-error`;

    return (
      <div className="flex flex-col gap-1">
        <label
          htmlFor={textareaId}
          className={cn("text-sm font-medium text-ink-800 dark:text-slate-200", hideLabel && "sr-only")}
        >
          {label}
        </label>
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink-900 shadow-sm transition-colors",
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

Textarea.displayName = "Textarea";
