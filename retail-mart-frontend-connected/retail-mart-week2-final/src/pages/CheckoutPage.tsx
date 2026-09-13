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
import { formatCurrency } from "@/utils/format";
import { ROUTES } from "@/constants/routes";

export default function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const { addresses, isLoading, error, addAddress } = useAddresses();
  const { currentUser } = useAuth();
  const { payWithRazorpay } = useRazorpayCheckout();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const effectiveSelectedId = selectedAddressId ?? addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? null;

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
    const created = await addAddress(values);
    setSelectedAddressId(created.id);
    setIsAddingAddress(false);
  }

  async function handlePlaceOrder() {
    if (!currentUser) return;
    setIsPlacingOrder(true);
    try {
      const order = await createOrder({
        customer: currentUser.name,
        customerEmail: currentUser.email ?? "",
        items: items.map((item) => ({
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
        } catch {
          showToast(
            "Order placed, but payment wasn't completed. You can pay again from My Orders.",
            "error",
          );
        }
      } else {
        showToast("Order placed successfully!");
      }

      navigate(`${ROUTES.myOrders}?justPlaced=${order.id}`);
    } catch {
      showToast("Something went wrong placing your order.", "error");
    } finally {
      setIsPlacingOrder(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800/90">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Secure Checkout
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Review your delivery destination and confirm your order
          </p>
        </div>
        <Link
          to={ROUTES.cart}
          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors dark:text-emerald-400"
        >
          ← Return to Cart
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Main Details Column */}
        <div className="flex flex-col gap-6 lg:col-span-8">
          {/* Delivery Address Section */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800/90 dark:bg-slate-900 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
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
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
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
                        ? "border-emerald-600 bg-emerald-50/50 shadow-xs dark:border-emerald-500 dark:bg-emerald-950/30"
                        : "border-slate-200/80 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      className="mt-1 accent-emerald-600"
                      checked={effectiveSelectedId === address.id}
                      onChange={() => setSelectedAddressId(address.id)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{address.label}</span>
                        {address.isDefault && (
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            Default
                          </span>
                        )}
                      </div>
                      <span className="mt-1 block text-slate-600 dark:text-slate-400">
                        {address.line1}
                        {address.line2 ? `, ${address.line2}` : ""}, {address.city}, {address.state} — {address.postalCode}
                      </span>
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

          {/* Order Items Review Section */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800/90 dark:bg-slate-900 transition-colors">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                2
              </span>
              <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                Review Items ({items.length})
              </h2>
            </div>

            <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {items.map((item) => (
                <li key={item.productId} className="flex items-center justify-between py-3 text-xs sm:text-sm">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white">{item.productName}</span>
                    <span className="ml-2 text-slate-400 dark:text-slate-500">× {item.quantity}</span>
                  </div>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Order Summary Column */}
        <div className="lg:col-span-4">
          <div className="sticky top-20 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800/90 dark:bg-slate-900 transition-colors">
            <h2 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
              Payment Summary
            </h2>

            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal ({items.length} items)</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Express Carrier Shipping</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Free</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Estimated Taxes</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">Included</span>
              </div>

              <div className="mt-4 flex justify-between border-t border-slate-100 pt-4 text-base font-black text-slate-950 dark:border-slate-800 dark:text-white">
                <span>Total Amount</span>
                <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(subtotal)}</span>
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold shadow-xs"
              onClick={handlePlaceOrder}
              disabled={isPlacingOrder || !effectiveSelectedId}
            >
              <span>{isPlacingOrder ? "Placing Order..." : "Place Order & Pay"}</span>
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

            {!effectiveSelectedId && !isLoading && (
              <p className="mt-2.5 text-center text-xs font-semibold text-rose-600 dark:text-rose-400">
                Please select or add a delivery address to continue.
              </p>
            )}

            <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
              Payment will be processed securely via RazorPay. You will receive an instant order confirmation email.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
