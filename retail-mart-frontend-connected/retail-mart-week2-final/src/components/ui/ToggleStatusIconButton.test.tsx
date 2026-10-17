import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToggleStatusIconButton } from "./ToggleStatusIconButton";

describe("ToggleStatusIconButton", () => {
  it("renders with 'Deactivate' tooltip and label when isActive is true", () => {
    render(<ToggleStatusIconButton isActive={true} />);
    const button = screen.getByRole("button", { name: "Deactivate" });
    expect(button).toBeInTheDocument();
    expect(screen.getByText("Deactivate")).toBeInTheDocument();
  });

  it("renders with 'Activate' tooltip and label when isActive is false", () => {
    render(<ToggleStatusIconButton isActive={false} />);
    const button = screen.getByRole("button", { name: "Activate" });
    expect(button).toBeInTheDocument();
    expect(screen.getByText("Activate")).toBeInTheDocument();
  });

  it("renders with custom aria-label", () => {
    render(<ToggleStatusIconButton isActive={true} aria-label="Deactivate User Gautam" />);
    const button = screen.getByRole("button", { name: "Deactivate User Gautam" });
    expect(button).toBeInTheDocument();
    expect(screen.getByText("Deactivate")).toBeInTheDocument();
  });

  it("triggers onClick when clicked", async () => {
    const handleClick = vi.fn();
    render(<ToggleStatusIconButton isActive={true} onClick={handleClick} />);

    const button = screen.getByRole("button", { name: "Deactivate" });
    await userEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("does not trigger onClick when disabled", async () => {
    const handleClick = vi.fn();
    render(<ToggleStatusIconButton isActive={false} disabled onClick={handleClick} />);

    const button = screen.getByRole("button", { name: "Activate" });
    expect(button).toBeDisabled();
    await userEvent.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it("renders the SVG outline icon with aria-hidden", () => {
    render(<ToggleStatusIconButton isActive={true} />);
    const button = screen.getByRole("button", { name: "Deactivate" });
    const svg = button.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });
});
