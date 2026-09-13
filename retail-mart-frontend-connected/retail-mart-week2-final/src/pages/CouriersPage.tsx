import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, TableColumn } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { ManagementToolbar } from "@/components/common/ManagementToolbar";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { AdminStatCard } from "@/components/common/AdminStatCard";
import { useCouriers } from "@/features/couriers/useCouriers";
import { useToast } from "@/hooks/useToast";
import type { Courier, CourierFormValues } from "@/types";
import { isRequired, isValid } from "@/utils/validation";

interface CourierModalProps {
  initialValues?: Courier;
  onSave: (values: CourierFormValues) => Promise<void>;
  onClose: () => void;
}

function CourierFormModal({ initialValues, onSave, onClose }: CourierModalProps) {
  const [name, setName] = useState(initialValues?.name || "");
  const [code, setCode] = useState(initialValues?.code || "");
  const [email, setEmail] = useState(initialValues?.contactEmail || "");
  const [template, setTemplate] = useState(initialValues?.trackingUrlTemplate || "");
  const [isActive, setIsActive] = useState(initialValues ? initialValues.isActive : true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const nameErr = isRequired(name);
    if (nameErr) errs.name = nameErr;
    const codeErr = isRequired(code);
    if (codeErr) errs.code = codeErr;
    setErrors(errs);
    if (!isValid(errs)) return;

    setIsSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        contactEmail: email.trim() || null,
        trackingUrlTemplate: template.trim() || null,
        isActive,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Courier Name *"
        placeholder="e.g. BlueDart"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        required
      />
      <Input
        label="Carrier Code *"
        placeholder="e.g. BLUEDART"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        error={errors.code}
        required
      />
      <Input
        label="Contact Email"
        type="email"
        placeholder="support@carrier.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        label="Tracking URL Template"
        placeholder="https://track.carrier.com/?id={tracking_number}"
        value={template}
        onChange={(e) => setTemplate(e.target.value)}
      />
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Use <code className="rounded bg-slate-100 px-1 py-0.5 font-mono dark:bg-slate-800 dark:text-slate-300">{"{tracking_number}"}</code> as the placeholder for customer shipment links.
      </p>

      <label className="flex items-center gap-2 text-sm text-ink-800 dark:text-slate-200">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
        />
        Active partner (available in shipment form)
      </label>

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : initialValues ? "Update Partner" : "Add Partner"}
        </Button>
      </div>
    </form>
  );
}

export default function CouriersPage() {
  const { couriers, isLoading, error, refresh, addCourier, editCourier, toggleStatus, removeCourier } =
    useCouriers();
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null);
  const [deletingCourier, setDeletingCourier] = useState<Courier | null>(null);

  const filteredCouriers = useMemo(() => {
    return couriers.filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase()),
    );
  }, [couriers, search]);

  async function handleSaveCourier(values: CourierFormValues) {
    try {
      if (editingCourier) {
        await editCourier(editingCourier.id, values);
        showToast("Courier updated successfully.");
      } else {
        await addCourier(values);
        showToast("Courier partner registered successfully.");
      }
      setIsModalOpen(false);
      setEditingCourier(null);
    } catch (err: any) {
      const msg = err?.message || "Failed to save courier.";
      showToast(msg, "error");
    }
  }

  async function handleToggle(courier: Courier) {
    try {
      await toggleStatus(courier.id, !courier.isActive);
      showToast(`Courier ${courier.isActive ? "deactivated" : "activated"}.`);
    } catch {
      showToast("Could not update courier status.", "error");
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingCourier) return;
    try {
      await removeCourier(deletingCourier.id);
      showToast("Courier partner deleted.");
    } catch (err: any) {
      const msg = err?.message || "Cannot delete courier linked to existing shipments.";
      showToast(msg, "error");
    } finally {
      setDeletingCourier(null);
    }
  }

  const totalCouriers = couriers.length;
  const activeCouriers = couriers.filter((c) => c.isActive).length;
  const apiIntegrated = couriers.filter((c) => Boolean(c.trackingUrlTemplate)).length;

  const columns: TableColumn<Courier>[] = [
    {
      header: "Courier Partner",
      render: (c) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 font-bold text-xs text-white shadow-xs">
            {c.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{c.name}</span>
            {c.contactEmail && (
              <p className="text-xs text-slate-400 font-mono sm:hidden">{c.contactEmail}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Carrier Code",
      render: (c) => (
        <code className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {c.code}
        </code>
      ),
    },
    { header: "Dispatch Contact", hideBelow: "md", render: (c) => <span className="text-slate-600 dark:text-slate-300 font-mono text-xs">{c.contactEmail || "—"}</span> },
    {
      header: "Live API Tracking",
      hideBelow: "lg",
      render: (c) => (
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
          {c.trackingUrlTemplate ? "Connected (AWB Sandbox)" : "Manual Dispatch"}
        </span>
      ),
    },
    {
      header: "Status",
      render: (c) => (
        <StatusBadge status={c.isActive ? "active" : "inactive"} />
      ),
    },
    {
      header: "Actions",
      render: (c) => (
        <div className="flex justify-end gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleToggle(c)}
          >
            {c.isActive ? "Deactivate" : "Activate"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setEditingCourier(c);
              setIsModalOpen(true);
            }}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => setDeletingCourier(c)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        badge="LOGISTICS PARTNERS"
        title="Courier Providers"
        description="Configure third-party carrier integrations, webhook trackers, and dispatch channels."
        action={
          <Button onClick={() => { setEditingCourier(null); setIsModalOpen(true); }}>
            + Register Courier
          </Button>
        }
      />

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <AdminStatCard
          label="Registered Couriers"
          value={totalCouriers}
          subtext="Configured providers"
          accentColor="blue"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
        />
        <AdminStatCard
          label="Active Routing"
          value={activeCouriers}
          subtext="Ready for dispatch"
          accentColor="emerald"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <AdminStatCard
          label="API Sandbox Active"
          value={apiIntegrated}
          subtext="Carrier tracking synchronized"
          accentColor="purple"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
        />
      </div>

      <Card className="p-4 sm:p-5">
        <ManagementToolbar
          searchLabel="Search courier name or code"
          searchValue={search}
          onSearchChange={setSearch}
        />

        <div className="mt-4">
          {isLoading ? (
            <LoadingState label="Loading courier partners" rows={4} />
          ) : error ? (
            <ErrorState title="Couldn't load couriers" description={error} onRetry={refresh} />
          ) : filteredCouriers.length === 0 ? (
            <EmptyState
              title="No courier partners found"
              description={search ? "Try searching with a different name or code." : "Register your first courier partner."}
            />
          ) : (
            <Table
              columns={columns}
              rows={filteredCouriers}
              getRowKey={(c: Courier) => c.id}
            />
          )}
        </div>
      </Card>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        title={editingCourier ? `Edit ${editingCourier.name}` : "Register Courier Partner"}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCourier(null);
        }}
      >
        <CourierFormModal
          initialValues={editingCourier || undefined}
          onSave={handleSaveCourier}
          onClose={() => {
            setIsModalOpen(false);
            setEditingCourier(null);
          }}
        />
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingCourier)}
        title="Delete Courier Partner"
        description={`Are you sure you want to delete ${deletingCourier?.name}? If any shipments are linked, deletion will be blocked.`}
        confirmLabel="Delete Partner"
        tone="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingCourier(null)}
      />
    </div>
  );
}
