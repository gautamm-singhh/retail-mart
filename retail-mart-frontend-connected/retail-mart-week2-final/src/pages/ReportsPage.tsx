import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Table, TableColumn } from "@/components/ui/Table";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { fetchSalesReport, fetchAnalyticsSummary } from "@/services/api/reports";
import { TrendLineChart, CategoryBarChart, StatusDistribution, PaymentDistribution } from "@/components/charts/ReportCharts";
import { AdminStatCard } from "@/components/common/AdminStatCard";
import type { ReportPeriod, SalesReportBucket, AnalyticsSummary } from "@/types";
import { formatCurrency } from "@/utils/format";

const PERIOD_OPTIONS: { label: string; value: ReportPeriod }[] = [
  { label: "Monthly Sales", value: "monthly" },
  { label: "Daily Sales", value: "daily" },
  { label: "Year End Sales", value: "yearly" },
];

const PERIOD_COLUMN_LABEL: Record<ReportPeriod, string> = {
  daily: "Date",
  monthly: "Month",
  yearly: "Year",
};

export default function ReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>("monthly");
  const [buckets, setBuckets] = useState<SalesReportBucket[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([fetchSalesReport(period), fetchAnalyticsSummary()])
      .then(([reportData, summaryData]) => {
        if (!cancelled) {
          setBuckets(reportData);
          setSummary(summaryData);
        }
      })
      .catch(() => {
        if (!cancelled) setError("We couldn't load this report. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [period, reloadToken]);

  const totalRevenue = buckets.reduce((sum, b) => sum + b.revenue, 0);
  const totalOrders = buckets.reduce((sum, b) => sum + b.orderCount, 0);

  const columns: TableColumn<SalesReportBucket>[] = [
    { header: PERIOD_COLUMN_LABEL[period], render: (b) => b.period },
    { header: "Orders", render: (b) => b.orderCount },
    { header: "Revenue", render: (b) => formatCurrency(b.revenue) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        badge="EXECUTIVE INTELLIGENCE"
        title="Executive Reports & Analytics"
        description="Comprehensive performance diagnostics, financial revenue trajectories, and aggregated cohort metrics."
      />

      {/* High-Level Executive KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <AdminStatCard
            label="Net Sales Revenue"
            value={formatCurrency(summary.executiveTotals.totalRevenue)}
            subtext="Excludes cancelled orders"
            accentColor="emerald"
            icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <AdminStatCard
            label="Total Orders Placed"
            value={summary.executiveTotals.totalOrders}
            subtext="Across all retail channels"
            accentColor="blue"
            icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>}
          />
          <AdminStatCard
            label="Avg. Order Value"
            value={formatCurrency(summary.executiveTotals.avgOrderValue)}
            subtext="Per active customer transaction"
            accentColor="teal"
            icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
          />
          <AdminStatCard
            label="Delivered Packages"
            value={summary.executiveTotals.deliveredOrders}
            subtext="Successfully delivered"
            accentColor="purple"
            icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
          />
        </div>
      )}

      {/* Visual Charts Grid */}
      {summary && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Revenue Trend Chart */}
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-ink-950 dark:text-slate-100">Revenue Trajectory</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Sales volume and order trajectory over time</p>
              </div>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-sky-950 dark:text-sky-300">
                Interactive Chart
              </span>
            </div>
            <TrendLineChart data={summary.monthlyTrends} />
          </Card>

          {/* Category Sales Distribution */}
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-ink-950 dark:text-slate-100">Revenue by Category</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Contribution and volume across product categories</p>
              </div>
            </div>
            <CategoryBarChart data={summary.categoryBreakdown} />
          </Card>

          {/* Order Status Distribution */}
          <Card className="p-5">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-ink-950 dark:text-slate-100">Order Lifecycle Breakdown</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Current progression of customer orders</p>
            </div>
            <StatusDistribution data={summary.orderStatusBreakdown} />
          </Card>

          {/* Payment Method Distribution */}
          <Card className="p-5">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-ink-950 dark:text-slate-100">Payment Channels</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Transaction volume by payment instrument</p>
            </div>
            <PaymentDistribution data={summary.paymentMethodBreakdown} />
          </Card>
        </div>
      )}

      {/* Detailed Period Report Table */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-ink-950 dark:text-slate-100">Periodic Sales Breakdown</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Audit-ready tabular report for daily, monthly, and yearly intervals</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="sm:w-56">
              <Select
                label="Interval"
                options={PERIOD_OPTIONS}
                value={period}
                onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
              />
            </div>
            {!isLoading && !error && (
              <div className="text-right text-xs">
                <p className="text-slate-500 dark:text-slate-400">Period Total: <strong className="text-ink-900 dark:text-slate-100">{formatCurrency(totalRevenue)}</strong></p>
                <p className="text-slate-500 dark:text-slate-400">Orders: <strong className="text-ink-900 dark:text-slate-100">{totalOrders}</strong></p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4">
          {isLoading ? (
            <LoadingState label="Loading report data" rows={5} />
          ) : error ? (
            <ErrorState
              title="Couldn't load this report"
              description={error}
              onRetry={() => setReloadToken((t) => t + 1)}
            />
          ) : (
            <Table
              columns={columns}
              rows={buckets}
              getRowKey={(b: SalesReportBucket) => b.period}
            />
          )}
        </div>
      </Card>
    </div>
  );
}
