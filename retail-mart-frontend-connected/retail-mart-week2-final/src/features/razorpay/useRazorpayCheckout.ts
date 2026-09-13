import { useCallback, useState } from "react";
import { createRazorpayOrder, verifyRazorpayPayment } from "@/services/api/razorpay";
import type { Payment } from "@/types";

const CHECKOUT_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

// Module-level cache so the RazorPay script tag is only ever injected once,
// no matter how many times payWithRazorpay() is called across the app.
let checkoutScriptPromise: Promise<void> | null = null;

function loadCheckoutScript(): Promise<void> {
  if (checkoutScriptPromise) return checkoutScriptPromise;

  checkoutScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${CHECKOUT_SCRIPT_SRC}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = CHECKOUT_SCRIPT_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load RazorPay checkout script"));
    document.body.appendChild(script);
  });

  return checkoutScriptPromise;
}

interface RazorpayCheckoutResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

/**
 * One hook for the whole RazorPay checkout flow: create order -> open
 * widget -> verify signature -> return the updated (Paid) Payment.
 *
 * In dev (no real RAZORPAY_KEY_ID configured on the backend - see that
 * project's README), the create-order response comes back with
 * `live: false` and this skips loading RazorPay's real widget entirely,
 * verifying immediately with a mock signature instead. This means the
 * full checkout flow, including the "money changes hands" UI state, is
 * testable with zero RazorPay account setup. Going live later requires no
 * changes here - only the backend's two env vars.
 */
export function useRazorpayCheckout() {
  const [isProcessing, setIsProcessing] = useState(false);

  const payWithRazorpay = useCallback(
    (paymentId: string, customerName: string, customerEmail: string): Promise<Payment> => {
      setIsProcessing(true);

      return createRazorpayOrder(paymentId)
        .then((order) => {
          if (!order.live) {
            // Mock mode: simulate an instant successful payment.
            return verifyRazorpayPayment({
              paymentId,
              razorpayOrderId: order.razorpayOrderId,
              razorpayPaymentId: `pay_mock_${Date.now()}`,
              razorpaySignature: "mock-signature",
            });
          }

          return loadCheckoutScript().then(
            () =>
              new Promise<Payment>((resolve, reject) => {
                if (!window.Razorpay) {
                  reject(new Error("RazorPay checkout script did not load"));
                  return;
                }
                const razorpay = new window.Razorpay({
                  key: order.keyId,
                  amount: order.amount,
                  currency: order.currency,
                  name: "Retail Mart",
                  description: `Payment ${paymentId}`,
                  order_id: order.razorpayOrderId,
                  prefill: { name: customerName, email: customerEmail },
                  handler: (response: RazorpayCheckoutResponse) => {
                    verifyRazorpayPayment({
                      paymentId,
                      razorpayOrderId: response.razorpay_order_id,
                      razorpayPaymentId: response.razorpay_payment_id,
                      razorpaySignature: response.razorpay_signature,
                    })
                      .then(resolve)
                      .catch(reject);
                  },
                  modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
                });
                razorpay.open();
              }),
          );
        })
        .finally(() => setIsProcessing(false));
    },
    [],
  );

  return { payWithRazorpay, isProcessing };
}
