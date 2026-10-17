import { ROUTES } from "@/constants/routes";
import type { Role } from "@/types";

function isShopPath(pathname: string): boolean {
  return pathname === ROUTES.shop || pathname.startsWith(`${ROUTES.shop}/`);
}

export function getPostLoginRedirect(role: Role, requestedFrom?: string | null): string {
  const fallback = role === "Customer" ? ROUTES.shop : ROUTES.dashboard;
  if (!requestedFrom) return fallback;

  const requestedIsShop = isShopPath(requestedFrom);
  const roleIsCustomer = role === "Customer";
  return requestedIsShop === roleIsCustomer ? requestedFrom : fallback;
}
