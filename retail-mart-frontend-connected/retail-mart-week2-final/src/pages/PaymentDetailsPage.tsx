import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { usePayments } from "@/features/payments/usePayments";
import { useRazorpayCheckout } from "@/features/razorpay/useRazorpayCheckout";
import { useToast } from "@/hooks/useToast";
import { formatCurrency, formatDate } from "@/utils/format";
import { ROUTES } from "@/constants/routes";

export default function PaymentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { allPayments, isLoading, error, refresh, markRefunded, downloadReceipt } = usePayments();
  const { payWithRazorpay, isProcessing } = useRazorpayCheckout();
  const { showToast } = useToast();

  const [isRefundOpen, setIsRefundOpen] = useState(false);
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Payment details" />
        <Card>
          <LoadingState label="Loading payment" rows={4} />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Payment details" />
        <Card>
          <ErrorState title="Couldn't load this payment" description={error} onRetry={refresh} />
        </Card>
      </div>
    );
  }

  const payment = allPayments.find((p) => p.id === id);

  if (!payment) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Payment not found" />
        <Card>
          <ErrorState
            title="We couldn't find this payment"
            description="It may not exist, or the link is incorrect."
            onRetry={() => navigate(ROUTES.payments)}
          />
        </Card>
      </div>
    );
  }

  const backRoute = payment.status === "Refunded" ? ROUTES.refunds : ROUTES.payments;

  async function handleRefundConfirmed() {
    if (!payment) return;
    const updated = await markRefunded(payment.id);
    if (updated) {
      showToast("Payment marked as refunded.");
    } else {
      showToast("Only paid payments can be refunded.", "error");
    }
    setIsRefundOpen(false);
  }

  async function handleDownloadReceipt() {
    if (!payment) return;
    setIsDownloadingReceipt(true);
    try {
      await downloadReceipt(payment.id);
    } catch {
      showToast("Something went wrong downloading this receipt.", "error");
    } finally {
      setIsDownloadingReceipt(false);
    }
  }

  async function handlePayNow() {
    if (!payment) return;
    try {
      await payWithRazorpay(payment.id, payment.customer, "");
      showToast("Payment successful.");
      refresh();
    } catch {
      showToast("Payment was not completed.", "error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        badge="SETTLEMENT LEDGER"
        title={payment.id}
        description={`Linked Order: ${payment.orderId} • Date: ${formatDate(payment.date)}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => navigate(`${ROUTES.orders}/${payment.orderId}`)}
            >
              View Order Details
            </Button>
            <Button variant="secondary" onClick={() => navigate(backRoute)}>
              ← Back to {payment.status === "Refunded" ? "refunds" : "payments"}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-5 dark:border-slate-800">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Settlement</span>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  {formatCurrency(payment.amount)}
                </span>
                <StatusBadge status={payment.status} />
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400">Gateway Channel</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{payment.method}</p>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <dt className="text-xs text-slate-400">Customer Payer</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{payment.customer}</dd>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <dt className="text-xs text-slate-400">Payment Channel</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{payment.method}</dd>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <dt className="text-xs text-slate-400">Ledger Timestamp</dt>
              <dd className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">{formatDate(payment.date)}</dd>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <dt className="text-xs text-slate-400">Linked Order ID</dt>
              <dd className="mt-1 font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">{payment.orderId}</dd>
            </div>
          </dl>

          <div className="mt-8 border-t border-slate-100 pt-6 dark:border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Transaction Audit Timeline</h3>
            <ol className="relative mt-5 border-l border-slate-200 dark:border-slate-800 ml-3 space-y-6">
              {payment.history.map((event, index) => (
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
          </div>
        </Card>

        <Card className="flex flex-col gap-4 p-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Transaction Actions</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Issue verified customer payment receipts, launch gateway payments, or mark chargeback refunds.
            </p>
          </div>

          <div className="mt-2 flex flex-col gap-2.5">
            {payment.status === "Paid" ? (
              <>
                <Button
                  variant="secondary"
                  onClick={handleDownloadReceipt}
                  disabled={isDownloadingReceipt}
                  className="w-full justify-center"
                >
                  {isDownloadingReceipt ? "Generating PDF..." : "Export Receipt (PDF)"}
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setIsRefundOpen(true)}
                  className="w-full justify-center"
                >
                  Mark as Refunded
                </Button>
              </>
            ) : payment.status === "Pending" ? (
              <Button onClick={handlePayNow} disabled={isProcessing} className="w-full justify-center">
                {isProcessing ? "Connecting Gateway..." : "Pay Now with RazorPay"}
              </Button>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                This transaction is archived in &ldquo;{payment.status}&rdquo; state.
              </p>
            )}
          </div>

          <div className="mt-auto rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/30 dark:bg-blue-950/20">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-800 dark:text-blue-300">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Reconciliation Verified
            </div>
            <p className="mt-1 text-xs text-blue-700 dark:text-blue-400">
              Ledger matches parent order {payment.orderId}. Automatic receipt emailing supported.
            </p>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        isOpen={isRefundOpen}
        title="Refund payment"
        description={`Mark ${payment.id} as refunded? This updates the payment record via the backend API and does not process a real refund.`}
        confirmLabel="Mark as refunded"
        onConfirm={handleRefundConfirmed}
        onCancel={() => setIsRefundOpen(false)}
      />
    </div>
  );
}
