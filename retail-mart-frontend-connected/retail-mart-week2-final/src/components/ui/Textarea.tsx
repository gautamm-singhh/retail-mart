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
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={textareaId}
          className={cn("text-sm font-medium text-slate-700 dark:text-slate-200", hideLabel && "sr-only")}
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
            "w-full rounded-xl border px-3.5 py-2.5 text-sm",
            "bg-white text-slate-900 placeholder:text-slate-400",
            "dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500",
            "border-slate-200 dark:border-slate-700",
            "shadow-xs resize-y",
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

Textarea.displayName = "Textarea";
