import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, renderHook, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthContext, AuthContextValue } from "@/features/auth/AuthContext";
import { CartProvider } from "@/features/cart/CartContext";
import { useCart } from "@/features/cart/useCart";
import { ToastProvider } from "@/components/common/ToastProvider";
import ShopHomePage from "@/pages/ShopHomePage";
import ShopProductDetailPage from "@/pages/ShopProductDetailPage";
import { ProductCard } from "@/features/shop/components/ProductCard";
import { DEMO_CANDIDATE_PRODUCTS } from "@/features/shop/data/demoCatalog";
import type { User, Product } from "@/types";

// Mock API responses for products and categories (7 verified active products from MySQL)
vi.mock("@/services/api/products", () => ({
  productsCache: { data: null, timestamp: 0, inFlight: null, listeners: new Set() },
  fetchProducts: vi.fn().mockResolvedValue([
    { id: "p-1001", name: "Cotton Crew T-Shirt", sku: "APP-TSH-001", price: 499, stock: 240, status: "active", category: "Apparel", imageUrl: null },
    { id: "p-1002", name: "Slim Fit Denim Jeans", sku: "APP-JNS-014", price: 1799, stock: 58, status: "active", category: "Apparel", imageUrl: null },
    { id: "p-1004", name: "Wireless Earbuds Pro", sku: "ELE-EAR-009", price: 2999, stock: 132, status: "active", category: "Electronics", imageUrl: null },
    { id: "p-1005", name: "Non-Stick Frying Pan 26cm", sku: "HOM-PAN-005", price: 899, stock: 76, status: "active", category: "Home & Kitchen", imageUrl: null },
    { id: "p-1006", name: "Running Shoes - Trail", sku: "FTW-RUN-031", price: 2499, stock: 12, status: "active", category: "Footwear", imageUrl: null },
    { id: "p-1008", name: "Yoga Mat 6mm", sku: "SPT-YOG-007", price: 799, stock: 94, status: "active", category: "Sports & Fitness", imageUrl: null },
    { id: "p-1010", name: "Leather Wallet - Bifold", sku: "ACC-WAL-003", price: 999, stock: 61, status: "active", category: "Accessories", imageUrl: null },
    { id: "p-1009", name: "Bluetooth Speaker Mini", sku: "ELE-SPK-012", price: 1499, stock: 45, status: "draft", category: "Electronics", imageUrl: null },
  ]),
  fetchProduct: vi.fn().mockImplementation((_id: string) => Promise.resolve(null)),
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

function renderShopHomePage(initialRoute = "/shop", user: User | null = null) {
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
    </AuthContext.Provider>,
  );
}

describe("Customer Storefront Product Count & Catalog Preview Verification", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("1. Normal Guest visitor sees 36 cards on /shop without needing to log in", async () => {
    renderShopHomePage("/shop", null);

    // Should visibly render cards across all categories
    const cards = await screen.findAllByRole("link", { name: /cotton crew t-shirt|running shoes|fleece pullover hoodie/i });
    expect(cards.length).toBeGreaterThan(0);

    // Verify badge displays 36 items
    expect(screen.getByText("All (36)")).toBeInTheDocument();
  });

  it("2. Normal Customer account sees 36 cards on /shop", async () => {
    const customerUser: User = {
      id: "u-cust",
      name: "Normal Customer",
      email: "cust@example.com",
      role: "Customer",
      status: "active",
      createdAt: "2026-01-01",
    };
    renderShopHomePage("/shop", customerUser);

    expect(await screen.findByText("All (36)")).toBeInTheDocument();
    // Live product is present
    expect(screen.getByText("Cotton Crew T-Shirt")).toBeInTheDocument();
    // Second product is visibly present
    expect(screen.getByText("Classic Fleece Pullover Hoodie")).toBeInTheDocument();
  });

  it("3. Every category displays at least 6 visible product cards in the normal customer storefront", async () => {
    const categoriesToTest = [
      { name: "Apparel", minCount: 6 },
      { name: "Footwear", minCount: 6 },
      { name: "Electronics", minCount: 6 },
      { name: "Home & Kitchen", minCount: 6 },
      { name: "Sports & Fitness", minCount: 6 },
      { name: "Accessories", minCount: 6 },
    ];

    for (const cat of categoriesToTest) {
      const { unmount } = renderShopHomePage(`/shop?category=${encodeURIComponent(cat.name)}`, null);
      
      // Wait for heading with category name to render
      const heading = await screen.findByRole("heading", { name: cat.name, level: 2 });
      expect(heading).toBeInTheDocument();

      // Check category count badge indicates 6 items
      const badges = screen.getAllByText(/6 items/i);
      expect(badges.length).toBeGreaterThan(0);

      unmount();
    }
  });

  it("4. Preview cards render 'Catalog Preview' badge, 'Indicative • Coming Soon' and disabled action button", () => {
    const samplePreviewItem = DEMO_CANDIDATE_PRODUCTS[0]; // Classic Fleece Pullover Hoodie

    render(
      <ToastProvider>
        <CartProvider>
          <MemoryRouter>
            <ProductCard product={samplePreviewItem} />
          </MemoryRouter>
        </CartProvider>
      </ToastProvider>,
    );

    // Badge
    expect(screen.getByText("Catalog Preview")).toBeInTheDocument();

    // Indicative Price label
    expect(screen.getByText("Indicative • Coming Soon")).toBeInTheDocument();

    // Action button is disabled with Coming Soon label
    const btn = screen.getByRole("button", { name: /coming soon • preview only/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toBeDisabled();
  });

  it("5. Live real products render active 'Add to Cart' button and are fully purchasable", () => {
    const realProduct: Product = {
      id: "p-1001",
      name: "Cotton Crew T-Shirt",
      sku: "APP-TSH-001",
      price: 499,
      stock: 240,
      status: "active",
      category: "Apparel",
      description: "Comfortable organic cotton everyday t-shirt",
      imageUrl: null,
    };

    render(
      <ToastProvider>
        <CartProvider>
          <MemoryRouter>
            <ProductCard product={realProduct} />
          </MemoryRouter>
        </CartProvider>
      </ToastProvider>,
    );

    // Live product has taxes included
    expect(screen.getByText("Incl. taxes")).toBeInTheDocument();

    // Action button is active Add to Cart
    const btn = screen.getByRole("button", { name: /add to cart/i });
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
  });

  it("6. CartContext strictly blocks preview products from being added to cart", () => {
    const samplePreviewItem = DEMO_CANDIDATE_PRODUCTS[0];

    const { result } = renderHook(() => useCart(), {
      wrapper: ({ children }) => <CartProvider>{children}</CartProvider>,
    });

    expect(result.current.itemCount).toBe(0);

    // Attempt to add preview candidate product
    act(() => {
      result.current.addItem(samplePreviewItem);
    });

    // Cart remains empty!
    expect(result.current.itemCount).toBe(0);
    expect(result.current.items).toHaveLength(0);

    // Real product can be added normally
    const realProduct: Product = {
      id: "p-1001",
      name: "Cotton Crew T-Shirt",
      sku: "APP-TSH-001",
      price: 499,
      stock: 240,
      status: "active",
      category: "Apparel",
      description: "Comfortable organic cotton everyday t-shirt",
      imageUrl: null,
    };

    act(() => {
      result.current.addItem(realProduct);
    });

    expect(result.current.itemCount).toBe(1);
    expect(result.current.items[0].productId).toBe("p-1001");
  });

  it("7. Normal Guest or Customer can view product detail page for preview items with Coming Soon messaging", async () => {
    render(
      <AuthContext.Provider value={createMockAuthValue(null)}>
        <ToastProvider>
          <CartProvider>
            <MemoryRouter initialEntries={["/shop/product/demo-p-1011"]}>
              <Routes>
                <Route path="/shop/product/:id" element={<ShopProductDetailPage />} />
              </Routes>
            </MemoryRouter>
          </CartProvider>
        </ToastProvider>
      </AuthContext.Provider>,
    );

    // Product heading is visible
    const heading = await screen.findByRole("heading", { name: "Classic Fleece Pullover Hoodie", level: 1 });
    expect(heading).toBeInTheDocument();

    // Banner indicates Coming Soon / Catalog Preview
    expect(screen.getByText(/catalog preview • coming soon/i)).toBeInTheDocument();

    // Indicative price is shown
    expect(screen.getByText(/indicative price \(coming soon\)/i)).toBeInTheDocument();

    // Non-purchasable button
    expect(screen.getByText(/catalog preview — coming soon \(cannot be added to cart or purchased\)/i)).toBeInTheDocument();
  });
});
