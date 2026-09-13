import { request } from "@/services/api/client";
import type { Address, AddressFormValues } from "@/types";

export function fetchAddresses(): Promise<Address[]> {
  return request<Address[]>("/addresses");
}

export function createAddress(values: AddressFormValues): Promise<Address> {
  return request<Address>("/addresses", { method: "POST", body: JSON.stringify(values) });
}

export function updateAddress(id: string, values: Partial<AddressFormValues>): Promise<Address> {
  return request<Address>(`/addresses/${id}`, { method: "PUT", body: JSON.stringify(values) });
}

export function deleteAddress(id: string): Promise<void> {
  return request<void>(`/addresses/${id}`, { method: "DELETE" });
}
