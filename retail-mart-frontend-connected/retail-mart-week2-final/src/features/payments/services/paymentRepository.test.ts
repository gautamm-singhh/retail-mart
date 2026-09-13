import { describe, expect, it } from "vitest";
import { paymentRepository } from "@/features/payments/services/paymentRepository";

describe("paymentRepository.markRefunded", () => {
  it("marks a Paid payment as Refunded and appends history", async () => {
    const payments = await paymentRepository.list();
    const paidPayment = payments.find((p) => p.status === "Paid");
    expect(paidPayment).toBeDefined();

    const updated = await paymentRepository.markRefunded(paidPayment!.id, payments);

    expect(updated?.status).toBe("Refunded");
    expect(updated?.history.at(-1)?.status).toBe("Refunded");
  });

  it("does not refund a payment that is not Paid", async () => {
    const payments = await paymentRepository.list();
    const pendingPayment = payments.find((p) => p.status === "Pending");
    expect(pendingPayment).toBeDefined();

    const updated = await paymentRepository.markRefunded(pendingPayment!.id, payments);

    expect(updated).toBeUndefined();
  });

  it("returns undefined for a payment id that doesn't exist", async () => {
    const payments = await paymentRepository.list();
    const updated = await paymentRepository.markRefunded("PAY-DOES-NOT-EXIST", payments);
    expect(updated).toBeUndefined();
  });
});
