import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useShipments } from "@/features/shipping/useShipments";
import { trackShipment, syncTracking } from "@/services/api/shipping";
import { useToast } from "@/hooks/useToast";
import { SHIPMENT_STATUS_TRANSITIONS, ShipmentStatus } from "@/types";
import { formatDate } from "@/utils/format";
import { ROUTES } from "@/constants/routes";

export default function ShipmentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { shipments, isLoading, error, refresh, updateStatus } = useShipments();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [pendingStatus, setPendingStatus] = useState<ShipmentStatus | null>(null);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const shipment = shipments.find((s) => s.id === id);

  useEffect(() => {
    if (id) {
      trackShipment(id)
        .then((data) => setTrackingData(data))
        .catch(() => {
          // fallback to local shipment data
        });
    }
  }, [id, shipment?.status]);

  async function handleSyncTracking() {
    if (!id) return;
    setIsSyncing(true);
    try {
      const res = await syncTracking(id);
      if (res.synced) {
        showToast(`Carrier synced! Status moved to "${res.currentStatus}".`);
        await refresh();
      } else {
        showToast(`Carrier tracking verified: ${res.externalStatus} (${res.mappedStatus}).`);
      }
      setTrackingData((prev: any) => ({ ...prev, externalTracking: res.externalTracking }));
    } catch {
      showToast("Could not sync with external carrier.", "error");
    } finally {
      setIsSyncing(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Shipment details" />
        <Card>
          <LoadingState label="Loading shipment" rows={4} />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Shipment details" />
        <Card>
          <ErrorState
            title="Couldn't load this shipment"
            description={error}
            onRetry={refresh}
          />
        </Card>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Shipment not found" />
        <Card>
          <ErrorState
            title="We couldn't find this shipment"
            description="It may not exist, or the link is incorrect."
            onRetry={() => navigate(ROUTES.shipping)}
          />
        </Card>
      </div>
    );
  }

  const allowedNextStatuses = SHIPMENT_STATUS_TRANSITIONS[shipment.status];

  async function handleConfirmStatusChange() {
    if (!pendingStatus || !shipment || isUpdating) return;
    setIsUpdating(true);
    const targetStatus = pendingStatus;
    try {
      await updateStatus(shipment.id, targetStatus);
      showToast(`Shipment marked as ${targetStatus}.`);
      setPendingStatus(null);
    } catch {
      showToast("That status change is not allowed.", "error");
    } finally {
      setIsUpdating(false);
    }
  }

  const ext = trackingData?.externalTracking;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        badge="CARRIER TRACKING"
        title={shipment.id}
        description={`Order ${shipment.orderId} • Destination: ${shipment.customer}`}
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => navigate(ROUTES.shipping)}>
              ← Back to shipments
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate(`${ROUTES.orders}/${shipment.orderId}`)}
            >
              View Order
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-5 dark:border-slate-800">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Shipment Status</span>
              <div className="mt-1 flex items-center gap-3">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{shipment.status}</h2>
                <StatusBadge status={shipment.status} />
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400">Courier Partner</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{shipment.courier}</p>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <dt className="text-xs text-slate-400">Recipient Customer</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{shipment.customer}</dd>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <dt className="text-xs text-slate-400">Carrier Partner</dt>
              <dd className="mt-1 flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">{shipment.courier}</span>
                {shipment.courierId && (
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {shipment.courierId}
                  </span>
                )}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <dt className="text-xs text-slate-400">AWB Tracking Number</dt>
              <dd className="mt-1 font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">{shipment.trackingNumber}</dd>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <dt className="text-xs text-slate-400">Estimated Delivery</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">{formatDate(shipment.expectedDelivery)}</dd>
            </div>
          </dl>

          {/* External Carrier Integration Card */}
          {ext && (
            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Live Carrier Tracking ({ext.provider})
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Carrier status: <strong className="text-ink-800 dark:text-slate-200">{ext.externalStatus}</strong> (mapped to: <strong className="text-ink-800 dark:text-slate-200">{ext.mappedStatus}</strong>)
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isSyncing}
                  onClick={handleSyncTracking}
                >
                  {isSyncing ? "Syncing..." : "Sync with Carrier"}
                </Button>
              </div>

              {ext.checkpoints && ext.checkpoints.length > 0 && (
                <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Carrier Checkpoints:</p>
                  <ul className="space-y-2 text-xs">
                    {ext.checkpoints.map((cp: any, idx: number) => (
                      <li key={idx} className="flex gap-2">
                        <span className="font-mono text-slate-400">{cp.date}</span>
                        <span className="font-medium text-ink-800 dark:text-slate-200">{cp.status}</span>
                        {cp.location && <span className="text-slate-500 dark:text-slate-400">• {cp.location}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {trackingData?.trackingUrl && (
                <div className="mt-3 border-t border-slate-200 pt-2 text-right dark:border-slate-700">
                  <a
                    href={trackingData.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline dark:text-emerald-400 dark:hover:text-emerald-300"
                  >
                    Open carrier tracking page &rarr;
                  </a>
                </div>
              )}
            </div>
          )}

          <h3 className="mt-6 text-sm font-semibold text-ink-950 dark:text-slate-100">Internal tracking history</h3>
          <ol className="mt-3 space-y-3">
            {shipment.trackingHistory.map((event, index) => (
              <li key={index} className="flex items-center gap-3 text-sm">
                <span
                  className="h-2 w-2 shrink-0 rounded-full bg-brand-500 dark:bg-emerald-400"
                  aria-hidden="true"
                />
                <StatusBadge status={event.status} />
                <span className="text-slate-500 dark:text-slate-400">{formatDate(event.date)}</span>
              </li>
            ))}
          </ol>
        </Card>

        <Card className="flex flex-col gap-3 p-5">
          <h2 className="text-sm font-semibold text-ink-950 dark:text-slate-100">Delivery status</h2>
          <StatusBadge status={shipment.status} />

          {allowedNextStatuses.length > 0 ? (
            <div className="mt-2 flex flex-col gap-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Update status to:</p>
              {allowedNextStatuses.map((status) => (
                <Button
                  key={status}
                  variant="secondary"
                  size="sm"
                  disabled={isUpdating}
                  onClick={() => setPendingStatus(status)}
                >
                  Mark as {status}
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {shipment.status === "Delivered"
                ? "This shipment has been delivered."
                : "This shipment has no further status transitions available."}
            </p>
          )}
        </Card>
      </div>

      <ConfirmDialog
        isOpen={Boolean(pendingStatus)}
        isLoading={isUpdating}
        title="Update shipment status"
        description={`Mark ${shipment.id} as "${pendingStatus}"? This updates the shipment via the backend API.`}
        confirmLabel="Update status"
        onConfirm={handleConfirmStatusChange}
        onCancel={() => {
          if (!isUpdating) setPendingStatus(null);
        }}
      />
    </div>
  );
}
