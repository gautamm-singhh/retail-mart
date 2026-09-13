import { useEffect, useState, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import { useProducts } from "@/features/products/useProducts";
import { usePayments } from "@/features/payments/usePayments";
import { useShipments } from "@/features/shipping/useShipments";
import { useOrders } from "@/features/orders/useOrders";
import { useUsers } from "@/features/users/useUsers";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingState } from "@/components/ui/LoadingState";
import { formatCurrency, formatDate } from "@/utils/format";
import { ROUTES } from "@/constants/routes";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";

// Sample mock timeline events for Recent Activity
const RECENT_ACTIVITIES = [
  {
    id: "act-1",
    icon: "🛒",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    text: "New order received",
    code: "ORD-09968",
    time: "2 minutes ago",
  },
  {
    id: "act-2",
    icon: "💳",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    text: "Payment completed",
    code: "ORD-59453",
    time: "12 minutes ago",
  },
  {
    id: "act-3",
    icon: "📦",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
    text: "Product updated",
    code: "Wireless Earbuds Pro",
    time: "1 hour ago",
  },
  {
    id: "act-4",
    icon: "⚠️",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    text: "Low stock alert",
    code: "Yoga Mat (6 units left)",
    time: "2 hours ago",
  },
];

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const { users, isLoading: usersLoading } = useUsers();
  const { products, isLoading: productsLoading } = useProducts();
  const { payments, isLoading: paymentsLoading } = usePayments();
  const { shipments } = useShipments();
  const { orders, isLoading: ordersLoading } = useOrders();

  const [showQuickActions, setShowQuickActions] = useState(false);
  const [timeframe, setTimeframe] = useState("This Year");
  const quickActionsRef = useRef<HTMLDivElement>(null);
  const ordersScrollRef = useRef<HTMLDivElement>(null);
  const [isOrdersPaused, setIsOrdersPaused] = useState(false);

  useOnClickOutside(quickActionsRef, () => setShowQuickActions(false), showQuickActions);

  // Auto-scrolling effect for Recent Orders table
  useEffect(() => {
    const el = ordersScrollRef.current;
    if (!el) return;

    // Check prefers-reduced-motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let intervalId: NodeJS.Timeout;
    if (!isOrdersPaused) {
      intervalId = setInterval(() => {
        if (!el) return;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
          el.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          el.scrollTop += 1;
        }
      }, 45);
    }
    return () => clearInterval(intervalId);
  }, [isOrdersPaused]);

  // Derived metrics
  const lowStockCount = useMemo(() => products.filter((p) => p.stock > 0 && p.stock <= 20).length, [products]);
  const outOfStockCount = useMemo(() => products.filter((p) => p.status === "out-of-stock" || p.stock <= 0).length, [products]);
  const inStockCount = useMemo(() => Math.max(0, products.length - lowStockCount - outOfStockCount), [products, lowStockCount, outOfStockCount]);

  const pendingOrdersCount = useMemo(() => orders.filter((o) => o.status === "Pending" || o.status === "Processing").length, [orders]);
  const pendingShipmentsCount = useMemo(() => shipments.filter((s) => s.status !== "Delivered").length, [shipments]);

  const paidTotal = useMemo(
    () => payments.filter((p) => p.status === "Paid").reduce((sum, p) => sum + p.amount, 0),
    [payments],
  );
  const failedPaymentsCount = useMemo(() => payments.filter((p) => p.status === "Failed").length, [payments]);

  // Sorted orders list for recent table
  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [orders]);

  const currentDateFormatted = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());

  const isLoading = usersLoading && productsLoading && ordersLoading && paymentsLoading;

  if (isLoading) {
    return (
      <div className="py-8">
        <LoadingState label="Loading operations console..." rows={6} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Welcome Header & Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Welcome back, {currentUser?.name || "Sorav"}!
          </span>
          <h1 className="mt-0.5 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Here's what's happening with your store today.
          </p>
        </div>

        {/* Right Controls: Date Pill & Quick Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Date & Productivity Pill */}
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-2 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              📅
            </span>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                {currentDateFormatted}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Have a productive day!
              </span>
            </div>
          </div>

          {/* Quick Actions Dropdown */}
          <div className="relative" ref={quickActionsRef}>
            <button
              type="button"
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="group flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md active:translate-y-0.5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <span>+ Quick Actions</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-y-0.5"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showQuickActions && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50 animate-dropdown">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickActions(false);
                    navigate(ROUTES.products);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-700 dark:text-slate-200 dark:hover:bg-slate-800/80 dark:hover:text-emerald-400 transition-colors"
                >
                  <span className="text-base">📦</span>
                  <span>Add New Product</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickActions(false);
                    navigate(ROUTES.orders);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-700 dark:text-slate-200 dark:hover:bg-slate-800/80 dark:hover:text-emerald-400 transition-colors"
                >
                  <span className="text-base">🛒</span>
                  <span>View All Orders</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickActions(false);
                    navigate(ROUTES.users);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-700 dark:text-slate-200 dark:hover:bg-slate-800/80 dark:hover:text-emerald-400 transition-colors"
                >
                  <span className="text-base">👥</span>
                  <span>Manage Users</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickActions(false);
                    navigate(ROUTES.campaigns);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-700 dark:text-slate-200 dark:hover:bg-slate-800/80 dark:hover:text-emerald-400 transition-colors"
                >
                  <span className="text-base">📢</span>
                  <span>Create Campaign</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Row of 5 KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {/* KPI 1: Active Users */}
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <circle cx="9" cy="8" r="3.5" />
                <path d="M3 20a6 6 0 0 1 12 0" />
                <circle cx="17" cy="9" r="2.5" />
                <path d="M14 20a4.5 4.5 0 0 1 7 0" />
              </svg>
            </span>
            <div className="text-right pl-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Users</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{users.length || 8}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800/80">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span>▲ +12%</span>
              <span className="text-slate-400 font-normal">9 total accounts</span>
            </div>
            {/* Emerald Mini Sparkline */}
            <svg viewBox="0 0 60 20" fill="none" className="h-4 w-12 shrink-0 text-emerald-500">
              <path d="M2 16 L12 14 L24 10 L36 12 L48 6 L58 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* KPI 2: Total Products */}
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path d="M21 8l-9-5-9 5 9 5 9-5z" />
                <path d="M3 8v8l9 5 9-5V8" />
                <path d="M12 13v8" />
              </svg>
            </span>
            <div className="text-right pl-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Products</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{products.length || 10}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800/80">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-500">
              <span>▼ -5%</span>
              <span className="text-slate-400 font-normal">{outOfStockCount || 2} out of stock</span>
            </div>
            {/* Blue Mini Sparkline */}
            <svg viewBox="0 0 60 20" fill="none" className="h-4 w-12 shrink-0 text-blue-500">
              <path d="M2 8 L14 12 L26 7 L38 14 L50 9 L58 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* KPI 3: Pending Orders */}
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <circle cx="9" cy="20" r="1.4" />
                <circle cx="18" cy="20" r="1.4" />
                <path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8a2 2 0 0 0 2-1.6L21 8H6" />
              </svg>
            </span>
            <div className="text-right pl-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pending Orders</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{pendingOrdersCount || 6}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800/80">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              <span>▲ +20%</span>
              <span className="text-slate-400 font-normal">{orders.length || 26} orders total</span>
            </div>
            {/* Amber Mini Sparkline */}
            <svg viewBox="0 0 60 20" fill="none" className="h-4 w-12 shrink-0 text-amber-500">
              <path d="M2 14 L12 12 L24 15 L36 8 L48 6 L58 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* KPI 4: Total Payments */}
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M2 10h20" />
                <path d="M6 15h4" />
              </svg>
            </span>
            <div className="text-right pl-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Payments</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{payments.length || 23}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800/80">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-600 dark:text-purple-400">
              <span>▲ +8%</span>
              <span className="text-slate-400 font-normal">{failedPaymentsCount || 1} failed</span>
            </div>
            {/* Purple Mini Sparkline */}
            <svg viewBox="0 0 60 20" fill="none" className="h-4 w-12 shrink-0 text-purple-500">
              <path d="M2 16 L14 12 L26 14 L38 9 L48 11 L58 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* KPI 5: Pending Shipments */}
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <rect x="1" y="6" width="14" height="11" rx="1.5" />
                <path d="M15 10h4l3 3v4h-7z" />
                <circle cx="6" cy="19" r="1.6" />
                <circle cx="17.5" cy="19" r="1.6" />
              </svg>
            </span>
            <div className="text-right pl-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pending Shipments</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{pendingShipmentsCount || 5}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800/80">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
              <span>▲ +25%</span>
              <span className="text-slate-400 font-normal">{shipments.length || 21} shipments total</span>
            </div>
            {/* Rose Mini Sparkline */}
            <svg viewBox="0 0 60 20" fill="none" className="h-4 w-12 shrink-0 text-rose-500">
              <path d="M2 15 L14 13 L26 9 L38 12 L50 6 L58 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* 3. Promotional Growth Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/90 via-teal-50/60 to-emerald-100/40 p-5 shadow-xs dark:border-emerald-900/60 dark:from-emerald-950/40 dark:via-slate-900 dark:to-teal-950/30">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-6 w-6">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </span>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Grow Your Business
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Track performance, manage inventory, and deliver great customer experiences.
              </p>
              <button
                type="button"
                onClick={() => navigate(ROUTES.reports)}
                className="group mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-emerald-800 hover:shadow-sm"
              >
                <span>View Reports</span>
                <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
              </button>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-6 text-right pr-4">
            <div className="flex flex-col text-xs font-bold text-emerald-800 dark:text-emerald-300 tracking-wide">
              <span>More Sales</span>
              <span>Happier Customers</span>
              <span>A Bigger Tomorrow</span>
            </div>
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-3xl">
              🛍️
            </div>
          </div>
        </div>
      </div>

      {/* 4. Middle Section: Recent Orders (Left 8) + Inventory & Payments (Right 4) */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Left 8 Cols: Recent Orders Table with Auto-Scroll */}
        <div className="xl:col-span-8 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                📋
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Orders</h3>
            </div>
            <Link
              to={ROUTES.orders}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              View All →
            </Link>
          </div>

          {/* Table container with gentle auto-scroll & pause controls */}
          <div
            ref={ordersScrollRef}
            onMouseEnter={() => setIsOrdersPaused(true)}
            onMouseLeave={() => setIsOrdersPaused(false)}
            onFocus={() => setIsOrdersPaused(true)}
            onBlur={() => setIsOrdersPaused(false)}
            tabIndex={0}
            role="region"
            aria-label="Recent Orders activity feed"
            className="mt-3 max-h-[340px] overflow-y-auto no-scrollbar focus:outline-none focus:ring-1 focus:ring-emerald-500/30 rounded-lg"
          >
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider dark:bg-slate-800/80 dark:text-slate-400 z-10">
                <tr>
                  <th scope="col" className="py-2.5 px-3">#</th>
                  <th scope="col" className="py-2.5 px-3">Customer</th>
                  <th scope="col" className="py-2.5 px-3">Date</th>
                  <th scope="col" className="py-2.5 px-3">Amount</th>
                  <th scope="col" className="py-2.5 px-3">Payment</th>
                  <th scope="col" className="py-2.5 px-3">Status</th>
                  <th scope="col" className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sortedOrders.map((order) => {
                  const initial = (order.customer || "User").charAt(0).toUpperCase();
                  return (
                    <tr
                      key={order.id}
                      className="group transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/60 cursor-pointer"
                      onClick={() => navigate(`${ROUTES.orders}/${order.id}`)}
                    >
                      <td className="py-3 px-3 font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                        {order.id}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            {initial}
                          </span>
                          <span className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-[120px]">
                            {order.customer}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatDate(order.date)}
                      </td>
                      <td className="py-3 px-3 font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                        {formatCurrency(order.amount)}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                          {order.paymentStatus || "Paid"}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="py-3 px-3 text-right text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200">
                        •••
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-auto pt-2 text-[10px] text-slate-400 dark:text-slate-500 text-right">
            Hover to pause scroll
          </div>
        </div>

        {/* Right 4 Cols: Inventory & Payments Summary */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          {/* Inventory Summary Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  📦
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Inventory Summary</h3>
              </div>
              <Link
                to={ROUTES.products}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                View Details →
              </Link>
            </div>

            <div className="mt-4 flex items-center justify-between gap-4">
              {/* SVG Donut Chart */}
              <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
                <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                  {/* Background circle */}
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#E2E8F0" strokeWidth="3.5" className="dark:stroke-slate-800" />
                  {/* In stock arc (emerald) */}
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#10B981" strokeWidth="3.5" strokeDasharray="65 100" strokeDashoffset="0" />
                  {/* Low stock arc (amber) */}
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#F59E0B" strokeWidth="3.5" strokeDasharray="15 100" strokeDashoffset="-65" />
                  {/* Out of stock arc (rose) */}
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#F43F5E" strokeWidth="3.5" strokeDasharray="20 100" strokeDashoffset="-80" />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-lg font-black text-slate-900 dark:text-white leading-none">{products.length || 10}</span>
                  <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-tight">Total</span>
                </div>
              </div>

              {/* Legend List */}
              <div className="flex-1 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-slate-600 dark:text-slate-300">In Stock</span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">{inStockCount || 7}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="text-slate-600 dark:text-slate-300">Low Stock (≤20)</span>
                  </div>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{lowStockCount || 1}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    <span className="text-slate-600 dark:text-slate-300">Out of Stock</span>
                  </div>
                  <span className="font-bold text-rose-600 dark:text-rose-400">{outOfStockCount || 2}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payments Summary Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
                  💳
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Payments Summary</h3>
              </div>
              <Link
                to={ROUTES.payments}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                View Details →
              </Link>
            </div>

            <div className="mt-4 flex items-center justify-between gap-4">
              {/* Mini Bar Graph */}
              <div className="flex h-16 items-end gap-1.5">
                <span className="h-8 w-2.5 rounded-sm bg-emerald-400/50" />
                <span className="h-12 w-2.5 rounded-sm bg-emerald-500/70" />
                <span className="h-7 w-2.5 rounded-sm bg-emerald-400/40" />
                <span className="h-14 w-2.5 rounded-sm bg-emerald-600" />
                <span className="h-10 w-2.5 rounded-sm bg-emerald-500/60" />
                <span className="h-16 w-2.5 rounded-sm bg-emerald-500" />
              </div>

              <div className="text-right">
                <p className="text-xl font-black text-slate-900 dark:text-white">
                  {formatCurrency(paidTotal || 60557)}
                </p>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Collected (paid)</span>
                <p className="mt-2 text-xs font-bold text-rose-500">
                  {failedPaymentsCount || 1} Failed payments
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Bottom Section: Sales Overview (5), Top Categories (3), Recent Activity (4) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Sales Overview (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                📈
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Sales Overview</h3>
            </div>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white py-1 px-2.5 text-xs font-semibold text-slate-700 shadow-xs focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="This Year">This Year</option>
              <option value="Last 6 Months">Last 6 Months</option>
              <option value="This Month">This Month</option>
            </select>
          </div>

          {/* Area Chart with Bezier Curve */}
          <div className="mt-4">
            <svg viewBox="0 0 320 120" className="w-full overflow-visible">
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line x1="0" y1="20" x2="320" y2="20" stroke="#E2E8F0" strokeDasharray="3 3" className="dark:stroke-slate-800" />
              <line x1="0" y1="50" x2="320" y2="50" stroke="#E2E8F0" strokeDasharray="3 3" className="dark:stroke-slate-800" />
              <line x1="0" y1="80" x2="320" y2="80" stroke="#E2E8F0" strokeDasharray="3 3" className="dark:stroke-slate-800" />
              <line x1="0" y1="110" x2="320" y2="110" stroke="#E2E8F0" className="dark:stroke-slate-800" />

              {/* Gradient Area Fill */}
              <path
                d="M 10 95 Q 40 85, 75 90 T 145 75 T 215 60 T 285 45 L 310 25 L 310 110 L 10 110 Z"
                fill="url(#salesGrad)"
              />
              {/* Line Curve */}
              <path
                d="M 10 95 Q 40 85, 75 90 T 145 75 T 215 60 T 285 45 L 310 25"
                fill="none"
                stroke="#10B981"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Data Point Dots */}
              <circle cx="310" cy="25" r="4" fill="#10B981" className="animate-pulse" />
            </svg>
            <div className="mt-2 flex justify-between text-[10px] font-semibold text-slate-400">
              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
              <span>May</span>
              <span>Jun</span>
              <span>Jul</span>
              <span>Aug</span>
              <span>Sep</span>
            </div>
          </div>
        </div>

        {/* Top Categories (3 cols) */}
        <div className="lg:col-span-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                🥧
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Top Categories</h3>
            </div>
            <Link
              to={ROUTES.categories}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              View All →
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>Electronics</span>
                <span>40%</span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: "40%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>Apparel</span>
                <span>20%</span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full rounded-full bg-blue-500" style={{ width: "20%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>Home & Kitchen</span>
                <span>15%</span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full rounded-full bg-amber-500" style={{ width: "15%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>Footwear</span>
                <span>15%</span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full rounded-full bg-purple-500" style={{ width: "15%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>Sports & Fitness</span>
                <span>10%</span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full rounded-full bg-rose-500" style={{ width: "10%" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity (4 cols) */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                🔔
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Activity</h3>
            </div>
            <Link
              to={ROUTES.orders}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              View All →
            </Link>
          </div>

          <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800 space-y-2">
            {RECENT_ACTIVITIES.map((act) => (
              <div key={act.id} className="pt-2 flex items-start gap-3">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${act.color}`}>
                  {act.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {act.text}{" "}
                    <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{act.code}</span>
                  </p>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{act.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
