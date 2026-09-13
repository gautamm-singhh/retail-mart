interface LoadingStateProps {
  rows?: number;
  label?: string;
}

/**
 * Skeleton pulse placeholder displayed while async data resolves.
 */
export function LoadingState({ rows = 4, label = "Loading" }: LoadingStateProps) {
  return (
    <div role="status" aria-label={label} className="space-y-3 p-4 animate-in fade-in-50 duration-200">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-11 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/70"
          style={{ opacity: Math.max(0.4, 1 - index * 0.12) }}
        />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}
