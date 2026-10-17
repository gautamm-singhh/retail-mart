import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import StorefrontLayout from "@/layouts/StorefrontLayout";
import * as useAuthModule from "@/features/auth/useAuth";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/components/common/ToastProvider";
import { CartProvider } from "@/features/cart/CartContext";
import { WishlistProvider } from "@/features/wishlist/WishlistContext";
import type { CurrentUser } from "@/features/auth/AuthContext";

function renderStorefrontLayout() {
  return render(
    <ThemeProvider>
      <ToastProvider>
        <CartProvider>
          <WishlistProvider>
            <MemoryRouter>
              <StorefrontLayout />
            </MemoryRouter>
          </WishlistProvider>
        </CartProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

describe("StorefrontLayout - API Documentation Entry Points", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("Customer: sees API Documentation in footer, but NOT the header API Docs button", () => {
    const customerUser: CurrentUser = {
      id: "cust-1",
      name: "Customer Jane",
      email: "jane@example.com",
      role: "Customer",
    };

    vi.spyOn(useAuthModule, "useAuth").mockReturnValue({
      isAuthenticated: true,
      currentUser: customerUser,
      isLoadingUser: false,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
      requestOtp: vi.fn(),
      verifyOtp: vi.fn(),
    });

    renderStorefrontLayout();

    expect(screen.getByText("Developers")).toBeInTheDocument();
    const apiDocLinks = screen.getAllByRole("link", { name: "API Documentation" });
    expect(apiDocLinks).toHaveLength(1);
    expect(apiDocLinks[0]).toHaveAttribute("href", "/help/api");

    const fsdLinks = screen.getAllByRole("link", { name: "Functional Documentation" });
    expect(fsdLinks).toHaveLength(1);
    expect(fsdLinks[0]).toHaveAttribute("href", "/help/fsd");

    const headerApiDocsButton = screen.queryByRole("link", { name: /API Docs/i });
    expect(headerApiDocsButton).toBeNull();
  });

  it("Guest: sees API Documentation in footer, but NOT the header API Docs button", () => {
    vi.spyOn(useAuthModule, "useAuth").mockReturnValue({
      isAuthenticated: false,
      currentUser: null,
      isLoadingUser: false,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
      requestOtp: vi.fn(),
      verifyOtp: vi.fn(),
    });

    renderStorefrontLayout();

    expect(screen.getByText("Developers")).toBeInTheDocument();
    const apiDocLinks = screen.getAllByRole("link", { name: "API Documentation" });
    expect(apiDocLinks).toHaveLength(1);
    expect(apiDocLinks[0]).toHaveAttribute("href", "/help/api");

    const headerApiDocsButton = screen.queryByRole("link", { name: /API Docs/i });
    expect(headerApiDocsButton).toBeNull();
  });

  it("Admin: sees API Documentation in footer AND sees the prominent header API Docs button", () => {
    const adminUser: CurrentUser = {
      id: "admin-1",
      name: "Admin Joe",
      email: "admin@example.com",
      role: "Admin",
    };

    vi.spyOn(useAuthModule, "useAuth").mockReturnValue({
      isAuthenticated: true,
      currentUser: adminUser,
      isLoadingUser: false,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
      requestOtp: vi.fn(),
      verifyOtp: vi.fn(),
    });

    renderStorefrontLayout();

    expect(screen.getByText("Developers")).toBeInTheDocument();
    const apiDocLinks = screen.getAllByRole("link", { name: "API Documentation" });
    expect(apiDocLinks).toHaveLength(1);
    expect(apiDocLinks[0]).toHaveAttribute("href", "/help/api");

    const headerApiDocsButton = screen.getByRole("link", { name: /API Docs/i });
    expect(headerApiDocsButton).toBeInTheDocument();
    expect(headerApiDocsButton).toHaveAttribute("href", "/help/api");
  });
});
