import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserForm } from "@/features/users/components/UserForm";

describe("UserForm", () => {
  it("shows validation errors and does not submit when required fields are empty", async () => {
    const handleSubmit = vi.fn();
    render(
      <UserForm submitLabel="Create user" onSubmit={handleSubmit} onCancel={vi.fn()} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Create user" }));

    expect(await screen.findAllByText("This field is required.")).not.toHaveLength(0);
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it("rejects an invalid email address", async () => {
    const handleSubmit = vi.fn();
    render(
      <UserForm submitLabel="Create user" onSubmit={handleSubmit} onCancel={vi.fn()} />,
    );

    await userEvent.type(screen.getByLabelText(/full name/i), "Test User");
    await userEvent.type(screen.getByLabelText(/email/i), "not-an-email");
    await userEvent.click(screen.getByRole("button", { name: "Create user" }));

    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it("submits valid values", async () => {
    const handleSubmit = vi.fn();
    render(
      <UserForm submitLabel="Create user" onSubmit={handleSubmit} onCancel={vi.fn()} />,
    );

    await userEvent.type(screen.getByLabelText(/full name/i), "Test User");
    await userEvent.type(screen.getByLabelText(/email/i), "test.user@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Create user" }));

    expect(handleSubmit).toHaveBeenCalledWith({
      name: "Test User",
      email: "test.user@example.com",
      role: "Staff",
      status: "active",
    });
  });

  it("calls onCancel when Cancel is clicked", async () => {
    const handleCancel = vi.fn();
    render(
      <UserForm submitLabel="Create user" onSubmit={vi.fn()} onCancel={handleCancel} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(handleCancel).toHaveBeenCalledTimes(1);
  });
});
