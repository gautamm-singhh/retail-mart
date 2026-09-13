import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ToastProvider } from "@/components/common/ToastProvider";
import ShipmentDetailsPage from "@/pages/ShipmentDetailsPage";
import { mockShipments } from "@/features/shipping/data/shipments";

describe("ShipmentDetailsPage", () => {
  it("renders shipment info and its tracking history once loaded", async () => {
    const shipment = mockShipments[0];

    render(
      <ToastProvider>
        <MemoryRouter initialEntries={[`/shipping/${shipment.id}`]}>
          <Routes>
            <Route path="/shipping/:id" element={<ShipmentDetailsPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: shipment.id })).toBeInTheDocument();
    });

    expect(screen.getByText(shipment.customer)).toBeInTheDocument();
    expect(screen.getByText(shipment.trackingNumber)).toBeInTheDocument();
    // Every tracking history entry's status should render as a badge.
    for (const event of shipment.trackingHistory) {
      expect(screen.getAllByText(event.status).length).toBeGreaterThan(0);
    }
  });

  it("shows a not-found state for an unknown shipment id", async () => {
    render(
      <ToastProvider>
        <MemoryRouter initialEntries={["/shipping/SHP-DOES-NOT-EXIST"]}>
          <Routes>
            <Route path="/shipping/:id" element={<ShipmentDetailsPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("We couldn't find this shipment")).toBeInTheDocument();
    });
  });
});
