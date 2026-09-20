/**
 * Postal PIN code lookup service for Indian addresses.
 * Uses official Indian Postal Pincode API with in-memory memoization cache
 * and fail-safe timeout handling.
 */

export interface PincodeLookupResult {
  city: string;
  state: string;
  district?: string;
  officeName?: string;
}

const cache = new Map<string, PincodeLookupResult>();

export async function lookupPincode(
  pincode: string,
  timeoutMs = 3500,
): Promise<PincodeLookupResult | null> {
  const cleanPin = pincode ? pincode.trim() : "";
  if (!/^[1-9]\d{5}$/.test(cleanPin)) {
    return null;
  }

  // Return from in-memory cache if previously resolved
  if (cache.has(cleanPin)) {
    return cache.get(cleanPin)!;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    clearTimeout(timer);

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (
      Array.isArray(data) &&
      data[0]?.Status === "Success" &&
      Array.isArray(data[0]?.PostOffice) &&
      data[0].PostOffice.length > 0
    ) {
      const offices = data[0].PostOffice;
      // Prefer Head Post Office or Delivery office if available, otherwise first office
      const primaryOffice =
        offices.find(
          (o: { DeliveryStatus?: string }) => o.DeliveryStatus === "Delivery",
        ) || offices[0];

      const district = (primaryOffice.District || "").trim();
      const state = (primaryOffice.State || "").trim();
      const officeName = (primaryOffice.Name || "").trim();

      // For city, use District (standard across India) or office name
      const city = district || officeName;

      if (city && state) {
        const result: PincodeLookupResult = {
          city,
          state,
          district: district || undefined,
          officeName: officeName || undefined,
        };
        cache.set(cleanPin, result);
        return result;
      }
    }

    return null;
  } catch {
    clearTimeout(timer);
    return null;
  }
}
