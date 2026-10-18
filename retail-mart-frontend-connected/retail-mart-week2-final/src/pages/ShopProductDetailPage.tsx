import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchProduct, fetchProducts } from "@/services/api/products";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ProductCard } from "@/features/shop/components/ProductCard";
import { getProductExactImage, NEUTRAL_PRODUCT_FALLBACK } from "@/features/shop/utils/productImages";
import { mockProducts } from "@/features/products/data/products";
import { DEMO_CANDIDATE_PRODUCTS } from "@/features/shop/data/demoCatalog";
import { useCart } from "@/features/cart/useCart";
import { useWishlist } from "@/features/wishlist/useWishlist";
import { useToast } from "@/hooks/useToast";
import type { Product } from "@/types";
import { formatCurrency } from "@/utils/format";
import { ROUTES } from "@/constants/routes";

export default function ShopProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { isWishlisted: checkWishlisted, toggleWishlist, pendingProductIds } = useWishlist();
  const { showToast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [recommended, setRecommended] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [imgError, setImgError] = useState(false);

  const isDemo = Boolean((product as any)?.isDemo || id?.startsWith("demo-"));
  const isWishlisted = product ? checkWishlisted(product.id) : false;
  const isWishlistPending = product ? pendingProductIds.has(product.id) : false;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    // Preview catalog candidate items are accessible to all visitors (Guests, Customers, Admins)
    if (id.startsWith("demo-")) {
      const demoFound = DEMO_CANDIDATE_PRODUCTS.find((p) => p.id === id);
      if (demoFound) {
        setProduct(demoFound);
        setRecommended(DEMO_CANDIDATE_PRODUCTS.filter((p) => p.id !== id).slice(0, 4));
        setIsLoading(false);
        return;
      }
    }

    const singlePromise = fetchProduct(id).catch(() => mockProducts.find((p) => p.id === id) || null);
    const allPromise = fetchProducts().catch(() => mockProducts);

    Promise.all([singlePromise, allPromise])
      .then(([singleProduct, allProducts]) => {
        if (!cancelled) {
          const matched = singleProduct || mockProducts.find((p) => p.id === id);
          if (matched) {
            setProduct(matched);
            const liveMap = new Map(((allProducts as Product[]) || []).map((p) => [p.id, p]));
            const fullCatalog = mockProducts.map((p) => {
              const live = liveMap.get(p.id);
              return live ? { ...p, ...live } : p;
            });
            const others = fullCatalog.filter((p) => p.id !== id);
            setRecommended(others.slice(0, 6));
          } else {
            setError("We couldn't find this product.");
          }
        }
      })
      .catch(() => {
        if (!cancelled) setError("We couldn't find this product.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleToggleWishlist() {
    if (!product || isWishlistPending) return;
    try {
      await toggleWishlist(product);
    } catch {
      /* ignore */
    }
  }

  function handleAddToCart() {
    if (!product || isDemo) {
      if (isDemo) showToast("This product is a catalog preview and cannot be added to cart.");
      return;
    }
    addItem(product, quantity);
    showToast(`Added ${quantity} × ${product.name} to cart.`);
  }

  function handleBuyNow() {
    if (!product || isDemo) {
      if (isDemo) showToast("This product is a catalog preview and cannot be purchased.");
      return;
    }
    addItem(product, quantity);
    navigate(ROUTES.cart);
  }

  if (isLoading) return <LoadingState label="Loading product details..." rows={6} />;
  if (error || !product) {
    return (
      <ErrorState
        title="Product not found"
        description={error ?? "This product may no longer be available in our catalog."}
        onRetry={() => navigate(ROUTES.shop)}
      />
    );
  }

  return (
    <div className="space-y-6 pb-16 sm:pb-0 animate-in fade-in-50 duration-200">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link to={ROUTES.shop} className="hover:text-emerald-600 transition-colors dark:hover:text-emerald-400">
          Storefront
        </Link>
        <span>/</span>
        <Link
          to={`${ROUTES.shop}?category=${encodeURIComponent(product.category)}`}
          className="hover:text-emerald-600 transition-colors dark:hover:text-emerald-400"
        >
          {product.category}
        </Link>
        <span>/</span>
        <span className="font-semibold text-slate-900 truncate max-w-xs dark:text-white">
          {product.name}
        </span>
      </nav>

      <div className="grid grid-cols-1 gap-8 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8 md:grid-cols-12 lg:gap-12 dark:border-slate-800/90 dark:bg-slate-900 transition-colors">
        <div className="md:col-span-6 lg:col-span-6">
          <div className="group relative aspect-square w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs flex items-center justify-center p-6">
            {getProductExactImage(product) && !imgError ? (
              <img
                src={getProductExactImage(product)}
                alt={product.name}
                onError={() => setImgError(true)}
                className="max-h-full max-w-full object-contain object-center transition-transform duration-500 ease-out group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-50 dark:bg-slate-800 p-8">
                <img src={NEUTRAL_PRODUCT_FALLBACK} alt="Placeholder" className="h-24 w-24 opacity-30" />
              </div>
            )}

            <button
              type="button"
              onClick={handleToggleWishlist}
              disabled={isWishlistPending}
              title={isWishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
              aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
              className={`absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-md backdrop-blur-xs transition-all duration-150 dark:bg-slate-900/90 dark:text-slate-300 ${
                isWishlistPending
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:scale-110 active:scale-95"
              }`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill={isWishlisted ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`h-5 w-5 transition-colors ${
                  isWishlisted ? "text-rose-500 fill-rose-500" : "hover:text-rose-500"
                } ${isWishlistPending ? "animate-pulse" : ""}`}
              >
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex flex-col justify-between md:col-span-6 lg:col-span-6">
          <div className="space-y-4">
            <div>
              <span className="inline-block rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                {product.category}
              </span>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                {product.name}
              </h1>
            </div>

            {isDemo && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 shadow-xs dark:border-amber-800/80 dark:bg-amber-950/40">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-black uppercase text-white">
                    PREVIEW
                  </span>
                  <h3 className="text-sm font-bold text-amber-950 dark:text-amber-100">
                    Catalog Preview &bull; Coming Soon
                  </h3>
                </div>
                <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-300/80">
                  This product is part of our upcoming catalog. Proposed price is indicative. Real inventory and purchasing will be available soon once stock arrives.
                </p>
              </div>
            )}

            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-slate-950 dark:text-white">
                {formatCurrency(product.price)}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {isDemo ? "Indicative Price (Coming Soon)" : "Inclusive of all taxes"}
              </span>
            </div>

            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {product.description}
            </p>

            <div className="pt-2">
              {isDemo ? (
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Upcoming Catalog Item &bull; Coming Soon (0 currently in stock)
                </span>
              ) : product.stock > 0 ? (
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  In Stock ({product.stock} available for express dispatch)
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  Currently Out of Stock
                </span>
              )}
            </div>

            {!isDemo && product.stock > 0 && (
              <div className="flex items-center gap-3 pt-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Quantity
                </label>
                <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 p-0.5">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-all hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  </button>
                  <span className="w-8 text-center text-sm font-bold text-slate-900 dark:text-white">{quantity}</span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    disabled={quantity >= product.stock}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-all hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-emerald-950/40"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  </button>
                </div>
                {product.stock <= 5 && (
                  <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                    Only {product.stock} left!
                  </span>
                )}
              </div>
            )}

            {isDemo ? (
              <div className="mt-4 rounded-xl border border-amber-300/80 bg-amber-50/90 p-3.5 text-center text-xs font-bold text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
                Catalog Preview &mdash; Coming Soon (Cannot Be Added to Cart or Purchased)
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap items-center gap-3 pt-4">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={handleAddToCart}
                  disabled={product.stock <= 0}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl px-6"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-4 w-4"
                  >
                    <circle cx="9" cy="20" r="1.4" />
                    <circle cx="18" cy="20" r="1.4" />
                    <path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8a2 2 0 0 0 2-1.6L21 8H6" />
                  </svg>
                  <span>Add to Cart</span>
                </Button>

                <Button
                  variant="primary"
                  size="md"
                  onClick={handleBuyNow}
                  disabled={product.stock <= 0}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl px-7"
                >
                  <span>Buy Now</span>
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
                </Button>
              </div>
            )}
          </div>

          <div className="mt-8 rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50/80 to-white p-4 dark:border-slate-800 dark:from-slate-800/50 dark:to-slate-900/50">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { icon: "🚀", label: "Express Dispatch" },
                { icon: "↩️", label: "7-Day Returns" },
                { icon: "✅", label: "Genuine Certified" },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-base dark:bg-emerald-950/40">
                    {icon}
                  </span>
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {recommended.length > 0 && (
        <div className="mt-14 pt-10 border-t border-slate-200/80 dark:border-slate-800/80">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Recommended Products
                </h2>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                  {recommended.length} items
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Frequently bought together and popular recommendations from our catalog
              </p>
            </div>
            <Link
              to={ROUTES.shop}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              Browse all &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </div>
      )}

      <aside
        aria-label="Quick purchase actions"
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between gap-3 border-t border-slate-200/90 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-md dark:border-slate-800/90 dark:bg-slate-900/95 sm:hidden"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
            {product.name}
          </p>
          <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(product.price)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAddToCart}
            disabled={product.stock <= 0}
            className="rounded-xl px-3 text-xs"
          >
            Add to Cart
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleBuyNow}
            disabled={product.stock <= 0}
            className="rounded-xl px-3.5 text-xs font-bold"
          >
            Buy Now
          </Button>
        </div>
      </aside>
    </div>
  );
}
