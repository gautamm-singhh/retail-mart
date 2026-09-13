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
import { ManagementToolbar } from "@/components/common/ManagementToolbar";
import { AdminStatCard } from "@/components/common/AdminStatCard";
import { PaymentsTabs } from "@/features/payments/components/PaymentsTabs";
import { usePayments } from "@/features/payments/usePayments";
import { useToast } from "@/hooks/useToast";
import type { Payment } from "@/types";
import { formatCurrency, formatDate } from "@/utils/format";
import { ROUTES } from "@/constants/routes";

// "Refunded" is deliberately not offered here - refunds have their own tab
// and their own view (RefundsPage). See the README's "Payments vs Refunds"
// section for why, and usePayments() for how the two lists are derived.
const STATUS_OPTIONS = [
  { label: "All statuses", value: "all" },
  { label: "Pending", value: "Pending" },
  { label: "Paid", value: "Paid" },
  { label: "Failed", value: "Failed" },
];

export default function PaymentsPage() {
  const { payments, isLoading, error, refresh, downloadReceipt } = usePayments();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const query = search.toLowerCase();
      const matchesSearch =
        payment.customer.toLowerCase().includes(query) ||
        payment.orderId.toLowerCase().includes(query) ||
        payment.id.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [payments, search, statusFilter]);

  async function handleDownloadReceipt(payment: Payment) {
    setDownloadingId(payment.id);
    try {
      await downloadReceipt(payment.id);
    } catch {
      showToast("Something went wrong downloading this receipt.", "error");
    } finally {
      setDownloadingId(null);
    }
  }

  const totalPayments = payments.length;
  const paidPayments = payments.filter((p) => p.status === "Paid").length;
  const pendingPayments = payments.filter((p) => p.status === "Pending").length;
  const totalAmountCollected = payments
    .filter((p) => p.status === "Paid")
    .reduce((sum, p) => sum + p.amount, 0);

  const columns: TableColumn<Payment>[] = [
    {
      header: "Payment ID",
      render: (p) => (
        <button
          type="button"
          onClick={() => navigate(`${ROUTES.payments}/${p.id}`)}
          className="font-mono text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 rounded-md ring-1 ring-emerald-500/20"
        >
          {p.id}
        </button>
      ),
    },
    {
      header: "Order ID",
      hideBelow: "sm",
      render: (p) => (
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
          {p.orderId}
        </span>
      ),
    },
    {
      header: "Customer",
      render: (p) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
            {p.customer.charAt(0).toUpperCase()}
          </div>
          <span className="font-medium text-slate-900 dark:text-slate-100">{p.customer}</span>
        </div>
      ),
    },
    {
      header: "Amount",
      render: (p) => (
        <span className="font-bold text-slate-900 dark:text-slate-100">
          {formatCurrency(p.amount)}
        </span>
      ),
    },
    {
      header: "Method",
      hideBelow: "md",
      render: (p) => (
        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {p.method}
        </span>
      ),
    },
    { header: "Status", render: (p) => <StatusBadge status={p.status} /> },
    { header: "Date", hideBelow: "lg", render: (p) => <span className="text-slate-500 dark:text-slate-400 text-xs">{formatDate(p.date)}</span> },
    {
      header: "Actions",
      render: (p) => (
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => navigate(`${ROUTES.payments}/${p.id}`)}>
            View
          </Button>
          {p.status === "Paid" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDownloadReceipt(p)}
              disabled={downloadingId === p.id}
            >
              {downloadingId === p.id ? "Downloading..." : "Receipt"}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        badge="SETTLEMENTS & CASHFLOW"
        title="Payments & Collections"
        description="Review incoming customer payments, verification state, transaction methods, and receipts."
      />

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <AdminStatCard
          label="Total Transactions"
          value={totalPayments}
          subtext="Processed payments"
          accentColor="emerald"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>}
        />
        <AdminStatCard
          label="Settled & Paid"
          value={paidPayments}
          subtext={`${Math.round((paidPayments / (totalPayments || 1)) * 100)}% settlement rate`}
          accentColor="teal"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <AdminStatCard
          label="Pending Verification"
          value={pendingPayments}
          subtext={pendingPayments > 0 ? "Awaiting clearance" : "All cleared"}
          accentColor={pendingPayments > 0 ? "amber" : "emerald"}
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <AdminStatCard
          label="Net Collected"
          value={formatCurrency(totalAmountCollected)}
          subtext="Cleared funds"
          accentColor="purple"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
        />
      </div>

      <PaymentsTabs />

      <Card className="p-4 sm:p-5">
        <ManagementToolbar
          searchLabel="Search payments by customer, order, or payment ID"
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
            <LoadingState label="Loading payments" rows={5} />
          ) : error ? (
            <ErrorState title="Couldn't load payments" description={error} onRetry={refresh} />
          ) : (
            <Table
              columns={columns}
              rows={filteredPayments}
              getRowKey={(p) => p.id}
              emptyState={
                <EmptyState
                  title="No payments found"
                  description="Try a different search term or status filter."
                />
              }
            />
          )}
        </div>
      </Card>
    </div>
  );
}
