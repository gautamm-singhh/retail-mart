import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/useAuth";
import { ROUTES } from "@/constants/routes";

/**
 * Authenticated staff and administrator profile details.
 */
export default function ProfilePage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  if (!currentUser) return null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        badge="ADMINISTRATIVE SESSION"
        title="Admin Profile & Access"
        description="Active console session identity, enterprise roles, and security authorization."
        action={
          <Button variant="secondary" onClick={() => navigate(ROUTES.dashboard)}>
            ← Back to dashboard
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center gap-5 border-b border-slate-100 pb-5 dark:border-slate-800">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-2xl font-bold text-white shadow-md">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{currentUser.name}</h2>
                <Badge tone="success">Active Session</Badge>
              </div>
              <p className="mt-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">{currentUser.email}</p>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <dt className="text-xs text-slate-400">Assigned Privilege Tier</dt>
              <dd className="mt-1">
                <Badge tone="brand">{currentUser.role}</Badge>
              </dd>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <dt className="text-xs text-slate-400">Auth Mechanism</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                JWT Bearer (RSA Signed)
              </dd>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <dt className="text-xs text-slate-400">Console Capabilities</dt>
              <dd className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                Full CRUD across Catalog, Orders, Courier APIs & Mailer
              </dd>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <dt className="text-xs text-slate-400">Console Version</dt>
              <dd className="mt-1 font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Retail Mart Enterprise v1.0.0
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="flex flex-col gap-4 p-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Security & Environment</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Active security policies enforced for administrative sessions:
          </p>

          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Role-Based Access Control (RBAC) active</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Secure Token in localStorage with auto-refresh</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>CORS restricted to authorized clients</span>
            </li>
          </ul>

          <div className="mt-auto rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
            <span className="font-semibold">Operations Active:</span> Logged in as administrator. Any changes made are attributed to your session audit trail.
          </div>
        </Card>
      </div>
    </div>
  );
}
