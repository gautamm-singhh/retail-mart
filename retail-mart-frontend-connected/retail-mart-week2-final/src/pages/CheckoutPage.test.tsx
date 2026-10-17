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

  it("calculates intra-state CGST and SGST for Telangana delivery address", async () => {
    // 1 item: Cotton Crew T-Shirt (₹499 inclusive, 5% GST)
    localStorage.setItem(
      "retail-mart-cart",
      JSON.stringify([
        {
          productId: "p-tshirt",
          productName: "Cotton Crew T-Shirt",
          price: 499,
          quantity: 1,
        },
      ]),
    );

    renderCheckoutPage();

    // Default address in mockApi is Telangana
    expect(await screen.findByText(/Intra-State \(Telangana → Telangana\)/i)).toBeInTheDocument();
    expect(screen.getByText("Taxable Value (Net Base)")).toBeInTheDocument();
    expect(screen.getByText("₹475.24")).toBeInTheDocument();
    expect(screen.getByText(/• CGST \(Central Tax\):/i)).toBeInTheDocument();
    expect(screen.getByText(/• SGST \(State Tax\):/i)).toBeInTheDocument();
    expect(screen.getAllByText("₹11.88").length).toBe(2); // CGST 11.88 and SGST 11.88
    expect(screen.getByText("₹23.76")).toBeInTheDocument(); // Total GST
    expect(screen.getAllByText("₹499").length).toBeGreaterThanOrEqual(1);
  });

  it("calculates inter-state IGST when delivery address is Karnataka", async () => {
    // Select the Karnataka address (addr-002 in mockApi)
    localStorage.setItem(
      "retail-mart-cart",
      JSON.stringify([
        {
          productId: "p-tshirt",
          productName: "Cotton Crew T-Shirt",
          price: 499,
          quantity: 1,
        },
      ]),
    );

    renderCheckoutPage();

    // Switch to Karnataka address
    const karnatakaAddressOption = await screen.findByText(/Office \(Bengaluru\)/i);
    karnatakaAddressOption.click();

    expect(await screen.findByText(/Inter-State \(Telangana → Karnataka\)/i)).toBeInTheDocument();
    expect(screen.getByText("₹475.24")).toBeInTheDocument();
    expect(screen.getByText(/• IGST \(Integrated Tax\):/i)).toBeInTheDocument();
    expect(screen.getAllByText("₹23.76").length).toBeGreaterThanOrEqual(2); // IGST line + Total GST header
    expect(screen.queryByText(/• CGST \(Central Tax\):/i)).not.toBeInTheDocument();
  });

  it("handles mixed GST rates with multiple products (5%, 12%, 18%)", async () => {
    localStorage.setItem(
      "retail-mart-cart",
      JSON.stringify([
        {
          productId: "p1",
          productName: "Cotton Crew T-Shirt",
          price: 499,
          quantity: 1,
        },
        {
          productId: "p2",
          productName: "Slim Fit Denim Jeans",
          price: 1799,
          quantity: 1,
        },
        {
          productId: "p3",
          productName: "Wireless Earbuds Pro",
          price: 2999,
          quantity: 1,
        },
      ]),
    );

    renderCheckoutPage();

    // Gross: 499 + 1799 + 2999 = 5297
    expect(await screen.findByText(/Intra-State \(Telangana → Telangana\)/i)).toBeInTheDocument();
    expect(screen.getByText("₹4,730.10")).toBeInTheDocument(); // Taxable base
    expect(screen.getByText("₹283.46")).toBeInTheDocument(); // CGST 283.46
    expect(screen.getByText("₹283.44")).toBeInTheDocument(); // SGST 283.44
    expect(screen.getByText("₹566.90")).toBeInTheDocument(); // Total GST
    expect(screen.getAllByText("₹5,297").length).toBeGreaterThanOrEqual(1);

    // Slabs breakdown displayed (5% for T-shirt & Jeans under Notification 9/2025, 18% for Earbuds)
    expect(screen.getByText(/Product Tax Slabs \(HSN Verified\):/i)).toBeInTheDocument();
    expect(screen.getByText(/HSN 6109 \(5%\):/i)).toBeInTheDocument();
    expect(screen.getByText(/HSN 8518 \(18%\):/i)).toBeInTheDocument();
  });

  it("clearly displays GST Registration in Progress preview banner and pending GSTIN", async () => {
    localStorage.setItem(
      "retail-mart-cart",
      JSON.stringify([
        {
          productId: "p1",
          productName: "Cotton Crew T-Shirt",
          price: 499,
          quantity: 1,
        },
      ]),
    );

    renderCheckoutPage();

    expect(await screen.findByText("GST Registration in Progress (Preview Mode)")).toBeInTheDocument();
    expect(
      screen.getByText(/Seller GSTIN: Pending client registration/i),
    ).toBeInTheDocument();
  });
});
