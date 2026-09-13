import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "@/features/cart/useCart";
import { useWishlist } from "@/features/wishlist/useWishlist";
import { useToast } from "@/hooks/useToast";
import type { Product } from "@/types";
import { formatCurrency } from "@/utils/format";
import { ROUTES } from "@/constants/routes";
import { getProductExactImage } from "@/features/shop/utils/productImages";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { isWishlisted: checkWishlisted, toggleWishlist, pendingProductIds } = useWishlist();
  const { showToast } = useToast();
  const [imgError, setImgError] = useState(false);
  const displayImageUrl = getProductExactImage(product);

  const isWishlisted = checkWishlisted(product.id);
  const isWishlistPending = pendingProductIds.has(product.id);

  async function handleToggleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (isWishlistPending) return;
    try {
      await toggleWishlist(product);
    } catch {
      // Handled in context
    }
  }

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock <= 0) return;
    addItem(product);
    showToast(`Added ${product.name} to cart.`);
  }

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all duration-200 ease-out hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-lg dark:border-slate-800/90 dark:bg-slate-900 dark:hover:border-emerald-500/30">
      {/* Product Image Container */}
      <Link
        to={`${ROUTES.shopProduct}/${product.id}`}
        className="relative block aspect-square w-full overflow-hidden bg-slate-100 dark:bg-slate-800/80"
      >
        {displayImageUrl && !imgError ? (
          <img
            src={displayImageUrl}
            alt={product.name}
            loading="lazy"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover object-center transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-emerald-50/50 text-4xl font-extrabold text-emerald-700 dark:bg-slate-800 dark:text-emerald-400">
            {product.name.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Wishlist Heart Button */}
        <button
          type="button"
          onClick={handleToggleWishlist}
          disabled={isWishlistPending}
          title={isWishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          className={`absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm backdrop-blur-xs transition-all duration-150 dark:bg-slate-900/90 dark:text-slate-300 ${
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
            className={`h-4 w-4 transition-colors duration-150 ${
              isWishlisted ? "text-rose-500 fill-rose-500" : "hover:text-rose-500"
            } ${isWishlistPending ? "animate-pulse" : ""}`}
          >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
        </button>

        {/* Stock Status Pill */}
        {isOutOfStock && (
          <div className="absolute left-2.5 top-2.5 z-10 rounded-md bg-rose-600/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs backdrop-blur-xs">
            Out of Stock
          </div>
        )}
        {isLowStock && (
          <div className="absolute left-2.5 top-2.5 z-10 rounded-md bg-amber-500/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs backdrop-blur-xs">
            Only {product.stock} Left
          </div>
        )}
      </Link>

      {/* Product Information Body */}
      <div className="flex flex-1 flex-col p-4 sm:p-4.5">
        <div className="mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            {product.category}
          </span>
        </div>

        <Link
          to={`${ROUTES.shopProduct}/${product.id}`}
          className="line-clamp-2 text-sm font-semibold text-slate-900 transition-colors duration-150 hover:text-emerald-600 dark:text-slate-100 dark:hover:text-emerald-400"
        >
          {product.name}
        </Link>

        {/* Price & Action Row */}
        <div className="mt-auto pt-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-base font-extrabold text-slate-950 dark:text-white">
              {formatCurrency(product.price)}
            </p>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              Incl. taxes
            </span>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`group/btn mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold shadow-xs transition-all duration-200 ease-out active:scale-[0.99] ${
              isOutOfStock
                ? "cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600"
                : "bg-emerald-600 text-white hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-sm active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500"
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
              className="h-3.5 w-3.5 transition-transform duration-200 group-hover/btn:scale-110"
            >
              <circle cx="9" cy="20" r="1.4" />
              <circle cx="18" cy="20" r="1.4" />
              <path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8a2 2 0 0 0 2-1.6L21 8H6" />
            </svg>
            <span>{isOutOfStock ? "Out of Stock" : "Add to Cart"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
