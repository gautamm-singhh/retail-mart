import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "@/features/cart/useCart";
import { useWishlist } from "@/features/wishlist/useWishlist";
import { useToast } from "@/hooks/useToast";
import type { Product } from "@/types";
import { formatCurrency } from "@/utils/format";
import { ROUTES } from "@/constants/routes";
import { getProductExactImage } from "@/features/shop/utils/productImages";

interface ProductCardProps {
  product: Product;
  /** Optional animation delay for staggered grid entrances (in ms) */
  animDelay?: number;
}

export function ProductCard({ product, animDelay = 0 }: ProductCardProps) {
  const { addItem } = useCart();
  const { isWishlisted: checkWishlisted, toggleWishlist, pendingProductIds } = useWishlist();
  const { showToast } = useToast();
  const [imgError, setImgError] = useState(false);
  const [cartPop, setCartPop] = useState(false);
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
    // Micro-feedback: momentary green pulse on button
    setCartPop(true);
    setTimeout(() => setCartPop(false), 600);
  }

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  return (
    <div
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-emerald-400/50 hover:shadow-lg dark:border-slate-800/70 dark:bg-slate-900 dark:hover:border-emerald-500/40"
      style={animDelay ? { animationDelay: `${animDelay}ms` } : undefined}
    >
      {/* Product Image Container */}
      <Link
        to={`${ROUTES.shopProduct}/${product.id}`}
        className="relative block aspect-square w-full overflow-hidden bg-slate-100 dark:bg-slate-800/80"
        tabIndex={-1}
      >
        {displayImageUrl && !imgError ? (
          <img
            src={displayImageUrl}
            alt={product.name}
            loading="lazy"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 text-5xl font-black text-emerald-600/50 dark:from-slate-800 dark:to-slate-800 dark:text-emerald-400/40">
            {product.name.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Hover overlay gradient for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Wishlist Heart Button */}
        <button
          type="button"
          onClick={handleToggleWishlist}
          disabled={isWishlistPending}
          title={isWishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          className={[
            "absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full",
            "bg-white/92 shadow-sm backdrop-blur-sm",
            "transition-all duration-200",
            "dark:bg-slate-900/90 dark:text-slate-300",
            isWishlistPending
              ? "opacity-60 cursor-not-allowed"
              : "hover:scale-110 hover:bg-white active:scale-95",
          ].join(" ")}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill={isWishlisted ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={[
              "h-4 w-4 transition-all duration-200",
              isWishlisted
                ? "text-rose-500 fill-rose-500 scale-110"
                : "text-slate-500 hover:text-rose-400",
              isWishlistPending ? "animate-pulse" : "",
            ].join(" ")}
          >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
        </button>

        {/* Stock Status Pill */}
        {isOutOfStock && (
          <div className="absolute left-2.5 top-2.5 z-10 rounded-lg bg-rose-600/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs backdrop-blur-sm">
            Out of Stock
          </div>
        )}
        {isLowStock && (
          <div className="absolute left-2.5 top-2.5 z-10 rounded-lg bg-amber-500/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs backdrop-blur-sm">
            Only {product.stock} Left
          </div>
        )}
      </Link>

      {/* Product Information Body */}
      <div className="flex flex-1 flex-col p-4">
        {/* Category label */}
        <span className="text-[10.5px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
          {product.category}
        </span>

        {/* Product name */}
        <Link
          to={`${ROUTES.shopProduct}/${product.id}`}
          className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-slate-900 transition-colors duration-150 hover:text-emerald-600 dark:text-slate-100 dark:hover:text-emerald-400"
        >
          {product.name}
        </Link>

        {/* Price & Action Row */}
        <div className="mt-auto pt-3">
          <div className="flex items-baseline justify-between gap-2 mb-3">
            <p className="text-base font-extrabold tracking-tight text-slate-950 dark:text-white">
              {formatCurrency(product.price)}
            </p>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              Incl. taxes
            </span>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={[
              "group/btn flex w-full items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-semibold",
              "transition-all duration-200 ease-out",
              cartPop ? "scale-95 bg-emerald-500 text-white shadow-none" : "",
              isOutOfStock
                ? "cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600"
                : !cartPop
                  ? "bg-emerald-600 text-white shadow-xs hover:-translate-y-px hover:bg-emerald-700 hover:shadow-sm active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                  : "",
            ].join(" ")}
          >
            {/* Cart icon */}
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`h-3.5 w-3.5 transition-transform duration-200 ${cartPop ? "scale-125" : "group-hover/btn:scale-110"}`}
            >
              <circle cx="9" cy="20" r="1.4" />
              <circle cx="18" cy="20" r="1.4" />
              <path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8a2 2 0 0 0 2-1.6L21 8H6" />
            </svg>
            <span>{cartPop ? "Added!" : isOutOfStock ? "Out of Stock" : "Add to Cart"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
