import { useState, useEffect, useRef, Suspense, useMemo } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { PageFallback } from "@/components/common/PageFallback";
import { useDisclosure } from "@/hooks/useDisclosure";
import { cn } from "@/utils/cn";
import { ROUTES } from "@/constants/routes";
import { getSwaggerUrl } from "@/services/api/docs";
import { Logo } from "@/components/common/Logo";
import { FSD_SEARCH_INDEX, type FsdSearchItem } from "@/features/docs/data/fsdSearchIndex";

interface SubNavItem {
  label: string;
  hash: string;
}

interface NavItem {
  label: string;
  hash: string;
  icon?: string;
  count?: number;
  subItems?: SubNavItem[];
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

export default function DocumentationLayout() {
  const location = useLocation();
  const isApiDoc = location.pathname.includes("/help/api");
  const drawer = useDisclosure();
  const swaggerUrl = getSwaggerUrl();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    "#system-overview": true,
    "#architecture": true,
    "#core-features": false,
    "#user-roles": false,
    "#authentication": false,
    "#products-categories": false,
    "#cart-checkout-orders": false,
    "#payments": false,
    "#shipping-couriers": false,
    "#campaigns": false,
    "#notifications-email": false,
    "#reports": false,
    "#analytics-projections": false,
    "#database": false,
    "#api-docs": false,
    "#frontend-architecture": false,
    "#environment-config": false,
    "#deployment": false,
  });

  const [activeHash, setActiveHash] = useState<string>("#introduction");
  const [activeSectionTitle, setActiveSectionTitle] = useState<string>("Introduction");

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedSearchIdx, setSelectedSearchIdx] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        (e.key === "/" || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) &&
        document.activeElement !== searchInputRef.current &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      } else if (e.key === "Escape") {
        setIsSearchOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchResults: FsdSearchItem[] = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return FSD_SEARCH_INDEX.filter((item) => {
      return (
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.toLowerCase().includes(q))
      );
    }).slice(0, 8);
  }, [searchQuery]);

  useEffect(() => {
    if (isApiDoc) return;
    const sectionIds = [
      "introduction",
      "system-overview",
      "architecture",
      "tech-stack",
      "core-features",
      "user-roles",
      "authentication",
      "products-categories",
      "cart-checkout-orders",
      "payments",
      "shipping-couriers",
      "wishlist",
      "campaigns",
      "notifications-email",
      "reports",
      "analytics-projections",
      "database",
      "api-docs",
      "frontend-architecture",
      "security",
      "environment-config",
      "deployment",
      "troubleshooting",
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            const hash = `#${id}`;
            setActiveHash(hash);
            const heading = entry.target.querySelector("h2");
            if (heading?.textContent) {
              setActiveSectionTitle(heading.textContent.trim());
            }
          }
        });
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 },
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [isApiDoc, location.pathname]);

  const toggleSubnav = (hash: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedSections((prev) => ({
      ...prev,
      [hash]: !prev[hash],
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSearchResultClick = (targetId: string) => {
    setIsSearchOpen(false);
    setSearchQuery("");
    drawer.close();
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const apiNavSections: NavGroup[] = [
    {
      group: "Getting Started",
      items: [
        { label: "Overview", hash: "#overview", icon: "◉" },
        { label: "Quick Start", hash: "#getting-started", icon: "⚡" },
        { label: "Authentication & JWT", hash: "#authentication", icon: "🔑" },
        { label: "Roles & Permissions", hash: "#roles-permissions", icon: "👥" },
        { label: "API Error Handling", hash: "#error-handling", icon: "🛡" },
        { label: "Interactive Swagger", hash: "#interactive-swagger", icon: "⚡" },
      ],
    },
    {
      group: "API Resources (18 Modules)",
      items: [
        { label: "Authentication", hash: "#module-authentication", count: 6, icon: "🔑" },
        { label: "Users", hash: "#module-users", count: 6, icon: "👤" },
        { label: "Products", hash: "#module-products", count: 5, icon: "📦" },
        { label: "Categories", hash: "#module-categories", count: 5, icon: "🏷" },
        { label: "Orders", hash: "#module-orders", count: 8, icon: "🛒" },
        { label: "Payments", hash: "#module-payments", count: 7, icon: "💳" },
        { label: "Receipts", hash: "#module-receipts", count: 3, icon: "🧾" },
        { label: "Shipments", hash: "#module-shipments", count: 6, icon: "🚚" },
        { label: "Addresses", hash: "#module-addresses", count: 4, icon: "📍" },
        { label: "Campaigns", hash: "#module-campaigns", count: 6, icon: "🎉" },
        { label: "Couriers", hash: "#module-couriers", count: 6, icon: "🚛" },
        { label: "Analytics", hash: "#module-analytics", count: 2, icon: "📈" },
        { label: "Reports", hash: "#module-reports", count: 2, icon: "📊" },
        { label: "Dashboard", hash: "#module-dashboard", count: 1, icon: "📱" },
        { label: "Customer Statistics", hash: "#module-customer-statistics", count: 1, icon: "🎯" },
        { label: "Communications", hash: "#module-communications", count: 3, icon: "✉" },
        { label: "Wishlist", hash: "#module-wishlist", count: 3, icon: "♡" },
        { label: "System", hash: "#module-system", count: 2, icon: "⚙" },
      ],
    },
  ];

  const fsdNavSections: NavGroup[] = [
    {
      group: "Overview",
      items: [
        { label: "Introduction", hash: "#introduction", icon: "◉" },
        {
          label: "System Overview",
          hash: "#system-overview",
          icon: "☰",
          subItems: [
            { label: "Two Portals, One Identity System", hash: "#system-overview-two-portals-one-identity-system" },
          ],
        },
        {
          label: "System Architecture",
          hash: "#architecture",
          icon: "⊞",
          subItems: [
            { label: "High-level request flow", hash: "#architecture-high-level-request-flow" },
            { label: "External integration touchpoints", hash: "#architecture-external-integration-touchpoints" },
            { label: "Backend module layout", hash: "#architecture-backend-module-layout" },
            { label: "External integrations", hash: "#architecture-external-integrations" },
          ],
        },
        { label: "Technology Stack", hash: "#tech-stack", icon: "⚙" },
        {
          label: "Core Features",
          hash: "#core-features",
          icon: "★",
          subItems: [
            { label: "Customer Experience", hash: "#core-features-customer-experience" },
            { label: "Operations Management", hash: "#core-features-operations-management" },
            { label: "Communications, Analytics & Marketing", hash: "#core-features-communications-analytics-marketing" },
          ],
        },
      ],
    },
    {
      group: "Access & Identity",
      items: [
        {
          label: "User Roles & Permissions",
          hash: "#user-roles",
          icon: "👥",
          subItems: [
            { label: "Permission matrix", hash: "#user-roles-permission-matrix-verified-against" },
          ],
        },
        {
          label: "Authentication & Authorization",
          hash: "#authentication",
          icon: "🔑",
          subItems: [
            { label: "Three ways to obtain an account", hash: "#authentication-three-ways-to-obtain-an-account" },
            { label: "Endpoints", hash: "#authentication-endpoints" },
          ],
        },
      ],
    },
    {
      group: "Commerce",
      items: [
        {
          label: "Product & Category Management",
          hash: "#products-categories",
          icon: "📦",
          subItems: [
            { label: "Read endpoints (public)", hash: "#products-categories-read-endpoints-public" },
            { label: "Write endpoints (Admin / Manager)", hash: "#products-categories-write-endpoints-admin-manager" },
          ],
        },
        {
          label: "Cart, Checkout & Order Management",
          hash: "#cart-checkout-orders",
          icon: "🛒",
          subItems: [
            { label: "Order creation sequence", hash: "#cart-checkout-orders-order-creation-sequence" },
            { label: "Order status workflow", hash: "#cart-checkout-orders-order-status-workflow-forward-only" },
            { label: "Key endpoints", hash: "#cart-checkout-orders-key-endpoints" },
          ],
        },
        {
          label: "Payment System",
          hash: "#payments",
          icon: "💳",
          subItems: [
            { label: "RazorPay integration (2-step)", hash: "#payments-razorpay-integration-2-step" },
            { label: "RazorPay checkout sequence", hash: "#payments-razorpay-checkout-sequence" },
            { label: "Endpoints", hash: "#payments-endpoints" },
          ],
        },
        {
          label: "Shipping, Courier Registry & Tracking",
          hash: "#shipping-couriers",
          icon: "🚚",
          subItems: [
            { label: "Shipment delivery workflow", hash: "#shipping-couriers-shipment-delivery-workflow-sequential" },
            { label: "Automatic AWB tracking-number", hash: "#shipping-couriers-automatic-awb-tracking-number" },
            { label: "Live carrier tracking & sync", hash: "#shipping-couriers-live-carrier-tracking-sync" },
            { label: "External status normalization", hash: "#shipping-couriers-external-status-normalization" },
            { label: "Courier partner registry", hash: "#shipping-couriers-courier-partner-registry" },
          ],
        },
        { label: "Wishlist", hash: "#wishlist", icon: "♡" },
        {
          label: "Promotional Campaigns",
          hash: "#campaigns",
          icon: "🎉",
          subItems: [
            { label: "Pre-configured templates", hash: "#campaigns-pre-configured-templates-frontend" },
            { label: "Sending a campaign", hash: "#campaigns-sending-a-campaign" },
          ],
        },
      ],
    },
    {
      group: "Communications",
      items: [
        {
          label: "Email & Transactional Notifications",
          hash: "#notifications-email",
          icon: "✉",
          subItems: [
            { label: "Automated lifecycle emails", hash: "#notifications-email-automated-lifecycle-emails" },
            { label: "Diagnostics & manual send", hash: "#notifications-email-diagnostics-manual-send" },
          ],
        },
      ],
    },
    {
      group: "Intelligence",
      items: [
        {
          label: "Reports & Analytics",
          hash: "#reports",
          icon: "📊",
          subItems: [
            { label: "Period sales reports", hash: "#reports-period-sales-reports" },
            { label: "Executive analytics summary", hash: "#reports-executive-analytics-summary" },
            { label: "Frontend visualizations", hash: "#reports-frontend-visualizations" },
          ],
        },
        {
          label: "Revenue Projections & AI Forecasting",
          hash: "#analytics-projections",
          icon: "🧠",
          subItems: [
            { label: "Statistical model", hash: "#analytics-projections-statistical-model" },
            { label: "AI-narrated projection", hash: "#analytics-projections-ai-narrated-projection" },
            { label: "Currency compliance (strict INR)", hash: "#analytics-projections-currency-compliance-strict-inr" },
          ],
        },
      ],
    },
    {
      group: "Engineering",
      items: [
        {
          label: "Database Architecture",
          hash: "#database",
          icon: "🗃",
          subItems: [
            { label: "Tables & relationships", hash: "#database-tables-relationships" },
            { label: "Relationship diagram", hash: "#database-relationship-diagram" },
            { label: "Example schema", hash: "#database-example-schema-couriers-shipment-fk" },
          ],
        },
        {
          label: "API Documentation",
          hash: "#api-docs",
          icon: "🔌",
          subItems: [
            { label: "Health", hash: "#api-docs-health" },
            { label: "Auth — /api/auth", hash: "#api-docs-auth-api-auth" },
            { label: "Users — /api/users", hash: "#api-docs-users-api-users" },
            { label: "Products & Categories", hash: "#api-docs-products-api-products-categories-api" },
            { label: "Orders & Payments & Receipts", hash: "#api-docs-orders-api-orders-payments-api-payments" },
            { label: "Shipments & Couriers", hash: "#api-docs-shipments-api-shipments-couriers-api" },
            { label: "Dashboard", hash: "#api-docs-dashboard-api-dashboard" },
            { label: "Customer Stats", hash: "#api-docs-customer-stats-api-customer-stats" },
            { label: "Addresses", hash: "#api-docs-addresses-api-addresses" },
            { label: "Wishlist, Campaigns, Communications", hash: "#api-docs-wishlist-api-wishlist-campaigns-api" },
            { label: "Reports & Analytics", hash: "#api-docs-reports-api-reports-analytics-api" },
            { label: "Standard error shape", hash: "#api-docs-standard-error-shape" },
          ],
        },
        {
          label: "Frontend Architecture",
          hash: "#frontend-architecture",
          icon: "💻",
          subItems: [
            { label: "Two portals, one router", hash: "#frontend-architecture-two-portals-one-router" },
            { label: "Project structure", hash: "#frontend-architecture-project-structure" },
          ],
        },
        { label: "Security", hash: "#security", icon: "🛡" },
      ],
    },
    {
      group: "Operations",
      items: [
        {
          label: "Environment Configuration",
          hash: "#environment-config",
          icon: "✎",
          subItems: [
            { label: "Backend (.env)", hash: "#environment-config-backend-env" },
            { label: "Frontend (.env)", hash: "#environment-config-frontend-env" },
          ],
        },
        {
          label: "Deployment",
          hash: "#deployment",
          icon: "☁",
          subItems: [
            { label: "Local development setup", hash: "#deployment-local-development-setup" },
          ],
        },
        { label: "Troubleshooting", hash: "#troubleshooting", icon: "🔧" },
      ],
    },
  ];

  const currentNav = isApiDoc ? apiNavSections : fsdNavSections;

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#0B1528] dark:bg-[#070D18] text-slate-300 border-r border-slate-800/80">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-4">
        <Link to={ROUTES.dashboard} className="flex items-center gap-3 group min-w-0">
          <Logo
            size="md"
            className="rounded-xl shadow-md shadow-blue-950/40 transition-transform duration-200 group-hover:scale-105"
          />
          {!isSidebarCollapsed && (
            <div className="flex flex-col truncate">
              <span className="text-base font-extrabold tracking-tight text-white leading-tight truncate">
                Retail Mart
              </span>
              <span className="text-[10px] font-bold tracking-widest uppercase text-blue-400 truncate">
                Technical Documentation
              </span>
            </div>
          )}
        </Link>
        <button
          type="button"
          onClick={() => setIsSidebarCollapsed((prev) => !prev)}
          className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="text-xs">{isSidebarCollapsed ? "❯" : "❮"}</span>
        </button>
      </div>

      <div className="p-3 border-b border-white/10">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/5 p-1 text-xs font-semibold">
          <NavLink
            to={ROUTES.helpFsd}
            onClick={() => drawer.close()}
            className={({ isActive }) =>
              cn(
                "flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-center transition-all",
                isActive || location.pathname === ROUTES.help
                  ? "bg-blue-600/30 text-blue-200 font-bold border border-blue-500/40 shadow-xs"
                  : "text-slate-400 hover:text-white hover:bg-white/5",
              )
            }
          >
            <span>Functional Documentation</span>
          </NavLink>
          <NavLink
            to={ROUTES.helpApi}
            onClick={() => drawer.close()}
            className={({ isActive }) =>
              cn(
                "flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-center transition-all",
                isActive
                  ? "bg-blue-600/30 text-blue-200 font-bold border border-blue-500/40 shadow-xs"
                  : "text-slate-400 hover:text-white hover:bg-white/5",
              )
            }
          >
            <span>API Documentation</span>
          </NavLink>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 no-scrollbar">
        {currentNav.map((section) => (
          <div key={section.group}>
            {!isSidebarCollapsed && (
              <p className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                {section.group}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = activeHash === item.hash;
                const isExpanded = !!expandedSections[item.hash];
                const hasSub = item.subItems && item.subItems.length > 0;

                return (
                  <li key={item.hash} className="space-y-0.5">
                    <div className="flex items-center gap-1">
                      <a
                        href={item.hash}
                        onClick={() => {
                          setActiveHash(item.hash);
                          drawer.close();
                        }}
                        className={cn(
                          "group flex flex-1 items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all truncate",
                          isActive
                            ? "bg-blue-600/25 text-white font-bold border-l-2 border-blue-500"
                            : "text-slate-300 hover:bg-white/5 hover:text-white",
                        )}
                        title={item.label}
                      >
                        {item.icon && (
                          <span className="shrink-0 text-slate-400 group-hover:text-blue-300 text-xs">
                            {item.icon}
                          </span>
                        )}
                        {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                        {item.count !== undefined && !isSidebarCollapsed && (
                          <span className="ml-auto rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-400">
                            {item.count}
                          </span>
                        )}
                      </a>

                      {hasSub && !isSidebarCollapsed && (
                        <button
                          type="button"
                          onClick={(e) => toggleSubnav(item.hash, e)}
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-white/10 hover:text-white"
                          title="Toggle subsections"
                          aria-label="Toggle subsections"
                          aria-expanded={isExpanded}
                        >
                          <span className={cn("text-xs transition-transform duration-150 inline-block", isExpanded && "rotate-90")}>
                            ›
                          </span>
                        </button>
                      )}
                    </div>

                    {hasSub && isExpanded && !isSidebarCollapsed && (
                      <ul className="ml-5 pl-2.5 border-l border-white/10 space-y-0.5 my-1">
                        {item.subItems!.map((sub) => (
                          <li key={sub.hash}>
                            <a
                              href={sub.hash}
                              onClick={() => drawer.close()}
                              className="block py-1 px-1.5 text-[11px] text-slate-400 hover:text-blue-300 hover:bg-white/5 rounded transition-colors truncate"
                            >
                              {sub.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="shrink-0 border-t border-white/10 p-3 space-y-2">
        <a
          href={swaggerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-300 hover:bg-blue-500/20 transition-all shadow-xs"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">⚡</span>
            {!isSidebarCollapsed && <span>Open Swagger UI</span>}
          </div>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>

        {!isSidebarCollapsed && (
          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
            <Link to={ROUTES.dashboard} className="hover:text-slate-200 transition-colors">
              ← Admin Console
            </Link>
            <span className="text-[10px] text-slate-500">v1.0 · Sep 2026</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F8FD] dark:bg-[#070D18] text-slate-900 dark:text-slate-100 transition-colors print:bg-white print:text-black">
      <style>{`
        @media print {
          aside, header, .print-hide, .btn-top, button, nav, #topbar {
            display: none !important;
          }
          main {
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            height: auto !important;
          }
          body, html {
            background: #ffffff !important;
            color: #000000 !important;
            height: auto !important;
            overflow: visible !important;
          }
        }
      `}</style>

      <aside className={cn(
        "hidden lg:block shrink-0 h-full transition-all duration-200 print:hidden",
        isSidebarCollapsed ? "w-16" : "w-72"
      )}>
        {sidebarContent}
      </aside>

      {drawer.isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex print:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={drawer.close}
          />
          <div className="relative w-72 max-w-[80vw] h-full shadow-2xl z-10 animate-fade-in">
            {sidebarContent}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col h-full overflow-hidden">
        <header id="topbar" className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/90 bg-white/95 px-4 shadow-xs backdrop-blur-md dark:border-slate-800/90 dark:bg-[#0B1528]/95 sm:px-6 print:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={drawer.open}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-700 shadow-xs lg:hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              aria-label="Toggle Documentation Navigation"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 px-3 py-1.5 shadow-2xs">
              <Logo size="xs" className="rounded-lg" />
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Retail Mart
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {isApiDoc ? "API Documentation" : "Functional Documentation"}
                </span>
              </div>
            </div>

            {!isApiDoc && activeSectionTitle && (
              <div className="hidden md:flex items-center gap-1.5 rounded-full border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/40 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="truncate max-w-[160px]">{activeSectionTitle}</span>
              </div>
            )}
          </div>

          <div ref={searchContainerRef} className="relative hidden sm:block w-72 md:w-80 lg:w-96">
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-3 text-slate-400">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                  setSelectedSearchIdx(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSelectedSearchIdx((prev) => Math.min(searchResults.length - 1, prev + 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSelectedSearchIdx((prev) => Math.max(0, prev - 1));
                  } else if (e.key === "Enter" && searchResults[selectedSearchIdx]) {
                    handleSearchResultClick(searchResults[selectedSearchIdx].id);
                  }
                }}
                placeholder="Search documentation..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-900/70 py-1.5 pl-8 pr-12 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-colors"
              />
              <kbd className="pointer-events-none absolute right-2.5 rounded bg-slate-200/80 dark:bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
                /
              </kbd>
            </div>

            {isSearchOpen && searchQuery.trim() && (
              <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden z-50 animate-fade-in max-h-96 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                    No matching sections for &ldquo;{searchQuery}&rdquo;
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {searchResults.map((item, idx) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSearchResultClick(item.id)}
                        className={cn(
                          "w-full text-left p-3 text-xs transition-colors flex flex-col gap-1",
                          idx === selectedSearchIdx
                            ? "bg-blue-50 dark:bg-blue-950/50"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/50",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-700 dark:text-blue-300">
                            {item.number}. {item.title}
                          </span>
                          <span className="text-[10px] uppercase font-semibold text-slate-400">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {item.content}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <a
              href={swaggerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-blue-600/30 bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all shadow-xs"
              title="Open Interactive Swagger UI in a new tab"
            >
              <span>Swagger UI</span>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>

            <button
              type="button"
              onClick={handlePrint}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs"
              title="Print documentation"
              aria-label="Print documentation"
            >
              <span className="text-sm">🖶</span>
            </button>

            <ThemeToggle variant="icon" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl animate-page-entrance">
            <Suspense fallback={<PageFallback />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
