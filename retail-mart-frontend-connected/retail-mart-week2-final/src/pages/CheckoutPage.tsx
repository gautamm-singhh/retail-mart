import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { AddressForm } from "@/features/addresses/components/AddressForm";
import { useAddresses } from "@/features/addresses/useAddresses";
import { useCart } from "@/features/cart/useCart";
import { useAuth } from "@/features/auth/useAuth";
import { useRazorpayCheckout } from "@/features/razorpay/useRazorpayCheckout";
import { createOrder } from "@/services/api/orders";
import { useToast } from "@/hooks/useToast";
import type { AddressFormValues } from "@/types";
import { formatCurrency, formatTaxAmount } from "@/utils/format";
import { ROUTES } from "@/constants/routes";
import { calculateOrderTaxBreakdown } from "@/utils/taxCalculation";
import { SELLER_TAX_PROFILE, PRODUCT_TAX_REGISTRY } from "@/constants/taxConfig";
import { getProductExactImage, NEUTRAL_PRODUCT_FALLBACK } from "@/features/shop/utils/productImages";
import { ApiError } from "@/services/api/client";

export default function CheckoutPage() {
  const { items, clear } = useCart();
  const { addresses, isLoading, error, addAddress } = useAddresses();
  const { currentUser } = useAuth();
  const { payWithRazorpay } = useRazorpayCheckout();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const effectiveSelectedId =
    selectedAddressId ?? addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? null;
  const effectiveSelectedAddress = addresses.find((a) => a.id === effectiveSelectedId) ?? null;

  // Pricing breakdown (Prices are tax-inclusive MRP standard)
  const deliveryCharge = 0; // Free Express Delivery
  const standardDeliveryFee = 99; // Standard carrier fee crossed out to highlight savings
  const discountAmount = 0; // Base discount (₹0)

  // Real-time authoritative Place of Supply & Tax Calculation
  const taxBreakdown = calculateOrderTaxBreakdown(
    items,
    effectiveSelectedAddress?.state,
    discountAmount,
    deliveryCharge,
  );

  // Final Total Amount = Subtotal + Delivery Charges - Discount
  const totalAmount = taxBreakdown.totalPayable;

  if (items.length === 0) {
    return (
      <EmptyState
        title="Your cart is empty"
        description="Please add items to your cart before proceeding to checkout."
        action={
          <Button variant="primary" size="md" onClick={() => navigate(ROUTES.shop)} className="px-6 rounded-xl">
            Explore Catalog
          </Button>
        }
      />
    );
  }

  async function handleAddAddress(values: AddressFormValues) {
    try {
      const created = await addAddress(values);
      setSelectedAddressId(created.id);
      setIsAddingAddress(false);
      showToast("Address saved and selected.");
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : (err as Error)?.message || "Failed to save address.";
      showToast(msg, "error");
    }
  }

  async function handlePlaceOrder() {
    if (!currentUser) return;
    setIsPlacingOrder(true);
    try {
      const order = await createOrder({
        customer: currentUser.name,
        customerEmail: currentUser.email ?? "",
        destinationState: effectiveSelectedAddress?.state,
        items: items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
        })),
      });
      clear();

      if (order.paymentId) {
        try {
          await payWithRazorpay(order.paymentId, currentUser.name, currentUser.email ?? "");
          showToast("Payment successful! Your order is confirmed.");
        } catch (paymentErr: unknown) {
          const pMsg =
            paymentErr instanceof Error && paymentErr.message.toLowerCase().includes("cancel")
              ? "Payment cancelled. You can complete payment anytime from My Orders."
              : "Order placed, but payment wasn't completed. You can pay again from My Orders.";
          showToast(pMsg, "error");
        }
      } else {
        showToast("Order placed successfully!");
      }

      navigate(`${ROUTES.myOrders}?justPlaced=${order.id}`);
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : (err as Error)?.message || "Something went wrong placing your order.";
      showToast(msg, "error");
    } finally {
      setIsPlacingOrder(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Checkout Progress Stepper */}
      <nav
        aria-label="Checkout progress"
        className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800/90 dark:bg-slate-900 transition-colors"
      >
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <Link
            to={ROUTES.cart}
            className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 group"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs group-hover:scale-105 transition-transform">
              ✓
            </span>
            <span className="hidden sm:inline">Shopping Cart</span>
          </Link>

          <div className="flex-1 mx-3 h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full" />

          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
            <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm ring-4 ring-emerald-500/20">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-25" />
              2
            </span>
            <span className="hidden sm:inline">Delivery & Review</span>
          </div>

          <div className="flex-1 mx-3 h-0.5 bg-slate-200 dark:bg-slate-800 rounded-full" />

          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 dark:text-slate-500">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 font-semibold text-[11px]">
              3
            </span>
            <span className="hidden sm:inline">Payment & Confirm</span>
          </div>
        </div>
      </nav>

      {/* Page Title & Return to Cart */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800/90">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Secure Checkout
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Confirm your delivery destination and review your order summary
          </p>
        </div>
        <Link
          to={ROUTES.cart}
          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors dark:text-emerald-400 flex items-center gap-1"
        >
          <span>← Return to Cart</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column (8 cols): Delivery Destination & Review Items */}
        <div className="flex flex-col gap-6 lg:col-span-7 xl:col-span-8">
          {/* Section 1: Delivery Address */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800/90 dark:bg-slate-900 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  1
                </span>
                <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                  Delivery Destination
                </h2>
              </div>
              {!isAddingAddress && addresses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsAddingAddress(true)}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 transition-colors"
                >
                  + Add New Address
                </button>
              )}
            </div>

            {isLoading ? (
              <LoadingState label="Loading saved addresses..." rows={2} />
            ) : error ? (
              <ErrorState title="Couldn't load addresses" description={error} />
            ) : (
              <div className="space-y-3">
                {addresses.map((address) => (
                  <label
                    key={address.id}
                    className={`flex cursor-pointer items-start gap-3.5 rounded-xl border p-4 text-xs sm:text-sm transition-all duration-150 ${
                      effectiveSelectedId === address.id
                        ? "border-emerald-600 bg-emerald-50/40 shadow-xs ring-1 ring-emerald-500/20 dark:border-emerald-500 dark:bg-emerald-950/25"
                        : "border-slate-200/80 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      className="mt-1 h-4 w-4 accent-emerald-600"
                      checked={effectiveSelectedId === address.id}
                      onChange={() => setSelectedAddressId(address.id)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{address.label}</span>
                        {address.isDefault && (
                          <span className="rounded-md bg-emerald-100/70 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                            Default Address
                          </span>
                        )}
                        {effectiveSelectedId === address.id && (
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            Delivering Here
                          </span>
                        )}
                      </div>
                      <span className="mt-1 block text-slate-600 dark:text-slate-400 leading-relaxed">
                        {address.line1}
                        {address.line2 ? `, ${address.line2}` : ""}, {address.city}, {address.state} — {address.postalCode}
                      </span>
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          Free Standard Delivery
                        </span>
                        <span>•</span>
                        <span>Est. delivery: 2–4 business days</span>
                      </div>
                    </div>
                  </label>
                ))}

                {isAddingAddress && (
                  <div className="mt-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800 animate-in fade-in-50">
                    <AddressForm
                      submitLabel="Save & Deliver Here"
                      onSubmit={handleAddAddress}
                      onCancel={() => setIsAddingAddress(false)}
                    />
                  </div>
                )}

                {!isAddingAddress && addresses.length === 0 && (
                  <Button variant="secondary" size="sm" onClick={() => setIsAddingAddress(true)} className="mt-2">
                    + Add a delivery address
                  </Button>
                )}
              </div>
            )}
          </section>

          {/* Section 2: Review Items */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800/90 dark:bg-slate-900 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  2
                </span>
                <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                  Order Items ({items.length})
                </h2>
              </div>
              <Link
                to={ROUTES.cart}
                className="text-xs font-medium text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400"
              >
                Edit Cart
              </Link>
            </div>

            <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {items.map((item, index) => {
                const itemImg = getProductExactImage({ id: item.productId, name: item.productName });
                return (
                  <li key={item.productId} className="flex items-center justify-between py-3 text-xs sm:text-sm">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {index + 1}
                      </span>
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800 flex items-center justify-center">
                        <img
                          src={itemImg}
                          alt={item.productName}
                          loading="lazy"
                          className="h-full w-full object-contain p-0.5"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = NEUTRAL_PRODUCT_FALLBACK;
                          }}
                        />
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white">{item.productName}</span>
                        <div className="flex items-center gap-2 mt-0.5 text-slate-500 dark:text-slate-400 text-xs">
                          <span>Qty: <strong>{item.quantity}</strong></span>
                          <span>•</span>
                          <span>{formatCurrency(item.price)} each</span>
                        </div>
                      </div>
                    </div>
                  <div className="text-right">
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                    <span className="block text-[10px] text-slate-400 dark:text-slate-500">
                      {PRODUCT_TAX_REGISTRY[item.productName]
                        ? `Taxes included • HSN ${PRODUCT_TAX_REGISTRY[item.productName].hsn} (${PRODUCT_TAX_REGISTRY[item.productName].rate}%)`
                        : "Taxes included"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
          </section>
        </div>

        {/* Right Column (4 cols): Modern E-commerce Payment Summary Card */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="sticky top-20 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors">
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
                    Payment Summary
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
                  {formatCurrency(taxBreakdown.subtotal)}
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

              {/* 4. Taxable Value (Net Goods Base) */}
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Taxable Value (Net Base)</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">
                  {formatTaxAmount(taxBreakdown.taxableValue)}
                </span>
              </div>

              {/* 5. Statutory GST / Taxes Breakdown */}
              <div className="rounded-xl bg-slate-50/90 p-3.5 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      Estimated GST / Taxes
                    </span>
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                      Included
                    </span>
                  </div>
                  <span className="font-extrabold text-slate-900 dark:text-slate-100">
                    {formatTaxAmount(taxBreakdown.totalGst)}
                  </span>
                </div>

                {/* Place of Supply indicator */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  <span>Place of Supply:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {taxBreakdown.isPlaceOfSupplyIntra
                      ? `Intra-State (${SELLER_TAX_PROFILE.state} → ${taxBreakdown.destinationState})`
                      : `Inter-State (${SELLER_TAX_PROFILE.state} → ${taxBreakdown.destinationState})`}
                  </span>
                </div>

                {/* CGST + SGST or IGST line items */}
                <div className="space-y-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                  {taxBreakdown.isPlaceOfSupplyIntra ? (
                    <>
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span>• CGST (Central Tax):</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {formatTaxAmount(taxBreakdown.cgstAmount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span>• SGST (State Tax):</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {formatTaxAmount(taxBreakdown.sgstAmount)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>• IGST (Integrated Tax):</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {formatTaxAmount(taxBreakdown.igstAmount)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Slabs summary (HSN verified) */}
                {taxBreakdown.slabs.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                      Product Tax Slabs (HSN Verified):
                    </span>
                    {taxBreakdown.slabs.map((slab) => (
                      <div key={slab.hsn} className="flex items-center justify-between">
                        <span>HSN {slab.hsn} ({slab.rate}%):</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          Taxable: {formatTaxAmount(slab.taxableValue)} | Tax: {formatTaxAmount(slab.totalTax)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Statutory Pending Registration Notice */}
                <div className="mt-2 rounded-lg bg-amber-50/90 p-2.5 text-[11px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 border border-amber-200/70 dark:border-amber-800/50">
                  <div className="flex items-start gap-1.5">
                    <span className="text-xs">ℹ️</span>
                    <div>
                      <p className="font-bold">
                        GST Registration in Progress (Preview Mode)
                      </p>
                      <p className="mt-0.5 text-[10px] text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
                        Seller GSTIN: Pending client registration. Breakdown reflects statutory tax estimates based on official HSN rates. Official GST is not separately charged.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
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

              {/* 6. Total Amount (Prominent Highlight Box) */}
              <div className="mt-3 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white shadow-md dark:from-slate-800 dark:to-slate-950 border border-slate-800 dark:border-slate-700">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Total Amount
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

            {/* Place Order & Pay CTA Button */}
            <Button
              variant="primary"
              size="md"
              className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold shadow-md hover:shadow-lg transition-all"
              onClick={handlePlaceOrder}
              disabled={isPlacingOrder || !effectiveSelectedId}
            >
              <span>{isPlacingOrder ? "Placing Order..." : `Place Order & Pay • ${formatCurrency(totalAmount)}`}</span>
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

            {!effectiveSelectedId && !isLoading && (
              <div className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40">
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Please select or add a delivery address to continue.</span>
              </div>
            )}

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

              <p className="text-center text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
                You will receive an order confirmation & tax invoice after successful payment.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Modal during Order Placement */}
      {isPlacingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs animate-in fade-in-50">
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 text-center max-w-xs mx-4">
            <div className="h-10 w-10 animate-spin rounded-full border-3 border-emerald-600 border-t-transparent" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Connecting Secure Checkout</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Initializing payment gateway and generating live order...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
