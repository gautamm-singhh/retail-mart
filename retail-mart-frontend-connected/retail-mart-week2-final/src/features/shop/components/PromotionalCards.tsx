interface PromotionalCardsProps {
  onSelectCategory: (categoryName: string) => void;
}

const PROMO_ITEMS = [
  {
    id: "promo-electronics",
    category: "Electronics",
    tag: "Trending Tech",
    title: "High-Fidelity Audio & Gear",
    description: "Earbuds, wireless sound & smart electronics.",
    imageUrl: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80",
    cta: "Shop Audio & Tech",
  },
  {
    id: "promo-apparel",
    category: "Apparel",
    tag: "Everyday Comfort",
    title: "Premium Casual & Denim",
    description: "Tailored tees, classic denim & modern fits.",
    imageUrl: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=600&auto=format&fit=crop&q=80",
    cta: "Explore Apparel",
  },
  {
    id: "promo-home",
    category: "Home & Kitchen",
    tag: "Home Living",
    title: "Artisan Kitchen & Dining",
    description: "Non-stick cookware, bottles & ceramic mugs.",
    imageUrl: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&auto=format&fit=crop&q=80",
    cta: "Discover Kitchen",
  },
];

export function PromotionalCards({ onSelectCategory }: PromotionalCardsProps) {
  return (
    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {PROMO_ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelectCategory(item.category)}
          className="group relative flex overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-xs transition-all duration-200 ease-out hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-md active:translate-y-0.5 active:scale-[0.99] dark:border-slate-800/90 dark:bg-slate-900"
        >
          {/* Subtle gradient highlight */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-emerald-500/5 blur-2xl group-hover:bg-emerald-500/10 transition-colors dark:bg-emerald-500/10"
          />

          <div className="relative z-10 flex flex-1 flex-col justify-between">
            <div>
              <span className="inline-block rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                {item.tag}
              </span>
              <h3 className="mt-2 text-base font-bold text-slate-900 group-hover:text-emerald-600 transition-colors dark:text-white dark:group-hover:text-emerald-400">
                {item.title}
              </h3>
              <p className="mt-1 text-xs text-slate-500 line-clamp-2 dark:text-slate-400">
                {item.description}
              </p>
            </div>

            <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
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
          </div>

          <div className="relative ml-4 h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
            <img
              src={item.imageUrl}
              alt={item.title}
              loading="lazy"
              className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-110"
            />
          </div>
        </button>
      ))}
    </div>
  );
}
