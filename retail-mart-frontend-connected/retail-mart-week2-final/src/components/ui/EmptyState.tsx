import { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center animate-in fade-in-50 duration-200">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800/70 dark:text-slate-500 shadow-xs">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-6.5 w-6.5">
          <path
            d="M3 7h18M5 7l1.5 13a1 1 0 001 .9h9a1 1 0 001-.9L19 7M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-800 dark:text-white">{title}</p>
        {description && (
          <p className="max-w-[26rem] text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
