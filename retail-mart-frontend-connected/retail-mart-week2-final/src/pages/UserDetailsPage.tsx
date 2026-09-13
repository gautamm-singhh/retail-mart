import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { UserForm } from "@/features/users/components/UserForm";
import { useUsers } from "@/features/users/useUsers";
import { useToast } from "@/hooks/useToast";
import type { UserFormValues } from "@/types";
import { formatDate } from "@/utils/format";
import { ROUTES } from "@/constants/routes";

export default function UserDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { users, isLoading, error, refresh, editUser, setUserStatus, removeUser } = useUsers();
  const { showToast } = useToast();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="User details" />
        <Card>
          <LoadingState label="Loading user" rows={4} />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="User details" />
        <Card>
          <ErrorState title="Couldn't load this user" description={error} onRetry={refresh} />
        </Card>
      </div>
    );
  }

  const user = users.find((u) => u.id === id);

  if (!user) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="User not found" />
        <Card>
          <ErrorState
            title="We couldn't find this user"
            description="It may have been deleted, or the link is incorrect."
            onRetry={() => navigate(ROUTES.users)}
          />
        </Card>
      </div>
    );
  }

  const handleEditSubmit = async (values: UserFormValues) => {
    try {
      await editUser(user.id, values);
      showToast("User updated successfully.");
      setIsEditOpen(false);
    } catch {
      showToast("Something went wrong saving this user.", "error");
    }
  };

  const handleToggleStatus = async () => {
    const nextStatus = user.status === "active" ? "inactive" : "active";
    try {
      await setUserStatus(user.id, nextStatus);
      showToast(nextStatus === "active" ? "User reactivated." : "User deactivated.");
    } catch {
      showToast("Something went wrong updating this user's status.", "error");
    }
  };

  const handleDeleteConfirmed = async () => {
    try {
      await removeUser(user.id);
      showToast("User deleted.");
      navigate(ROUTES.users);
    } catch {
      showToast("Something went wrong deleting this user.", "error");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        badge="USER PROFILE"
        title={user.name}
        description={`Account identifier: ${user.id}`}
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => navigate(ROUTES.users)}>
              ← Back to users
            </Button>
            <Button onClick={() => setIsEditOpen(true)}>Edit Profile</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-5 dark:border-slate-800">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-2xl font-bold text-white shadow-md">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{user.name}</h2>
                <StatusBadge status={user.status} />
              </div>
              <p className="mt-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Assigned Role</dt>
              <dd className="mt-1 flex items-center gap-2">
                <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-950/60 dark:text-emerald-300">
                  {user.role}
                </span>
              </dd>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Account Status</dt>
              <dd className="mt-1">
                <StatusBadge status={user.status} />
              </dd>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Account Created</dt>
              <dd className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">{formatDate(user.createdAt)}</dd>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Security Tier</dt>
              <dd className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                {user.role === "Admin" ? "Full Enterprise Superuser" : "Standard Operations Access"}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="flex flex-col gap-4 p-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Account Management</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Administrative role assignment and account security controls.
            </p>
          </div>

          <div className="mt-2 flex flex-col gap-3">
            <Button variant="secondary" onClick={handleToggleStatus} className="w-full justify-center">
              {user.status === "active" ? "Deactivate User Account" : "Reactivate User Account"}
            </Button>
            <Button variant="danger" onClick={() => setIsDeleteOpen(true)} className="w-full justify-center">
              Delete User Account
            </Button>
          </div>

          <div className="mt-auto rounded-xl border border-amber-200/60 bg-amber-50/60 p-3.5 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
            <span className="font-semibold">Security Note:</span> Role changes take effect immediately across all active login sessions.
          </div>
        </Card>
      </div>

      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit user">
        <UserForm
          initialValues={user}
          submitLabel="Save changes"
          onSubmit={handleEditSubmit}
          onCancel={() => setIsEditOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="Delete user"
        description={`This removes ${user.name} from the system.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setIsDeleteOpen(false)}
      />
    </div>
  );
}
