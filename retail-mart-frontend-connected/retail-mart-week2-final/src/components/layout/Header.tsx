import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ProfileMenu } from "@/components/layout/ProfileMenu";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { ROUTES } from "@/constants/routes";

interface HeaderProps {
  onMenuClick: () => void;
  onToggleCollapse?: () => void;
  isCollapsed?: boolean;
}

export function Header({ onMenuClick, onToggleCollapse, isCollapsed }: HeaderProps) {
  const navigate = useNavigate();
  const [searchVal, setSearchVal] = useState("");

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = searchVal.trim().toLowerCase();
    if (!q) return;
    if (q.startsWith("ord") || q.includes("order")) {
      navigate(ROUTES.orders);
    } else if (q.includes("user") || q.includes("sorav") || q.includes("gautam") || q.includes("ananya")) {
      navigate(ROUTES.users);
    } else if (q.includes("pay") || q.includes("refund")) {
      navigate(ROUTES.payments);
    } else if (q.includes("ship") || q.includes("track") || q.includes("courier")) {
      navigate(ROUTES.shipping);
    } else {
      navigate(`${ROUTES.products}?q=${encodeURIComponent(q)}`);
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 shadow-xs backdrop-blur-md transition-colors dark:border-slate-800/90 dark:bg-slate-900/95 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (window.innerWidth < 1024) {
              onMenuClick();
            } else if (onToggleCollapse) {
              onToggleCollapse();
            }
          }}
          aria-label="Toggle navigation menu"
          title={isCollapsed ? "Expand sidebar" : "Toggle navigation"}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-700 shadow-xs transition-all hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      <div className="flex flex-1 max-w-lg mx-4 items-center justify-center">
        <form onSubmit={handleSearchSubmit} className="w-full">
          <div className="relative flex items-center">
            <span className="pointer-events-none absolute left-3.5 text-slate-400 dark:text-slate-500">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="search"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Search users, products, orders, payments..."
              className="w-full rounded-xl border border-slate-200/90 bg-slate-50/80 py-1.5 pl-9 pr-4 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 transition-colors"
            />
          </div>
        </form>
      </div>

      <div className="flex items-center gap-3">
        <Link
          to={ROUTES.helpApi}
          title="API Documentation & Reference"
          className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white py-1.5 px-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
        >
          <span className="text-xs">⚡</span>
          <span>API Docs</span>
        </Link>

        <ThemeToggle variant="icon" />

        <div className="flex items-center gap-2.5 pl-1 border-l border-slate-200/80 dark:border-slate-800">
          <ProfileMenu showName={true} />
        </div>
      </div>
    </header>
  );
}
