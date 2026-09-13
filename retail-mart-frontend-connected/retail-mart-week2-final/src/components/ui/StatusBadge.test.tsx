import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/ui/StatusBadge";

describe("StatusBadge", () => {
  it("renders the status text", () => {
    render(<StatusBadge status="Delivered" />);
    expect(screen.getByText("Delivered")).toBeInTheDocument();
  });

  it("applies a success tone for a delivered status", () => {
    render(<StatusBadge status="Delivered" />);
    expect(screen.getByText("Delivered")).toHaveClass("text-success-600");
  });

  it("applies a danger tone for a failed status", () => {
    render(<StatusBadge status="Failed" />);
    expect(screen.getByText("Failed")).toHaveClass("text-danger-600");
  });

  it("falls back to a neutral tone for an unrecognized status", () => {
    render(<StatusBadge status="Some Unknown Status" />);
    expect(screen.getByText("Some Unknown Status")).toHaveClass("bg-slate-100");
  });
});
