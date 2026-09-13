import { ROUTES } from "@/constants/routes";
import type { Role } from "@/types";

function isShopPath(pathname: string): boolean {
  return pathname === ROUTES.shop || pathname.startsWith(`${ROUTES.shop}/`);
}

/**
 * The single place that decides where someone lands right after signing
 * in - used by both LoginPage (admin) and CustomerLoginPage (storefront).
 *
 * `requestedFrom` comes from ProtectedRoute's `state: { from: location }`
 * (see ProtectedRoute.tsx) - the page someone was trying to reach before
 * being bounced to a login screen. It's only honored when it actually
 * belongs to the portal the signed-in role can use; otherwise it's
 * ignored in favor of a role-appropriate fallback.
 *
 * This matters because visiting the bare "/" while signed out redirects
 * to /login with `from: "/"` - a perfectly truthy pathname that happens
 * to be admin-only. Blindly honoring it would send a Customer who just
 * signed in straight back to the admin dashboard redirect, which is
 * exactly the bug this function exists to prevent.
 */
export function getPostLoginRedirect(role: Role, requestedFrom?: string | null): string {
  const fallback = role === "Customer" ? ROUTES.shop : ROUTES.dashboard;
  if (!requestedFrom) return fallback;

  const requestedIsShop = isShopPath(requestedFrom);
  const roleIsCustomer = role === "Customer";
  return requestedIsShop === roleIsCustomer ? requestedFrom : fallback;
}
