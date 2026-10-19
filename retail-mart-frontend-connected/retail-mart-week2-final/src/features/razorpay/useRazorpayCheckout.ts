import { useCallback, useState } from "react";
import { createRazorpayOrder, verifyRazorpayPayment } from "@/services/api/razorpay";
import type { Payment } from "@/types";

const CHECKOUT_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

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

export function useRazorpayCheckout() {
  const [isProcessing, setIsProcessing] = useState(false);

  const payWithRazorpay = useCallback(
    (paymentId: string, customerName: string, customerEmail: string): Promise<Payment> => {
      setIsProcessing(true);

      return createRazorpayOrder(paymentId)
        .then((order) => {
          if (!order.live) {
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
                if (typeof (razorpay as unknown as { on?: (event: string, cb: (res: { error: { description?: string } }) => void) => void }).on === "function") {
                  (razorpay as unknown as { on: (event: string, cb: (res: { error: { description?: string } }) => void) => void }).on(
                    "payment.failed",
                    (res) => reject(new Error(res?.error?.description || "Payment failed")),
                  );
                }
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
