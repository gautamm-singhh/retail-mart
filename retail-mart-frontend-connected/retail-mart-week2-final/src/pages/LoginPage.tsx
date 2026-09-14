import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/features/auth/useAuth";
import { getPostLoginRedirect } from "@/features/auth/postLoginRedirect";

interface LocationState {
  from?: { pathname: string };
}

/** Seeded by seed.py - see the backend README for the full list. */
export const DEMO_CREDENTIALS = { email: "sorav@retailmart.dev", password: "password123" } as const;

export default function LoginPage() {
  const { isAuthenticated, currentUser, isLoadingUser, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Already signed in (token present) - don't show the login form again.
  // Wait for currentUser to resolve so the redirect target is role-correct
  // (a Customer should never land on the admin dashboard, and vice versa).
  if (isAuthenticated) {
    if (isLoadingUser) return null;
    if (!currentUser) return null;
    const requestedFrom = (location.state as LocationState | null)?.from?.pathname;
    return <Navigate to={getPostLoginRedirect(currentUser.role, requestedFrom)} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const user = await login(email, password);
      if (!user) {
        setError("Invalid email or password.");
        return;
      }

      // A Customer account signing in here (the admin console's login)
      // still gets sent to the storefront, not an admin page they have no
      // access to - see getPostLoginRedirect().
      const requestedFrom = (location.state as LocationState | null)?.from?.pathname;
      navigate(getPostLoginRedirect(user.role, requestedFrom), { replace: true });
    } catch {
      setError("Couldn't reach the server. Is the backend running?");
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
          <h1 className="text-lg font-semibold text-ink-950 dark:text-slate-100">Retail Mart Admin</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Sign in to the operations console.</p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@retailmart.dev"
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

            <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
