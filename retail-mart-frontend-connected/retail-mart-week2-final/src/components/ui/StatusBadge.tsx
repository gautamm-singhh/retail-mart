import { Badge } from "@/components/ui/Badge";

// One lookup table covers every status used across products, orders,
// payments, and shipments so each feature doesn't need its own badge
// mapping. Statuses that aren't listed fall back to the neutral tone.
const STATUS_TONE: Record<
  string,
  "neutral" | "brand" | "success" | "warning" | "danger"
> = {
  active: "success",
  paid: "success",
  delivered: "success",
  packed: "brand",

  processing: "brand",
  shipped: "brand",
  "out for delivery": "brand",

  pending: "warning",
  draft: "neutral",

  "out-of-stock": "danger",
  failed: "danger",
  cancelled: "danger",
  inactive: "neutral",
  refunded: "warning",
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const tone = STATUS_TONE[status.toLowerCase()] ?? "neutral";
  return <Badge tone={tone}>{status}</Badge>;
}
