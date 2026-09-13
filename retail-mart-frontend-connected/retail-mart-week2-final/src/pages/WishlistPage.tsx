import { Link, useNavigate } from "react-router-dom";
import { useWishlist } from "@/features/wishlist/useWishlist";
import { useCart } from "@/features/cart/useCart";
import { useToast } from "@/hooks/useToast";
import { formatCurrency } from "@/utils/format";
import { ROUTES } from "@/constants/routes";
import { getProductExactImage } from "@/features/shop/utils/productImages";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Product } from "@/types";

export default function WishlistPage() {
  const navigate = useNavigate();
  const { items, isLoading, error, refresh, removeItem, pendingProductIds } = useWishlist();
  const { addItem } = useCart();
  const { showToast } = useToast();

  function handleAddToCart(product: Product) {
    if (product.stock <= 0) return;
    addItem(product);
    showToast(`Added ${product.name} to cart.`);
  }

  async function handleRemove(productId: string) {
    try {
      await removeItem(productId);
    } catch {
      // Toast already shown in context
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link to={ROUTES.shop} className="hover:text-emerald-600 transition-colors dark:hover:text-emerald-400">
          Storefront
        </Link>
        <span>/</span>
        <span className="font-semibold text-slate-900 dark:text-white">My Wishlist</span>
      </nav>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800/90 dark:bg-slate-900 transition-colors">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 shadow-xs">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-6 w-6"
            >
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                My Wishlist
              </h1>
              <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-950/80 dark:text-rose-300">
                {items.length} {items.length === 1 ? "item" : "items"}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Personal saved items securely persisted to your account.
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate(ROUTES.shop)}
          className="self-start sm:self-auto rounded-xl"
        >
          <span>Continue Shopping</span>
        </Button>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <LoadingState label="Loading your saved items from server..." rows={4} />
      ) : error ? (
        <ErrorState
          title="Failed to load wishlist"
          description={error}
          onRetry={refresh}
        />
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-12 shadow-xs dark:border-slate-800/90 dark:bg-slate-900 transition-colors">
          <EmptyState
            title="Your wishlist is empty"
            description="Explore our catalog and click the heart icon on any product to save items you love for later."
            action={
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate(ROUTES.shop)}
                className="rounded-xl px-6"
              >
                <span>Explore Products</span>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => {
            const product = item.product;
            if (!product) return null;

            const isPending = pendingProductIds.has(product.id);
            const isOutOfStock = product.stock <= 0;
            const imageUrl = getProductExactImage(product);

            return (
              <div
                key={item.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-lg dark:border-slate-800/90 dark:bg-slate-900"
              >
                {/* Product Image */}
                <div className="relative aspect-square w-full overflow-hidden bg-slate-100 dark:bg-slate-800/80">
                  <Link to={`${ROUTES.shopProduct}/${product.id}`}>
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.name}
                        loading="lazy"
                        className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-emerald-50 text-4xl font-extrabold text-emerald-700 dark:bg-slate-800 dark:text-emerald-400">
                        {product.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </Link>

                  {/* Stock Status Badge */}
                  {isOutOfStock && (
                    <span className="absolute left-2.5 top-2.5 rounded-md bg-rose-600/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs">
                      Out of Stock
                    </span>
                  )}

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemove(product.id)}
                    disabled={isPending}
                    title={`Remove ${product.name} from wishlist`}
                    aria-label={`Remove ${product.name} from wishlist`}
                    className={`absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-rose-500 shadow-sm backdrop-blur-xs transition-all duration-150 hover:bg-rose-50 hover:scale-110 active:scale-95 dark:bg-slate-900/95 dark:text-rose-400 dark:hover:bg-rose-950/60 ${
                      isPending ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                {/* Card Body */}
                <div className="flex flex-1 flex-col p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    {product.category}
                  </span>

                  <Link
                    to={`${ROUTES.shopProduct}/${product.id}`}
                    className="mt-1 line-clamp-1 font-semibold text-slate-900 transition-colors group-hover:text-emerald-600 dark:text-white dark:group-hover:text-emerald-400"
                  >
                    {product.name}
                  </Link>

                  <div className="mt-2.5 flex items-baseline justify-between">
                    <span className="text-base font-extrabold text-slate-900 dark:text-white">
                      {formatCurrency(product.price)}
                    </span>
                    <span
                      className={`text-[11px] font-medium ${
                        isOutOfStock
                          ? "text-rose-500"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {isOutOfStock ? "Unavailable" : "In Stock"}
                    </span>
                  </div>

                  {/* Add to Cart Button */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleAddToCart(product)}
                      disabled={isOutOfStock}
                      className="w-full flex items-center justify-center gap-2 rounded-xl"
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
                      <span>{isOutOfStock ? "Out of Stock" : "Add to Cart"}</span>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
