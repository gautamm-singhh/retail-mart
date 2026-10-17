import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import { getPostLoginRedirect } from "@/features/auth/postLoginRedirect";
import { ROUTES } from "@/constants/routes";
import type { Role } from "@/types";

interface ProtectedRouteProps {
  redirectTo?: string;
  allowedRoles?: Role[];
}

export function ProtectedRoute({ redirectTo = ROUTES.login, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, currentUser, isLoadingUser } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  if (isLoadingUser || !currentUser) return null;

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to={getPostLoginRedirect(currentUser.role)} replace />;
  }

  return <Outlet />;
}
