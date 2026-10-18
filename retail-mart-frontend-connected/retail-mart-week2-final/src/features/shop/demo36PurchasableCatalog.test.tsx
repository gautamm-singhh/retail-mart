import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthContext, AuthContextValue } from "@/features/auth/AuthContext";
import { CartProvider } from "@/features/cart/CartContext";
import { ToastProvider } from "@/components/common/ToastProvider";
import ShopHomePage from "@/pages/ShopHomePage";
import { mockProducts } from "@/features/products/data/products";
import type { User } from "@/types";

// Mock the API to return the full 36 active demo products as delivered by retail_mart_demo
vi.mock("@/services/api/products", () => ({
  productsCache: { data: null, timestamp: 0, inFlight: null, listeners: new Set() },
  fetchProducts: vi.fn().mockImplementation(() => Promise.resolve(mockProducts)),
  fetchProduct: vi.fn().mockImplementation((id: string) =>
    Promise.resolve(mockProducts.find((p) => p.id === id) || null)
  ),
}));

vi.mock("@/services/api/categories", () => ({
  categoriesCache: { data: null, timestamp: 0, inFlight: null, listeners: new Set() },
  fetchCategories: vi.fn().mockResolvedValue([
    { id: "c-01", name: "Apparel", slug: "apparel", status: "active" },
    { id: "c-02", name: "Footwear", slug: "footwear", status: "active" },
    { id: "c-03", name: "Electronics", slug: "electronics", status: "active" },
    { id: "c-04", name: "Home & Kitchen", slug: "home-kitchen", status: "active" },
    { id: "c-05", name: "Sports & Fitness", slug: "sports-fitness", status: "active" },
    { id: "c-06", name: "Accessories", slug: "accessories", status: "active" },
  ]),
}));

function createMockAuthValue(user: User | null): AuthContextValue {
  return {
    isAuthenticated: Boolean(user),
    isLoadingUser: false,
    currentUser: user,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    requestOtp: vi.fn(),
    verifyOtp: vi.fn(),
  };
}

function renderShopPage(initialRoute = "/shop", user: User | null = null) {
  const authValue = createMockAuthValue(user);
  return render(
    <AuthContext.Provider value={authValue}>
      <ToastProvider>
        <CartProvider>
          <MemoryRouter initialEntries={[initialRoute]}>
            <ShopHomePage />
          </MemoryRouter>
        </CartProvider>
      </ToastProvider>
    </AuthContext.Provider>
  );
}

describe("Retail Mart 36-Product Mentor Demonstration Catalog Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("1. Total catalog shows exactly 36 products and 'All (36)' badge", async () => {
    renderShopPage("/shop", null);

    // Wait for the All count badge
    expect(await screen.findByText("All (36)")).toBeInTheDocument();

    // Verify key products across diverse categories appear
    expect(screen.getByText("Cotton Crew T-Shirt")).toBeInTheDocument();
    expect(screen.getByText("Classic Fleece Pullover Hoodie")).toBeInTheDocument();
    expect(screen.getByText("Stainless Steel Chronograph Watch")).toBeInTheDocument();
  });

  it("2. Each of the six categories displays exactly 6 products", async () => {
    const categories = [
      "Apparel",
      "Footwear",
      "Electronics",
      "Home & Kitchen",
      "Sports & Fitness",
      "Accessories",
    ];

    for (const cat of categories) {
      const { unmount } = renderShopPage(`/shop?category=${encodeURIComponent(cat)}`, null);

      const heading = await screen.findByRole("heading", { name: cat, level: 2 });
      expect(heading).toBeInTheDocument();

      // Check category badge shows 6 items
      const badges = screen.getAllByText(/6 items/i);
      expect(badges.length).toBeGreaterThan(0);

      unmount();
    }
  });

  it("3. Active demo products do not render Coming Soon or disabled preview buttons", async () => {
    renderShopPage("/shop?category=Apparel", null);

    await screen.findByRole("heading", { name: "Apparel", level: 2 });

    // Active hoodie is purchasable, not coming soon
    const hoodieCard = screen.getByText("Classic Fleece Pullover Hoodie");
    expect(hoodieCard).toBeInTheDocument();

    // No disabled preview buttons should exist on this active category page
    const disabledButtons = screen.queryAllByRole("button", { name: /coming soon • preview only/i });
    expect(disabledButtons).toHaveLength(0);

    // Add to cart buttons are active
    const addToCartButtons = screen.getAllByRole("button", { name: /add to cart/i });
    expect(addToCartButtons.length).toBeGreaterThanOrEqual(6);
  });

  it("4. Category selection via URL query parameter switches grid to 3 columns (3x2 layout) vs 4 columns for All Products", async () => {
    // 1. All Products (/shop) -> 4 columns on large desktop
    const { unmount: unmountAll } = renderShopPage("/shop", null);
    await screen.findByText("All (36)");
    const allGrid = screen.getByTestId("products-grid");
    expect(allGrid.className).toContain("xl:grid-cols-4");
    expect(allGrid.className).toContain("sm:grid-cols-2");
    expect(allGrid.className).toContain("grid-cols-1");
    unmountAll();

    // 2. Apparel category (?category=Apparel) -> 3 columns on desktop (3x2 layout)
    const { unmount: unmountApparel } = renderShopPage("/shop?category=Apparel", null);
    await screen.findByRole("heading", { name: "Apparel", level: 2 });
    const apparelGrid = screen.getByTestId("products-grid");
    expect(apparelGrid.className).toContain("lg:grid-cols-3");
    expect(apparelGrid.className).not.toContain("xl:grid-cols-4");
    expect(apparelGrid.className).toContain("sm:grid-cols-2");
    expect(apparelGrid.className).toContain("grid-cols-1");
    unmountApparel();

    // 3. Footwear category (?category=Footwear) -> 3 columns on desktop (3x2 layout)
    const { unmount: unmountFootwear } = renderShopPage("/shop?category=Footwear", null);
    await screen.findByRole("heading", { name: "Footwear", level: 2 });
    const footwearGrid = screen.getByTestId("products-grid");
    expect(footwearGrid.className).toContain("lg:grid-cols-3");
    expect(footwearGrid.className).not.toContain("xl:grid-cols-4");
    unmountFootwear();
  });

  it("5. Promotional cards section displays exactly 4 equal-width responsive cards", async () => {
    renderShopPage("/shop", null);
    await screen.findByText("All (36)");

    const promoSection = screen.getByTestId("promotional-cards-section");
    expect(promoSection).toBeInTheDocument();

    const promoGrid = promoSection.firstElementChild as HTMLElement;
    expect(promoGrid.className).toContain("lg:grid-cols-4");
    expect(promoGrid.className).toContain("sm:grid-cols-2");
    expect(promoGrid.className).toContain("grid-cols-1");

    // Exactly 4 promotional cards
    const promoCards = promoGrid.querySelectorAll("button");
    expect(promoCards).toHaveLength(4);
    promoCards.forEach((card) => {
      expect(card.className).toContain("min-w-0");
    });
  });
});
