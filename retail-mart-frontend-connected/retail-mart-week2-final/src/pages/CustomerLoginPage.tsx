import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/features/auth/useAuth";
import { getPostLoginRedirect } from "@/features/auth/postLoginRedirect";
import { ROUTES } from "@/constants/routes";
import type { Role } from "@/types";

interface LocationState {
  from?: { pathname: string };
}

type Tab = "password" | "otp";
type OtpStep = "phone" | "code";

export default function CustomerLoginPage() {
  const { isAuthenticated, currentUser, isLoadingUser, login, requestOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [tab, setTab] = useState<Tab>("otp");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Email/password fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // OTP fields
  const [otpStep, setOtpStep] = useState<OtpStep>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  if (isAuthenticated) {
    if (isLoadingUser || !currentUser) return null;
    const requestedFrom = (location.state as LocationState | null)?.from?.pathname;
    return <Navigate to={getPostLoginRedirect(currentUser.role, requestedFrom)} replace />;
  }

  function redirectAfterAuth(role: Role) {
    const requestedFrom = (location.state as LocationState | null)?.from?.pathname;
    navigate(getPostLoginRedirect(role, requestedFrom), { replace: true });
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const user = await login(email, password);
      if (!user) {
        setError("Invalid email or password.");
        return;
      }
      redirectAfterAuth(user.role);
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await requestOtp(phone);
      setOtpStep("code");
    } catch {
      setError("Couldn't send a code to that number. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await verifyOtp(phone, code, name);
      // OTP always signs in/creates a Customer account (see backend
      // POST /auth/otp/verify), so the role here is always "Customer".
      redirectAfterAuth("Customer");
    } catch {
      setError("That code is invalid or has expired. Please request a new one.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-600 text-sm font-semibold text-white shadow-sm">
            RM
          </div>
          <h1 className="text-lg font-semibold text-ink-950 dark:text-slate-100">Sign in to Retail Mart</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Shop the best deals, track your orders, and more.</p>
        </div>

        <Card className="p-6">
          <div className="mb-4 flex gap-1 rounded-md bg-surface-muted p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => {
                setTab("otp");
                setError(null);
              }}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                tab === "otp"
                  ? "bg-white shadow-sm text-ink-900 dark:bg-slate-900 dark:text-slate-100"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              Mobile OTP
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("password");
                setError(null);
              }}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                tab === "password"
                  ? "bg-white shadow-sm text-ink-900 dark:bg-slate-900 dark:text-slate-100"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              Email & Password
            </button>
          </div>

          {tab === "otp" ? (
            otpStep === "phone" ? (
              <form onSubmit={handleSendOtp} noValidate className="flex flex-col gap-4">
                <Input
                  label="Mobile number"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />
                {error && (
                  <p role="alert" className="text-sm text-danger-600 dark:text-rose-400">
                    {error}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Sending..." : "Send OTP"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} noValidate className="flex flex-col gap-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Enter the 6-digit code sent to <span className="font-medium text-ink-900 dark:text-slate-100">{phone}</span>
                </p>
                <Input
                  label="OTP code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                />
                <Input
                  label="Name (only needed if this is a new account)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
                {error && (
                  <p role="alert" className="text-sm text-danger-600 dark:text-rose-400">
                    {error}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Verifying..." : "Verify & Continue"}
                </Button>
                <button
                  type="button"
                  onClick={() => setOtpStep("phone")}
                  className="text-center text-sm text-brand-600 hover:underline dark:text-emerald-400"
                >
                  Use a different number
                </button>
              </form>
            )
          ) : (
            <form onSubmit={handlePasswordSubmit} noValidate className="flex flex-col gap-4">
              <Input
                label="Email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
              <Input
                label="Password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              {error && (
                <p role="alert" className="text-sm text-danger-600 dark:text-rose-400">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          )}
        </Card>

        <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
          New here?{" "}
          <Link to={ROUTES.signup} className="font-medium text-brand-600 hover:underline dark:text-emerald-400">
            Create an account
          </Link>
        </p>

        <div className="mt-4 rounded-md border border-dashed border-slate-300 bg-white p-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <p className="font-medium text-ink-700 dark:text-slate-300">Seeded customer account</p>
          <p className="mt-1">Email: ananya.rao@example.com / Password: password123</p>
          <p>Phone: +919876543210 (any code shown in the backend&apos;s console works in dev mode)</p>
        </div>
      </div>
    </div>
  );
}
