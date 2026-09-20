import { Button } from "@/components/ui/Button";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

/**
 * Generic error state component displayed when an API or network operation fails.
 */
export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this data. Please try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center animate-in fade-in-50 duration-200"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300 shadow-xs ring-1 ring-rose-200/60 dark:ring-rose-900/50">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-6.5 w-6.5">
          <path
            d="M12 9v4m0 4h.01M10.29 3.86l-8.18 14.18A1 1 0 003 19.5h18a1 1 0 00.89-1.46L13.71 3.86a1 1 0 00-1.42 0z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-800 dark:text-white">{title}</p>
        <p className="max-w-md text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
      </div>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          className="mt-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 shadow-xs focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          Try again
        </Button>
      )}
    </div>
  );
}
