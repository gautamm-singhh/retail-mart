import { useContext } from "react";
import { WishlistContext, type WishlistContextValue } from "./WishlistContext";

const defaultWishlistValue: WishlistContextValue = {
  items: [],
  itemCount: 0,
  isLoading: false,
  error: null,
  pendingProductIds: new Set(),
  isWishlisted: () => false,
  toggleWishlist: async () => false,
  addItem: async () => {},
  removeItem: async () => {},
  refresh: async () => {},
};

export function useWishlist(): WishlistContextValue {
  const context = useContext(WishlistContext);
  return context ?? defaultWishlistValue;
}
