interface StorefrontHeroProps {
  onShopNowClick?: () => void;
  onExploreDealsClick?: () => void;
}

export function StorefrontHero({ onShopNowClick, onExploreDealsClick }: StorefrontHeroProps) {
  function handleShopNow() {
    if (onShopNowClick) {
      onShopNowClick();
    } else {
      const catalogEl = document.getElementById("catalog-section");
      if (catalogEl) {
        catalogEl.scrollIntoView({ behavior: "smooth" });
      }
    }
  }

  return (
    <div className="relative mb-8 overflow-hidden rounded-3xl border border-emerald-200/60 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-slate-50 p-6 shadow-xs sm:p-8 md:p-10 lg:p-12 dark:border-slate-800/90 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900/95 dark:to-emerald-950/40 dark:shadow-md transition-colors duration-200">
      {/* Ambient background decoration shapes */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl dark:bg-emerald-500/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-teal-400/15 blur-3xl dark:bg-teal-500/10"
      />

      <div className="relative z-10 grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-12">
        {/* Left Content Column */}
        <div className="lg:col-span-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-white/85 px-3.5 py-1 text-xs font-semibold text-emerald-800 shadow-xs backdrop-blur-sm dark:border-emerald-900/60 dark:bg-emerald-950/70 dark:text-emerald-300">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>NEW SEASON COLLECTION</span>
          </div>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl dark:text-white leading-[1.15]">
            Style Meets <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 bg-clip-text text-transparent dark:from-emerald-400 dark:to-teal-300">
              Everyday Comfort
            </span>
          </h1>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
            Discover trending apparel, active footwear, premium electronics and everyday essentials — delivered fast with verified live carrier tracking.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3.5 sm:mt-8">
            <button
              type="button"
              onClick={handleShopNow}
              className="group inline-flex items-center gap-2.5 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md active:translate-y-0.5 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
            >
              <span>Shop Now</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>

            <button
              type="button"
              onClick={onExploreDealsClick || handleShopNow}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300/80 bg-white/95 px-5 py-3.5 text-sm font-semibold text-slate-700 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:border-slate-400/80 hover:shadow-sm active:translate-y-0.5 active:scale-[0.99] dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <span>Explore Deals</span>
            </button>
          </div>

          {/* Trust Indicators */}
          <div className="mt-8 grid grid-cols-1 gap-2.5 pt-6 border-t border-slate-200/70 sm:grid-cols-3 sm:gap-4 dark:border-slate-800/80">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 font-bold text-[11px] shadow-xs">
                ✓
              </span>
              <span>Free Shipping on ₹999+</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 font-bold text-[11px] shadow-xs">
                ✓
              </span>
              <span>7-Day Easy Returns</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 font-bold text-[11px] shadow-xs">
                ✓
              </span>
              <span>100% Secure Checkout</span>
            </div>
          </div>
        </div>

        {/* Right Visual Showcase Column */}
        <div className="relative lg:col-span-5 flex justify-center">
          <div className="relative w-full max-w-sm sm:max-w-md">
            {/* Primary Showcase Image */}
            <div className="group relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/40 bg-gradient-to-tr from-slate-100 to-white shadow-xl dark:border-slate-700/60 dark:bg-slate-800 transition-all duration-300">
              <img
                src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80"
                alt="Retail Mart Premium Catalog"
                className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <span className="rounded-md bg-emerald-600/90 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider backdrop-blur-xs">
                  Featured Choice
                </span>
                <p className="mt-1 text-sm font-bold drop-shadow-sm">
                  Wireless Pro Audio & Ergonomic Living
                </p>
              </div>
            </div>

            {/* Floating Offer Badge */}
            <div className="absolute -bottom-4 -left-4 sm:-bottom-5 sm:-left-5 rounded-2xl border border-amber-200/80 bg-white p-3 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-amber-900/60 dark:bg-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/70 dark:text-amber-400 font-black text-sm">
                  %
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Festive Sale
                  </p>
                  <p className="text-xs font-extrabold text-slate-900 dark:text-white">
                    Up to 40% OFF
                  </p>
                </div>
              </div>
            </div>

            {/* Floating Rating Pill */}
            <div className="absolute -top-3 -right-3 rounded-full border border-slate-200/80 bg-white/95 px-3 py-1.5 shadow-md backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900/95">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <span className="text-amber-400">★</span>
                <span>4.9</span>
                <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                  (2.4k+ reviews)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
