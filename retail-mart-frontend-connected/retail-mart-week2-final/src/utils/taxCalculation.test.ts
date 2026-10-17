import { describe, it, expect } from "vitest";
import {
  calculateOrderTaxBreakdown,
  determineSupplyType,
} from "./taxCalculation";
import { CartItem } from "../types/customer";

describe("Statutory Indian GST Calculation Engine (Frontend)", () => {
  it("correctly identifies intra-state supply for Telangana delivery address", () => {
    const res = determineSupplyType("Telangana");
    expect(res.supplyType).toBe("intra");

    const resLower = determineSupplyType("telangana");
    expect(resLower.supplyType).toBe("intra");
  });

  it("correctly identifies inter-state supply for other Indian states (e.g. Karnataka, Maharashtra)", () => {
    const karnataka = determineSupplyType("Karnataka");
    expect(karnataka.supplyType).toBe("inter");

    const maharashtra = determineSupplyType("Maharashtra");
    expect(maharashtra.supplyType).toBe("inter");
  });

  it("calculates 5% GST reverse-breakdown for Cotton Crew T-Shirt (₹499) intra-state (Telangana)", () => {
    const items: CartItem[] = [
      {
        productId: "p1",
        productName: "Cotton Crew T-Shirt",
        price: 499,
        quantity: 1,
      },
    ];

    const breakdown = calculateOrderTaxBreakdown(items, "Telangana");

    expect(breakdown.supplyType).toBe("intra");
    expect(breakdown.isPlaceOfSupplyIntra).toBe(true);
    expect(breakdown.subtotal).toBe(499);
    expect(breakdown.totalPayable).toBe(499);
    // 499 / 1.05 = 475.238... -> 475.24 taxable
    expect(breakdown.taxableValue).toBe(475.24);
    // GST = 23.76
    expect(breakdown.totalGst).toBe(23.76);
    // CGST 50% = 11.88, SGST 50% = 11.88
    expect(breakdown.cgstAmount).toBe(11.88);
    expect(breakdown.sgstAmount).toBe(11.88);
    expect(breakdown.igstAmount).toBe(0);

    // Exact penny precision check
    expect(
      Number(
        (
          breakdown.taxableValue +
          breakdown.cgstAmount +
          breakdown.sgstAmount
        ).toFixed(2)
      )
    ).toBe(499);
  });

  it("calculates 5% GST for Cotton Crew T-Shirt (₹499) inter-state (Karnataka) with IGST", () => {
    const items: CartItem[] = [
      {
        productId: "p1",
        productName: "Cotton Crew T-Shirt",
        price: 499,
        quantity: 1,
      },
    ];

    const breakdown = calculateOrderTaxBreakdown(items, "Karnataka");

    expect(breakdown.supplyType).toBe("inter");
    expect(breakdown.isPlaceOfSupplyIntra).toBe(false);
    expect(breakdown.subtotal).toBe(499);
    expect(breakdown.totalPayable).toBe(499);
    expect(breakdown.taxableValue).toBe(475.24);
    expect(breakdown.cgstAmount).toBe(0);
    expect(breakdown.sgstAmount).toBe(0);
    expect(breakdown.igstAmount).toBe(23.76);
    expect(breakdown.totalGst).toBe(23.76);

    expect(
      Number((breakdown.taxableValue + breakdown.igstAmount).toFixed(2))
    ).toBe(499);
  });

  it("handles multi-product cart with mixed GST slabs (5%, 12%, 18%)", () => {
    const items: CartItem[] = [
      {
        productId: "p1",
        productName: "Cotton Crew T-Shirt",
        price: 499,
        quantity: 1,
      },
      {
        productId: "p2",
        productName: "Slim Fit Denim Jeans",
        price: 1799,
        quantity: 1,
      },
      {
        productId: "p3",
        productName: "Wireless Earbuds Pro",
        price: 2999,
        quantity: 1,
      },
    ];

    // Total gross = 499 + 1799 + 2999 = 5297
    const breakdown = calculateOrderTaxBreakdown(items, "Telangana");

    expect(breakdown.subtotal).toBe(5297);
    expect(breakdown.totalPayable).toBe(5297);

    // Sum of taxable: 475.24 (T-shirt @ 5%) + 1713.33 (Jeans @ 5%) + 2541.53 (Earbuds @ 18%) = 4730.10
    expect(breakdown.taxableValue).toBe(4730.1);
    // CGST: 11.88 + 42.84 + 228.74 = 283.46
    // SGST: 11.88 + 42.83 + 228.73 = 283.44
    // Total GST = 566.90
    expect(breakdown.cgstAmount).toBe(283.46);
    expect(breakdown.sgstAmount).toBe(283.44);
    expect(breakdown.totalGst).toBe(566.9);

    expect(
      Number(
        (
          breakdown.taxableValue +
          breakdown.cgstAmount +
          breakdown.sgstAmount
        ).toFixed(2)
      )
    ).toBe(5297);

    // Slabs: 5% (T-Shirt & Jeans) and 18% (Earbuds) -> 2 distinct slabs
    expect(breakdown.slabs.length).toBe(2);
  });

  it("updates dynamically when quantity is updated", () => {
    const items: CartItem[] = [
      {
        productId: "p1",
        productName: "Cotton Crew T-Shirt",
        price: 499,
        quantity: 2,
      },
    ];

    const breakdown = calculateOrderTaxBreakdown(items, "Telangana");
    expect(breakdown.subtotal).toBe(998);
    expect(breakdown.taxableValue).toBe(950.48);
    expect(breakdown.totalGst).toBe(47.52);
    expect(
      Number((breakdown.taxableValue + breakdown.totalGst).toFixed(2))
    ).toBe(998);
  });

  it("handles delivery address switching seamlessly", () => {
    const items: CartItem[] = [
      {
        productId: "p1",
        productName: "Wireless Earbuds Pro",
        price: 2999,
        quantity: 1,
      },
    ];

    const intraBreakdown = calculateOrderTaxBreakdown(items, "Telangana");
    expect(intraBreakdown.cgstAmount).toBe(228.74);
    expect(intraBreakdown.sgstAmount).toBe(228.73);
    expect(intraBreakdown.igstAmount).toBe(0);

    const interBreakdown = calculateOrderTaxBreakdown(items, "Karnataka");
    expect(interBreakdown.cgstAmount).toBe(0);
    expect(interBreakdown.sgstAmount).toBe(0);
    expect(interBreakdown.igstAmount).toBe(457.47);

    // Total payable is invariant
    expect(intraBreakdown.totalPayable).toBe(2999);
    expect(interBreakdown.totalPayable).toBe(2999);
  });
});
