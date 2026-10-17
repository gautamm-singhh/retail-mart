import { request } from "@/services/api/client";
import type { WishlistItem } from "@/types";

export interface WishlistActionResponse {
  message: string;
  item?: WishlistItem;
}

export function fetchWishlist(): Promise<WishlistItem[]> {
  return request<WishlistItem[]>("/wishlist");
}

export function addToWishlist(productId: string): Promise<WishlistActionResponse> {
  return request<WishlistActionResponse>("/wishlist", {
    method: "POST",
    body: JSON.stringify({ productId }),
  });
}

export function removeFromWishlist(productId: string): Promise<WishlistActionResponse> {
  return request<WishlistActionResponse>(`/wishlist/${encodeURIComponent(productId)}`, {
    method: "DELETE",
  });
}
