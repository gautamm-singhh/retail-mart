import { fetchPayments, updatePaymentStatus, downloadPaymentReceipt } from "@/services/api/payments";
import { ApiError } from "@/services/api/client";
import type { Payment } from "@/types";

export function isRefund(payment: Payment): boolean {
  return payment.status === "Refunded";
}

export const paymentRepository = {
  list: (): Promise<Payment[]> => fetchPayments(),

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

  downloadReceipt: (id: string): Promise<void> => downloadPaymentReceipt(id),
};
