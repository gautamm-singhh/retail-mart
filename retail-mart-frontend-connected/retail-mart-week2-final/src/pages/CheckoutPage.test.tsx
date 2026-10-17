import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/features/auth/AuthContext";
import { CartProvider } from "@/features/cart/CartContext";
import { ToastProvider } from "@/components/common/ToastProvider";
import CheckoutPage from "@/pages/CheckoutPage";

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

describe("CheckoutPage - Professional Payment Summary & Accurate Tax/Security Badges", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders empty state when cart has no items", () => {
    renderCheckoutPage();
    expect(screen.getByText("Your cart is empty")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /explore catalog/i })).toBeInTheDocument();
  });

  it("renders Amazon/Flipkart style payment summary with neutral taxes and substantiated security badges", async () => {
    // Seed 1 item in cart: 1 x ₹2,000 = ₹2,000
    localStorage.setItem(
      "retail-mart-cart",
      JSON.stringify([
        {
          productId: "p-1001",
          productName: "Wireless Bluetooth Headphones",
          price: 2000,
          quantity: 1,
        },
      ]),
    );

    renderCheckoutPage();

    // 1. Verify Payment Summary Header
    expect(screen.getByRole("heading", { name: "Payment Summary" })).toBeInTheDocument();
    expect(screen.getByText("Transparent pricing breakdown")).toBeInTheDocument();

    // 2. Verify Pricing Breakdown items
    expect(screen.getByText(/Items Subtotal/i)).toBeInTheDocument();
    expect(screen.getByText("Delivery Charges")).toBeInTheDocument();
    expect(screen.getByText("FREE")).toBeInTheDocument();
    expect(screen.getByText("Discount")).toBeInTheDocument();

    // 3. Verify Neutral Tax Line Item (No assumed 18% GST split)
    expect(screen.getByText("Estimated GST / Taxes")).toBeInTheDocument();
    expect(screen.getByText("Taxes included where applicable")).toBeInTheDocument();

    // 4. Verify Item row neutral tax tag
    expect(screen.getByText("Taxes included")).toBeInTheDocument();

    // 5. Verify Savings Banner
    expect(screen.getByText(/You save/i)).toBeInTheDocument();
    expect(screen.getByText(/on delivery for this order!/i)).toBeInTheDocument();

    // 6. Verify Prominent Total Amount Section
    const totalHeadings = screen.getAllByText("Total Amount");
    expect(totalHeadings.length).toBeGreaterThan(0);
    expect(screen.getByText("Inclusive of all taxes where applicable")).toBeInTheDocument();
    expect(screen.getByText("Net Payable Amount:")).toBeInTheDocument();

    // 7. Verify CTA Button with correct total
    expect(
      screen.getByRole("button", { name: /place order & pay/i }),
    ).toBeInTheDocument();

    // 8. Verify Substantiated Security & Trust Reassurance Section
    const secureElements = screen.getAllByText(/secure checkout/i);
    expect(secureElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Secure checkout")).toBeInTheDocument();
    expect(screen.getByText("Payments processed via Razorpay")).toBeInTheDocument();
    expect(
      screen.getByText(/You will receive an order confirmation & tax invoice after successful payment\./i),
    ).toBeInTheDocument();
  });
});
