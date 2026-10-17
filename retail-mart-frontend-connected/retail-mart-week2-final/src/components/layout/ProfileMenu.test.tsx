import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/features/auth/AuthContext";
import { setAuthToken } from "@/features/auth/authStorage";
import { ProfileMenu } from "@/components/layout/ProfileMenu";

function renderProfileMenu() {
  setAuthToken("test-token-u-001");

  return render(
    <AuthProvider>
      <MemoryRouter>
        <ProfileMenu />
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe("ProfileMenu", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("does not show the menu until the avatar button is clicked", async () => {
    renderProfileMenu();
    await screen.findByRole("button", { name: /account menu/i });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens the dropdown on click and shows account info", async () => {
    renderProfileMenu();

    await userEvent.click(await screen.findByRole("button", { name: /account menu/i }));

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByText("Gautam Sharma")).toBeInTheDocument();
    expect(screen.getByText("gautam@retailmart.dev")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("closes when clicking outside the menu", async () => {
    renderProfileMenu();

    await userEvent.click(await screen.findByRole("button", { name: /account menu/i }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await userEvent.click(document.body);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes when Escape is pressed", async () => {
    renderProfileMenu();

    await userEvent.click(await screen.findByRole("button", { name: /account menu/i }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("signs out when Sign out is clicked from the menu", async () => {
    renderProfileMenu();

    await userEvent.click(await screen.findByRole("button", { name: /account menu/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));

    expect(
      screen.queryByRole("button", { name: /account menu/i }),
    ).not.toBeInTheDocument();
  });
});
