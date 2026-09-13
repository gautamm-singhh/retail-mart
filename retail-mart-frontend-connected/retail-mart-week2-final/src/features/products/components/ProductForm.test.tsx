import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductForm } from "@/features/products/components/ProductForm";

describe("ProductForm", () => {
  it("shows validation errors and does not submit when required fields are empty", async () => {
    const handleSubmit = vi.fn();
    render(
      <ProductForm
        submitLabel="Create product"
        onSubmit={handleSubmit}
        onCancel={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Create product" }));

    expect(await screen.findAllByText("This field is required.")).not.toHaveLength(0);
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it("rejects a zero or negative price", async () => {
    const handleSubmit = vi.fn();
    render(
      <ProductForm
        submitLabel="Create product"
        onSubmit={handleSubmit}
        onCancel={vi.fn()}
      />,
    );

    await userEvent.type(screen.getByLabelText(/product name/i), "Test Product");
    await userEvent.type(screen.getByLabelText(/sku/i), "TST-001");
    await userEvent.clear(screen.getByLabelText(/price/i));
    await userEvent.type(screen.getByLabelText(/price/i), "0");
    await userEvent.click(screen.getByRole("button", { name: "Create product" }));

    expect(await screen.findByText("Must be greater than 0.")).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it("submits valid values with numeric price and stock", async () => {
    const handleSubmit = vi.fn();
    render(
      <ProductForm
        submitLabel="Create product"
        onSubmit={handleSubmit}
        onCancel={vi.fn()}
      />,
    );

    await userEvent.type(screen.getByLabelText(/product name/i), "Test Product");
    await userEvent.type(screen.getByLabelText(/sku/i), "TST-001");
    await userEvent.clear(screen.getByLabelText(/price/i));
    await userEvent.type(screen.getByLabelText(/price/i), "499");
    await userEvent.clear(screen.getByLabelText(/stock quantity/i));
    await userEvent.type(screen.getByLabelText(/stock quantity/i), "10");
    await userEvent.click(screen.getByRole("button", { name: "Create product" }));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    const submitted = handleSubmit.mock.calls[0][0];
    expect(submitted.name).toBe("Test Product");
    expect(submitted.sku).toBe("TST-001");
    expect(submitted.price).toBe(499);
    expect(submitted.stock).toBe(10);
  });
});
