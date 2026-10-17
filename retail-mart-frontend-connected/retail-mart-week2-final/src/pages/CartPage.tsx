import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCart } from "@/features/cart/useCart";
import { formatCurrency } from "@/utils/format";
import { ROUTES } from "@/constants/routes";

export default function CartPage() {
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  const navigate = useNavigate();
  const standardDeliveryFee = 99;
  const totalAmount = subtotal;

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
          <div className="sticky top-20 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors">
            {/* Summary Card Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                    Order Summary
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Transparent pricing breakdown
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {items.length} {items.length === 1 ? "item" : "items"}
              </span>
            </div>

            {/* Pricing Breakdown Rows */}
            <div className="mt-4 space-y-3 text-xs sm:text-sm">
              {/* 1. Subtotal */}
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Items Subtotal ({items.length} {items.length === 1 ? "item" : "items"})</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrency(subtotal)}
                </span>
              </div>

              {/* 2. Delivery Charges */}
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span>Delivery Charges</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                    (Standard Express)
                  </span>
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400 line-through dark:text-slate-500">
                    {formatCurrency(standardDeliveryFee)}
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">FREE</span>
                </div>
              </div>

              {/* 3. Discount */}
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Discount</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">
                  ₹0
                </span>
              </div>

              {/* 4. GST / Tax Line Item */}
              <div className="rounded-xl bg-slate-50/80 p-3 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-slate-900 dark:text-slate-100">Estimated GST / Taxes</span>
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100/70 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50">
                      Included
                    </span>
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    Included
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Taxes included where applicable
                </p>
              </div>

              {/* Savings callout banner (Amazon / Flipkart style) */}
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50/90 px-3 py-2 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                <span className="text-sm">🎉</span>
                <span>
                  You save <strong>{formatCurrency(standardDeliveryFee)}</strong> on delivery for this order!
                </span>
              </div>

              {/* 5. Total Amount (Prominent Highlight Box) */}
              <div className="mt-3 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white shadow-md dark:from-slate-800 dark:to-slate-950 border border-slate-800 dark:border-slate-700">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Total Payable
                    </span>
                    <p className="text-[11px] text-slate-400 font-normal">
                      Inclusive of all taxes where applicable
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-300">
                  <span>Net Payable Amount:</span>
                  <span className="font-bold text-emerald-400">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <Button
              variant="primary"
              size="md"
              className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold shadow-md hover:shadow-lg transition-all"
              onClick={() => navigate(ROUTES.checkout)}
            >
              <span>{`Proceed to Checkout • ${formatCurrency(totalAmount)}`}</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Button>

            {/* Trust, Security & Reassurance Section */}
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Secure Checkout</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 p-2 dark:bg-slate-800/40">
                  <span className="text-emerald-500">🔒</span>
                  <span>Secure checkout</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 p-2 dark:bg-slate-800/40">
                  <span className="text-indigo-500">⚡</span>
                  <span>Payments processed via Razorpay</span>
                </div>
              </div>

              {/* Supported Payment Methods Badge Row */}
              <div className="flex items-center justify-center gap-1.5 flex-wrap pt-0.5">
                {["UPI", "Google Pay", "PhonePe", "Paytm", "Cards", "NetBanking"].map((method) => (
                  <span
                    key={method}
                    className="rounded border border-slate-200/80 bg-slate-50/80 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400"
                  >
                    {method}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
