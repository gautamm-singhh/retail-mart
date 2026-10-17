import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddressForm } from "./AddressForm";
import * as pincodeApi from "@/services/api/pincode";

describe("AddressForm & PIN Code Auto-Fill", () => {
  it("validates required fields on empty submit", async () => {
    const onSubmit = vi.fn();
    render(<AddressForm submitLabel="Save Address" onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole("button", { name: /save address/i }));

    expect(screen.getAllByText("This field is required.").length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/address line 1/i)).toHaveAttribute("aria-invalid", "true");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("automatically fills City and State when valid 6-digit PIN is entered", async () => {
    vi.spyOn(pincodeApi, "lookupPincode").mockResolvedValueOnce({
      city: "Darbhanga",
      state: "Bihar",
    });

    const onSubmit = vi.fn();
    render(<AddressForm submitLabel="Save Address" onSubmit={onSubmit} />);

    const pinInput = screen.getByLabelText(/postal code \(pin\)/i);
    await userEvent.type(pinInput, "846004");

    await waitFor(() => {
      expect(screen.getByDisplayValue("Darbhanga")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Bihar")).toBeInTheDocument();
    });

    expect(screen.getByText(/auto-filled: darbhanga, bihar/i)).toBeInTheDocument();
  });

  it("validates Indian phone number format and normalizes on submit", async () => {
    const onSubmit = vi.fn();
    render(
      <AddressForm
        submitLabel="Save Address"
        initialValues={{
          label: "Home",
          line1: "Flat 402, Royal Residency",
          line2: "MG Road",
          city: "Bengaluru",
          state: "Karnataka",
          postalCode: "560001",
          phone: "",
          isDefault: true,
        }}
        onSubmit={onSubmit}
      />,
    );

    const phoneInput = screen.getByLabelText(/phone number/i);
    await userEvent.type(phoneInput, "2876543210");
    await userEvent.click(screen.getByRole("button", { name: /save address/i }));

    expect(await screen.findByText(/indian mobile numbers must start with 6, 7, 8, or 9/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    await userEvent.clear(phoneInput);
    await userEvent.type(phoneInput, "+91 98765 43210");
    await userEvent.click(screen.getByRole("button", { name: /save address/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: "9876543210",
          city: "Bengaluru",
          state: "Karnataka",
        }),
      );
    });
  });

  it("allows user to manually edit City and State if lookup fails", async () => {
    vi.spyOn(pincodeApi, "lookupPincode").mockResolvedValueOnce(null);

    const onSubmit = vi.fn();
    render(<AddressForm submitLabel="Save Address" onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText(/postal code \(pin\)/i), "999999");

    await waitFor(() => {
      expect(screen.getByText(/you can enter city and state manually/i)).toBeInTheDocument();
    });

    await userEvent.type(screen.getByLabelText(/address line 1/i), "Main Road 12");
    await userEvent.type(screen.getByLabelText(/^city \*/i), "RemoteTown");
    await userEvent.type(screen.getByLabelText(/^state \*/i), "RemoteState");

    await userEvent.click(screen.getByRole("button", { name: /save address/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          line1: "Main Road 12",
          city: "RemoteTown",
          state: "RemoteState",
          postalCode: "999999",
        }),
      );
    });
  });
});
