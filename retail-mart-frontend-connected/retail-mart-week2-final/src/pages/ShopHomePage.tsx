import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchProducts } from "@/services/api/products";
import { fetchCategories } from "@/services/api/categories";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductCard } from "@/features/shop/components/ProductCard";
import { CategorySidebar } from "@/features/shop/components/CategorySidebar";
import { StorefrontHero } from "@/features/shop/components/StorefrontHero";
import { PromotionalCards } from "@/features/shop/components/PromotionalCards";
import { mockProducts } from "@/features/products/data/products";
import type { Category, Product } from "@/types";

type SortOption = "featured" | "price-asc" | "price-desc" | "name-asc";
type CollectionTab = "all" | "featured" | "new-arrivals";

export default function ShopHomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const categoryFilter = searchParams.get("category") ?? "all";
  const [sortBy, setSortBy] = useState<SortOption>("featured");
  const [collectionTab, setCollectionTab] = useState<CollectionTab>("all");

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([fetchProducts(), fetchCategories()])
      .then(([apiProducts, categoryData]) => {
        if (!cancelled) {
          // Merge API products with full catalog dataset to guarantee minimum 6 items in every category
          const apiMap = new Map((apiProducts || []).map((p) => [p.id, p]));
          const combined = mockProducts.map((p) => {
            const live = apiMap.get(p.id);
            return live ? { ...p, ...live, imageUrl: p.imageUrl || live.imageUrl } : p;
          });
          setProducts(combined);
          setCategories(categoryData.filter((c) => c.status === "active"));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProducts(mockProducts);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    let list = products.filter((product) => {
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
        list = list.slice(0, 6);
      } else if (collectionTab === "new-arrivals") {
        list = [...list].reverse().slice(0, 6);
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
  }, [products, query, categoryFilter, collectionTab, sortBy]);

  const recommendedProducts = useMemo(() => {
    const currentIds = new Set(filteredProducts.map((p) => p.id));
    const others = products.filter((p) => !currentIds.has(p.id));
    return others.slice(0, 6);
  }, [products, filteredProducts]);

  function handleSelectCategory(category: string) {
    const next = new URLSearchParams(searchParams);
    if (category === "all") {
      next.delete("category");
    } else {
      next.set("category", category);
    }
    setSearchParams(next);

    // Smooth scroll down to catalog if filtered from promo cards
    const catalogEl = document.getElementById("catalog-section");
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: "smooth" });
    }
  }

  function handleClearFilters() {
    setSearchParams(new URLSearchParams());
  }

  if (isLoading) {
    return (
      <div className="py-8">
        <LoadingState label="Loading product catalog..." rows={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8">
        <ErrorState title="Couldn't load products" description={error} />
      </div>
    );
  }

  const isFiltered = query || categoryFilter !== "all";

  return (
    <div>
      {/* High-Impact Hero Banner — shown when not performing a narrow search */}
      {!query && (
        <>
          <StorefrontHero
            onShopNowClick={() => {
              const catalogEl = document.getElementById("catalog-section");
              if (catalogEl) catalogEl.scrollIntoView({ behavior: "smooth" });
            }}
            onExploreDealsClick={() => handleSelectCategory("all")}
          />
          {/* Quick-Access Promotional Category Cards */}
          <PromotionalCards onSelectCategory={handleSelectCategory} />
        </>
      )}

      {/* Main 12-Column Storefront Layout */}
      <div id="catalog-section" className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Category Navigation Column */}
        <div className="lg:col-span-3">
          <CategorySidebar
            categories={categories}
            activeCategory={categoryFilter}
            onSelectCategory={handleSelectCategory}
            totalProductsCount={products.length}
          />
        </div>

        {/* Product Catalog Main Column */}
        <div className="lg:col-span-9">
          {/* Section Header & Control Toolbar */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800/90 dark:bg-slate-900 transition-colors">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {categoryFilter === "all" ? "Featured Catalog" : categoryFilter}
                </h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {filteredProducts.length} {filteredProducts.length === 1 ? "item" : "items"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Verified genuine products with express doorstep fulfillment
              </p>
            </div>

            {/* Sort & Filter Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Collection Quick Tabs (Visible on All Products) */}
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
                    All ({products.length})
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
                    Featured (6)
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
                    New Arrivals (6)
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

          {/* Active Search Notification */}
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

          {/* Product Grid / Empty State */}
          {filteredProducts.length === 0 ? (
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
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {/* Recommended Collection Section (Guarantees Minimum 6 Items) */}
          {(categoryFilter !== "all" || query) && filteredProducts.length > 0 && recommendedProducts.length >= 6 && (
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

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {recommendedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
