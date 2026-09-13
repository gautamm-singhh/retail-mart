import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/common/ToastProvider";
import PaymentsPage from "@/pages/PaymentsPage";
import RefundsPage from "@/pages/RefundsPage";
import { mockPayments } from "@/features/payments/data/payments";

function renderPaymentsPage() {
  return render(
    <ToastProvider>
      <MemoryRouter>
        <PaymentsPage />
      </MemoryRouter>
    </ToastProvider>,
  );
}

function renderRefundsPage() {
  return render(
    <ToastProvider>
      <MemoryRouter>
        <RefundsPage />
      </MemoryRouter>
    </ToastProvider>,
  );
}

describe("Payments vs Refunds separation", () => {
  it("does not display refunded transactions on the Payments view", async () => {
    renderPaymentsPage();

    const paidPayment = mockPayments.find((p) => p.status === "Paid");
    const refundedPayment = mockPayments.find((p) => p.status === "Refunded");
    expect(paidPayment).toBeDefined();
    expect(refundedPayment).toBeDefined();

    // Wait for the list to actually load before asserting on its contents.
    expect(await screen.findByText(paidPayment!.customer)).toBeInTheDocument();
    expect(screen.queryByText(refundedPayment!.customer)).not.toBeInTheDocument();
  });

  it("the Payments status filter no longer offers Refunded as an option", () => {
    renderPaymentsPage();

    const statusFilter = screen.getByLabelText("Status") as HTMLSelectElement;
    const optionLabels = Array.from(statusFilter.options).map(
      (option) => option.textContent,
    );

    expect(optionLabels).not.toContain("Refunded");
    expect(optionLabels).toEqual(["All statuses", "Pending", "Paid", "Failed"]);
  });

  it("the Refunds view shows only refunded transactions", async () => {
    renderRefundsPage();

    const refundedPayment = mockPayments.find((p) => p.status === "Refunded");
    const nonRefundedPayment = mockPayments.find((p) => p.status === "Paid");
    expect(refundedPayment).toBeDefined();
    expect(nonRefundedPayment).toBeDefined();

    expect(await screen.findByText(refundedPayment!.customer)).toBeInTheDocument();
    expect(screen.queryByText(nonRefundedPayment!.customer)).not.toBeInTheDocument();
  });

  it("labels the Refunds page clearly as Refunds", () => {
    renderRefundsPage();
    expect(screen.getByRole("heading", { name: "Refunds" })).toBeInTheDocument();
  });
});
