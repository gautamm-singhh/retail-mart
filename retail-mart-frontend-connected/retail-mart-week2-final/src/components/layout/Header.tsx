import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ProfileMenu } from "@/components/layout/ProfileMenu";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import { ROUTES } from "@/constants/routes";

interface HeaderProps {
  onMenuClick: () => void;
  onToggleCollapse?: () => void;
  isCollapsed?: boolean;
}

const NOTIFICATIONS = [
  { id: "notif-1", title: "New order received", meta: "ORD-09968 · ₹3,997", time: "2 min ago", unread: true },
  { id: "notif-2", title: "Payment completed", meta: "PAY-19206 · Razorpay Verified", time: "12 min ago", unread: true },
  { id: "notif-3", title: "Low stock alert", meta: "Yoga Mat 6mm (6 units left)", time: "2 hours ago", unread: true },
];

export function Header({ onMenuClick, onToggleCollapse, isCollapsed }: HeaderProps) {
  const navigate = useNavigate();
  const [searchVal, setSearchVal] = useState("");
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(notifRef, () => setShowNotifs(false), showNotifs);

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
      {/* Left: Hamburger & Navigation Toggle */}
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

      {/* Center: Omni-Search Bar */}
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

      {/* Right Controls: Theme Toggle, Notifications, User Profile */}
      <div className="flex items-center gap-3">
        {/* Segmented Light / Dark Toggle */}
        <ThemeToggle variant="segmented" />

        {/* Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setShowNotifs(!showNotifs)}
            aria-label="View notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 shadow-xs transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold text-white shadow-xs animate-pulse">
              3
            </span>
          </button>

          {/* Notifications Dropdown Modal */}
          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50 animate-dropdown">
              <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2 px-1 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Notifications</span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  3 unread
                </span>
              </div>
              <div className="space-y-1">
                {NOTIFICATIONS.map((n) => (
                  <div key={n.id} className="rounded-xl p-2 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">{n.title}</span>
                      <span className="text-[10px] text-slate-400">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{n.meta}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Info & Menu */}
        <div className="flex items-center gap-2.5 pl-1 border-l border-slate-200/80 dark:border-slate-800">
          <ProfileMenu showName={true} />
        </div>
      </div>
    </header>
  );
}
