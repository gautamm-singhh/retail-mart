interface PromotionalCardsProps {
  onSelectCategory: (categoryName: string) => void;
}

const PROMO_ITEMS = [
  {
    id: "promo-apparel",
    category: "Apparel",
    tag: "Everyday Comfort",
    title: "Premium Casual & Denim",
    description: "Tailored tees, classic denim & modern fits.",
    imageUrl: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=600&auto=format&fit=crop&q=80",
    cta: "Explore Apparel",
    accent: "#6366f1",
  },
  {
    id: "promo-footwear",
    category: "Footwear",
    tag: "Active Steps",
    title: "Trail & Lifestyle Footwear",
    description: "Running trainers, sneakers & sport slides.",
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
    cta: "Shop Footwear",
    accent: "#0ea5e9",
  },
  {
    id: "promo-electronics",
    category: "Electronics",
    tag: "Trending Tech",
    title: "High-Fidelity Audio & Gear",
    description: "Earbuds, wireless sound & smart essentials.",
    imageUrl: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80",
    cta: "Shop Electronics",
    accent: "#10b981",
  },
  {
    id: "promo-home",
    category: "Home & Kitchen",
    tag: "Home Living",
    title: "Artisan Kitchen & Dining",
    description: "Non-stick cookware, bottles & ceramic mugs.",
    imageUrl: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&auto=format&fit=crop&q=80",
    cta: "Discover Kitchen",
    accent: "#f59e0b",
  },
];

export function PromotionalCards({ onSelectCategory }: PromotionalCardsProps) {
  return (
    <div className="w-full mb-8" data-testid="promotional-cards-section">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 w-full">
        {PROMO_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectCategory(item.category)}
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 text-left shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-emerald-400/40 dark:border-slate-800/80 dark:bg-slate-900 min-w-0 h-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl opacity-15 transition-opacity duration-300 group-hover:opacity-35"
              style={{ background: item.accent }}
            />

            <div className="relative z-10 flex items-start justify-between gap-3 min-w-0 w-full">
              <div className="min-w-0 flex-1">
                <span
                  className="inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    background: `${item.accent}18`,
                    color: item.accent,
                  }}
                >
                  {item.tag}
                </span>
                <h3 className="mt-1.5 text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors dark:text-white dark:group-hover:text-emerald-400 leading-snug line-clamp-1">
                  {item.title}
                </h3>
                <p className="mt-1 text-xs text-slate-500 line-clamp-2 dark:text-slate-400">
                  {item.description}
                </p>
              </div>

              <div className="relative h-16 w-16 sm:h-18 sm:w-18 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  loading="lazy"
                  className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            </div>

            <div
              className="relative z-10 mt-4 flex items-center gap-1.5 text-xs font-semibold"
              style={{ color: item.accent }}
            >
              <span>{item.cta}</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
