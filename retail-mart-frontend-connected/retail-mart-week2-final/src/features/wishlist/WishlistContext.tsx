import { createContext, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { fetchWishlist, addToWishlist as apiAdd, removeFromWishlist as apiRemove } from "@/services/api/wishlist";
import { useAuth } from "@/features/auth/useAuth";
import { useToast } from "@/hooks/useToast";
import type { Product, WishlistItem } from "@/types";

const OLD_LOCAL_STORAGE_KEY = "retail_mart_wishlist";

export interface WishlistContextValue {
  items: WishlistItem[];
  itemCount: number;
  isLoading: boolean;
  error: string | null;
  pendingProductIds: Set<string>;
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (product: Product) => Promise<boolean>;
  addItem: (product: Product) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, currentUser } = useAuth();
  const { showToast } = useToast();

  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingProductIds, setPendingProductIds] = useState<Set<string>>(new Set());

  // Migrate / remove legacy localStorage wishlist data
  useEffect(() => {
    try {
      if (localStorage.getItem(OLD_LOCAL_STORAGE_KEY)) {
        localStorage.removeItem(OLD_LOCAL_STORAGE_KEY);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Fetch authenticated user's wishlist from MySQL backend
  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchWishlist();
      setItems(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load wishlist";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      void refresh();
    } else {
      setItems([]);
      setError(null);
    }
  }, [isAuthenticated, currentUser?.id, refresh]);

  const wishlistedIds = useMemo(() => {
    return new Set(items.map((it) => it.productId));
  }, [items]);

  const isWishlisted = useCallback(
    (productId: string) => wishlistedIds.has(productId),
    [wishlistedIds],
  );

  const addItem = useCallback(
    async (product: Product) => {
      if (!isAuthenticated) {
        showToast("Please sign in to add items to your wishlist.", "error");
        return;
      }

      setPendingProductIds((prev) => new Set(prev).add(product.id));

      // Optimistically add to UI
      const tempItem: WishlistItem = {
        id: `temp-${Date.now()}`,
        userId: currentUser?.id ?? "",
        productId: product.id,
        createdAt: new Date().toISOString(),
        product,
      };

      setItems((prev) => {
        if (prev.some((item) => item.productId === product.id)) return prev;
        return [tempItem, ...prev];
      });

      try {
        const res = await apiAdd(product.id);
        if (res.item) {
          const serverItem = res.item;
          setItems((prev) =>
            prev.map((it) =>
              it.productId === product.id
                ? {
                    id: serverItem.id || it.id,
                    userId: serverItem.userId || it.userId,
                    productId: serverItem.productId || it.productId,
                    createdAt: serverItem.createdAt || it.createdAt,
                    product: serverItem.product || product,
                  }
                : it,
            ),
          );
        }
        showToast(`Saved ${product.name} to wishlist.`);
      } catch (err: unknown) {
        // Roll back on failure
        setItems((prev) => prev.filter((it) => it.productId !== product.id));
        const msg = err instanceof Error ? err.message : "Could not save to wishlist";
        showToast(msg, "error");
        throw err;
      } finally {
        setPendingProductIds((prev) => {
          const next = new Set(prev);
          next.delete(product.id);
          return next;
        });
      }
    },
    [isAuthenticated, currentUser?.id, showToast],
  );

  const removeItem = useCallback(
    async (productId: string) => {
      if (!isAuthenticated) {
        showToast("Please sign in to update your wishlist.", "error");
        return;
      }

      setPendingProductIds((prev) => new Set(prev).add(productId));

      const previousItems = [...items];
      const targetItem = items.find((it) => it.productId === productId);
      const productName = targetItem?.product?.name || "Product";

      // Optimistically remove from UI
      setItems((prev) => prev.filter((it) => it.productId !== productId));

      try {
        await apiRemove(productId);
        showToast(`Removed ${productName} from wishlist.`);
      } catch (err: unknown) {
        // Rollback on failure
        setItems(previousItems);
        const msg = err instanceof Error ? err.message : "Could not remove from wishlist";
        showToast(msg, "error");
        throw err;
      } finally {
        setPendingProductIds((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      }
    },
    [isAuthenticated, items, showToast],
  );

  const toggleWishlist = useCallback(
    async (product: Product): Promise<boolean> => {
      if (!isAuthenticated) {
        showToast("Please sign in to save items to your wishlist.", "error");
        return false;
      }

      if (isWishlisted(product.id)) {
        await removeItem(product.id);
        return false;
      } else {
        await addItem(product);
        return true;
      }
    },
    [isAuthenticated, isWishlisted, addItem, removeItem, showToast],
  );

  const value = useMemo(
    () => ({
      items,
      itemCount: items.length,
      isLoading,
      error,
      pendingProductIds,
      isWishlisted,
      toggleWishlist,
      addItem,
      removeItem,
      refresh,
    }),
    [
      items,
      isLoading,
      error,
      pendingProductIds,
      isWishlisted,
      toggleWishlist,
      addItem,
      removeItem,
      refresh,
    ],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}
