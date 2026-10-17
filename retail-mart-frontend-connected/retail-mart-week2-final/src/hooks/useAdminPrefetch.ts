import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/features/auth/useAuth";
import { fetchCategories } from "@/services/api/categories";
import { fetchProducts } from "@/services/api/products";
import { fetchUsersDeduplicated } from "@/features/users/useUsers";
import { fetchPaymentsDeduplicated } from "@/features/payments/usePayments";
import { fetchShipmentsDeduplicated } from "@/features/shipping/useShipments";
import { ROUTES } from "@/constants/routes";

type IdleCallbackHandle = number;

/**
 * Selective idle prefetcher for Admin panel.
 * - Only runs after user is confirmed authenticated and authorized.
 * - Staggers background requests during browser idle time so user-initiated requests take priority.
 * - Reuses existing in-memory deduplication caches.
 */
export function useAdminPrefetch() {
  const { currentUser, isAuthenticated } = useAuth();
  const isAuthorized = isAuthenticated && Boolean(currentUser);
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const idleHandlesRef = useRef<IdleCallbackHandle[]>([]);

  const prefetchTarget = useCallback(
    (target: string) => {
      if (!isAuthorized) return;

      switch (target) {
        case ROUTES.categories:
        case "categories":
          fetchCategories().catch(() => {});
          break;
        case ROUTES.products:
        case "products":
          fetchProducts().catch(() => {});
          break;
        case ROUTES.users:
        case "users":
          fetchUsersDeduplicated().catch(() => {});
          break;
        case ROUTES.payments:
        case "payments":
          fetchPaymentsDeduplicated().catch(() => {});
          break;
        case ROUTES.shipping:
        case "shipping":
          fetchShipmentsDeduplicated().catch(() => {});
          break;
        default:
          break;
      }
    },
    [isAuthorized],
  );

  useEffect(() => {
    if (!isAuthorized) return;

    // Schedule background prefetch tasks in idle intervals after primary UI render
    const scheduleIdleTask = (task: () => void, delayMs: number) => {
      const timer = setTimeout(() => {
        if ("requestIdleCallback" in window) {
          const handle = (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback(
            () => {
              task();
            },
            { timeout: 3000 },
          );
          idleHandlesRef.current.push(handle);
        } else {
          task();
        }
      }, delayMs);
      timersRef.current.push(timer);
    };

    // Staggered background prefetch of likely next sections:
    // 1. Categories at 2000ms
    scheduleIdleTask(() => {
      fetchCategories().catch(() => {});
    }, 2000);

    // 2. Users at 3500ms
    scheduleIdleTask(() => {
      fetchUsersDeduplicated().catch(() => {});
    }, 3500);

    // 3. Payments at 5000ms
    scheduleIdleTask(() => {
      fetchPaymentsDeduplicated().catch(() => {});
    }, 5000);

    // 4. Shipments at 6500ms
    scheduleIdleTask(() => {
      fetchShipmentsDeduplicated().catch(() => {});
    }, 6500);

    return () => {
      // Clear timers and cancel idle callbacks on unmount, logout, or navigation
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];

      if ("cancelIdleCallback" in window) {
        idleHandlesRef.current.forEach((h) => {
          (window as unknown as { cancelIdleCallback: (handle: number) => void }).cancelIdleCallback(h);
        });
      }
      idleHandlesRef.current = [];
    };
  }, [isAuthorized]);

  return { prefetchTarget };
}
