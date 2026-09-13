import type { Product } from "./product";

export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  createdAt?: string;
  product?: Product;
}
