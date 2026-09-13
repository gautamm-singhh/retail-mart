import type { Role } from "@/types/user";

/**
 * Storefront-only types. `CustomerProfile` deliberately allows null
 * email/phone (phone-only OTP signups have no email; email/password
 * signups always have phone as optional) - this mirrors the backend's
 * User.to_dict() exactly for the /auth/me response.
 */
export interface CustomerProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: Role;
  status: string;
  createdAt: string;
}

export interface Address {
  id: string;
  label: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  phone: string;
  isDefault: boolean;
}

/** Fields collected by AddressForm when adding or editing an address. */
export type AddressFormValues = Omit<Address, "id">;

/** One line in the shopping cart - kept minimal since the cart lives client-side (see CartContext). */
export interface CartItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
}
