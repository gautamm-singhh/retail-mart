import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import { getPostLoginRedirect } from "@/features/auth/postLoginRedirect";
import { ROUTES } from "@/constants/routes";
import type { Role } from "@/types";

interface ProtectedRouteProps {
  /** Where to send an unauthenticated visitor. Defaults to the admin login. */
  redirectTo?: string;
  /**
   * If provided, only these roles may render the wrapped routes. An
   * authenticated person whose role isn't in this list is bounced to
   * their own portal's home (via getPostLoginRedirect) instead of seeing
   * admin content they have no access to, or hitting a wall of 403s from
   * customer-only endpoints on a page meant for shoppers.
   */
  allowedRoles?: Role[];
}

/**
 * Gates a route tree behind a valid JWT (see AuthContext), and optionally
 * behind a specific set of roles. Renders the matched child route via
 * <Outlet /> when both checks pass; otherwise redirects.
 *
 * Used three times:
 *   - Admin console (`/` and below): default redirectTo (/login),
 *     allowedRoles={["Admin","Manager","Staff"]} - a signed-in Customer
 *     visiting an admin URL is sent to /shop, not shown admin content.
 *   - Storefront checkout/orders/account: redirectTo={ROUTES.shopLogin},
 *     allowedRoles={["Customer"]} - an Admin/Staff account wandering into
 *     these customer-only pages is sent to /dashboard instead of hitting
 *     403s from endpoints like GET /addresses that only Customers can call.
 *   - Unauthenticated visitors are always sent to `redirectTo` regardless
 *     of allowedRoles, with the page they wanted remembered so the login
 *     page can send them back afterward.
 */
export function ProtectedRoute({ redirectTo = ROUTES.login, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, currentUser, isLoadingUser } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  // Token present but /auth/me hasn't resolved yet - wait rather than
  // guessing, since redirecting on an unknown role could bounce someone
  // who actually belongs here.
  if (isLoadingUser || !currentUser) return null;

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to={getPostLoginRedirect(currentUser.role)} replace />;
  }

  return <Outlet />;
}
