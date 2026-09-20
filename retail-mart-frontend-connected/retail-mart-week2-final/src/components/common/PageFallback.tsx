export function PageFallback() {
  return (
    <div
      role="status"
      aria-label="Loading page"
      className="flex min-h-[40vh] w-full items-center justify-center py-12 animate-in fade-in duration-150"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500/20 border-t-emerald-600 dark:border-emerald-400/20 dark:border-t-emerald-400" />
        <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Loading page...</span>
      </div>
    </div>
  );
}
