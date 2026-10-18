import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchProducts, productsCache } from "@/services/api/products";
import { fetchCategories, categoriesCache } from "@/services/api/categories";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductCard } from "@/features/shop/components/ProductCard";
import { CategorySidebar } from "@/features/shop/components/CategorySidebar";
import { StorefrontHero } from "@/features/shop/components/StorefrontHero";
import { PromotionalCards } from "@/features/shop/components/PromotionalCards";
import { DEMO_CANDIDATE_PRODUCTS } from "@/features/shop/data/demoCatalog";
import { useAuth } from "@/features/auth/useAuth";
import type { Category, Product } from "@/types";

type SortOption = "featured" | "price-asc" | "price-desc" | "name-asc";
type CollectionTab = "all" | "featured" | "new-arrivals";

function ProductCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm dark:border-slate-800/70 dark:bg-slate-900 animate-pulse">
      <div className="aspect-square w-full bg-slate-100 dark:bg-slate-800" />
      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="pt-2 flex items-center justify-between">
          <div className="h-5 w-20 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-8 w-24 rounded-xl bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
    </div>
  );
}

export default function ShopHomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const categoryFilter = searchParams.get("category") ?? "all";
  const { currentUser, isAuthenticated } = useAuth();

  // Demo Catalog Mode is strictly restricted to authenticated users with authorized backend roles (Admin, Manager, Staff)
  const isAuthorizedForDemo = useMemo(() => {
    if (!isAuthenticated || !currentUser) return false;
    const role = currentUser.role?.toLowerCase();
    return role === "admin" || role === "manager" || role === "staff";
  }, [currentUser, isAuthenticated]);

  const rawDemoRequested = searchParams.get("mode") === "demo" || searchParams.get("catalog") === "demo";
  // Enforce restriction: public visitors and regular customers cannot activate demo mode even with ?mode=demo
  const isDemoMode = rawDemoRequested && isAuthorizedForDemo;

  const [sortBy, setSortBy] = useState<SortOption>("featured");
  const [collectionTab, setCollectionTab] = useState<CollectionTab>("all");

  const [products, setProducts] = useState<Product[]>(() => productsCache.data ?? []);
  const [categories, setCategories] = useState<Category[]>(() =>
    (categoriesCache.data ?? []).filter((c) => c.status === "active"),
  );
  const [isLoading, setIsLoading] = useState(() => !productsCache.data || productsCache.data.length === 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!productsCache.data || productsCache.data.length === 0) {
      setIsLoading(true);
    }
    setError(null);

    Promise.all([fetchProducts(), fetchCategories()])
      .then(([apiProducts, categoryData]) => {
        if (!cancelled) {
          // Strictly preserve live inventory, verified pricing, HSN codes and GST rates
          // Only display active, verified products in customer storefront; draft and inactive records are excluded
          const activeCatalog = (apiProducts || []).filter((p) => p.status === "active");
          setProducts(activeCatalog);
          setCategories((categoryData || []).filter((c) => c.status === "active"));
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          if (!productsCache.data || productsCache.data.length === 0) {
            setError(err instanceof Error ? err.message : "Couldn't load products. Please check your network.");
          }
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // When Demo Mode is active, candidate products are loaded strictly for layout presentation
  const displayedCatalog = useMemo(() => {
    if (!isDemoMode) {
      return products;
    }
    return [...products, ...DEMO_CANDIDATE_PRODUCTS];
  }, [products, isDemoMode]);

  const filteredProducts = useMemo(() => {
    let list = displayedCatalog.filter((product) => {
      const matchesQuery =
        !query ||
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        product.category.toLowerCase().includes(query.toLowerCase());
      const matchesCategory =
        categoryFilter === "all" ||
        product.category.toLowerCase() === categoryFilter.toLowerCase() ||
        (categoryFilter.toLowerCase() === "kitchen" && product.category.toLowerCase().includes("kitchen"));
      return matchesQuery && matchesCategory;
    });

    if (categoryFilter === "all" && !query) {
      if (collectionTab === "featured") {
        list = list.slice(0, 8);
      } else if (collectionTab === "new-arrivals") {
        list = [...list].reverse().slice(0, 8);
      }
    }

    if (sortBy === "price-asc") {
      return [...list].sort((a, b) => a.price - b.price);
    }
    if (sortBy === "price-desc") {
      return [...list].sort((a, b) => b.price - a.price);
    }
    if (sortBy === "name-asc") {
      return [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [displayedCatalog, query, categoryFilter, collectionTab, sortBy]);

  const recommendedProducts = useMemo(() => {
    const currentIds = new Set(filteredProducts.map((p) => p.id));
    const others = displayedCatalog.filter((p) => !currentIds.has(p.id));
    return others.slice(0, 8);
  }, [displayedCatalog, filteredProducts]);

  function handleToggleDemoMode() {
    const next = new URLSearchParams(searchParams);
    if (isDemoMode) {
      next.delete("mode");
      next.delete("catalog");
    } else {
      next.set("mode", "demo");
    }
    setSearchParams(next);
  }

  function handleSelectCategory(category: string) {
    const next = new URLSearchParams(searchParams);
    if (category === "all") {
      next.delete("category");
    } else {
      next.set("category", category);
    }
    setSearchParams(next);

    const catalogEl = document.getElementById("catalog-section");
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: "smooth" });
    }
  }

  function handleClearFilters() {
    setSearchParams(new URLSearchParams());
  }

  const isFiltered = query || categoryFilter !== "all";

  return (
    <div>
      {!query && (
        <>
          <StorefrontHero
            onShopNowClick={() => {
              const catalogEl = document.getElementById("catalog-section");
              if (catalogEl) catalogEl.scrollIntoView({ behavior: "smooth" });
            }}
            onExploreDealsClick={() => handleSelectCategory("all")}
          />
          <PromotionalCards onSelectCategory={handleSelectCategory} />
        </>
      )}

      <div id="catalog-section" className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
        <div className="lg:col-span-3 lg:sticky lg:top-20 lg:self-start lg:z-10">
          <CategorySidebar
            categories={categories}
            activeCategory={categoryFilter}
            onSelectCategory={handleSelectCategory}
            totalProductsCount={displayedCatalog.length}
          />
        </div>

        <div className="lg:col-span-9">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-800/70 dark:bg-slate-900 transition-colors">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  {categoryFilter === "all" ? "Featured Catalog" : categoryFilter}
                </h2>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  {filteredProducts.length} {filteredProducts.length === 1 ? "item" : "items"}
                  {isDemoMode && " (Demo Included)"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {isDemoMode
                  ? "Client Presentation Mode: Showing live inventory + draft catalog proposals"
                  : "Verified genuine products with express doorstep fulfillment"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {isAuthorizedForDemo && (
                <button
                  type="button"
                  onClick={handleToggleDemoMode}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                    isDemoMode
                      ? "border-amber-400 bg-amber-50 text-amber-900 shadow-xs dark:border-amber-600 dark:bg-amber-950/60 dark:text-amber-200"
                      : "border-slate-200 bg-white text-slate-700 hover:border-amber-400 hover:bg-amber-50/50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-amber-600"
                  }`}
                  title="Toggle Demo Presentation Catalog mode with 17 proposal items"
                >
                  <span className={`h-2 w-2 rounded-full ${isDemoMode ? "bg-amber-500 animate-pulse" : "bg-slate-300 dark:bg-slate-600"}`} />
                  <span>{isDemoMode ? "Demo Mode: Active" : "Demo Catalog Mode"}</span>
                </button>
              )}

              {categoryFilter === "all" && !query && (
                <div className="flex items-center gap-1 rounded-xl bg-slate-100/90 p-1 dark:bg-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setCollectionTab("all")}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-150 ${
                      collectionTab === "all"
                        ? "bg-white text-emerald-700 shadow-xs dark:bg-slate-700 dark:text-emerald-300"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    All ({displayedCatalog.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCollectionTab("featured")}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-150 ${
                      collectionTab === "featured"
                        ? "bg-white text-emerald-700 shadow-xs dark:bg-slate-700 dark:text-emerald-300"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    Featured (8)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCollectionTab("new-arrivals")}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-150 ${
                      collectionTab === "new-arrivals"
                        ? "bg-white text-emerald-700 shadow-xs dark:bg-slate-700 dark:text-emerald-300"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    New Arrivals (8)
                  </button>
                </div>
              )}

              <label htmlFor="sort-select" className="sr-only">
                Sort products
              </label>
              <div className="relative">
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="rounded-xl border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-xs font-semibold text-slate-700 shadow-xs focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                >
                  <option value="featured">Sort: Featured</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="name-asc">Name: A to Z</option>
                </select>
              </div>

              {isFiltered && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {isDemoMode && (
            <div className="mb-6 rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 via-amber-50/90 to-yellow-50/60 p-4 shadow-sm dark:border-amber-800/80 dark:from-amber-950/60 dark:via-amber-950/40 dark:to-yellow-950/30">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white font-black text-xs shadow-xs">
                    DEMO
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold tracking-tight text-amber-950 dark:text-amber-100">
                        Demo Presentation Catalog (Client Review Mode)
                      </h3>
                      <span className="rounded-full bg-amber-200/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900 dark:bg-amber-900/90 dark:text-amber-200">
                        Non-Purchasable Preview
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-300/80">
                      Displaying 17 candidate items (&ge; 4 items/category) alongside 7 live products. Prices are indicative. Add-to-cart, orders, and real inventory are strictly disabled.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleDemoMode}
                  className="shrink-0 rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-xs font-bold text-amber-900 shadow-xs hover:bg-amber-50 active:scale-95 transition-all dark:border-amber-700 dark:bg-slate-900 dark:text-amber-200 dark:hover:bg-slate-800"
                >
                  Exit to Live Storefront
                </button>
              </div>
            </div>
          )}

          {query && (
            <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/90 px-4 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
              <p>
                Showing results for <strong className="text-slate-900 dark:text-white">&quot;{query}&quot;</strong>
              </p>
              <button
                type="button"
                onClick={handleClearFilters}
                className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
              >
                Clear search
              </button>
            </div>
          )}

          {isLoading && products.length === 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, idx) => (
                <ProductCardSkeleton key={`prod-skel-${idx}`} />
              ))}
            </div>
          ) : error && products.length === 0 ? (
            <div className="py-6">
              <ErrorState title="Couldn't load products" description={error} />
            </div>
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              title="No products found"
              description="No active items match your current filter or search criteria. Try selecting another category or clear your search."
              action={
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                >
                  Show All Products
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product, idx) => (
                <div
                  key={product.id}
                  className="opacity-0 animate-[fadeSlideUp_0.45s_ease-out_forwards]"
                  style={{ animationDelay: `${(idx % 6) * 60}ms` }}
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          )}

          {(categoryFilter !== "all" || query) && filteredProducts.length > 0 && recommendedProducts.length >= 4 && (
            <div className="mt-12 pt-8 border-t border-slate-200/80 dark:border-slate-800/80">
              <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                      Recommended From Our Catalog
                    </h3>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                      {recommendedProducts.length} items
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Explore top-rated essentials across other departments
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectCategory("all")}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline text-left sm:text-right"
                >
                  View full catalog &rarr;
                </button>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {recommendedProducts.map((product, idx) => (
                  <div
                    key={product.id}
                    className="opacity-0 animate-[fadeSlideUp_0.45s_ease-out_forwards]"
                    style={{ animationDelay: `${(idx % 6) * 60}ms` }}
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
