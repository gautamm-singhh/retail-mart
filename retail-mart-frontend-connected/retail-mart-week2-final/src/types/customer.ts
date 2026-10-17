import type { Role } from "@/types/user";

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

export type AddressFormValues = Omit<Address, "id">;

export interface CartItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
}
