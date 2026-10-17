import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/features/auth/AuthContext";
import LoginPage from "@/pages/LoginPage";
import CustomerLoginPage from "@/pages/CustomerLoginPage";
import SignupPage from "@/pages/SignupPage";
import { ROUTES } from "@/constants/routes";

const TEST_CUSTOMER_CREDENTIALS = { email: "customer@retailmart.dev", password: "password123" } as const;
const TEST_ADMIN_CREDENTIALS = { email: "sorav@retailmart.dev", password: "password123" } as const;

function DummyStorefront() {
  return <h1>Storefront Home</h1>;
}

function DummyDashboard() {
  return <h1>Admin Dashboard</h1>;
}

function renderUnifiedAuthApp(initialPath: string = ROUTES.shopLogin) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path={ROUTES.root} element={<Navigate to={ROUTES.shopLogin} replace />} />
          <Route path={ROUTES.login} element={<LoginPage />} />
          <Route path={ROUTES.shopLogin} element={<CustomerLoginPage />} />
          <Route path={ROUTES.signup} element={<SignupPage />} />
          <Route path={ROUTES.shop} element={<DummyStorefront />} />
          <Route path={ROUTES.dashboard} element={<DummyDashboard />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe("Simplified Authentication UI & RBAC Flow", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("1. Root route '/' redirects to '/shop/login' and displays single login screen", () => {
    renderUnifiedAuthApp(ROUTES.root);
    expect(screen.getByRole("heading", { name: /sign in to retail mart/i })).toBeInTheDocument();
    expect(screen.getByText(/shop the best deals, track your orders, and manage your account/i)).toBeInTheDocument();
  });

  it("2. Simplified auth page contains all expected controls and tabs", () => {
    renderUnifiedAuthApp(ROUTES.shopLogin);

    expect(screen.getByRole("heading", { name: /sign in to retail mart/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /email & password/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /mobile otp/i })).toHaveAttribute("aria-pressed", "false");

    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /create an account/i })).toBeInTheDocument();
  });

  it("3. Guarantees NO Customer | Admin role toggle exists", () => {
    renderUnifiedAuthApp(ROUTES.shopLogin);
    expect(screen.queryByRole("button", { name: /^customer$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^admin$/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("role-customer-btn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("role-admin-btn")).not.toBeInTheDocument();
  });

  it("4. Guarantees NO Sign In | Create Account segmented control exists", () => {
    renderUnifiedAuthApp(ROUTES.shopLogin);
    expect(screen.queryByRole("button", { name: /^create account$/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("mode-signin-btn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mode-signup-btn")).not.toBeInTheDocument();
  });

  it("5. Switching tabs between Email & Password and Mobile OTP works smoothly", async () => {
    renderUnifiedAuthApp(ROUTES.shopLogin);

    const otpTab = screen.getByRole("button", { name: /mobile otp/i });
    await userEvent.click(otpTab);
    expect(otpTab).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText(/mobile number/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send otp code/i })).toBeInTheDocument();

    const emailTab = screen.getByRole("button", { name: /email & password/i });
    await userEvent.click(emailTab);
    expect(emailTab).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
  });

  it("6. Customer credentials automatically authenticate and redirect to '/shop'", async () => {
    renderUnifiedAuthApp(ROUTES.shopLogin);

    await userEvent.type(screen.getByLabelText(/^email$/i), TEST_CUSTOMER_CREDENTIALS.email);
    await userEvent.type(screen.getByLabelText(/^password$/i), TEST_CUSTOMER_CREDENTIALS.password);
    await userEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(await screen.findByRole("heading", { name: /storefront home/i })).toBeInTheDocument();
    expect(sessionStorage.getItem("retail-mart-token")).toBeTruthy();
  });

  it("7. Admin credentials automatically authenticate and redirect to '/dashboard'", async () => {
    renderUnifiedAuthApp(ROUTES.login);

    await userEvent.type(screen.getByLabelText(/^email$/i), TEST_ADMIN_CREDENTIALS.email);
    await userEvent.type(screen.getByLabelText(/^password$/i), TEST_ADMIN_CREDENTIALS.password);
    await userEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(await screen.findByRole("heading", { name: /admin dashboard/i })).toBeInTheDocument();
    expect(sessionStorage.getItem("retail-mart-token")).toBeTruthy();
  });

  it("8. Invalid credentials display error alert", async () => {
    renderUnifiedAuthApp(ROUTES.shopLogin);

    await userEvent.type(screen.getByLabelText(/^email$/i), "invalid@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "wrongpassword");
    await userEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/invalid email or password/i);
    expect(sessionStorage.getItem("retail-mart-token")).toBeNull();
  });

  it("9. '/shop/signup' opens customer signup flow and successful registration redirects to '/shop'", async () => {
    renderUnifiedAuthApp(ROUTES.signup);

    expect(screen.getByRole("heading", { name: /create your account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password \(min\. 6 characters\)/i)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/full name/i), "Priya Sharma");
    await userEvent.type(screen.getByLabelText(/^email$/i), "priya@example.com");
    await userEvent.type(screen.getByLabelText(/password \(min\. 6 characters\)/i), "password123");
    await userEvent.click(screen.getByRole("button", { name: /create retail mart account/i }));

    expect(await screen.findByRole("heading", { name: /storefront home/i })).toBeInTheDocument();
    expect(sessionStorage.getItem("retail-mart-token")).toBeTruthy();
  });

  it("10. Customer OTP request and verification redirects to '/shop'", async () => {
    renderUnifiedAuthApp(ROUTES.shopLogin);

    await userEvent.click(screen.getByRole("button", { name: /mobile otp/i }));
    await userEvent.type(screen.getByLabelText(/mobile number/i), "9876543210");
    await userEvent.click(screen.getByRole("button", { name: /send otp code/i }));

    expect(await screen.findByLabelText(/otp code/i)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/otp code/i), "123456");
    await userEvent.click(screen.getByRole("button", { name: /verify & sign in/i }));

    expect(await screen.findByRole("heading", { name: /storefront home/i })).toBeInTheDocument();
    expect(sessionStorage.getItem("retail-mart-token")).toBeTruthy();
  });

  it("11. Guarantees NO demo credentials or auto-fill buttons anywhere in auth UI", () => {
    renderUnifiedAuthApp(ROUTES.shopLogin);
    expect(screen.queryByText(/demo credentials/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sorav@retailmart\.dev/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /auto-fill/i })).not.toBeInTheDocument();
  });

  it("12. Validates Indian phone number in OTP login and rejects invalid numbers", async () => {
    renderUnifiedAuthApp(ROUTES.shopLogin);

    await userEvent.click(screen.getByRole("button", { name: /mobile otp/i }));
    await userEvent.type(screen.getByLabelText(/mobile number/i), "12345");
    await userEvent.click(screen.getByRole("button", { name: /send otp code/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/valid 10-digit Indian mobile number/i);
  });

  it("13. Accepts formatted Indian phone (+91 prefix and spaces) and normalizes properly", async () => {
    renderUnifiedAuthApp(ROUTES.shopLogin);

    await userEvent.click(screen.getByRole("button", { name: /mobile otp/i }));
    await userEvent.type(screen.getByLabelText(/mobile number/i), "+91 98765 43210");
    await userEvent.click(screen.getByRole("button", { name: /send otp code/i }));

    expect(await screen.findByLabelText(/otp code/i)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/otp code/i), "123456");
    await userEvent.click(screen.getByRole("button", { name: /verify & sign in/i }));

    expect(await screen.findByRole("heading", { name: /storefront home/i })).toBeInTheDocument();
  });
});
