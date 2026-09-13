import { useState } from "react";
import { formatCurrency } from "@/utils/format";

interface TrendDataPoint {
  period: string;
  revenue: number;
  orderCount: number;
}

interface TrendLineChartProps {
  data: TrendDataPoint[];
  title?: string;
  height?: number;
}

export function TrendLineChart({ data, title, height = 220 }: TrendLineChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return <div className="py-8 text-center text-xs text-slate-400">No trend data available</div>;
  }

  const padding = { top: 20, right: 30, bottom: 35, left: 55 };
  const width = 600;
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 100);
  const minRevenue = 0;

  const points = data.map((d, i) => {
    const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartW;
    const y = padding.top + chartH - ((d.revenue - minRevenue) / (maxRevenue - minRevenue)) * chartH;
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, pt, idx) => {
    return `${acc} ${idx === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
  }, "");

  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${(padding.top + chartH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padding.top + chartH).toFixed(1)} Z`;

  return (
    <div className="flex flex-col gap-2">
      {title && <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</h3>}
      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
          <defs>
            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.33, 0.66, 1].map((ratio) => {
            const y = padding.top + chartH * (1 - ratio);
            const val = maxRevenue * ratio;
            return (
              <g key={ratio}>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                <text x={padding.left - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#94a3b8" className="fill-slate-400 dark:fill-slate-500">
                  {val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val.toFixed(0)}`}
                </text>
              </g>
            );
          })}

          {/* Area under curve */}
          <path d={areaD} fill="url(#trendGrad)" />

          {/* Line stroke */}
          <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data Points */}
          {points.map((pt, idx) => (
            <g
              key={idx}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoveredIdx === idx ? 6 : 4}
                fill="#ffffff"
                stroke="#2563eb"
                strokeWidth="2.5"
                className="transition-all duration-150 dark:fill-slate-900"
              />
              <text x={pt.x} y={height - 10} textAnchor="middle" fontSize="10" fill="#64748b" className="fill-slate-500 dark:fill-slate-400">
                {pt.period.length > 7 ? pt.period.slice(5) : pt.period}
              </text>
            </g>
          ))}
        </svg>

        {/* Hover Tooltip */}
        {hoveredIdx !== null && points[hoveredIdx] && (
          <div
            className="pointer-events-none absolute -top-2 rounded-md bg-ink-950 px-2.5 py-1.5 text-xs text-white shadow-lg transition-all dark:bg-slate-800 dark:border dark:border-slate-700"
            style={{
              left: `${(points[hoveredIdx].x / width) * 100}%`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <p className="font-semibold">{points[hoveredIdx].period}</p>
            <p className="text-emerald-400">{formatCurrency(points[hoveredIdx].revenue)}</p>
            <p className="text-slate-300 dark:text-slate-400">{points[hoveredIdx].orderCount} order(s)</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface CategoryBarChartProps {
  data: { category: string; orderCount: number; unitsSold: number; totalSpent: number }[];
}

export function CategoryBarChart({ data }: CategoryBarChartProps) {
  if (!data || data.length === 0) return <p className="text-xs text-slate-400">No category data</p>;

  const maxSpent = Math.max(...data.map((c) => c.totalSpent), 1);

  return (
    <div className="flex flex-col gap-3">
      {data.map((item) => {
        const pct = Math.round((item.totalSpent / maxSpent) * 100);
        return (
          <div key={item.category} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-ink-900 dark:text-slate-100">{item.category}</span>
              <span className="font-semibold text-ink-800 dark:text-slate-200">{formatCurrency(item.totalSpent)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-indigo-600 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="shrink-0 text-[10px] text-slate-400 dark:text-slate-500">{item.unitsSold} units</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface StatusBreakdownProps {
  data: { status: string; count: number; percentage: number }[];
}

export function StatusDistribution({ data }: StatusBreakdownProps) {
  if (!data || data.length === 0) return null;

  const colors: Record<string, string> = {
    Delivered: "bg-emerald-500",
    Shipped: "bg-blue-500",
    Pending: "bg-amber-500",
    Processing: "bg-indigo-500",
    Cancelled: "bg-rose-400",
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Segmented bar */}
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        {data.map((item) => (
          <div
            key={item.status}
            className={`h-full ${colors[item.status] || "bg-slate-400"} transition-all`}
            style={{ width: `${item.percentage}%` }}
            title={`${item.status}: ${item.count} (${item.percentage}%)`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {data.map((item) => (
          <div key={item.status} className="flex items-center gap-2 text-xs">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${colors[item.status] || "bg-slate-400"}`} />
            <span className="text-slate-600 dark:text-slate-400">{item.status}:</span>
            <span className="font-semibold text-ink-900 dark:text-slate-100">{item.count} ({item.percentage}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface PaymentDistributionProps {
  data: { method: string; count: number; totalAmount: number }[];
}

export function PaymentDistribution({ data }: PaymentDistributionProps) {
  if (!data || data.length === 0) return null;

  const total = data.reduce((acc, d) => acc + d.totalAmount, 0) || 1;

  const colors = ["bg-brand-500", "bg-purple-500", "bg-emerald-500", "bg-amber-500", "bg-cyan-500"];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        {data.map((item, idx) => {
          const pct = Math.round((item.totalAmount / total) * 100);
          return (
            <div
              key={item.method}
              className={`h-full ${colors[idx % colors.length]}`}
              style={{ width: `${pct}%` }}
              title={`${item.method}: ${formatCurrency(item.totalAmount)} (${pct}%)`}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {data.map((item, idx) => {
          const pct = Math.round((item.totalAmount / total) * 100);
          return (
            <div key={item.method} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${colors[idx % colors.length]}`} />
                <span className="text-slate-700 dark:text-slate-300">{item.method}</span>
              </div>
              <div className="text-right">
                <span className="font-semibold text-ink-900 dark:text-slate-100">{formatCurrency(item.totalAmount)}</span>
                <span className="ml-1 text-[10px] text-slate-400 dark:text-slate-500">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ForecastChartProps {
  history: { period: string; revenue: number; orderCount: number }[];
  forecast: { period: string; projectedRevenue: number }[];
}

export function ForecastComparisonChart({ history, forecast }: ForecastChartProps) {
  const [hovered, setHovered] = useState<{ label: string; value: number; type: "History" | "Projected" } | null>(null);

  const combined = [
    ...history.map((h) => ({ period: h.period, value: h.revenue, type: "History" as const })),
    ...forecast.map((f) => ({ period: f.period, value: f.projectedRevenue, type: "Projected" as const })),
  ];

  if (combined.length === 0) return null;

  const maxValue = Math.max(...combined.map((c) => c.value), 100);
  const padding = { top: 20, right: 35, bottom: 35, left: 55 };
  const width = 600;
  const height = 220;
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const points = combined.map((d, i) => {
    const x = padding.left + (i / Math.max(combined.length - 1, 1)) * chartW;
    const y = padding.top + chartH - (d.value / maxValue) * chartH;
    return { x, y, ...d };
  });

  const histPoints = points.filter((p) => p.type === "History");
  const forePoints = points.filter((p) => p.type === "Projected");
  const bridgePoints = histPoints.length > 0 && forePoints.length > 0 ? [histPoints[histPoints.length - 1], ...forePoints] : [];

  const histPath = histPoints.reduce((acc, pt, idx) => `${acc} ${idx === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`, "");
  const bridgePath = bridgePoints.reduce((acc, pt, idx) => `${acc} ${idx === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`, "");

  return (
    <div className="relative w-full overflow-hidden">
      <div className="mb-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
            <span className="text-slate-600 dark:text-slate-400 font-medium">Historical Revenue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-600" />
            <span className="text-slate-600 dark:text-slate-400 font-medium">Projected Trajectory</span>
          </div>
        </div>
        {hovered && (
          <span className="font-medium text-ink-900 dark:text-slate-200">
            {hovered.type} ({hovered.label}): <strong className="text-brand-700 dark:text-emerald-400">{formatCurrency(hovered.value)}</strong>
          </span>
        )}
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
        {/* Grid lines */}
        {[0, 0.5, 1].map((ratio) => {
          const y = padding.top + chartH * (1 - ratio);
          const val = maxValue * ratio;
          return (
            <g key={ratio}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
              <text x={padding.left - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#94a3b8" className="fill-slate-400 dark:fill-slate-500">
                {val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val.toFixed(0)}`}
              </text>
            </g>
          );
        })}

        {/* Historical solid line */}
        {histPath && <path d={histPath} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

        {/* Projected dashed line */}
        {bridgePath && <path d={bridgePath} fill="none" stroke="#9333ea" strokeWidth="2.5" strokeDasharray="5 4" strokeLinecap="round" strokeLinejoin="round" />}

        {/* Points */}
        {points.map((pt, idx) => (
          <g
            key={idx}
            className="cursor-pointer"
            onMouseEnter={() => setHovered({ label: pt.period, value: pt.value, type: pt.type })}
            onMouseLeave={() => setHovered(null)}
          >
            <circle
              cx={pt.x}
              cy={pt.y}
              r={pt.type === "History" ? 4 : 5}
              fill="#ffffff"
              stroke={pt.type === "History" ? "#2563eb" : "#9333ea"}
              strokeWidth="2.5"
              className="dark:fill-slate-900"
            />
            <text x={pt.x} y={height - 8} textAnchor="middle" fontSize="10" fill="#64748b" className="fill-slate-500 dark:fill-slate-400">
              {pt.period}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

