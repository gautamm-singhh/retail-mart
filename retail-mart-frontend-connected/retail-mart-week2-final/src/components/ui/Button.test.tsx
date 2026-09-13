import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/Button";

describe("Button", () => {
  it("renders as a real <button> element with its label", () => {
    render(<Button>Add Product</Button>);
    expect(screen.getByRole("button", { name: "Add Product" })).toBeInTheDocument();
  });

  it("calls onClick when activated", async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Save</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire onClick when disabled", async () => {
    const handleClick = vi.fn();
    render(
      <Button onClick={handleClick} disabled>
        Save
      </Button>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(handleClick).not.toHaveBeenCalled();
  });
});
