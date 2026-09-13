import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/features/auth/AuthContext";
import { ToastProvider } from "@/components/common/ToastProvider";
import UsersPage from "@/pages/UsersPage";

function renderUsersPage() {
  return render(
    <AuthProvider>
      <ToastProvider>
        <MemoryRouter>
          <UsersPage />
        </MemoryRouter>
      </ToastProvider>
    </AuthProvider>,
  );
}

describe("UsersPage", () => {
  it("renders the seeded users once loaded", async () => {
    renderUsersPage();

    expect(await screen.findByText("Gautam Sharma")).toBeInTheDocument();
    expect(screen.getByText("Sorav Kapoor")).toBeInTheDocument();
  });

  it("filters the list by search text", async () => {
    renderUsersPage();
    await screen.findByText("Gautam Sharma");

    await userEvent.type(screen.getByLabelText(/search users by name or email/i), "Neha");

    expect(screen.getByText("Neha Joshi")).toBeInTheDocument();
    expect(screen.queryByText("Gautam Sharma")).not.toBeInTheDocument();
  });

  it("shows an empty state when no user matches the search", async () => {
    renderUsersPage();
    await screen.findByText("Gautam Sharma");

    await userEvent.type(
      screen.getByLabelText(/search users by name or email/i),
      "no-such-user-xyz",
    );

    expect(screen.getByText("No users found")).toBeInTheDocument();
  });

  it("filters the list by role", async () => {
    renderUsersPage();
    await screen.findByText("Gautam Sharma");

    await userEvent.selectOptions(screen.getByLabelText("Role"), "Manager");

    await waitFor(() => {
      expect(screen.getByText("Neha Joshi")).toBeInTheDocument();
      expect(screen.queryByText("Gautam Sharma")).not.toBeInTheDocument();
    });
  });
});
