import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useOrders } from "@/features/orders/useOrders";
import { useCommunications } from "@/features/communications/useCommunications";
import { useToast } from "@/hooks/useToast";
import { ORDER_STATUS_TRANSITIONS } from "@/types";
import type { OrderStatus } from "@/types";
import { formatCurrency, formatDate } from "@/utils/format";
import { ROUTES } from "@/constants/routes";

export default function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { orders, isLoading, error, refresh, updateOrderStatus, downloadInvoice } = useOrders();
  const { isSending, sendConfirmation } = useCommunications();
  const { showToast } = useToast();

  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null);
  const [isDownloadingInvoice, setIsDownloadingInvoice] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Order details" />
        <Card>
          <LoadingState label="Loading order" rows={4} />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Order details" />
        <Card>
          <ErrorState title="Couldn't load this order" description={error} onRetry={refresh} />
        </Card>
      </div>
    );
  }

  const order = orders.find((o) => o.id === id);

  if (!order) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Order not found" />
        <Card>
          <ErrorState
            title="We couldn't find this order"
            description="It may not exist, or the link is incorrect."
            onRetry={() => navigate(ROUTES.orders)}
          />
        </Card>
      </div>
    );
  }

  const allowedNextStatuses = ORDER_STATUS_TRANSITIONS[order.status];

  async function handleConfirmStatusChange() {
    if (!pendingStatus || !order) return;
    try {
      await updateOrderStatus(order.id, pendingStatus);
      showToast(`Order marked as ${pendingStatus}.`);
    } catch {
      showToast("That status change is not allowed from the current status.", "error");
    } finally {
      setPendingStatus(null);
    }
  }

  async function handleDownloadInvoice() {
    if (!order) return;
    setIsDownloadingInvoice(true);
    try {
      await downloadInvoice(order.id);
    } catch {
      showToast("Something went wrong downloading this invoice.", "error");
    } finally {
      setIsDownloadingInvoice(false);
    }
  }

  async function handleSendConfirmation() {
    if (!order) return;
    try {
      const sent = await sendConfirmation(order.id);
      if (sent) {
        showToast("Order confirmation email sent.");
      } else {
        showToast("Email could not be delivered. Check backend SMTP configuration.", "error");
      }
    } catch {
      showToast("Something went wrong sending the confirmation.", "error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        badge="ORDER FULFILLMENT"
        title={order.id}
        description={`Placed on ${formatDate(order.date)} • Total: ${formatCurrency(order.amount)}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={handleDownloadInvoice} disabled={isDownloadingInvoice}>
              <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              {isDownloadingInvoice ? "Downloading..." : "Download Invoice"}
            </Button>
            <Button variant="secondary" onClick={handleSendConfirmation} disabled={isSending}>
              <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              {isSending ? "Sending..." : "Send Confirmation"}
            </Button>
            <Button variant="secondary" onClick={() => navigate(ROUTES.orders)}>
              ← Back to orders
            </Button>
          </div>
        }
      />

      {/* Progress Stepper Banner */}
      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Order Progress</span>
              <StatusBadge status={order.status} />
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-xs text-slate-500">Payment:</span>
              <StatusBadge status={order.paymentStatus} />
            </div>
            <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
              Current lifecycle: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{order.status}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {allowedNextStatuses.map((status) => (
              <Button
                key={status}
                variant={status === "Cancelled" ? "danger" : "primary"}
                size="sm"
                onClick={() => setPendingStatus(status)}
              >
                Mark as {status}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Order Items */}
          <Card className="p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Order Items</h2>
              <span className="text-xs font-medium text-slate-500">{order.items.length} unique line items</span>
            </div>
            <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800/80">
              {order.items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-3.5 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {item.productName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{item.productName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Qty: {item.quantity} × {formatCurrency(item.price)}</p>
                    </div>
                  </div>
                  <p className="font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-between border-t border-slate-200/80 pt-4 text-sm dark:border-slate-800">
              <span className="font-semibold text-slate-900 dark:text-white">Grand Total</span>
              <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{formatCurrency(order.amount)}</span>
            </div>
          </Card>

          {/* Status History Timeline */}
          <Card className="p-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Status Timeline</h2>
            <ol className="relative mt-5 border-l border-slate-200 dark:border-slate-800 ml-3 space-y-6">
              {order.statusHistory.map((event, index) => (
                <li key={index} className="ml-6">
                  <span className="absolute -left-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 ring-4 ring-white dark:bg-emerald-950 dark:ring-slate-900">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  <div className="flex items-center gap-2.5">
                    <StatusBadge status={event.status} />
                    <span className="text-xs text-slate-400 font-mono">{formatDate(event.date)}</span>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          {/* Customer Details Card */}
          <Card className="p-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Customer Information</h2>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-lg font-bold text-white shadow-sm">
                {order.customer.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{order.customer}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{order.customerEmail}</p>
              </div>
            </div>

            <dl className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-xs dark:border-slate-800">
              <div className="flex justify-between">
                <dt className="text-slate-400">Order ID</dt>
                <dd className="font-mono font-semibold text-slate-800 dark:text-slate-200">{order.id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Payment Status</dt>
                <dd><StatusBadge status={order.paymentStatus} /></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Booking Date</dt>
                <dd className="text-slate-700 dark:text-slate-300">{formatDate(order.date)}</dd>
              </div>
            </dl>
          </Card>

          {/* Quick Support Card */}
          <Card className="p-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Order Actions & Notifications</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Automated notifications are dispatched on every status update to the customer's verified email.
            </p>
            <div className="mt-4 flex flex-col gap-2.5">
              <Button variant="secondary" onClick={handleDownloadInvoice} disabled={isDownloadingInvoice} className="w-full justify-center">
                {isDownloadingInvoice ? "Generating PDF..." : "Export Tax Invoice (PDF)"}
              </Button>
              <Button variant="secondary" onClick={handleSendConfirmation} disabled={isSending} className="w-full justify-center">
                {isSending ? "Dispatching..." : "Resend Order Email"}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(pendingStatus)}
        title="Update order status"
        description={`Mark ${order.id} as "${pendingStatus}"? This updates the order via the backend API.`}
        confirmLabel="Update status"
        tone={pendingStatus === "Cancelled" ? "danger" : "primary"}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => setPendingStatus(null)}
      />
    </div>
  );
}
