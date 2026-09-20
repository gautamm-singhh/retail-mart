import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/features/auth/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import LoginPage from "@/pages/LoginPage";
import { ROUTES } from "@/constants/routes";

const DEMO_CREDENTIALS = { email: "sorav@retailmart.dev", password: "password123" } as const;

function DummyDashboard() {
  return <h1>Dashboard</h1>;
}

function renderApp() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[ROUTES.dashboard]}>
        <Routes>
          <Route path={ROUTES.login} element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path={ROUTES.dashboard} element={<DummyDashboard />} />
          </Route>
          <Route path="*" element={<Navigate to={ROUTES.login} replace />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe("Login -> protected dashboard flow", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("redirects an unauthenticated visitor from a protected route to /login", () => {
    renderApp();
    expect(
      screen.getByRole("heading", { name: /sign in to retail mart/i }),
    ).toBeInTheDocument();
  });

  it("shows an error and stays on /login for invalid credentials", async () => {
    renderApp();

    await userEvent.type(screen.getByLabelText(/email/i), "wrong@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "wrong-password");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /invalid email or password/i,
    );
  });

  it("logs in with a seeded account and reaches the protected dashboard", async () => {
    renderApp();

    await userEvent.type(screen.getByLabelText(/email/i), DEMO_CREDENTIALS.email);
    await userEvent.type(screen.getByLabelText(/password/i), DEMO_CREDENTIALS.password);
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
  });
});
