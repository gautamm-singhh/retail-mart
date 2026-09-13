import { useMemo, useState } from "react";
import { formatCurrency } from "@/utils/format";

export interface CategoryDataPoint {
  category: string;
  orderCount: number;
  unitsSold: number;
  totalSpent: number;
}

interface CategoryDonutChartProps {
  data: CategoryDataPoint[];
  totalRevenue?: number;
}

const CATEGORY_COLORS = [
  "#10B981", // Emerald
  "#3B82F6", // Blue
  "#F59E0B", // Amber
  "#EC4899", // Pink
  "#8B5CF6", // Purple
  "#06B6D4", // Cyan
  "#64748B", // Slate
];

export function CategoryDonutChart({ data, totalRevenue }: CategoryDonutChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const calculatedTotal = useMemo(() => {
    if (typeof totalRevenue === "number" && totalRevenue > 0) return totalRevenue;
    return data.reduce((sum, item) => sum + item.totalSpent, 0);
  }, [data, totalRevenue]);

  const segments = useMemo(() => {
    if (!data.length || calculatedTotal <= 0) return [];

    let currentOffset = 0;
    const circumference = 2 * Math.PI * 45; // r = 45

    return data.map((item, idx) => {
      const percentage = (item.totalSpent / calculatedTotal) * 100;
      const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
      const strokeDashoffset = -currentOffset;
      currentOffset += (percentage / 100) * circumference;

      return {
        ...item,
        percentage: Math.round(percentage) || 1,
        color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
        strokeDasharray,
        strokeDashoffset,
      };
    });
  }, [data, calculatedTotal]);

  const displayTotalFormatted = useMemo(() => {
    if (calculatedTotal >= 100000) {
      return `₹${(calculatedTotal / 100000).toFixed(2)}L`;
    }
    return formatCurrency(calculatedTotal);
  }, [calculatedTotal]);

  if (!data.length) {
    return <div className="py-12 text-center text-xs text-slate-400">No category breakdown data available</div>;
  }

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
      {/* SVG Donut Circle */}
      <div className="relative mx-auto flex h-48 w-48 shrink-0 items-center justify-center">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90 transform">
          <circle
            cx="60"
            cy="60"
            r="45"
            className="stroke-slate-100 dark:stroke-slate-800"
            strokeWidth="16"
            fill="none"
          />
          {segments.map((seg, idx) => (
            <circle
              key={seg.category}
              cx="60"
              cy="60"
              r="45"
              fill="none"
              stroke={seg.color}
              strokeWidth={hoveredIndex === idx ? "19" : "16"}
              strokeDasharray={seg.strokeDasharray}
              strokeDashoffset={seg.strokeDashoffset}
              strokeLinecap="round"
              className="cursor-pointer transition-all duration-300"
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ))}
        </svg>

        {/* Center Metric Text */}
        <div className="pointer-events-none absolute flex flex-col items-center justify-center text-center">
          <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
            {hoveredIndex !== null && segments[hoveredIndex]
              ? formatCurrency(segments[hoveredIndex].totalSpent)
              : displayTotalFormatted}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {hoveredIndex !== null && segments[hoveredIndex]
              ? segments[hoveredIndex].category
              : "Total Revenue"}
          </span>
        </div>
      </div>

      {/* Categories Legend List */}
      <div className="flex flex-1 flex-col gap-2.5">
        {segments.slice(0, 5).map((seg, idx) => (
          <div
            key={seg.category}
            className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 transition-colors ${
              hoveredIndex === idx ? "bg-slate-100/70 dark:bg-slate-800/80" : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
            }`}
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
              <span className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                {seg.category}
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {seg.percentage}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
