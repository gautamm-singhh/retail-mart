import { useMemo, useState } from "react";
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
import { CampaignForm } from "@/features/campaigns/components/CampaignForm";
import { useCampaigns } from "@/features/campaigns/useCampaigns";
import { useToast } from "@/hooks/useToast";
import type { Campaign, CampaignFormValues } from "@/types";
import { formatCurrency, formatDate } from "@/utils/format";

const STATUS_OPTIONS = [
  { label: "All statuses", value: "all" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Active", value: "active" },
  { label: "Ended", value: "ended" },
];

function formatDiscount(campaign: Campaign): string {
  return campaign.discountType === "percentage"
    ? `${campaign.discountValue}% off`
    : `${formatCurrency(campaign.discountValue)} off`;
}

export default function CampaignsPage() {
  const {
    campaigns,
    isLoading,
    error,
    refresh,
    addCampaign,
    editCampaign,
    removeCampaign,
    sendCampaignBlast,
  } = useCampaigns();
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [deletingCampaign, setDeletingCampaign] = useState<Campaign | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((campaign) => {
      const query = search.toLowerCase();
      const matchesSearch =
        campaign.name.toLowerCase().includes(query) || campaign.code.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || campaign.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [campaigns, search, statusFilter]);

  function openAddForm() {
    setEditingCampaign(null);
    setIsFormOpen(true);
  }

  function openEditForm(campaign: Campaign) {
    setEditingCampaign(campaign);
    setIsFormOpen(true);
  }

  async function handleFormSubmit(values: CampaignFormValues) {
    try {
      if (editingCampaign) {
        await editCampaign(editingCampaign.id, values);
        showToast("Campaign updated successfully.");
      } else {
        await addCampaign(values);
        showToast("Campaign created successfully.");
      }
      setIsFormOpen(false);
      setEditingCampaign(null);
    } catch {
      showToast("Something went wrong saving this campaign.", "error");
    }
  }

  async function handleDeleteConfirmed() {
    if (!deletingCampaign) return;
    try {
      await removeCampaign(deletingCampaign.id);
      showToast("Campaign deleted.");
    } catch {
      showToast("Something went wrong deleting this campaign.", "error");
    } finally {
      setDeletingCampaign(null);
    }
  }

  async function handleSend(campaign: Campaign) {
    setSendingId(campaign.id);
    try {
      const result = await sendCampaignBlast(campaign.id);
      showToast(`Sent to ${result.sent} of ${result.recipients} customers.`);
    } catch {
      showToast("Something went wrong sending this campaign.", "error");
    } finally {
      setSendingId(null);
    }
  }

  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
  const scheduledCampaigns = campaigns.filter((c) => c.status === "scheduled").length;

  const columns: TableColumn<Campaign>[] = [
    {
      header: "Campaign",
      render: (c) => (
        <div>
          <p className="font-semibold text-slate-900 dark:text-slate-100">{c.name}</p>
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono font-medium text-emerald-600 dark:bg-slate-800 dark:text-emerald-400">
            {c.code}
          </code>
        </div>
      ),
    },
    {
      header: "Discount Value",
      hideBelow: "sm",
      render: (c) => (
        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
          {formatDiscount(c)}
        </span>
      ),
    },
    { header: "Start Date", hideBelow: "md", render: (c) => <span className="text-slate-500 dark:text-slate-400 text-xs">{formatDate(c.startDate)}</span> },
    { header: "End Date", hideBelow: "md", render: (c) => <span className="text-slate-500 dark:text-slate-400 text-xs">{c.endDate ? formatDate(c.endDate) : "Ongoing"}</span> },
    { header: "Status", render: (c) => <StatusBadge status={c.status} /> },
    {
      header: "Actions",
      render: (c) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => openEditForm(c)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSend(c)}
            disabled={sendingId === c.id}
          >
            {sendingId === c.id ? "Sending..." : "Send Email"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeletingCampaign(c)}
            className="text-rose-600 hover:text-rose-700 dark:text-rose-400"
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
        badge="MARKETING & PROMOTIONS"
        title="Promotional Campaigns"
        description="Launch seasonal promo discount codes and send automated email blasts to customers."
        action={<Button onClick={openAddForm}>+ Add Campaign</Button>}
      />

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <AdminStatCard
          label="Total Campaigns"
          value={totalCampaigns}
          subtext="Promotions in system"
          accentColor="purple"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>}
        />
        <AdminStatCard
          label="Active Promotions"
          value={activeCampaigns}
          subtext="Live discount codes"
          accentColor="emerald"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <AdminStatCard
          label="Scheduled Blasts"
          value={scheduledCampaigns}
          subtext="Upcoming launches"
          accentColor="blue"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
        />
      </div>

      <Card className="p-4 sm:p-5">
        <ManagementToolbar
          searchLabel="Search campaigns by name or code"
          searchValue={search}
          onSearchChange={setSearch}
          filters={
            <div className="sm:w-48">
              <Select
                label="Status"
                hideLabel
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              />
            </div>
          }
        />

        <div className="mt-4">
          {isLoading ? (
            <LoadingState label="Loading campaigns" rows={5} />
          ) : error ? (
            <ErrorState title="Couldn't load campaigns" description={error} onRetry={refresh} />
          ) : (
            <Table
              columns={columns}
              rows={filteredCampaigns}
              getRowKey={(c) => c.id}
              emptyState={
                <EmptyState
                  title="No campaigns found"
                  description="Try a different search term or status filter."
                />
              }
            />
          )}
        </div>
      </Card>

      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingCampaign ? "Edit campaign" : "Add campaign"}
      >
        <CampaignForm
          initialValues={editingCampaign ?? undefined}
          submitLabel={editingCampaign ? "Save changes" : "Create campaign"}
          onSubmit={handleFormSubmit}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deletingCampaign)}
        title="Delete campaign"
        description={`This removes ${deletingCampaign?.name ?? "this campaign"} permanently.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeletingCampaign(null)}
      />
    </div>
  );
}
