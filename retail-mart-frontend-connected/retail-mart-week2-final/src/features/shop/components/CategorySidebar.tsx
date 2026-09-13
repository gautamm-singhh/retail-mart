import type { Category } from "@/types";

interface CategorySidebarProps {
  categories: Category[];
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  totalProductsCount?: number;
}

function getCategoryIcon(categoryName: string) {
  const normalized = categoryName.toLowerCase();
  if (normalized.includes("apparel") || normalized.includes("cloth") || normalized.includes("fashion")) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
      </svg>
    );
  }
  if (normalized.includes("electronic") || normalized.includes("audio") || normalized.includes("gadget")) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
      </svg>
    );
  }
  if (normalized.includes("kitchen") || normalized.includes("home") || normalized.includes("cook")) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    );
  }
  if (normalized.includes("footwear") || normalized.includes("shoe")) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M4 17h16" />
        <path d="M4 14h16" />
        <path d="M19 14v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-4" />
        <path d="M5 14V9l4-3 5 5h5a2 2 0 0 1 2 2v1" />
      </svg>
    );
  }
  if (normalized.includes("fitness") || normalized.includes("sport") || normalized.includes("yoga")) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="m6.5 6.5 11 11" />
        <path d="m21 21-1-1" />
        <path d="m3 3 1 1" />
        <path d="m18 22 4-4" />
        <path d="m2 6 4-4" />
        <path d="m3 10 7-7" />
        <path d="m14 21 7-7" />
      </svg>
    );
  }
  if (normalized.includes("accessor") || normalized.includes("wallet") || normalized.includes("bag")) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
        <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  );
}

export function CategorySidebar({
  categories,
  activeCategory,
  onSelectCategory,
  totalProductsCount,
}: CategorySidebarProps) {
  const isAll = activeCategory === "all";

  return (
    <div className="w-full">
      {/* Mobile/Tablet Horizontal Scrollable Ribbon */}
      <div className="lg:hidden mb-6">
        <div className="flex items-center justify-between pb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Categories
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500">Scroll horizontally</span>
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1 sm:-mx-6 sm:px-6">
          <button
            type="button"
            onClick={() => onSelectCategory("all")}
            className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0.5 ${
              isAll
                ? "border-emerald-600 bg-emerald-600 text-white shadow-xs dark:border-emerald-500 dark:bg-emerald-600"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700"
            }`}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
              <rect width="7" height="7" x="3" y="3" rx="1" />
              <rect width="7" height="7" x="14" y="3" rx="1" />
              <rect width="7" height="7" x="14" y="14" rx="1" />
              <rect width="7" height="7" x="3" y="14" rx="1" />
            </svg>
            All Products
            {typeof totalProductsCount === "number" && (
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${isAll ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
                {totalProductsCount}
              </span>
            )}
          </button>

          {categories.map((c) => {
            const active = activeCategory === c.name;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectCategory(c.name)}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0.5 ${
                  active
                    ? "border-emerald-600 bg-emerald-600 text-white shadow-xs dark:border-emerald-500 dark:bg-emerald-600"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700"
                }`}
              >
                {getCategoryIcon(c.name)}
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Vertical Category Card */}
      <aside className="hidden lg:block">
        <div className="sticky top-20 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800/90 dark:bg-slate-900 transition-colors duration-200">
          <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                  <path d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </span>
              <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                Categories
              </h2>
            </div>
            {typeof totalProductsCount === "number" && (
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {totalProductsCount} items
              </span>
            )}
          </div>

          <nav aria-label="Product categories" className="space-y-1">
            <button
              type="button"
              onClick={() => onSelectCategory("all")}
              className={`group relative flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-150 ${
                isAll
                  ? "bg-emerald-50/90 text-emerald-700 font-semibold dark:bg-emerald-950/70 dark:text-emerald-300 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-full before:bg-emerald-600 dark:before:bg-emerald-400"
                  : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={`transition-transform duration-200 group-hover:scale-110 ${isAll ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300"}`}>
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                    <rect width="7" height="7" x="3" y="3" rx="1" />
                    <rect width="7" height="7" x="14" y="3" rx="1" />
                    <rect width="7" height="7" x="14" y="14" rx="1" />
                    <rect width="7" height="7" x="3" y="14" rx="1" />
                  </svg>
                </span>
                <span>All Products</span>
              </div>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`h-3.5 w-3.5 transition-transform duration-150 ${isAll ? "text-emerald-600 translate-x-0.5 dark:text-emerald-400" : "text-slate-300 group-hover:translate-x-1 dark:text-slate-600"}`}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            {categories.map((c) => {
              const active = activeCategory === c.name;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectCategory(c.name)}
                  className={`group relative flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-150 ${
                    active
                      ? "bg-emerald-50/90 text-emerald-700 font-semibold dark:bg-emerald-950/70 dark:text-emerald-300 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-full before:bg-emerald-600 dark:before:bg-emerald-400"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`transition-transform duration-200 group-hover:scale-110 ${active ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300"}`}>
                      {getCategoryIcon(c.name)}
                    </span>
                    <span>{c.name}</span>
                  </div>
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`h-3.5 w-3.5 transition-transform duration-150 ${active ? "text-emerald-600 translate-x-0.5 dark:text-emerald-400" : "text-slate-300 group-hover:translate-x-1 dark:text-slate-600"}`}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              );
            })}
          </nav>

          {/* Quick Perks Mini-Card */}
          <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5 dark:border-emerald-950/60 dark:bg-emerald-950/20 transition-all">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-bold shadow-xs">
                ✓
              </span>
              <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                Verified Express
              </p>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-emerald-800/90 dark:text-emerald-300/80">
              Orders placed today dispatch within 24 hours with live carrier tracking.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
