import { createContext, ReactNode, useCallback, useState } from "react";

export type ToastVariant = "success" | "error";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

export interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const AUTO_DISMISS_MS = 3500;

/**
 * Lightweight, accessible toast notification system with smooth entrance
 * and clear visual feedback.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, variant: ToastVariant = "success") => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, message, variant }]);
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, AUTO_DISMISS_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2.5 px-4 sm:items-end sm:px-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-center gap-2.5 w-full max-w-sm rounded-xl px-4 py-3 text-xs sm:text-sm font-semibold shadow-xl backdrop-blur-xs transition-all animate-in fade-in-0 slide-in-from-bottom-2 duration-200 ${
              toast.variant === "success"
                ? "bg-slate-900/95 text-white border border-slate-700/60 dark:bg-slate-800/95 dark:border-slate-700"
                : "bg-rose-600/95 text-white border border-rose-500/60 dark:bg-rose-900/90 dark:border-rose-800"
            }`}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs">
              {toast.variant === "success" ? "✓" : "!"}
            </span>
            <span className="flex-1 leading-snug">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
