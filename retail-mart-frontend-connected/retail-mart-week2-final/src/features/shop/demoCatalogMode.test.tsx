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

// Mock API responses for products and categories
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

describe("Demo Catalog Mode - Access Restrictions, Isolation & Purchasing Guards", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("1. Public visitors and normal customers CANNOT see the Demo Mode toggle button", async () => {
    // Guest visitor
    const { unmount } = renderShopHomePage("/shop", null);
    expect(screen.queryByTitle(/toggle demo presentation catalog mode/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/demo catalog mode/i)).not.toBeInTheDocument();
    unmount();

    // Normal Customer account
    const customerUser: User = {
      id: "u-cust",
      name: "Customer John",
      email: "john@example.com",
      role: "Customer",
      status: "active",
      createdAt: "2026-01-01",
    };
    renderShopHomePage("/shop", customerUser);
    expect(screen.queryByTitle(/toggle demo presentation catalog mode/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/demo catalog mode/i)).not.toBeInTheDocument();
  });

  it("2. Unauthorized users CANNOT bypass restrictions via URL query param (?mode=demo)", async () => {
    const customerUser: User = {
      id: "u-cust",
      name: "Customer John",
      email: "john@example.com",
      role: "Customer",
      status: "active",
      createdAt: "2026-01-01",
    };

    // Customer attempts to open /shop?mode=demo
    renderShopHomePage("/shop?mode=demo", customerUser);

    // Banner must NOT appear
    expect(screen.queryByText(/demo presentation catalog/i)).not.toBeInTheDocument();

    // Demo products like Hoodie must NOT be displayed
    expect(screen.queryByText("Classic Fleece Pullover Hoodie")).not.toBeInTheDocument();
  });

  it("3. Authorized Admin CAN see Demo toggle and view the 24-product preview with Demo Banner", async () => {
    const adminUser: User = {
      id: "u-admin",
      name: "Admin User",
      email: "admin@retailmart.com",
      role: "Admin",
      status: "active",
      createdAt: "2026-01-01",
    };

    // Admin opens /shop
    const { unmount } = renderShopHomePage("/shop", adminUser);

    // Toggle button IS visible to Admin
    const toggleBtn = await screen.findByTitle(/toggle demo presentation catalog mode/i);
    expect(toggleBtn).toBeInTheDocument();
    unmount();

    // Now Admin navigates to /shop?mode=demo
    renderShopHomePage("/shop?mode=demo", adminUser);

    // Prominent Demo banner is shown
    expect(await screen.findByText(/demo presentation catalog \(client review mode\)/i)).toBeInTheDocument();

    // Candidate products are present
    expect(await screen.findByText("Classic Fleece Pullover Hoodie")).toBeInTheDocument();
  });

  it("4. Demo product card renders 'Demo Preview' badge, 'Indicative Price' and disabled action button", () => {
    const sampleDemoItem = DEMO_CANDIDATE_PRODUCTS[0]; // Classic Fleece Pullover Hoodie

    render(
      <ToastProvider>
        <CartProvider>
          <MemoryRouter>
            <ProductCard product={sampleDemoItem} />
          </MemoryRouter>
        </CartProvider>
      </ToastProvider>,
    );

    // Badge
    expect(screen.getByText("Demo Preview")).toBeInTheDocument();

    // Indicative Price label
    expect(screen.getByText("Indicative Price")).toBeInTheDocument();

    // Action button is disabled with Demo label
    const btn = screen.getByRole("button", { name: /demo preview only/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toBeDisabled();
  });

  it("5. CartContext strictly rejects demo products from being added to cart", () => {
    const sampleDemoItem = DEMO_CANDIDATE_PRODUCTS[0];

    const { result } = renderHook(() => useCart(), {
      wrapper: ({ children }) => <CartProvider>{children}</CartProvider>,
    });

    expect(result.current.itemCount).toBe(0);

    // Attempt to add demo product
    act(() => {
      result.current.addItem(sampleDemoItem);
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

  it("6. Demo product detail URL (/shop/product/demo-*) strictly rejects unauthorized customer access", async () => {
    const customerUser: User = {
      id: "u-cust",
      name: "Customer John",
      email: "john@example.com",
      role: "Customer",
      status: "active",
      createdAt: "2026-01-01",
    };

    render(
      <AuthContext.Provider value={createMockAuthValue(customerUser)}>
        <ToastProvider>
          <CartProvider>
            <MemoryRouter initialEntries={["/shop/product/demo-app-001"]}>
              <Routes>
                <Route path="/shop/product/:id" element={<ShopProductDetailPage />} />
              </Routes>
            </MemoryRouter>
          </CartProvider>
        </ToastProvider>
      </AuthContext.Provider>,
    );

    // Should display error state that product cannot be found
    expect(await screen.findByText(/we couldn't find this product/i)).toBeInTheDocument();
    // And should NOT show the demo hoodie name
    expect(screen.queryByText("Classic Fleece Pullover Hoodie")).not.toBeInTheDocument();
  });
});
