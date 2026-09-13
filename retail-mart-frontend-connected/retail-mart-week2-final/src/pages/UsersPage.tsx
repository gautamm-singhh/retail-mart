import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Table, TableColumn } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Modal } from "@/components/ui/Modal";
import { ManagementToolbar } from "@/components/common/ManagementToolbar";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { AdminStatCard } from "@/components/common/AdminStatCard";
import { RoleSelect } from "@/features/users/components/RoleSelect";
import { UserForm } from "@/features/users/components/UserForm";
import { useUsers } from "@/features/users/useUsers";
import { useToast } from "@/hooks/useToast";
import type { User, UserFormValues } from "@/types";
import { formatDate } from "@/utils/format";
import { ROUTES } from "@/constants/routes";

const STATUS_OPTIONS = [
  { label: "All statuses", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

export default function UsersPage() {
  const { users, isLoading, error, refresh, addUser, editUser, setUserStatus, removeUser } =
    useUsers();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const query = search.toLowerCase();
      const matchesSearch =
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query);
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus = statusFilter === "all" || user.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  function openAddForm() {
    setEditingUser(null);
    setIsFormOpen(true);
  }

  function openEditForm(user: User) {
    setEditingUser(user);
    setIsFormOpen(true);
  }

  async function handleFormSubmit(values: UserFormValues) {
    try {
      if (editingUser) {
        await editUser(editingUser.id, values);
        showToast("User updated successfully.");
      } else {
        await addUser(values);
        showToast("User created successfully.");
      }
      setIsFormOpen(false);
      setEditingUser(null);
    } catch {
      showToast("Something went wrong saving this user.", "error");
    }
  }

  async function handleToggleStatus(user: User) {
    const nextStatus = user.status === "active" ? "inactive" : "active";
    try {
      await setUserStatus(user.id, nextStatus);
      showToast(nextStatus === "active" ? "User reactivated." : "User deactivated.");
    } catch {
      showToast("Something went wrong updating this user's status.", "error");
    }
  }

  async function handleDeleteConfirmed() {
    if (!deletingUser) return;
    try {
      await removeUser(deletingUser.id);
      showToast("User deleted.");
    } catch {
      showToast("Something went wrong deleting this user.", "error");
    } finally {
      setDeletingUser(null);
    }
  }

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === "active").length;
  const adminUsers = users.filter((u) => u.role === "Admin").length;
  const staffUsers = users.filter((u) => u.role === "Manager" || u.role === "Staff").length;

  const columns: TableColumn<User>[] = [
    {
      header: "User",
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-xs font-bold text-white shadow-xs">
            {u.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <button
              type="button"
              onClick={() => navigate(`${ROUTES.users}/${u.id}`)}
              className="font-medium text-slate-900 hover:text-emerald-600 hover:underline dark:text-slate-100 dark:hover:text-emerald-400 transition-colors"
            >
              {u.name}
            </button>
            <p className="text-xs text-slate-500 dark:text-slate-400 sm:hidden">{u.email}</p>
          </div>
        </div>
      ),
    },
    { header: "Email", hideBelow: "sm", render: (u) => <span className="text-slate-600 dark:text-slate-300 font-mono text-xs">{u.email}</span> },
    {
      header: "Role",
      render: (u) => (
        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-200">
          {u.role}
        </span>
      ),
    },
    { header: "Status", render: (u) => <StatusBadge status={u.status} /> },
    { header: "Created", hideBelow: "lg", render: (u) => <span className="text-slate-500 dark:text-slate-400 text-xs">{formatDate(u.createdAt)}</span> },
    {
      header: "Actions",
      render: (u) => (
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => openEditForm(u)}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(u)}>
            {u.status === "active" ? "Deactivate" : "Activate"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeletingUser(u)} className="text-rose-600 hover:text-rose-700 dark:text-rose-400">
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        badge="USER MANAGEMENT"
        title="Users & Access Control"
        description="Manage admin console users, administrative roles, and system privileges."
        action={<Button onClick={openAddForm}>+ Add User</Button>}
      />

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <AdminStatCard
          label="Total Accounts"
          value={totalUsers}
          subtext="Active in directory"
          accentColor="emerald"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
        />
        <AdminStatCard
          label="Active Users"
          value={activeUsers}
          subtext={`${Math.round((activeUsers / (totalUsers || 1)) * 100)}% active rate`}
          accentColor="teal"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <AdminStatCard
          label="Administrators"
          value={adminUsers}
          subtext="Full system access"
          accentColor="purple"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
        />
        <AdminStatCard
          label="Staff / Managers"
          value={staffUsers}
          subtext="Operations & support"
          accentColor="blue"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
        />
      </div>

      <Card className="p-4 sm:p-5">
        <ManagementToolbar
          searchLabel="Search users by name or email"
          searchValue={search}
          onSearchChange={setSearch}
          filters={
            <>
              <div className="sm:w-40">
                <RoleSelect
                  hideLabel
                  includeAllOption
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                />
              </div>
              <div className="sm:w-40">
                <Select
                  label="Status"
                  hideLabel
                  options={STATUS_OPTIONS}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                />
              </div>
            </>
          }
        />

        <div className="mt-4">
          {isLoading ? (
            <LoadingState label="Loading users" rows={5} />
          ) : error ? (
            <ErrorState title="Couldn't load users" description={error} onRetry={refresh} />
          ) : (
            <Table
              columns={columns}
              rows={filteredUsers}
              getRowKey={(u) => u.id}
              emptyState={
                <EmptyState
                  title="No users found"
                  description="Try a different search term or filter."
                />
              }
            />
          )}
        </div>
      </Card>

      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingUser ? "Edit user" : "Add user"}
      >
        <UserForm
          initialValues={editingUser ?? undefined}
          submitLabel={editingUser ? "Save changes" : "Create user"}
          onSubmit={handleFormSubmit}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deletingUser)}
        title="Delete user"
        description={`This removes ${deletingUser?.name ?? "this user"} from the system.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeletingUser(null)}
      />
    </div>
  );
}
