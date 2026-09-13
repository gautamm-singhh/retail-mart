import { fetchPayments, updatePaymentStatus, downloadPaymentReceipt } from "@/services/api/payments";
import { ApiError } from "@/services/api/client";
import type { Payment } from "@/types";

/**
 * The single definition of "this payment is a refund" - a refund is
 * modeled as a Payment whose status is "Refunded" rather than as a
 * separate domain entity. Both the repository and usePayments() import
 * this so "payments" vs "refunds" can never drift apart into two
 * different definitions.
 */
export function isRefund(payment: Payment): boolean {
  return payment.status === "Refunded";
}

export const paymentRepository = {
  /** All payment records regardless of status. Used for detail lookups where a refund still needs to be viewable. */
  list: (): Promise<Payment[]> => fetchPayments(),

  /**
   * Marks a payment as refunded via PATCH /payments/<id>/status. Only
   * meaningful from "Paid" - mirrored here client-side (in addition to
   * whatever the backend enforces) so the UI's own guard stays honest even
   * if the backend's rules evolve.
   */
  markRefunded: async (id: string, payments: Payment[]): Promise<Payment | undefined> => {
    const payment = payments.find((p) => p.id === id);
    if (!payment || payment.status !== "Paid") return undefined;

    try {
      return await updatePaymentStatus(id, "Refunded");
    } catch (err) {
      if (err instanceof ApiError) return undefined;
      throw err;
    }
  },

  /**
   * Triggers a browser download of the payment's receipt PDF. Only
   * available once the payment's status is "Paid" - the backend responds
   * 409 otherwise (see GET /payments/<id>/receipt).
   */
  downloadReceipt: (id: string): Promise<void> => downloadPaymentReceipt(id),
};
