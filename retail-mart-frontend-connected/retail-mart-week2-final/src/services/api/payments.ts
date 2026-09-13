import { request, downloadFile } from "@/services/api/client";
import type { Payment, PaymentStatus } from "@/types";

export function fetchPayments(): Promise<Payment[]> {
  return request<Payment[]>("/payments");
}

export function updatePaymentStatus(id: string, status: PaymentStatus): Promise<Payment> {
  return request<Payment>(`/payments/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function downloadPaymentReceipt(id: string): Promise<void> {
  return downloadFile(`/payments/${id}/receipt`, `receipt-${id}.pdf`);
}
