import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCart } from "@/features/cart/useCart";
import { formatCurrency } from "@/utils/format";
import { ROUTES } from "@/constants/routes";

export default function CartPage() {
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <EmptyState
        title="Your shopping cart is empty"
        description="Explore our curated catalog to find quality essentials and trending items."
        action={
          <Button variant="primary" size="md" onClick={() => navigate(ROUTES.shop)} className="px-6 rounded-xl">
            Explore Catalog
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800/90">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Shopping Cart
          </h1>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        </div>
        <Link
          to={ROUTES.shop}
          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors dark:text-emerald-400"
        >
          ← Continue Shopping
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Items List */}
        <div className="flex flex-col gap-3.5 lg:col-span-8">
          {items.map((item) => (
            <div
              key={item.productId}
              className="group flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs transition-all duration-200 hover:border-emerald-500/30 hover:shadow-sm dark:border-slate-800/90 dark:bg-slate-900"
            >
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl font-black text-emerald-700 dark:bg-slate-800 dark:text-emerald-300 shadow-xs">
                {item.productName.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <Link
                  to={`${ROUTES.shopProduct}/${item.productId}`}
                  className="line-clamp-1 text-sm font-bold text-slate-900 hover:text-emerald-600 dark:text-white dark:hover:text-emerald-400 transition-colors"
                >
                  {item.productName}
                </Link>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Unit Price: {formatCurrency(item.price)}
                </p>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4">
                <div className="flex items-center gap-2">
                  <label htmlFor={`qty-${item.productId}`} className="text-xs text-slate-500 sr-only">
                    Quantity
                  </label>
                  <select
                    id={`qty-${item.productId}`}
                    aria-label={`Quantity for ${item.productName}`}
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.productId, Number(e.target.value))}
                    className="rounded-xl border border-slate-200 bg-white py-1.5 pl-2.5 pr-7 text-xs font-semibold text-slate-800 shadow-xs focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>

                <p className="w-24 text-right font-extrabold text-slate-900 dark:text-white text-sm">
                  {formatCurrency(item.price * item.quantity)}
                </p>

                <button
                  type="button"
                  onClick={() => removeItem(item.productId)}
                  aria-label={`Remove ${item.productName} from cart`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-4">
          <div className="sticky top-20 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800/90 dark:bg-slate-900 transition-colors">
            <h2 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
              Order Summary
            </h2>

            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal ({items.length} items)</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Standard Express Delivery</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Free</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Estimated Tax (Included)</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">₹0.00</span>
              </div>

              <div className="mt-4 flex justify-between border-t border-slate-100 pt-4 text-base font-black text-slate-950 dark:border-slate-800 dark:text-white">
                <span>Order Total</span>
                <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(subtotal)}</span>
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold shadow-xs"
              onClick={() => navigate(ROUTES.checkout)}
            >
              <span>Proceed to Checkout</span>
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

            <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
              <span>🔒 256-bit SSL Secure Checkout</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
