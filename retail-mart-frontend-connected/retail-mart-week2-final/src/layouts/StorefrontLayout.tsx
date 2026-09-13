import { FormEvent, useState } from "react";
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import { useCart } from "@/features/cart/useCart";
import { useWishlist } from "@/features/wishlist/useWishlist";
import { useCustomerStats } from "@/features/dashboard/useCustomerStats";
import { AppreciationMarquee } from "@/components/common/AppreciationMarquee";
import { ProfileMenu } from "@/components/layout/ProfileMenu";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { ROUTES } from "@/constants/routes";

export default function StorefrontLayout() {
  const { isAuthenticated, currentUser } = useAuth();
  const { itemCount } = useCart();
  const { itemCount: wishlistCount } = useWishlist();
  const { stats } = useCustomerStats();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get("q") ?? "");

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = searchInput.trim();
    navigate(trimmed ? `${ROUTES.shop}?q=${encodeURIComponent(trimmed)}` : ROUTES.shop);
  }

  return (
    <div className="min-h-screen bg-[#F2F5F4] dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Elevated Commercial Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-xs dark:border-slate-800/90 dark:bg-slate-900/95 dark:shadow-sm transition-all duration-200">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* LEFT: Retail Mart Brand Logo */}
          <div className="flex shrink-0 items-center">
            <Link
              to={ROUTES.shop}
              className="group flex items-center gap-2.5 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-black text-sm shadow-xs transition-transform duration-200 group-hover:scale-105 group-active:scale-95">
                RM
              </span>
              <div className="flex flex-col">
                <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight transition-colors group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                  Retail Mart
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase text-emerald-600 dark:text-emerald-400">
                  Storefront
                </span>
              </div>
            </Link>
          </div>

          {/* CENTER: Visually Centered Search Input */}
          <div className="hidden md:flex flex-1 max-w-xl mx-auto items-center justify-center px-4">
            <form onSubmit={handleSearchSubmit} className="w-full">
              <div className="group relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 group-focus-within:text-emerald-600 dark:text-slate-500 dark:group-focus-within:text-emerald-400 transition-colors duration-200">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-4 w-4"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search products, brands and essentials..."
                  aria-label="Search products"
                  className="w-full rounded-full border border-slate-200/90 bg-slate-100/60 py-2 pl-10 pr-9 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 shadow-inner transition-all duration-200 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-500 dark:focus:bg-slate-900 dark:focus:ring-emerald-500/20"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      navigate(ROUTES.shop);
                    }}
                    title="Clear search query"
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-3.5 w-3.5"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* FAR RIGHT: Theme Toggle Pill, Account, Cart */}
          <div className="flex shrink-0 items-center justify-end gap-2.5 sm:gap-3">
            {/* Single Segmented Light / Dark Toggle Pill */}
            <ThemeToggle variant="segmented" />

            {/* Account / User Control */}
            {isAuthenticated ? (
              <ProfileMenu showName={true} />
            ) : (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => navigate(ROUTES.shopLogin, { state: { from: location } })}
                className="flex items-center gap-1.5 rounded-full px-3.5 shadow-xs"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400"
                >
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>Sign in</span>
              </Button>
            )}

            {/* Wishlist Button with Real-time Count Badge */}
            <Link
              to={ROUTES.wishlist}
              aria-label={`Saved wishlist with ${wishlistCount} item${wishlistCount === 1 ? "" : "s"}`}
              className="group relative flex h-9 items-center gap-1.5 sm:gap-2 rounded-full border border-slate-200/90 bg-white px-3 text-xs font-semibold text-slate-700 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-rose-300 hover:text-rose-600 hover:shadow-sm active:translate-y-0.5 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-rose-500/50 dark:hover:text-rose-400"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill={wishlistCount > 0 ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`h-4 w-4 transition-transform duration-200 group-hover:scale-110 ${
                  wishlistCount > 0 ? "text-rose-500 fill-rose-500" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
              <span className="hidden sm:inline">Wishlist</span>
              {wishlistCount > 0 && (
                <span
                  key={wishlistCount}
                  className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-extrabold text-white shadow-xs animate-badge-pop"
                >
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Prominent Cart Button with Count Badge */}
            <Link
              to={ROUTES.cart}
              aria-label={`Shopping cart with ${itemCount} item${itemCount === 1 ? "" : "s"}`}
              className="group relative flex h-9 items-center gap-2 rounded-full border border-slate-200/90 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500 hover:text-emerald-700 hover:shadow-sm active:translate-y-0.5 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-500/50 dark:hover:text-emerald-400"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-3"
              >
                <circle cx="9" cy="20" r="1.4" />
                <circle cx="18" cy="20" r="1.4" />
                <path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8a2 2 0 0 0 2-1.6L21 8H6" />
              </svg>
              <span className="hidden sm:inline">Cart</span>
              {itemCount > 0 && (
                <span
                  key={itemCount}
                  className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-extrabold text-white shadow-xs animate-badge-pop"
                >
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Mobile Search Input */}
        <div className="border-t border-slate-200/70 px-4 py-2.5 md:hidden dark:border-slate-800/80">
          <form onSubmit={handleSearchSubmit}>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search products..."
                aria-label="Search products"
                className="w-full rounded-full border border-slate-200 bg-slate-50/90 py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </form>
        </div>
      </header>

      {/* Customer appreciation marquee */}
      {isAuthenticated && currentUser && (
        <AppreciationMarquee stats={stats} customerName={currentUser.name} />
      )}

      {/* Centered Max-Width Storefront Body with Smooth Page Entrance */}
      <main key={location.pathname} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-page-entrance">
        <Outlet />
      </main>
    </div>
  );
}
