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
    accent: "#10b981",
  },
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
    id: "promo-home",
    category: "Home & Kitchen",
    tag: "Home Living",
    title: "Artisan Kitchen & Dining",
    description: "Non-stick cookware, bottles & ceramic mugs.",
    imageUrl: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&auto=format&fit=crop&q=80",
    cta: "Discover Kitchen",
    accent: "#f59e0b",
  },
  {
    id: "promo-sports",
    category: "Sports",
    tag: "Active Lifestyle",
    title: "Sports & Fitness Gear",
    description: "Performance wear, gym essentials & outdoor kits.",
    imageUrl: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&auto=format&fit=crop&q=80",
    cta: "Shop Sports",
    accent: "#ef4444",
  },
  {
    id: "promo-beauty",
    category: "Beauty",
    tag: "Glow Up",
    title: "Skincare & Beauty Picks",
    description: "Top-rated serums, moisturisers & makeup kits.",
    imageUrl: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&auto=format&fit=crop&q=80",
    cta: "Explore Beauty",
    accent: "#ec4899",
  },
  {
    id: "promo-books",
    category: "Books",
    tag: "Read More",
    title: "Bestselling Books & Stationery",
    description: "Fiction, non-fiction, journals & planners.",
    imageUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80",
    cta: "Browse Books",
    accent: "#8b5cf6",
  },
];

// Duplicate items for seamless infinite loop
const MARQUEE_ITEMS = [...PROMO_ITEMS, ...PROMO_ITEMS];

export function PromotionalCards({ onSelectCategory }: PromotionalCardsProps) {
  return (
    <div className="promo-marquee-root mb-8">
      {/* Fade masks on left & right edges */}
      <div className="promo-marquee-track-wrap">
        <div className="promo-marquee-track">
          {MARQUEE_ITEMS.map((item, idx) => (
            <button
              key={`${item.id}-${idx}`}
              type="button"
              onClick={() => onSelectCategory(item.category)}
              className="promo-marquee-card group"
            >
              {/* Glow blob */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl opacity-20 transition-opacity duration-300 group-hover:opacity-40"
                style={{ background: item.accent }}
              />

              <div className="relative z-10 flex flex-1 flex-col justify-between">
                <div>
                  <span
                    className="inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      background: `${item.accent}18`,
                      color: item.accent,
                    }}
                  >
                    {item.tag}
                  </span>
                  <h3 className="mt-2 text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors dark:text-white dark:group-hover:text-emerald-400 leading-snug">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2 dark:text-slate-400">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold" style={{ color: item.accent }}>
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
      </div>
    </div>
  );
}
