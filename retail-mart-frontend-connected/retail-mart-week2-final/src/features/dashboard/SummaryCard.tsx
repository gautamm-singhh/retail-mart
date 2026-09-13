import { Card } from "@/components/ui/Card";
import type { SummaryCard as SummaryCardData } from "@/features/dashboard/data/summary";

export function SummaryCard({ label, value, hint }: SummaryCardData) {
  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink-950 dark:text-slate-100">{value}</p>
      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p>
    </Card>
  );
}
