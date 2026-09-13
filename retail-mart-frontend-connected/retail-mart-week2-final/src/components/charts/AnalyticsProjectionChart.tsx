import { useState, useId, useMemo } from "react";
import { formatCurrency } from "@/utils/format";
import type { SalesReportBucket, ProjectionForecastPoint } from "@/types";

interface AnalyticsProjectionChartProps {
  history: SalesReportBucket[];
  forecast: ProjectionForecastPoint[];
}

export function AnalyticsProjectionChart({ history, forecast }: AnalyticsProjectionChartProps) {
  const chartId = useId();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [chartMode, setChartMode] = useState<"line" | "area">("area");

  const combined = useMemo(() => {
    return [
      ...history.map((h) => ({
        period: h.period,
        value: h.revenue,
        orderCount: h.orderCount,
        type: "Historical" as const,
      })),
      ...forecast.map((f, idx) => {
        let label = f.period;
        if (history.length > 0) {
          const lastPeriod = history[history.length - 1].period;
          if (/^\d{4}-\d{2}$/.test(lastPeriod)) {
            const [yStr, mStr] = lastPeriod.split("-");
            const targetDate = new Date(parseInt(yStr, 10), parseInt(mStr, 10) + idx, 1);
            label = targetDate.toLocaleDateString("en-US", { month: "short", year: "numeric" }) + " (Proj)";
          } else {
            label = `Period +${idx + 1} (Proj)`;
          }
        }
        return {
          period: label,
          value: f.projectedRevenue,
          orderCount: undefined,
          type: "Projected" as const,
        };
      }),
    ];
  }, [history, forecast]);

  const maxValue = useMemo(() => {
    const rawMax = Math.max(...combined.map((c) => c.value), 100);
    // Round up to clean ceiling for readable Y-axis ticks
    if (rawMax <= 1000) return 1000;
    if (rawMax <= 10000) return Math.ceil(rawMax / 2000) * 2000;
    if (rawMax <= 50000) return Math.ceil(rawMax / 10000) * 10000;
    if (rawMax <= 200000) return Math.ceil(rawMax / 50000) * 50000;
    return Math.ceil(rawMax / 100000) * 100000;
  }, [combined]);

  // Chart bounds
  const width = 800;
  const height = 300;
  const padding = { top: 30, right: 35, bottom: 45, left: 65 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const points = useMemo(() => {
    if (!combined.length) return [];
    return combined.map((d, i) => {
      const x = padding.left + (i / Math.max(combined.length - 1, 1)) * chartW;
      const y = padding.top + chartH - (d.value / maxValue) * chartH;
      return { x, y, ...d };
    });
  }, [combined, maxValue, chartW, chartH, padding.left, padding.top]);

  const histPoints = points.filter((p) => p.type === "Historical");
  const forePoints = points.filter((p) => p.type === "Projected");
  const bridgePoints =
    histPoints.length > 0 && forePoints.length > 0
      ? [histPoints[histPoints.length - 1], ...forePoints]
      : forePoints;

  const histPath = histPoints.reduce(
    (acc, pt, idx) => `${acc} ${idx === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`,
    "",
  );

  const bridgePath = bridgePoints.reduce(
    (acc, pt, idx) => `${acc} ${idx === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`,
    "",
  );

  // Area under curve
  const areaPath = useMemo(() => {
    if (points.length === 0) return "";
    const firstX = points[0].x.toFixed(1);
    const lastX = points[points.length - 1].x.toFixed(1);
    const bottomY = (padding.top + chartH).toFixed(1);
    const lineSegments = points.reduce(
      (acc, pt, idx) => `${acc} ${idx === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`,
      "",
    );
    return `${lineSegments} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [points, chartH, padding.top]);

  const peakProjected = forecast.length > 0 ? forecast[forecast.length - 1] : null;

  if (combined.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        No sales data available for projection
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Chart Top Controls & Legend Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Legend */}
        <div className="flex items-center gap-5 text-xs font-medium">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-blue-600 shadow-xs" />
            <span className="text-slate-700 dark:text-slate-300">Historical Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-purple-600 shadow-xs" />
            <span className="text-slate-700 dark:text-slate-300">Projected Trajectory</span>
          </div>
        </div>

        {/* Callout Chip & View Switcher */}
        <div className="flex items-center gap-3">
          {peakProjected && (
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200/80 bg-purple-50/80 px-3 py-1.5 text-xs font-semibold text-purple-700 shadow-2xs dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300">
              <span className="text-[10px] uppercase tracking-wider text-purple-500">Projected</span>
              <strong className="font-extrabold">{formatCurrency(peakProjected.projectedRevenue)}</strong>
              <span className="text-[10px] text-purple-500 font-normal">({peakProjected.period})</span>
            </div>
          )}

          <select
            aria-label="Chart display type"
            value={chartMode}
            onChange={(e) => setChartMode(e.target.value as "line" | "area")}
            className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs transition-colors hover:border-slate-300 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="area">Area View</option>
            <option value="line">Line Chart</option>
          </select>
        </div>
      </div>

      {/* Interactive SVG Canvas */}
      <div className="relative w-full overflow-hidden rounded-xl bg-slate-50/50 p-2 dark:bg-slate-900/50">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full overflow-visible select-none"
        >
          <defs>
            {/* Area gradient */}
            <linearGradient id={`revGrad-${chartId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.22" />
              <stop offset="60%" stopColor="#3B82F6" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
            </linearGradient>

            {/* Projection Area Mask */}
            <linearGradient id={`projGrad-${chartId}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>

          {/* Grid lines and Y-axis text */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding.top + chartH * (1 - ratio);
            const val = maxValue * ratio;
            return (
              <g key={ratio}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray="4 4"
                  className="stroke-slate-200/80 dark:stroke-slate-800/80"
                />
                <text
                  x={padding.left - 12}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fontWeight="500"
                  className="fill-slate-400 dark:fill-slate-500 font-sans"
                >
                  {val >= 100000
                    ? `₹${(val / 100000).toFixed(1)}L`
                    : val >= 1000
                    ? `₹${(val / 1000).toFixed(0)}k`
                    : `₹${val.toFixed(0)}`}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          {chartMode === "area" && areaPath && (
            <path d={areaPath} fill={`url(#revGrad-${chartId})`} />
          )}

          {/* Historical Solid Line */}
          {histPath && (
            <path
              d={histPath}
              fill="none"
              stroke="#2563EB"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-300"
            />
          )}

          {/* Projected Dashed Line */}
          {bridgePath && (
            <path
              d={bridgePath}
              fill="none"
              stroke="#8B5CF6"
              strokeWidth="3.2"
              strokeDasharray="6 5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-300"
            />
          )}

          {/* Hover Column Guide */}
          {hoveredIdx !== null && points[hoveredIdx] && (
            <line
              x1={points[hoveredIdx].x}
              y1={padding.top}
              x2={points[hoveredIdx].x}
              y2={padding.top + chartH}
              stroke="#8B5CF6"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              className="opacity-60"
            />
          )}

          {/* Interactive Point Nodes */}
          {points.map((pt, idx) => {
            const isProjected = pt.type === "Projected";
            const isHovered = hoveredIdx === idx;
            return (
              <g
                key={idx}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Hit target */}
                <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />

                {/* Point Halo */}
                {isHovered && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="9"
                    fill={isProjected ? "#8B5CF6" : "#2563EB"}
                    opacity="0.25"
                  />
                )}

                {/* Visible node */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 5.5 : 4}
                  fill={isProjected ? "#8B5CF6" : "#ffffff"}
                  stroke={isProjected ? "#ffffff" : "#2563EB"}
                  strokeWidth={isProjected ? "2" : "2.5"}
                  className="transition-transform duration-150 dark:fill-slate-900"
                />

                {/* X-axis Period Label */}
                <text
                  x={pt.x}
                  y={height - 15}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight={isHovered ? "700" : "500"}
                  className={`font-sans transition-colors ${
                    isHovered
                      ? "fill-slate-900 dark:fill-white font-bold"
                      : "fill-slate-500 dark:fill-slate-400"
                  }`}
                >
                  {pt.period}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIdx !== null && points[hoveredIdx] && (
          <div
            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-xl border border-slate-200/90 bg-white/95 px-3 py-2 text-xs shadow-xl backdrop-blur-md transition-all duration-150 dark:border-slate-800 dark:bg-slate-900/95"
            style={{
              left: `${(points[hoveredIdx].x / width) * 100}%`,
              top: `${(points[hoveredIdx].y / height) * 100 - 4}%`,
            }}
          >
            <div className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  points[hoveredIdx].type === "Projected" ? "bg-purple-500" : "bg-blue-500"
                }`}
              />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {points[hoveredIdx].type}
              </span>
            </div>
            <p className="mt-0.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
              {points[hoveredIdx].period}
            </p>
            <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrency(points[hoveredIdx].value)}
            </p>
            {points[hoveredIdx].orderCount !== undefined && (
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {points[hoveredIdx].orderCount} order(s)
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
