import { fetchAddresses, createAddress, updateAddress, deleteAddress } from "@/services/api/addresses";
import type { Address, AddressFormValues } from "@/types";

export const addressRepository = {
  list: (): Promise<Address[]> => fetchAddresses(),
  create: (values: AddressFormValues): Promise<Address> => createAddress(values),
  update: (id: string, values: Partial<AddressFormValues>): Promise<Address> => updateAddress(id, values),
  remove: (id: string): Promise<void> => deleteAddress(id),
};
