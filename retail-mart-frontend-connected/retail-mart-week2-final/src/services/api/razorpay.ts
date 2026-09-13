import { request } from "@/services/api/client";
import type { Payment } from "@/types";

export interface RazorpayOrderResponse {
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
  paymentId: string;
  live: boolean;
}

export function createRazorpayOrder(paymentId: string): Promise<RazorpayOrderResponse> {
  return request<RazorpayOrderResponse>("/payments/razorpay/order", {
    method: "POST",
    body: JSON.stringify({ paymentId }),
  });
}

export function verifyRazorpayPayment(params: {
  paymentId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<Payment> {
  return request<Payment>("/payments/razorpay/verify", {
    method: "POST",
    body: JSON.stringify(params),
  });
}
