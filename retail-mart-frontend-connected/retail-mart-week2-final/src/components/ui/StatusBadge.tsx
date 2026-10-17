import { Badge } from "@/components/ui/Badge";

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
