import { useTheme } from "@/context/ThemeContext";

interface ThemeToggleProps {
  className?: string;
  variant?: "icon" | "segmented";
}

export function ThemeToggle({ className = "", variant = "segmented" }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();

  const isDark = resolvedTheme === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
        title={`Current: ${isDark ? "Dark" : "Light"} mode. Click to toggle.`}
        className={`relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-700 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-900 active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 ${className}`}
      >
        {isDark ? (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 text-amber-400 transition-transform duration-200"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 text-slate-700 transition-transform duration-200"
          >
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
        )}
      </button>
    );
  }

  // Segmented clean pill control: [ ☀ Light | ☾ Dark ]
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      onClick={toggleTheme}
      aria-label={`Current theme is ${isDark ? "dark" : "light"}. Click to switch to ${isDark ? "light" : "dark"} mode.`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      className={`group relative inline-flex h-9 items-center rounded-full border border-slate-200/90 bg-slate-100/90 p-1 text-xs font-semibold shadow-inner transition-all duration-200 hover:border-slate-300 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-slate-700 ${className}`}
    >
      {/* Light Option Item */}
      <span
        className={`relative z-10 flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-all duration-200 ${
          !isDark
            ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white"
            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        }`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-3.5 w-3.5 transition-transform duration-200 ${
            !isDark ? "text-amber-500 scale-110" : "text-slate-400"
          }`}
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
        <span className="hidden sm:inline">Light</span>
      </span>

      {/* Dark Option Item */}
      <span
        className={`relative z-10 flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-all duration-200 ${
          isDark
            ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white"
            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        }`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-3.5 w-3.5 transition-transform duration-200 ${
            isDark ? "text-indigo-400 scale-110" : "text-slate-400"
          }`}
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
        <span className="hidden sm:inline">Dark</span>
      </span>
    </button>
  );
}
