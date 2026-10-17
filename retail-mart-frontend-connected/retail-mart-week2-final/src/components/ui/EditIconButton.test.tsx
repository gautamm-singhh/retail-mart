import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditIconButton } from "./EditIconButton";

describe("EditIconButton", () => {
  it("renders with default 'Edit' aria-label and tooltip", () => {
    render(<EditIconButton />);
    const button = screen.getByRole("button", { name: "Edit" });
    expect(button).toBeInTheDocument();
    expect(screen.getByText("Edit")).toBeInTheDocument();
  });

  it("renders with custom tooltip and aria-label", () => {
    render(<EditIconButton tooltip="Edit product" aria-label="Edit Headphones" />);
    const button = screen.getByRole("button", { name: "Edit Headphones" });
    expect(button).toBeInTheDocument();
    expect(screen.getByText("Edit product")).toBeInTheDocument();
  });

  it("triggers onClick when clicked", async () => {
    const handleClick = vi.fn();
    render(<EditIconButton onClick={handleClick} />);

    const button = screen.getByRole("button", { name: "Edit" });
    await userEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("does not trigger onClick when disabled", async () => {
    const handleClick = vi.fn();
    render(<EditIconButton disabled onClick={handleClick} />);

    const button = screen.getByRole("button", { name: "Edit" });
    expect(button).toBeDisabled();
    await userEvent.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it("renders the SVG outline icon with aria-hidden", () => {
    render(<EditIconButton />);
    const button = screen.getByRole("button", { name: "Edit" });
    const svg = button.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });
});
