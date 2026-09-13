import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/common/ToastProvider";
import ShippingPage from "@/pages/ShippingPage";
import { mockShipments } from "@/features/shipping/data/shipments";

function renderShippingPage() {
  return render(
    <ToastProvider>
      <MemoryRouter>
        <ShippingPage />
      </MemoryRouter>
    </ToastProvider>,
  );
}

describe("ShippingPage", () => {
  it("shows a loading state before the shipment list resolves", async () => {
    renderShippingPage();
    expect(
      screen.getByRole("status", { name: /loading shipments/i }),
    ).toBeInTheDocument();

    // Let the (synchronous, Promise-wrapped) mock fetch resolve before the
    // test ends, so the state update it triggers happens inside act().
    await waitFor(() => {
      expect(screen.getByText(mockShipments[0].customer)).toBeInTheDocument();
    });
  });

  it("renders the seeded shipments once loading finishes", async () => {
    renderShippingPage();

    await waitFor(() => {
      expect(screen.getByText(mockShipments[0].customer)).toBeInTheDocument();
    });
  });

  it("filters the list by search text", async () => {
    renderShippingPage();

    await waitFor(() => {
      expect(screen.getByText(mockShipments[0].customer)).toBeInTheDocument();
    });

    const target = mockShipments.find((s) => s.status === "Delivered");
    expect(target).toBeDefined();

    await userEvent.type(
      screen.getByLabelText(/search shipments by customer/i),
      target!.customer,
    );

    expect(screen.getByText(target!.customer)).toBeInTheDocument();
  });

  it("shows an empty state when no shipment matches the search", async () => {
    renderShippingPage();

    await waitFor(() => {
      expect(screen.getByText(mockShipments[0].customer)).toBeInTheDocument();
    });

    await userEvent.type(
      screen.getByLabelText(/search shipments by customer/i),
      "no-such-shipment-xyz",
    );

    expect(screen.getByText("No shipments found")).toBeInTheDocument();
  });
});
