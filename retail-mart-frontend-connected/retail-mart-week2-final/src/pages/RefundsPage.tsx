import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, TableColumn } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ManagementToolbar } from "@/components/common/ManagementToolbar";
import { PaymentsTabs } from "@/features/payments/components/PaymentsTabs";
import { usePayments } from "@/features/payments/usePayments";
import { AdminStatCard } from "@/components/common/AdminStatCard";
import type { Payment } from "@/types";
import { formatCurrency, formatDate } from "@/utils/format";
import { ROUTES } from "@/constants/routes";

/** The date the refund actually happened - the last "Refunded" entry in the payment's history, not the original payment date. */
function getRefundDate(payment: Payment): string {
  const refundEvent = [...payment.history]
    .reverse()
    .find((event) => event.status === "Refunded");
  return refundEvent?.date ?? payment.date;
}

export default function RefundsPage() {
  const { refunds, isLoading, error, refresh } = usePayments();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");

  const filteredRefunds = useMemo(() => {
    const query = search.toLowerCase();
    return refunds.filter(
      (refund) =>
        refund.customer.toLowerCase().includes(query) ||
        refund.orderId.toLowerCase().includes(query) ||
        refund.id.toLowerCase().includes(query),
    );
  }, [refunds, search]);

  const totalRefunds = refunds.length;
  const totalRefundValue = refunds.reduce((sum, r) => sum + r.amount, 0);

  const columns: TableColumn<Payment>[] = [
    {
      header: "Refund / Payment ID",
      render: (r) => (
        <button
          type="button"
          onClick={() => navigate(`${ROUTES.payments}/${r.id}`)}
          className="font-mono text-xs font-semibold text-amber-700 hover:text-amber-800 hover:underline dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-1 rounded-md ring-1 ring-amber-500/20"
        >
          {r.id}
        </button>
      ),
    },
    { header: "Order ID", hideBelow: "sm", render: (r) => <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{r.orderId}</span> },
    {
      header: "Customer",
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
            {r.customer.charAt(0).toUpperCase()}
          </div>
          <span className="font-medium text-slate-900 dark:text-slate-100">{r.customer}</span>
        </div>
      ),
    },
    { header: "Refund amount", render: (r) => <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(r.amount)}</span> },
    {
      header: "Original method",
      hideBelow: "md",
      render: (r) => (
        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {r.method}
        </span>
      ),
    },
    {
      header: "Refund date",
      hideBelow: "sm",
      render: (r) => <span className="text-slate-500 dark:text-slate-400 text-xs">{formatDate(getRefundDate(r))}</span>,
    },
    { header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    {
      header: "Actions",
      render: (r) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`${ROUTES.payments}/${r.id}`)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        badge="REVERSALS & AUDIT"
        title="Refunds"
        description="Audit log of processed and recorded customer refund transactions and reversals."
      />

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <AdminStatCard
          label="Total Refunds"
          value={totalRefunds}
          subtext="Processed chargebacks"
          accentColor="amber"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" /></svg>}
        />
        <AdminStatCard
          label="Total Value Reversed"
          value={formatCurrency(totalRefundValue)}
          subtext="Returned to customers"
          accentColor="rose"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" /></svg>}
        />
        <AdminStatCard
          label="Dispute Resolution"
          value="100%"
          subtext="Audited & closed"
          accentColor="emerald"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      <PaymentsTabs />

      <Card className="p-4 sm:p-5">
        <ManagementToolbar
          searchLabel="Search refunds by customer, order, or payment ID"
          searchValue={search}
          onSearchChange={setSearch}
        />

        <div className="mt-4">
          {isLoading ? (
            <LoadingState label="Loading refunds" rows={5} />
          ) : error ? (
            <ErrorState title="Couldn't load refunds" description={error} onRetry={refresh} />
          ) : (
            <Table
              columns={columns}
              rows={filteredRefunds}
              getRowKey={(r) => r.id}
              emptyState={
                <EmptyState
                  title="No refunds found"
                  description="No transactions have been refunded yet, or none match your search."
                />
              }
            />
          )}
        </div>
      </Card>
    </div>
  );
}
