import { useState, useEffect, useRef } from "react";
import { NavLink, Link } from "react-router-dom";
import { NAV_ROUTES, ROUTES } from "@/constants/routes";
import { NavIcon } from "@/components/common/NavIcon";
import { Logo } from "@/components/common/Logo";
import { useOrders } from "@/features/orders/useOrders";
import { cn } from "@/utils/cn";

interface SidebarProps {
  onNavigate?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ onNavigate, isCollapsed = false }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { orders } = useOrders();

  const pendingOrdersCount = orders.filter(
    (o) => o.status === "Pending" || o.status === "Processing",
  ).length;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filteredRoutes = NAV_ROUTES.filter((route) =>
    route.label.toLowerCase().includes(searchQuery.toLowerCase().trim()),
  );

  return (
    <nav
      aria-label="Admin Navigation"
      className={cn(
        "relative flex h-full flex-col bg-[#0B132B] dark:bg-[#060B18] text-slate-300 border-r border-slate-800/80 transition-all duration-300 select-none shadow-sm",
        isCollapsed ? "w-20" : "w-64",
      )}
    >
      <div className={cn("flex h-16 shrink-0 items-center gap-3 border-b border-white/5 px-4", isCollapsed && "justify-center px-2")}>
        <Logo
          size="md"
          className="rounded-xl shadow-md shadow-emerald-950/40 transition-transform duration-200 hover:scale-105"
        />
        {!isCollapsed && (
          <div className="flex flex-col overflow-hidden animate-fade-in">
            <span className="text-base font-extrabold tracking-tight text-white leading-tight">
              Retail Mart
            </span>
            <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-400/90">
              Enterprise Suite
            </span>
          </div>
        )}
      </div>

      {!isCollapsed && (
        <div className="px-3 pt-3 pb-1">
          <div className="relative flex items-center">
            <span className="pointer-events-none absolute left-3 text-slate-500">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search menu..."
              className="w-full rounded-xl border border-white/10 bg-white/5 py-1.5 pl-8 pr-12 text-xs text-slate-200 placeholder:text-slate-500 focus:border-emerald-500 focus:bg-white/10 focus:outline-none transition-colors"
            />
            <kbd className="pointer-events-none absolute right-2.5 rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold text-slate-400 uppercase">
              Ctrl K
            </kbd>
          </div>
        </div>
      )}

      <ul className="flex flex-1 flex-col gap-1 px-3 py-2 overflow-y-auto no-scrollbar">
        {filteredRoutes.map((route) => {
          const isOrders = route.path.includes("orders");
          return (
            <li key={route.path}>
              <NavLink
                to={route.path}
                onClick={onNavigate}
                title={isCollapsed ? route.label : undefined}
                className={({ isActive }) =>
                  cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-transparent text-white font-bold border-l-4 border-emerald-400 shadow-xs"
                      : "text-slate-300 hover:bg-white/5 hover:text-white",
                    isCollapsed && "justify-center px-0 border-l-0",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <NavIcon
                      name={route.icon}
                      className={cn(
                        "h-5 w-5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5",
                        isActive ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-200",
                      )}
                    />
                    {!isCollapsed && (
                      <span className="flex-1 truncate tracking-tight">{route.label}</span>
                    )}
                    {!isCollapsed && isOrders && pendingOrdersCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500/25 px-1.5 text-[11px] font-bold text-emerald-300 border border-emerald-500/35">
                        {pendingOrdersCount}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>

      <div className="shrink-0 border-t border-white/5 p-3 space-y-1.5">
        <Link
          to={ROUTES.helpApi}
          title="API Documentation"
          className={cn(
            "group flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-2 text-xs font-medium text-slate-400 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-300",
            isCollapsed && "justify-center px-0",
          )}
        >
          <span className="text-sm">⚡</span>
          {!isCollapsed && (
            <>
              <span className="flex-1 truncate">API Documentation</span>
              <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300 border border-emerald-500/30">
                Docs
              </span>
            </>
          )}
        </Link>

        <Link
          to="/shop"
          target="_blank"
          rel="noopener noreferrer"
          title="Open Customer Storefront"
          className={cn(
            "group flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-2 text-xs font-medium text-slate-400 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-300",
            isCollapsed && "justify-center px-0",
          )}
        >
          <span className="text-sm">🛍️</span>
          {!isCollapsed && (
            <>
              <span className="flex-1 truncate">View Storefront</span>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-emerald-400">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </>
          )}
        </Link>
      </div>
    </nav>
  );
}
