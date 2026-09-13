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
import { useOrders } from "@/features/orders/useOrders";
import { useToast } from "@/hooks/useToast";
import type { Order } from "@/types";
import { formatCurrency, formatDate } from "@/utils/format";
import { ROUTES } from "@/constants/routes";

const STATUS_OPTIONS = [
  { label: "All statuses", value: "all" },
  { label: "Pending", value: "Pending" },
  { label: "Processing", value: "Processing" },
  { label: "Shipped", value: "Shipped" },
  { label: "Delivered", value: "Delivered" },
  { label: "Cancelled", value: "Cancelled" },
];

export default function OrdersPage() {
  const { orders, isLoading, error, refresh, downloadInvoice } = useOrders();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.customer.toLowerCase().includes(search.toLowerCase()) ||
        order.id.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  async function handleDownloadInvoice(order: Order) {
    setDownloadingId(order.id);
    try {
      await downloadInvoice(order.id);
    } catch {
      showToast("Something went wrong downloading this invoice.", "error");
    } finally {
      setDownloadingId(null);
    }
  }

  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status === "Pending" || o.status === "Processing").length;
  const deliveredOrders = orders.filter((o) => o.status === "Delivered").length;
  const totalOrderRevenue = orders
    .filter((o) => o.status !== "Cancelled")
    .reduce((sum, o) => sum + o.amount, 0);

  const columns: TableColumn<Order>[] = [
    {
      header: "Order ID",
      render: (o) => (
        <button
          type="button"
          onClick={() => navigate(`${ROUTES.orders}/${o.id}`)}
          className="font-mono text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 rounded-md ring-1 ring-emerald-500/20"
        >
          {o.id}
        </button>
      ),
    },
    {
      header: "Customer",
      render: (o) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
            {o.customer.charAt(0).toUpperCase()}
          </div>
          <span className="font-medium text-slate-900 dark:text-slate-100">{o.customer}</span>
        </div>
      ),
    },
    { header: "Date", hideBelow: "sm", render: (o) => <span className="text-slate-500 dark:text-slate-400 text-xs">{formatDate(o.date)}</span> },
    {
      header: "Amount",
      render: (o) => (
        <span className="font-bold text-slate-900 dark:text-slate-100">
          {formatCurrency(o.amount)}
        </span>
      ),
    },
    {
      header: "Payment",
      hideBelow: "md",
      render: (o) => <StatusBadge status={o.paymentStatus} />,
    },
    { header: "Fulfillment", render: (o) => <StatusBadge status={o.status} /> },
    {
      header: "Actions",
      render: (o) => (
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => navigate(`${ROUTES.orders}/${o.id}`)}>
            View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDownloadInvoice(o)}
            disabled={downloadingId === o.id}
          >
            {downloadingId === o.id ? "Downloading..." : "Invoice"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        badge="ORDER PROCESSING"
        title="Customer Orders"
        description="Track customer orders, monitor fulfillment stages, and issue automated tax invoices."
      />

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <AdminStatCard
          label="Total Orders"
          value={totalOrders}
          subtext="All customer bookings"
          accentColor="emerald"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>}
        />
        <AdminStatCard
          label="Pending Fulfillment"
          value={pendingOrders}
          subtext="Requires processing"
          accentColor={pendingOrders > 0 ? "amber" : "emerald"}
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <AdminStatCard
          label="Delivered"
          value={deliveredOrders}
          subtext="Successfully completed"
          accentColor="teal"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
        />
        <AdminStatCard
          label="Gross Revenue"
          value={formatCurrency(totalOrderRevenue)}
          subtext="Valid completed orders"
          accentColor="purple"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      <Card className="p-4 sm:p-5">
        <ManagementToolbar
          searchLabel="Search orders by customer or order ID"
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
            <LoadingState label="Loading orders" rows={5} />
          ) : error ? (
            <ErrorState title="Couldn't load orders" description={error} onRetry={refresh} />
          ) : (
            <Table
              columns={columns}
              rows={filteredOrders}
              getRowKey={(o) => o.id}
              emptyState={
                <EmptyState
                  title="No orders found"
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
