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
import { AdminStatCard } from "@/components/common/AdminStatCard";
import { ShipmentForm } from "@/features/shipping/components/ShipmentForm";
import { useShipments } from "@/features/shipping/useShipments";
import { useToast } from "@/hooks/useToast";
import type { Shipment, ShipmentFormValues } from "@/types";
import { formatDate } from "@/utils/format";
import { ROUTES } from "@/constants/routes";

const STATUS_OPTIONS = [
  { label: "All statuses", value: "all" },
  { label: "Pending", value: "Pending" },
  { label: "Packed", value: "Packed" },
  { label: "Shipped", value: "Shipped" },
  { label: "Out for Delivery", value: "Out for Delivery" },
  { label: "Delivered", value: "Delivered" },
];

export default function ShippingPage() {
  const { shipments, isLoading, error, refresh, addShipment } = useShipments();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const filteredShipments = useMemo(() => {
    return shipments.filter((shipment) => {
      const matchesSearch =
        shipment.customer.toLowerCase().includes(search.toLowerCase()) ||
        shipment.orderId.toLowerCase().includes(search.toLowerCase()) ||
        shipment.trackingNumber.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || shipment.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [shipments, search, statusFilter]);

  async function handleCreateShipment(values: ShipmentFormValues) {
    try {
      await addShipment(values);
      showToast("Shipment created successfully.");
      setIsFormOpen(false);
    } catch {
      showToast("Something went wrong creating this shipment.", "error");
    }
  }

  const totalShipments = shipments.length;
  const inTransit = shipments.filter(
    (s) => s.status === "Shipped" || s.status === "Out for Delivery",
  ).length;
  const delivered = shipments.filter((s) => s.status === "Delivered").length;
  const pendingShipments = shipments.filter(
    (s) => s.status === "Pending" || s.status === "Packed",
  ).length;

  const columns: TableColumn<Shipment>[] = [
    {
      header: "Shipment ID",
      render: (s) => (
        <button
          type="button"
          onClick={() => navigate(`${ROUTES.shipping}/${s.id}`)}
          className="font-mono text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 rounded-md ring-1 ring-emerald-500/20"
        >
          {s.id}
        </button>
      ),
    },
    {
      header: "Order ID",
      hideBelow: "sm",
      render: (s) => (
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
          {s.orderId}
        </span>
      ),
    },
    {
      header: "Customer",
      render: (s) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
            {s.customer.charAt(0).toUpperCase()}
          </div>
          <span className="font-medium text-slate-900 dark:text-slate-100">{s.customer}</span>
        </div>
      ),
    },
    {
      header: "Courier",
      hideBelow: "md",
      render: (s) => (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          {s.courier}
        </span>
      ),
    },
    {
      header: "AWB / Tracking #",
      hideBelow: "lg",
      render: (s) => (
        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
          {s.trackingNumber}
        </span>
      ),
    },
    { header: "Status", render: (s) => <StatusBadge status={s.status} /> },
    {
      header: "Expected",
      hideBelow: "sm",
      render: (s) => <span className="text-slate-500 dark:text-slate-400 text-xs">{formatDate(s.expectedDelivery)}</span>,
    },
    {
      header: "Actions",
      render: (s) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`${ROUTES.shipping}/${s.id}`)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        badge="LOGISTICS & CARRIER OPS"
        title="Shipping & Tracking"
        description="Monitor real-time package delivery tracking, courier partnerships, and logistics milestones."
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => navigate(ROUTES.couriers)}>
              Manage Couriers
            </Button>
            <Button onClick={() => setIsFormOpen(true)}>+ Create Shipment</Button>
          </div>
        }
      />

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <AdminStatCard
          label="Total Shipments"
          value={totalShipments}
          subtext="Dispatched consignments"
          accentColor="emerald"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>}
        />
        <AdminStatCard
          label="In Transit"
          value={inTransit}
          subtext="Actively moving"
          accentColor="blue"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <AdminStatCard
          label="Delivered"
          value={delivered}
          subtext={`${Math.round((delivered / (totalShipments || 1)) * 100)}% completion rate`}
          accentColor="teal"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <AdminStatCard
          label="Pending Dispatch"
          value={pendingShipments}
          subtext="In warehouse"
          accentColor={pendingShipments > 0 ? "amber" : "emerald"}
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
        />
      </div>

      <Card className="p-4 sm:p-5">
        <ManagementToolbar
          searchLabel="Search shipments by customer, order, or tracking number"
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
            <LoadingState label="Loading shipments" rows={5} />
          ) : error ? (
            <ErrorState
              title="Couldn't load shipments"
              description={error}
              onRetry={refresh}
            />
          ) : (
            <Table
              columns={columns}
              rows={filteredShipments}
              getRowKey={(s) => s.id}
              emptyState={
                <EmptyState
                  title="No shipments found"
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
        title="Create shipment"
      >
        <ShipmentForm
          submitLabel="Create shipment"
          onSubmit={handleCreateShipment}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>
    </div>
  );
}
