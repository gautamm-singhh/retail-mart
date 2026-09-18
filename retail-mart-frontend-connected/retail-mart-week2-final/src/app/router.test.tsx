import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { routes } from "@/app/router";
import { AuthProvider } from "@/features/auth/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/components/common/ToastProvider";
import { CartProvider } from "@/features/cart/CartContext";
import { WishlistProvider } from "@/features/wishlist/WishlistContext";

function renderWithProviders(initialEntries: string[]) {
  const testRouter = createMemoryRouter(routes, { initialEntries });
  return {
    ...render(
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <CartProvider>
              <WishlistProvider>
                <RouterProvider router={testRouter} />
              </WishlistProvider>
            </CartProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    ),
    router: testRouter,
  };
}

describe("Application Routing & Entry Point Tests", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("1. Root route '/' redirects to Customer Login page (/shop/login)", async () => {
    const { router } = renderWithProviders(["/"]);

    // URL should be /shop/login
    expect(router.state.location.pathname).toBe("/shop/login");

    // Brand and customer login elements
    expect(screen.getByRole("heading", { name: /sign in to retail mart/i })).toBeInTheDocument();
    expect(screen.getByText(/shop the best deals, track your orders, and more/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mobile otp/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /email & password/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /create an account/i })).toBeInTheDocument();

    // Confirm NO seeded credentials box exists
    expect(screen.queryByText(/seeded customer account/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ananya\.rao@example\.com/i)).not.toBeInTheDocument();
  });

  it("2. Direct navigation to '/shop/login' renders Customer Login page", () => {
    const { router } = renderWithProviders(["/shop/login"]);

    expect(router.state.location.pathname).toBe("/shop/login");
    expect(screen.getByRole("heading", { name: /sign in to retail mart/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mobile otp/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /email & password/i })).toBeInTheDocument();
  });

  it("3. Direct navigation to '/login' redirects to '/shop/login' (Customer Login)", () => {
    const { router } = renderWithProviders(["/login"]);

    // /login now redirects to /shop/login
    expect(router.state.location.pathname).toBe("/shop/login");
    expect(screen.getByRole("heading", { name: /sign in to retail mart/i })).toBeInTheDocument();
    expect(screen.getByText(/shop the best deals, track your orders, and more/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mobile otp/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /email & password/i })).toBeInTheDocument();
  });

  it("4. Clicking 'Create an account' from Customer Login navigates to /shop/signup", async () => {
    const { router } = renderWithProviders(["/shop/login"]);

    const createAccountLink = screen.getByRole("link", { name: /create an account/i });
    expect(createAccountLink).toBeInTheDocument();
    expect(createAccountLink.getAttribute("href")).toBe("/shop/signup");

    await userEvent.click(createAccountLink);

    expect(router.state.location.pathname).toBe("/shop/signup");
    expect(screen.getByRole("heading", { name: /create your account/i })).toBeInTheDocument();
  });

  it("5. Direct navigation to '/shop/signup' renders Signup page", () => {
    const { router } = renderWithProviders(["/shop/signup"]);

    expect(router.state.location.pathname).toBe("/shop/signup");
    expect(screen.getByRole("heading", { name: /create your account/i })).toBeInTheDocument();
  });

  it("6. Direct navigation to legacy '/signup' redirects to '/shop/signup'", () => {
    const { router } = renderWithProviders(["/signup"]);

    expect(router.state.location.pathname).toBe("/shop/signup");
    expect(screen.getByRole("heading", { name: /create your account/i })).toBeInTheDocument();
  });
});
