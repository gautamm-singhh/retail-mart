import {
  SELLER_TAX_PROFILE,
  PRODUCT_TAX_REGISTRY,
  INDIAN_STATES_CODE_MAP,
  ProductTaxRule,
} from "../constants/taxConfig";
import { CartItem } from "../types/customer";

export interface TaxSlabBreakdown {
  rate: number;
  hsn: string;
  description: string;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
}

export interface OrderTaxBreakdown {
  subtotal: number;
  deliveryFee: number;
  discount: number;
  totalPayable: number;
  taxableValue: number;
  totalGst: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  supplyType: "intra" | "inter";
  isPlaceOfSupplyIntra: boolean;
  sellerState: string;
  sellerStateCode: string;
  destinationState: string;
  gstMode: "preview" | "live";
  slabs: TaxSlabBreakdown[];
}

/**
 * Determine statutory supply type based on Indian GST Place of Supply rules.
 * Intrastate: Supplier State == Destination/Place of Supply State -> CGST + SGST (50% each)
 * Interstate: Supplier State != Destination/Place of Supply State -> IGST (100%)
 */
export function determineSupplyType(destinationState?: string): {
  supplyType: "intra" | "inter";
  normalizedDestination: string;
} {
  const sellerStateNorm = SELLER_TAX_PROFILE.state.toLowerCase().trim();
  const sellerStateCode = SELLER_TAX_PROFILE.stateCode;

  if (!destinationState || !destinationState.trim()) {
    // Default to configured origin state for cart / preliminary preview
    return { supplyType: "intra", normalizedDestination: SELLER_TAX_PROFILE.state };
  }

  const destNorm = destinationState.toLowerCase().trim();
  const destCode = INDIAN_STATES_CODE_MAP[destNorm] || "";

  const isIntra = destNorm === sellerStateNorm || destCode === sellerStateCode;
  return {
    supplyType: isIntra ? "intra" : "inter",
    normalizedDestination: destinationState.trim(),
  };
}

/**
 * Perform exact statutory GST reverse-calculation from tax-inclusive catalog prices.
 * Formula: Taxable Base = Price / (1 + Rate / 100)
 * Uses integer paise arithmetic to eliminate any floating-point or 1-paisa rounding errors.
 */
export function calculateOrderTaxBreakdown(
  items: CartItem[],
  destinationState?: string,
  discount: number = 0,
  deliveryFee: number = 0
): OrderTaxBreakdown {
  const { supplyType, normalizedDestination } = determineSupplyType(destinationState);
  const isIntra = supplyType === "intra";

  let subtotalPaise = 0;
  let taxablePaiseTotal = 0;
  let totalCgstPaise = 0;
  let totalSgstPaise = 0;
  let totalIgstPaise = 0;

  const slabMap = new Map<number, TaxSlabBreakdown>();

  for (const item of items) {
    const qty = Number(item.quantity) || 0;
    const unitPrice = Number(item.price) || 0;
    const lineTotalPaise = Math.round(unitPrice * 100) * qty;
    subtotalPaise += lineTotalPaise;

    const rule: ProductTaxRule = PRODUCT_TAX_REGISTRY[item.productName] || {
      hsn: "9999",
      rate: 18.0,
      description: "General Merchandise",
      verified: false,
    };

    // Dynamic threshold under Notification No. 09/2025-CT(R): <= ₹2,500 attracts 5%, > ₹2,500 attracts 18%
    let rate = rule.rate;
    if (rule.hsn === "6109" || rule.hsn === "6203" || rule.hsn === "6404") {
      rate = unitPrice <= 2500 ? 5.0 : 18.0;
    }

    // Reverse math in integer paise
    const divisor = 1 + rate / 100;
    const itemTaxablePaise = Math.round(lineTotalPaise / divisor);
    const itemGstPaise = lineTotalPaise - itemTaxablePaise;

    taxablePaiseTotal += itemTaxablePaise;

    let itemCgstPaise = 0;
    let itemSgstPaise = 0;
    let itemIgstPaise = 0;

    if (isIntra) {
      itemCgstPaise = Math.round(itemGstPaise / 2);
      itemSgstPaise = itemGstPaise - itemCgstPaise; // Guarantees itemCgst + itemSgst === itemGst
      totalCgstPaise += itemCgstPaise;
      totalSgstPaise += itemSgstPaise;
    } else {
      itemIgstPaise = itemGstPaise;
      totalIgstPaise += itemIgstPaise;
    }

    // Accumulate slab
    const existing = slabMap.get(rate) || {
      rate,
      hsn: rule.hsn,
      description: rule.description,
      taxableValue: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalTax: 0,
    };

    existing.taxableValue += itemTaxablePaise / 100;
    existing.cgstAmount += itemCgstPaise / 100;
    existing.sgstAmount += itemSgstPaise / 100;
    existing.igstAmount += itemIgstPaise / 100;
    existing.totalTax += itemGstPaise / 100;
    slabMap.set(rate, existing);
  }

  const subtotal = subtotalPaise / 100;
  const taxableValue = taxablePaiseTotal / 100;
  const cgstAmount = totalCgstPaise / 100;
  const sgstAmount = totalSgstPaise / 100;
  const igstAmount = totalIgstPaise / 100;
  const totalGst = (totalCgstPaise + totalSgstPaise + totalIgstPaise) / 100;

  const totalPayable = Math.max(0, subtotal + deliveryFee - discount);

  return {
    subtotal: Number(subtotal.toFixed(2)),
    deliveryFee: Number(deliveryFee.toFixed(2)),
    discount: Number(discount.toFixed(2)),
    totalPayable: Number(totalPayable.toFixed(2)),
    taxableValue: Number(taxableValue.toFixed(2)),
    totalGst: Number(totalGst.toFixed(2)),
    cgstAmount: Number(cgstAmount.toFixed(2)),
    sgstAmount: Number(sgstAmount.toFixed(2)),
    igstAmount: Number(igstAmount.toFixed(2)),
    supplyType,
    isPlaceOfSupplyIntra: isIntra,
    sellerState: SELLER_TAX_PROFILE.state,
    sellerStateCode: SELLER_TAX_PROFILE.stateCode,
    destinationState: normalizedDestination,
    gstMode: SELLER_TAX_PROFILE.gstMode,
    slabs: Array.from(slabMap.values()).map((s) => ({
      rate: s.rate,
      hsn: s.hsn,
      description: s.description,
      taxableValue: Number(s.taxableValue.toFixed(2)),
      cgstAmount: Number(s.cgstAmount.toFixed(2)),
      sgstAmount: Number(s.sgstAmount.toFixed(2)),
      igstAmount: Number(s.igstAmount.toFixed(2)),
      totalTax: Number(s.totalTax.toFixed(2)),
    })),
  };
}
