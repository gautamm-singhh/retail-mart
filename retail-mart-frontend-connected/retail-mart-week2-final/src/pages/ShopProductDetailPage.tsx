import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchProduct, fetchProducts } from "@/services/api/products";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ProductCard } from "@/features/shop/components/ProductCard";
import { getProductExactImage } from "@/features/shop/utils/productImages";
import { mockProducts } from "@/features/products/data/products";
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

  const isWishlisted = product ? checkWishlisted(product.id) : false;
  const isWishlistPending = product ? pendingProductIds.has(product.id) : false;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

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
      // Handled in context
    }
  }

  function handleAddToCart() {
    if (!product) return;
    addItem(product, quantity);
    showToast(`Added ${quantity} × ${product.name} to cart.`);
  }

  function handleBuyNow() {
    if (!product) return;
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
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Breadcrumb Bar */}
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

      {/* Main Product Card */}
      <div className="grid grid-cols-1 gap-8 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8 md:grid-cols-12 lg:gap-12 dark:border-slate-800/90 dark:bg-slate-900 transition-colors">
        {/* Left Column: Image Area */}
        <div className="md:col-span-6 lg:col-span-6">
          <div className="group relative aspect-square w-full overflow-hidden rounded-2xl border border-slate-100 bg-slate-100 dark:border-slate-800 dark:bg-slate-800/80 shadow-xs">
            {getProductExactImage(product) && !imgError ? (
              <img
                src={getProductExactImage(product)}
                alt={product.name}
                onError={() => setImgError(true)}
                className="h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-emerald-50 text-7xl font-black text-emerald-600 dark:bg-slate-800 dark:text-emerald-400">
                {product.name.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Floating Wishlist Button */}
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

        {/* Right Column: Details & Actions */}
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

            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-slate-950 dark:text-white">
                {formatCurrency(product.price)}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Inclusive of all taxes
              </span>
            </div>

            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {product.description}
            </p>

            <div className="pt-2">
              {product.stock > 0 ? (
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

            {/* Quantity Selector */}
            {product.stock > 0 && (
              <div className="flex items-center gap-3 pt-2">
                <label htmlFor="quantity" className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Quantity
                </label>
                <select
                  id="quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="rounded-xl border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-xs font-semibold text-slate-800 shadow-xs focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                >
                  {Array.from({ length: Math.min(product.stock, 10) }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Action Buttons */}
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
          </div>

          {/* Guarantee Highlights */}
          <div className="mt-8 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                <span className="text-emerald-600 font-bold dark:text-emerald-400">✓</span>
                <span>Express Dispatch</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                <span className="text-emerald-600 font-bold dark:text-emerald-400">✓</span>
                <span>7-Day Returns</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                <span className="text-emerald-600 font-bold dark:text-emerald-400">✓</span>
                <span>Genuine Certified</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Products Collection (Minimum 6 items) */}
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
    </div>
  );
}
