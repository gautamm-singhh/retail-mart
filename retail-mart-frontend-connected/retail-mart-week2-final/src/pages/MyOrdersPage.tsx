import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchMyOrders } from "@/services/api/myOrders";
import { downloadOrderInvoice } from "@/services/api/orders";
import { trackShipment } from "@/services/api/shipping";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useRazorpayCheckout } from "@/features/razorpay/useRazorpayCheckout";
import { useAuth } from "@/features/auth/useAuth";
import { useToast } from "@/hooks/useToast";
import type { Order } from "@/types";
import { formatCurrency, formatDate } from "@/utils/format";
import { ROUTES } from "@/constants/routes";

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [expandedTrackingId, setExpandedTrackingId] = useState<string | null>(null);
  const [trackingDetails, setTrackingDetails] = useState<Record<string, any>>({});
  const [loadingTrackingId, setLoadingTrackingId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { payWithRazorpay } = useRazorpayCheckout();
  const { showToast } = useToast();

  const justPlacedId = searchParams.get("justPlaced");

  function refresh() {
    setIsLoading(true);
    fetchMyOrders()
      .then(setOrders)
      .catch(() => setError("We couldn't load your orders. Please try again."))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDownloadInvoice(orderId: string) {
    setDownloadingId(orderId);
    try {
      await downloadOrderInvoice(orderId);
    } catch {
      showToast("Something went wrong downloading this invoice.", "error");
    } finally {
      setDownloadingId(null);
    }
  }

  async function handlePayNow(order: Order) {
    if (!order.paymentId || !currentUser) return;
    setPayingOrderId(order.id);
    try {
      await payWithRazorpay(order.paymentId, currentUser.name, currentUser.email ?? "");
      showToast("Payment successful!");
      refresh();
    } catch {
      showToast("Payment wasn't completed.", "error");
    } finally {
      setPayingOrderId(null);
    }
  }

  async function handleToggleTracking(shipmentId: string) {
    if (expandedTrackingId === shipmentId) {
      setExpandedTrackingId(null);
      return;
    }
    setExpandedTrackingId(shipmentId);
    if (!trackingDetails[shipmentId]) {
      setLoadingTrackingId(shipmentId);
      try {
        const data = await trackShipment(shipmentId);
        setTrackingDetails((prev) => ({ ...prev, [shipmentId]: data }));
      } catch {
        showToast("Could not load tracking checkpoints.", "error");
      } finally {
        setLoadingTrackingId(null);
      }
    }
  }

  if (isLoading) return <LoadingState label="Loading your orders..." rows={4} />;
  if (error) return <ErrorState title="Couldn't load your orders" description={error} />;
  if (orders.length === 0) {
    return (
      <EmptyState
        title="No orders yet"
        description="Your order history will show up here once you place your first order."
        action={
          <Button variant="primary" size="md" onClick={() => (window.location.href = ROUTES.shop)} className="rounded-xl px-6">
            Start Shopping
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 dark:border-slate-800/70">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            My Orders
          </h1>
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            {orders.length} {orders.length === 1 ? "order" : "orders"}
          </span>
        </div>
        <Link
          to={ROUTES.shop}
          className="flex items-center gap-1 text-xs font-semibold text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Continue Shopping
        </Link>
      </div>

      {justPlacedId && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs sm:text-sm text-emerald-800 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300 animate-in slide-in-from-top-2 duration-300">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs shadow-xs">
            ✓
          </span>
          <p>
            Order <strong>#{justPlacedId}</strong> has been successfully placed! A confirmation email and live courier tracking will update automatically.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {orders.map((order, idx) => (
          <div
            key={order.id}
            className="group rounded-2xl border border-slate-200/70 bg-white shadow-sm transition-all duration-200 hover:border-emerald-400/40 hover:shadow-md dark:border-slate-800/70 dark:bg-slate-900 overflow-hidden"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            {/* Order Card Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5 dark:border-slate-800/80">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    Order <span className="font-mono">#{order.id.slice(-8).toUpperCase()}</span>
                  </span>
                  <span className="text-xs text-slate-300 dark:text-slate-600">•</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDate(order.date)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={order.status} />
                <StatusBadge status={order.paymentStatus} />
              </div>
            </div>

            {/* Items List */}
            <ul className="px-4 sm:px-5 py-3 space-y-1.5 divide-y divide-slate-100/70 dark:divide-slate-800/60">
              {order.items.map((item, i) => (
                <li key={i} className="flex justify-between py-1.5 first:pt-0 text-xs sm:text-sm">
                  <span className="text-slate-700 dark:text-slate-300">
                    {item.productName}
                    <span className="ml-1 font-normal text-slate-400 dark:text-slate-500">× {item.quantity}</span>
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            {/* Shipment & Live Carrier Tracking Block */}
            {order.shipment ? (
              <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4 text-xs dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">Shipping Status:</span>
                    <StatusBadge status={order.shipment.status} />
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    Courier: <strong className="text-slate-900 dark:text-slate-200">{order.shipment.courier}</strong>
                    {" "}(AWB: <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{order.shipment.trackingNumber}</span>)
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                    onClick={() => handleToggleTracking(order.shipment!.id)}
                    disabled={loadingTrackingId === order.shipment.id}
                  >
                    {loadingTrackingId === order.shipment.id
                      ? "Loading checkpoints..."
                      : expandedTrackingId === order.shipment.id
                      ? "Hide Live Tracking ▲"
                      : "Track Live Delivery ▼"}
                  </Button>
                </div>

                {expandedTrackingId === order.shipment.id && trackingDetails[order.shipment.id] && (
                  <div className="mt-3 rounded-xl border border-emerald-100 bg-white p-4 shadow-xs dark:border-slate-700 dark:bg-slate-900 animate-in fade-in-50">
                    <p className="font-bold text-xs text-emerald-800 dark:text-emerald-300 mb-3">
                      Verified Carrier Route ({trackingDetails[order.shipment.id]?.externalTracking?.provider || order.shipment.courier})
                    </p>
                    <div className="space-y-2.5">
                      {(trackingDetails[order.shipment.id]?.externalTracking?.checkpoints || []).length === 0 ? (
                        <p className="text-slate-400 italic text-xs">No checkpoint updates recorded yet.</p>
                      ) : (
                        (trackingDetails[order.shipment.id]?.externalTracking?.checkpoints || []).map((cp: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-2.5 text-xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                            <div>
                              <span className="font-bold text-slate-800 dark:text-slate-200">{cp.status}</span>
                              {cp.location && <span className="text-slate-500 dark:text-slate-400"> — {cp.location}</span>}
                              <span className="text-slate-400 block text-[10px]">{cp.date}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate-400 italic">Shipping information will be assigned shortly.</p>
            )}

            {/* Order Card Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 sm:px-5 py-3.5 dark:border-slate-800/80">
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">Order Total:</span>
                <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(order.amount)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {order.paymentStatus === "Pending" && order.paymentId && (
                  <Button
                    size="sm"
                    variant="primary"
                    className="rounded-xl"
                    onClick={() => handlePayNow(order)}
                    disabled={payingOrderId === order.id}
                  >
                    {payingOrderId === order.id ? "Processing..." : "Pay Now"}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-xl"
                  onClick={() => handleDownloadInvoice(order.id)}
                  disabled={downloadingId === order.id}
                >
                  {downloadingId === order.id ? "Downloading..." : "Download Invoice"}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
