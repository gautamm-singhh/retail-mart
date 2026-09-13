import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import App from "@/app/App";
import WishlistPage from "@/pages/WishlistPage";
import StorefrontLayout from "@/layouts/StorefrontLayout";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/features/auth/AuthContext";
import { ToastProvider } from "@/components/common/ToastProvider";
import { CartProvider } from "@/features/cart/CartContext";
import { WishlistProvider } from "@/features/wishlist/WishlistContext";
import { ProductCard } from "@/features/shop/components/ProductCard";
import type { Product } from "@/types";

const sampleProduct: Product = {
  id: "p-test-1",
  name: "Ultra HD Smart Monitor",
  category: "Electronics",
  price: 24999,
  stock: 15,
  sku: "ELE-MON-001",
  status: "active",
  description: "Crystal clear 4K display with HDR.",
  imageUrl: "https://example.com/test.jpg",
};

describe("Frontend Page & Component Rendering", () => {
  it("renders the root App component without blank page or context crashes", () => {
    const { container } = render(<App />);
    expect(container).toBeDefined();
    expect(container.innerHTML.length).toBeGreaterThan(50);
  });

  it("renders ProductCard with heart button connected to WishlistContext", () => {
    render(
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <CartProvider>
              <WishlistProvider>
                <MemoryRouter>
                  <ProductCard product={sampleProduct} />
                </MemoryRouter>
              </WishlistProvider>
            </CartProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    );

    expect(screen.getByText("Ultra HD Smart Monitor")).toBeDefined();
    expect(screen.getByText("Electronics")).toBeDefined();
    // Verify accessible heart button is rendered
    const heartBtn = screen.getByRole("button", { name: /wishlist/i });
    expect(heartBtn).toBeDefined();
  });

  it("renders WishlistPage without errors", () => {
    render(
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <CartProvider>
              <WishlistProvider>
                <MemoryRouter>
                  <WishlistPage />
                </MemoryRouter>
              </WishlistProvider>
            </CartProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    );

    expect(screen.getAllByText("My Wishlist").length).toBeGreaterThanOrEqual(1);
  });

  it("renders StorefrontLayout with Wishlist counter button in navbar", () => {
    render(
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <CartProvider>
              <WishlistProvider>
                <MemoryRouter>
                  <StorefrontLayout />
                </MemoryRouter>
              </WishlistProvider>
            </CartProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    );

    expect(screen.getByText("Retail Mart")).toBeDefined();
    expect(screen.getByText("Wishlist")).toBeDefined();
    expect(screen.getByText("Cart")).toBeDefined();
  });
});
