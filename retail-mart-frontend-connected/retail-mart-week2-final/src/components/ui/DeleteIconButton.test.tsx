import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteIconButton } from "./DeleteIconButton";

describe("DeleteIconButton", () => {
  it("renders with default 'Delete' aria-label and tooltip", () => {
    render(<DeleteIconButton />);
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("renders with custom tooltip and aria-label", () => {
    render(<DeleteIconButton tooltip="Remove user" aria-label="Delete John Doe" />);
    const button = screen.getByRole("button", { name: "Delete John Doe" });
    expect(button).toBeInTheDocument();
    expect(screen.getByText("Remove user")).toBeInTheDocument();
  });

  it("triggers onClick when clicked", async () => {
    const handleClick = vi.fn();
    render(<DeleteIconButton onClick={handleClick} />);

    const button = screen.getByRole("button", { name: "Delete" });
    await userEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("does not trigger onClick when disabled", async () => {
    const handleClick = vi.fn();
    render(<DeleteIconButton disabled onClick={handleClick} />);

    const button = screen.getByRole("button", { name: "Delete" });
    expect(button).toBeDisabled();
    await userEvent.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it("renders the SVG outline icon with aria-hidden", () => {
    render(<DeleteIconButton />);
    const button = screen.getByRole("button", { name: "Delete" });
    const svg = button.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });
});
