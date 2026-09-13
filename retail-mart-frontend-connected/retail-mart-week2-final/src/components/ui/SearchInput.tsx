import { InputHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "@/utils/cn";

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

/**
 * A dedicated component (rather than <Input type="search"> with a class)
 * because every management page needs this exact search-with-icon pattern,
 * so it is worth naming and reusing.
 */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ label, id, className, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className="relative">
        <label htmlFor={inputId} className="sr-only">
          {label}
        </label>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        >
          <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M17 17l-3.5-3.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
        <input
          ref={ref}
          id={inputId}
          type="search"
          className={cn(
            "h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-ink-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100",
            "placeholder:text-slate-400 dark:placeholder:text-slate-500",
            "focus-visible:border-brand-500 dark:focus-visible:border-emerald-500",
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);

SearchInput.displayName = "SearchInput";
