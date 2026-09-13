import { useEffect, useId, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import { useDisclosure } from "@/hooks/useDisclosure";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import { Badge } from "@/components/ui/Badge";
import { ROUTES } from "@/constants/routes";

interface ProfileMenuProps {
  showName?: boolean;
}

/**
 * Authenticated user avatar button and context menu with profile navigation and sign out.
 */
export function ProfileMenu({ showName = false }: ProfileMenuProps) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const { isOpen, close, toggle } = useDisclosure();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useOnClickOutside(containerRef, close, isOpen);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close]);

  if (!currentUser) return null;

  const initial = currentUser.name.charAt(0).toUpperCase();

  function goToProfile() {
    if (!currentUser) return;
    close();
    navigate(currentUser.role === "Customer" ? ROUTES.account : ROUTES.profile);
  }

  function goToMyOrders() {
    close();
    navigate(ROUTES.myOrders);
  }

  function handleSignOut() {
    if (!currentUser) return;
    close();
    const wasCustomer = currentUser.role === "Customer";
    logout();
    navigate(wasCustomer ? ROUTES.shop : ROUTES.login, { replace: true });
  }

  return (
    <div ref={containerRef} className="relative">
      {showName ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={toggle}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-controls={menuId}
          aria-label={`Account menu for ${currentUser.name}`}
          className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white py-1 pl-1.5 pr-2.5 text-xs font-semibold text-slate-700 shadow-xs transition-all hover:bg-slate-50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-xs font-black text-white shadow-xs">
            {initial}
          </span>
          <div className="hidden flex-col text-left sm:flex">
            <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
              {currentUser.name}
            </span>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 leading-tight">
              {currentUser.role}
            </span>
          </div>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-3.5 w-3.5 text-slate-400 ml-0.5"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          onClick={toggle}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-controls={menuId}
          aria-label={`Account menu for ${currentUser.name}`}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700 hover:bg-emerald-200 transition-colors dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900 shadow-xs"
        >
          {initial}
        </button>
      )}

      {isOpen && (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="absolute right-0 z-50 mt-2 w-60 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-slate-900 transition-colors"
        >
          <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
            <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
              {currentUser.name}
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{currentUser.email}</p>
            <Badge tone="brand" className="mt-1.5">
              {currentUser.role}
            </Badge>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={goToProfile}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-slate-400">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>{currentUser.role === "Customer" ? "My Account" : "My Profile"}</span>
          </button>
          {currentUser.role === "Customer" && (
            <button
              type="button"
              role="menuitem"
              onClick={goToMyOrders}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-slate-400">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              <span>My Orders</span>
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}
