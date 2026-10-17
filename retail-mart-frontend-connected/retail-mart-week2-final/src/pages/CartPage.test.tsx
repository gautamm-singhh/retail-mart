import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/features/auth/AuthContext";
import { CartProvider } from "@/features/cart/CartContext";
import { ToastProvider } from "@/components/common/ToastProvider";
import CartPage from "@/pages/CartPage";
import CheckoutPage from "@/pages/CheckoutPage";

function renderCartPage() {
  return render(
    <AuthProvider>
      <ToastProvider>
        <CartProvider>
          <MemoryRouter>
            <CartPage />
          </MemoryRouter>
        </CartProvider>
      </ToastProvider>
    </AuthProvider>,
  );
}

function renderCheckoutPage() {
  return render(
    <AuthProvider>
      <ToastProvider>
        <CartProvider>
          <MemoryRouter>
            <CheckoutPage />
          </MemoryRouter>
        </CartProvider>
      </ToastProvider>
    </AuthProvider>,
  );
}

describe("CartPage - Consistent Pricing, Transparent Tax & Substantiated Badges", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders empty state when cart has no items", () => {
    renderCartPage();
    expect(screen.getByText("Your shopping cart is empty")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /explore catalog/i })).toBeInTheDocument();
  });

  it("renders single-item cart (₹499) with neutral taxes, free delivery, and no misleading ₹0.00 tax", () => {
    // Seed 1 item in cart: 1 x ₹499
    localStorage.setItem(
      "retail-mart-cart",
      JSON.stringify([
        {
          productId: "p-499",
          productName: "Premium Cotton T-Shirt",
          price: 499,
          quantity: 1,
        },
      ]),
    );

    renderCartPage();

    // 1. Verify Header and Subtotal
    expect(screen.getByRole("heading", { name: "Order Summary" })).toBeInTheDocument();
    expect(screen.getByText("Transparent pricing breakdown")).toBeInTheDocument();
    expect(screen.getByText(/Items Subtotal/i)).toBeInTheDocument();
    expect(screen.getAllByText("₹499").length).toBeGreaterThan(0);

    // 2. Verify Delivery Charges and Savings Banner
    expect(screen.getByText("Delivery Charges")).toBeInTheDocument();
    expect(screen.getByText("FREE")).toBeInTheDocument();
    expect(screen.getByText(/You save/i)).toBeInTheDocument();
    expect(screen.getByText(/on delivery for this order!/i)).toBeInTheDocument();

    // 3. Verify Neutral Tax Line Item and ABSENCE of misleading ₹0.00 tax
    expect(screen.getByText("Estimated GST / Taxes")).toBeInTheDocument();
    expect(screen.getByText("Taxes included where applicable")).toBeInTheDocument();
    expect(screen.queryByText("Estimated Tax (Included)")).not.toBeInTheDocument();
    expect(screen.queryByText("₹0.00")).not.toBeInTheDocument();

    // 4. Verify Total Payable Highlight Section
    expect(screen.getByText("Total Payable")).toBeInTheDocument();
    expect(screen.getByText("Inclusive of all taxes where applicable")).toBeInTheDocument();
    expect(screen.getByText("Net Payable Amount:")).toBeInTheDocument();

    // 5. Verify CTA Button
    expect(
      screen.getByRole("button", { name: /proceed to checkout • ₹499/i }),
    ).toBeInTheDocument();

    // 6. Verify Substantiated Security Badges
    expect(screen.getByText("Secure checkout")).toBeInTheDocument();
    expect(screen.getByText("Payments processed via Razorpay")).toBeInTheDocument();
    expect(screen.queryByText("256-bit SSL Secure Checkout")).not.toBeInTheDocument();
  });

  it("handles quantity increases and updates total payable dynamically", () => {
    localStorage.setItem(
      "retail-mart-cart",
      JSON.stringify([
        {
          productId: "p-499",
          productName: "Premium Cotton T-Shirt",
          price: 499,
          quantity: 1,
        },
      ]),
    );

    renderCartPage();

    // Click Increase Quantity
    const increaseBtn = screen.getByRole("button", { name: /increase quantity of/i });
    fireEvent.click(increaseBtn);

    // 2 x ₹499 = ₹998
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getAllByText("₹998").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: /proceed to checkout • ₹998/i }),
    ).toBeInTheDocument();
  });

  it("ensures Cart and Checkout pages display identical payable amounts and tax treatment", () => {
    // Seed ₹499 item
    localStorage.setItem(
      "retail-mart-cart",
      JSON.stringify([
        {
          productId: "p-499",
          productName: "Wireless Earbuds",
          price: 499,
          quantity: 1,
        },
      ]),
    );

    // 1. Render Cart
    const { unmount: unmountCart } = renderCartPage();
    expect(screen.getByText("Estimated GST / Taxes")).toBeInTheDocument();
    expect(screen.getByText("Taxes included where applicable")).toBeInTheDocument();
    expect(screen.queryByText("₹0.00")).not.toBeInTheDocument();
    unmountCart();

    // 2. Render Checkout
    renderCheckoutPage();
    expect(screen.getByRole("heading", { name: "Payment Summary" })).toBeInTheDocument();
    expect(screen.getByText("Estimated GST / Taxes")).toBeInTheDocument();
    expect(screen.getByText("Taxes included where applicable")).toBeInTheDocument();
    expect(screen.queryByText("₹0.00")).not.toBeInTheDocument();
    expect(screen.getAllByText("₹499").length).toBeGreaterThan(0);
  });
});
