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
      <div className="group relative">
        <label htmlFor={inputId} className="sr-only">
          {label}
        </label>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors duration-150 group-focus-within:text-brand-500 dark:group-focus-within:text-brand-400"
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
            "h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm",
            "text-slate-900 placeholder:text-slate-400",
            "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500",
            "shadow-xs",
            "transition-all duration-200 ease-out",
            "focus-visible:outline-none focus-visible:border-brand-500 focus-visible:ring-3 focus-visible:ring-brand-500/20",
            "dark:focus-visible:border-brand-400 dark:focus-visible:ring-brand-500/25",
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);

SearchInput.displayName = "SearchInput";
