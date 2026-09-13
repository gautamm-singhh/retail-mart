import { describe, expect, it } from "vitest";
import { getPostLoginRedirect } from "@/features/auth/postLoginRedirect";
import { ROUTES } from "@/constants/routes";

describe("getPostLoginRedirect", () => {
  it("sends a Customer to /shop when there's no requested page", () => {
    expect(getPostLoginRedirect("Customer")).toBe(ROUTES.shop);
  });

  it("sends an Admin to /dashboard when there's no requested page", () => {
    expect(getPostLoginRedirect("Admin")).toBe(ROUTES.dashboard);
  });

  it("does NOT send a Customer to an admin path even if that's what they were bounced from", () => {
    // Regression test: this is the exact bug report - an unauthenticated
    // visit to "/" redirects to /login with from: "/", and a Customer
    // logging in there must not be sent back to the admin dashboard.
    expect(getPostLoginRedirect("Customer", "/")).toBe(ROUTES.shop);
    expect(getPostLoginRedirect("Customer", "/dashboard")).toBe(ROUTES.shop);
    expect(getPostLoginRedirect("Customer", "/users")).toBe(ROUTES.shop);
  });

  it("does NOT send an Admin/Manager/Staff to a shop path", () => {
    expect(getPostLoginRedirect("Admin", "/shop/checkout")).toBe(ROUTES.dashboard);
    expect(getPostLoginRedirect("Staff", "/shop/orders")).toBe(ROUTES.dashboard);
  });

  it("honors the requested page when it matches the signed-in role's portal", () => {
    expect(getPostLoginRedirect("Customer", "/shop/checkout")).toBe("/shop/checkout");
    expect(getPostLoginRedirect("Admin", "/orders")).toBe("/orders");
    expect(getPostLoginRedirect("Manager", "/payments/PAY-123")).toBe("/payments/PAY-123");
  });

  it("treats /shop itself and /shop/* as shop paths", () => {
    expect(getPostLoginRedirect("Customer", "/shop")).toBe("/shop");
    expect(getPostLoginRedirect("Customer", "/shop/product/p-1001")).toBe("/shop/product/p-1001");
  });
});
