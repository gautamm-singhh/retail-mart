import { request } from "@/services/api/client";
import type { WishlistItem } from "@/types";

export interface WishlistActionResponse {
  message: string;
  item?: WishlistItem;
}

/**
 * Fetches all wishlist items for the authenticated user.
 * GET /api/wishlist
 */
export function fetchWishlist(): Promise<WishlistItem[]> {
  return request<WishlistItem[]>("/wishlist");
}

/**
 * Adds a product to the user's wishlist in MySQL.
 * POST /api/wishlist
 */
export function addToWishlist(productId: string): Promise<WishlistActionResponse> {
  return request<WishlistActionResponse>("/wishlist", {
    method: "POST",
    body: JSON.stringify({ productId }),
  });
}

/**
 * Removes a product from the user's wishlist in MySQL.
 * DELETE /api/wishlist/<productId>
 */
export function removeFromWishlist(productId: string): Promise<WishlistActionResponse> {
  return request<WishlistActionResponse>(`/wishlist/${encodeURIComponent(productId)}`, {
    method: "DELETE",
  });
}
