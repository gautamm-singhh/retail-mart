interface LoadingStateProps {
  rows?: number;
  label?: string;
}

export function LoadingState({ rows = 4, label = "Loading" }: LoadingStateProps) {
  return (
    <div role="status" aria-label={label} className="space-y-3 p-4 animate-in fade-in-50 duration-200">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="relative h-11 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800/60"
          style={{ opacity: Math.max(0.35, 1 - index * 0.15) }}
        >
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_linear_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-slate-700/40" />
        </div>
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}
