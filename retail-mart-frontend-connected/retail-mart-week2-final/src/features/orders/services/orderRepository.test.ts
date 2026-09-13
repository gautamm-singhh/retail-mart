import { describe, expect, it } from "vitest";
import { orderRepository } from "@/features/orders/services/orderRepository";
import { mockOrders } from "@/features/orders/data/orders";
import { ApiError } from "@/services/api/client";

// Exercises orderRepository against the in-memory fake backend in
// src/test/mockApi.ts (installed globally in src/test/setup.ts), which
// implements the same ORDER_STATUS_TRANSITIONS rule as the real Flask API.
describe("orderRepository.updateStatus", () => {
  it("allows a valid forward transition and records status history", async () => {
    const pendingOrder = mockOrders.find((o) => o.status === "Pending");
    expect(pendingOrder).toBeDefined();

    const updated = await orderRepository.updateStatus(pendingOrder!.id, "Processing");

    expect(updated.status).toBe("Processing");
    expect(updated.statusHistory.at(-1)?.status).toBe("Processing");
  });

  it("rejects an invalid transition (skipping a step) with a 409", async () => {
    const pendingOrder = mockOrders.find((o) => o.status === "Pending");
    expect(pendingOrder).toBeDefined();

    // Pending -> Delivered is not an allowed transition.
    await expect(
      orderRepository.updateStatus(pendingOrder!.id, "Delivered"),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("rejects any transition once an order is Delivered (a final state)", async () => {
    const deliveredOrder = mockOrders.find((o) => o.status === "Delivered");
    expect(deliveredOrder).toBeDefined();

    await expect(
      orderRepository.updateStatus(deliveredOrder!.id, "Cancelled"),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("rejects with a 404 for an order id that doesn't exist", async () => {
    await expect(
      orderRepository.updateStatus("ORD-DOES-NOT-EXIST", "Processing"),
    ).rejects.toMatchObject({ status: 404 });
  });
});
