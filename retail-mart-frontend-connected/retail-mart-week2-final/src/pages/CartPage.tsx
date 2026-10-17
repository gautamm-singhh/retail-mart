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
      <div className="rounded-3xl border border-slate-200/70 bg-white p-16 shadow-sm dark:border-slate-800/70 dark:bg-slate-900">
        <EmptyState
          title="Your shopping cart is empty"
          description="Explore our curated catalog to find quality essentials and trending items."
          action={
            <Button variant="primary" size="md" onClick={() => navigate(ROUTES.shop)} className="px-8 rounded-xl mt-2">
              Explore Catalog
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 dark:border-slate-800/70">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Shopping Cart
          </h1>
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        </div>
        <Link
          to={ROUTES.shop}
          className="flex items-center gap-1 text-xs font-semibold text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Continue Shopping
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-3 lg:col-span-8">
          {items.map((item, idx) => (
            <div
              key={item.productId}
              className="group flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-xs transition-all duration-200 hover:border-emerald-400/40 hover:shadow-sm dark:border-slate-800/70 dark:bg-slate-900"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 text-2xl font-black text-emerald-600 dark:from-slate-800 dark:to-slate-800 dark:text-emerald-400 shadow-xs">
                {item.productName.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <Link
                  to={`${ROUTES.shopProduct}/${item.productId}`}
                  className="line-clamp-1 text-sm font-semibold text-slate-900 hover:text-emerald-600 dark:text-white dark:hover:text-emerald-400 transition-colors"
                >
                  {item.productName}
                </Link>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Unit price: <span className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(item.price)}</span>
                </p>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-5">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label={`Decrease quantity of ${item.productName}`}
                    onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                    disabled={item.quantity <= 1}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  </button>
                  <span className="w-7 text-center text-sm font-semibold text-slate-900 dark:text-white">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label={`Increase quantity of ${item.productName}`}
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-all hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-emerald-600 dark:hover:bg-emerald-950/40"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  </button>
                </div>

                <p className="w-20 text-right text-sm font-extrabold text-slate-900 dark:text-white">
                  {formatCurrency(item.price * item.quantity)}
                </p>

                <button
                  type="button"
                  onClick={() => removeItem(item.productId)}
                  aria-label={`Remove ${item.productName} from cart`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
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

        <div className="lg:col-span-4">
          <div className="sticky top-20 rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm dark:border-slate-800/70 dark:bg-slate-900 transition-colors">
            <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
              Order Summary
            </h2>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal ({items.length} {items.length === 1 ? "item" : "items"})</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Standard Express Delivery</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Free</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Estimated Tax (Included)</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">₹0.00</span>
              </div>

              <div className="mt-4 flex justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                <span className="text-base font-bold text-slate-900 dark:text-white">Order Total</span>
                <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">{formatCurrency(subtotal)}</span>
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold"
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
                className="h-4 w-4"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Button>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5 text-emerald-500">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>256-bit SSL Secure Checkout</span>
            </div>

            <div className="mt-3 flex items-center justify-center gap-2">
              {["Visa", "MC", "UPI", "Net"].map((method) => (
                <span
                  key={method}
                  className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                >
                  {method}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
