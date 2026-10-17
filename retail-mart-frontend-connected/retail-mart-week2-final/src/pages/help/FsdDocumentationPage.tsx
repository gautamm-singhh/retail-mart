import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { getSwaggerUrl } from "@/services/api/docs";
import { FSD_CARD_DETAILS, type FsdCardDetail } from "@/features/docs/data/fsdCardDetails";
import { Logo } from "@/components/common/Logo";
import { DocumentationAmbientBackground } from "@/features/docs/components/DocumentationAmbientBackground";
import { DocumentationHeroAtmosphere } from "@/features/docs/components/DocumentationHeroAtmosphere";
import { useScrollReveal } from "@/features/docs/hooks/useScrollReveal";
import "./officialDocs.css";

export default function FsdDocumentationPage() {
  const swaggerUrl = getSwaggerUrl();
  useScrollReveal();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("introduction");
  const [indicatorText, setIndicatorText] = useState("Introduction");
  const [showTopBtn, setShowTopBtn] = useState(false);
  
  const [theme, setTheme] = useState<string>(() => {
    try {
      return localStorage.getItem("rm-doc-theme") || (document.documentElement.getAttribute("data-theme") || "dark");
    } catch {
      return "dark";
    }
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; title: string; snippet: string }>>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [activeCardKey, setActiveCardKey] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    try {
      localStorage.setItem("rm-doc-theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  useEffect(() => {
    const handleScroll = () => {
      setShowTopBtn(window.scrollY > 480);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "/" || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) &&
        document.activeElement !== searchInputRef.current &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape") {
        setIsSearchOpen(false);
        setActiveCardKey(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const sections = Array.from(document.querySelectorAll<HTMLElement>("main .section"));
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            setActiveSection(id);
            const heading = entry.target.querySelector("h2");
            if (heading?.textContent) {
              setIndicatorText(heading.textContent.trim());
            }
          }
        });
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 }
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const subnavLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>(".subnav-link"));
    const subTargets = subnavLinks
      .map((l) => document.getElementById(l.getAttribute("data-target") || ""))
      .filter(Boolean) as HTMLElement[];

    if (!subTargets.length) return;

    const subObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            const match = subnavLinks.find((l) => l.getAttribute("data-target") === id);
            if (match) {
              const navItem = match.closest(".nav-item");
              if (navItem) {
                navItem.classList.add("expanded");
              }
            }
          }
        });
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 }
    );

    subTargets.forEach((t) => subObserver.observe(t));
    return () => subObserver.disconnect();
  }, []);

  useEffect(() => {
    document.querySelectorAll(".nav-link").forEach((l) => {
      if (l.getAttribute("data-target") === activeSection) {
        l.classList.add("active");
      } else {
        l.classList.remove("active");
      }
    });
  }, [activeSection]);

  useEffect(() => {
    const handleToggle = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      const btn = e.currentTarget as HTMLElement;
      const item = btn.closest(".nav-item");
      if (item) {
        const isExp = item.classList.toggle("expanded");
        btn.setAttribute("aria-expanded", String(isExp));
      }
    };

    const buttons = document.querySelectorAll(".nav-toggle");
    buttons.forEach((b) => b.addEventListener("click", handleToggle));
    return () => buttons.forEach((b) => b.removeEventListener("click", handleToggle));
  }, []);

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    const q = value.trim().toLowerCase();
    if (!q) {
      setSearchResults([]);
      setIsSearchOpen(false);
      return;
    }

    const sections = Array.from(document.querySelectorAll<HTMLElement>("main .section"));
    const matches: Array<{ id: string; title: string; snippet: string }> = [];

    for (const sec of sections) {
      const titleEl = sec.querySelector("h2");
      const title = titleEl ? titleEl.textContent?.trim() || sec.id : sec.id;
      const text = sec.textContent?.replace(/\s+/g, " ").trim() || "";
      const lower = text.toLowerCase();
      const idx = lower.indexOf(q);

      if (idx !== -1 || title.toLowerCase().includes(q)) {
        const snippetStart = Math.max(0, idx - 40);
        const snippet = text.substring(snippetStart, snippetStart + 120).trim();
        matches.push({ id: sec.id, title, snippet });
        if (matches.length >= 8) break;
      }
    }

    setSearchResults(matches);
    setIsSearchOpen(true);
  };

  const handleSearchResultClick = (targetId: string) => {
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setIsSearchOpen(false);
    setSearchQuery("");
    setIsMobileOpen(false);
  };

  const openCard = (key: string) => {
    setActiveCardKey(key);
  };

  const handleCopyBlock = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const btn = e.currentTarget;
    const pre = btn.closest("pre");
    const text = pre ? pre.textContent?.replace("Copy", "").trim() || "" : "";
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        const orig = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(() => {
          btn.textContent = orig;
        }, 1400);
      });
    }
  };

  const activeModalData: FsdCardDetail | null = activeCardKey ? FSD_CARD_DETAILS[activeCardKey] || null : null;

  return (
    <div className="official-docs-shell" data-theme={theme}>
      <DocumentationAmbientBackground />

      <div
        className={`sidebar-scrim ${isMobileOpen ? "open" : ""}`}
        id="scrim"
        onClick={() => setIsMobileOpen(false)}
      />

      <div className="app-shell">
        <aside
          className={`sidebar ${isCollapsed ? "collapsed" : ""} ${isMobileOpen ? "mobile-open" : ""}`}
          id="sidebar"
        >
          <div className="sidebar-brand">
            <div className="logo" style={{ background: "transparent", boxShadow: "none", overflow: "hidden" }}>
              <Logo size="md" className="h-full w-full object-contain rounded-[10px]" />
            </div>
            <div className="brand-badge">
              <div className="brand-text">
                <strong>Retail Mart</strong>
                <span>Technical Documentation</span>
              </div>
            </div>
            <button
              aria-label="Collapse sidebar"
              className="sidebar-collapse-btn"
              id="collapseBtn"
              type="button"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => setIsCollapsed((prev) => !prev)}
            >
              {isCollapsed ? "❯" : "❮"}
            </button>
          </div>

          <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--sidebar-border)" }}>
            <div style={{ display: "flex", gap: "6px" }}>
              <Link
                to={ROUTES.helpFsd}
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "5px 4px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: "700",
                  background: "var(--sidebar-active-bg)",
                  color: "var(--sidebar-active-text)",
                  border: "1px solid var(--accent)",
                }}
              >
                Functional Documentation
              </Link>
              <Link
                to={ROUTES.helpApi}
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "5px 4px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: "600",
                  background: "var(--sidebar-bg2)",
                  color: "var(--sidebar-text-muted)",
                  border: "1px solid var(--sidebar-border)",
                }}
              >
                API Documentation →
              </Link>
            </div>
          </div>

          <nav aria-label="Documentation navigation" className="sidebar-nav" id="sidebarNav">

<div className="nav-group-title">Overview</div>
<a className="nav-link" data-target="introduction" href="#introduction"><span className="ic">◉</span><span className="lbl">Introduction</span></a>
<div className="nav-item"><div className="nav-link-row"><a className="nav-link" data-target="system-overview" href="#system-overview"><span className="ic">☰</span><span className="lbl">System Overview</span></a><button aria-expanded="false" aria-label="Toggle subsections" className="nav-toggle" type="button"><span className="chev">›</span></button></div><div className="subnav"><a className="subnav-link" data-target="system-overview-two-portals-one-identity-system" href="#system-overview-two-portals-one-identity-system">Two Portals, One Identity System</a></div></div>
<div className="nav-item"><div className="nav-link-row"><a className="nav-link" data-target="architecture" href="#architecture"><span className="ic">⊞</span><span className="lbl">Architecture</span></a><button aria-expanded="false" aria-label="Toggle subsections" className="nav-toggle" type="button"><span className="chev">›</span></button></div><div className="subnav"><a className="subnav-link" data-target="architecture-high-level-request-flow" href="#architecture-high-level-request-flow">High-level request flow</a><a className="subnav-link" data-target="architecture-external-integration-touchpoints" href="#architecture-external-integration-touchpoints">External integration touchpoints</a><a className="subnav-link" data-target="architecture-backend-module-layout" href="#architecture-backend-module-layout">Backend module layout</a><a className="subnav-link" data-target="architecture-external-integrations" href="#architecture-external-integrations">External integrations</a><a className="subnav-link" href="/docs/flow-diagram.html" target="_blank" rel="noopener noreferrer" aria-label="Open End-to-End Workflow Diagram in a new tab" style={{ display: "flex", alignItems: "center", gap: "4px" }}>End-to-End Workflow Diagram <span style={{ fontSize: "10px", opacity: 0.75 }}>↗</span></a></div></div>
<a className="nav-link" data-target="tech-stack" href="#tech-stack"><span className="ic">⚙</span><span className="lbl">Technology Stack</span></a>
<div className="nav-item"><div className="nav-link-row"><a className="nav-link" data-target="core-features" href="#core-features"><span className="ic">★</span><span className="lbl">Core Features</span></a><button aria-expanded="false" aria-label="Toggle subsections" className="nav-toggle" type="button"><span className="chev">›</span></button></div><div className="subnav"><a className="subnav-link" data-target="core-features-customer-experience" href="#core-features-customer-experience">Customer Experience</a><a className="subnav-link" data-target="core-features-operations-management" href="#core-features-operations-management">Operations Management</a><a className="subnav-link" data-target="core-features-communications-analytics-marketing" href="#core-features-communications-analytics-marketing">Communications, Analytics &amp; Marketing</a></div></div>
<div className="nav-group-title">Access &amp; Identity</div>
<div className="nav-item"><div className="nav-link-row"><a className="nav-link" data-target="user-roles" href="#user-roles"><span className="ic">👥</span><span className="lbl">User Roles &amp; Permissions</span></a><button aria-expanded="false" aria-label="Toggle subsections" className="nav-toggle" type="button"><span className="chev">›</span></button></div><div className="subnav"><a className="subnav-link" data-target="user-roles-permission-matrix-verified-against" href="#user-roles-permission-matrix-verified-against">Permission matrix (verified against@roles_requiredguards)</a></div></div>
<div className="nav-item"><div className="nav-link-row"><a className="nav-link" data-target="authentication" href="#authentication"><span className="ic">🔑</span><span className="lbl">Authentication</span></a><button aria-expanded="false" aria-label="Toggle subsections" className="nav-toggle" type="button"><span className="chev">›</span></button></div><div className="subnav"><a className="subnav-link" data-target="authentication-three-ways-to-obtain-an-account" href="#authentication-three-ways-to-obtain-an-account">Three ways to obtain an account</a><a className="subnav-link" data-target="authentication-endpoints" href="#authentication-endpoints">Endpoints</a></div></div>
<div className="nav-group-title">Commerce</div>
<div className="nav-item"><div className="nav-link-row"><a className="nav-link" data-target="products-categories" href="#products-categories"><span className="ic">📦</span><span className="lbl">Products &amp; Categories</span></a><button aria-expanded="false" aria-label="Toggle subsections" className="nav-toggle" type="button"><span className="chev">›</span></button></div><div className="subnav"><a className="subnav-link" data-target="products-categories-read-endpoints-public" href="#products-categories-read-endpoints-public">Read endpoints (public)</a><a className="subnav-link" data-target="products-categories-write-endpoints-admin-manager" href="#products-categories-write-endpoints-admin-manager">Write endpoints (Admin / Manager)</a></div></div>
<div className="nav-item"><div className="nav-link-row"><a className="nav-link" data-target="cart-checkout-orders" href="#cart-checkout-orders"><span className="ic">🛒</span><span className="lbl">Cart, Checkout &amp; Orders</span></a><button aria-expanded="false" aria-label="Toggle subsections" className="nav-toggle" type="button"><span className="chev">›</span></button></div><div className="subnav"><a className="subnav-link" data-target="cart-checkout-orders-order-creation-sequence" href="#cart-checkout-orders-order-creation-sequence">Order creation sequence</a><a className="subnav-link" data-target="cart-checkout-orders-order-status-workflow-forward-only" href="#cart-checkout-orders-order-status-workflow-forward-only">Order status workflow (forward-only, server-enforced)</a><a className="subnav-link" data-target="cart-checkout-orders-key-endpoints" href="#cart-checkout-orders-key-endpoints">Key endpoints</a></div></div>
<div className="nav-item"><div className="nav-link-row"><a className="nav-link" data-target="payments" href="#payments"><span className="ic">💳</span><span className="lbl">Payments</span></a><button aria-expanded="false" aria-label="Toggle subsections" className="nav-toggle" type="button"><span className="chev">›</span></button></div><div className="subnav"><a className="subnav-link" data-target="payments-razorpay-integration-2-step" href="#payments-razorpay-integration-2-step">RazorPay integration (2-step)</a><a className="subnav-link" data-target="payments-razorpay-checkout-sequence" href="#payments-razorpay-checkout-sequence">RazorPay checkout sequence</a><a className="subnav-link" data-target="payments-endpoints" href="#payments-endpoints">Endpoints</a></div></div>
<div className="nav-item"><div className="nav-link-row"><a className="nav-link" data-target="shipping-couriers" href="#shipping-couriers"><span className="ic">🚚</span><span className="lbl">Shipping &amp; Couriers</span></a><button aria-expanded="false" aria-label="Toggle subsections" className="nav-toggle" type="button"><span className="chev">›</span></button></div><div className="subnav"><a className="subnav-link" data-target="shipping-couriers-shipment-delivery-workflow-sequential" href="#shipping-couriers-shipment-delivery-workflow-sequential">Shipment delivery workflow (sequential, server-enforced)</a><a className="subnav-link" data-target="shipping-couriers-automatic-awb-tracking-number" href="#shipping-couriers-automatic-awb-tracking-number">Automatic AWB tracking-number generation</a><a className="subnav-link" data-target="shipping-couriers-live-carrier-tracking-sync" href="#shipping-couriers-live-carrier-tracking-sync">Live carrier tracking &amp; sync</a><a className="subnav-link" data-target="shipping-couriers-external-status-normalization" href="#shipping-couriers-external-status-normalization">External status normalization</a><a className="subnav-link" data-target="shipping-couriers-courier-partner-registry" href="#shipping-couriers-courier-partner-registry">Courier partner registry</a></div></div>
<a className="nav-link" data-target="wishlist" href="#wishlist"><span className="ic">♡</span><span className="lbl">Wishlist</span></a>
<div className="nav-item"><div className="nav-link-row"><a className="nav-link" data-target="campaigns" href="#campaigns"><span className="ic">🎉</span><span className="lbl">Campaigns</span></a><button aria-expanded="false" aria-label="Toggle subsections" className="nav-toggle" type="button"><span className="chev">›</span></button></div><div className="subnav"><a className="subnav-link" data-target="campaigns-pre-configured-templates-frontend" href="#campaigns-pre-configured-templates-frontend">Pre-configured templates (frontend:CampaignForm.tsx)</a><a className="subnav-link" data-target="campaigns-sending-a-campaign" href="#campaigns-sending-a-campaign">Sending a campaign</a></div></div>
<div className="nav-group-title">Communications</div>
<div className="nav-item"><div className="nav-link-row"><a className="nav-link" data-target="notifications-email" href="#notifications-email"><span className="ic">✉</span><span className="lbl">Email / Notifications</span></a><button aria-expanded="false" aria-label="Toggle subsections" className="nav-toggle" type="button"><span className="chev">›</span></button></div><div className="subnav"><a className="subnav-link" data-target="notifications-email-automated-lifecycle-emails" href="#notifications-email-automated-lifecycle-emails">Automated lifecycle emails</a><a className="subnav-link" data-target="notifications-email-diagnostics-manual-send" href="#notifications-email-diagnostics-manual-send">Diagnostics &amp; manual send</a></div></div>
<div className="nav-group-title">Intelligence</div>
<div className="nav-item"><div className="nav-link-row"><a className="nav-link" data-target="reports" href="#reports"><span className="ic">📊</span><span className="lbl">Reports &amp; Analytics</span></a><button aria-expanded="false" aria-label="Toggle subsections" className="nav-toggle" type="button"><span className="chev">›</span></button></div><div className="subnav"><a className="subnav-link" data-target="reports-period-sales-reports" href="#reports-period-sales-reports">Period sales reports</a><a className="subnav-link" data-target="reports-executive-analytics-summary" href="#reports-executive-analytics-summary">Executive analytics summary</a><a className="subnav-link" data-target="reports-frontend-visualizations" href="#reports-frontend-visualizations">Frontend visualizations</a></div></div>
<div className="nav-item"><div className="nav-link-row"><a className="nav-link" data-target="analytics-projections" href="#analytics-projections"><span className="ic">🧠</span><span className="lbl">AI Revenue Projections</span></a><button aria-expanded="false" aria-label="Toggle subsections" className="nav-toggle" type="button"><span className="chev">›</span></button></div><div className="subnav"><a className="subnav-link" data-target="analytics-projections-statistical-model" href="#analytics-projections-statistical-model">Statistical model</a><a className="subnav-link" data-target="analytics-projections-ai-narrated-projection" href="#analytics-projections-ai-narrated-projection">AI-narrated projection</a><a className="subnav-link" data-target="analytics-projections-currency-compliance-strict-inr" href="#analytics-projections-currency-compliance-strict-inr">Currency compliance (strict INR)</a></div></div>
<div className="nav-group-title">Engineering</div>
<div className="nav-item"><div className="nav-link-row"><a className="nav-link" data-target="database" href="#database"><span className="ic">🗃</span><span className="lbl">Database</span></a><button aria-expanded="false" aria-label="Toggle subsections" className="nav-toggle" type="button"><span className="chev">›</span></button></div><div className="subnav"><a className="subnav-link" data-target="database-tables-relationships" href="#database-tables-relationships">Tables &amp; relationships</a><a className="subnav-link" data-target="database-relationship-diagram" href="#database-relationship-diagram">Relationship diagram</a><a className="subnav-link" data-target="database-example-schema-couriers-shipment-fk" href="#database-example-schema-couriers-shipment-fk">Example schema (couriers &amp; shipment FK)</a></div></div>
<div className="nav-item"><div className="nav-link-row"><a className="nav-link" data-target="api-docs" href="#api-docs"><span className="ic">🔌</span><span className="lbl">API Documentation</span></a><button aria-expanded="false" aria-label="Toggle subsections" className="nav-toggle" type="button"><span className="chev">›</span></button></div><div className="subnav"><a className="subnav-link" data-target="api-docs-health" href="#api-docs-health">Health</a><a className="subnav-link" data-target="api-docs-auth-api-auth" href="#api-docs-auth-api-auth">Auth —/api/auth</a><a className="subnav-link" data-target="api-docs-users-api-users" href="#api-docs-users-api-users">Users —/api/users</a><a className="subnav-link" data-target="api-docs-products-api-products-categories-api" href="#api-docs-products-api-products-categories-api">Products —/api/products&amp; Categories —/api/categories</a><a className="subnav-link" data-target="api-docs-orders-api-orders-payments-api-payments" href="#api-docs-orders-api-orders-payments-api-payments">Orders —/api/orders&amp; Payments —/api/payments&amp; Receipts —/api/receipts</a><a className="subnav-link" data-target="api-docs-shipments-api-shipments-couriers-api" href="#api-docs-shipments-api-shipments-couriers-api">Shipments —/api/shipments&amp; Couriers —/api/couriers</a><a className="subnav-link" data-target="api-docs-dashboard-api-dashboard" href="#api-docs-dashboard-api-dashboard">Dashboard —/api/dashboard</a><a className="subnav-link" data-target="api-docs-customer-stats-api-customer-stats" href="#api-docs-customer-stats-api-customer-stats">Customer Stats —/api/customer/stats</a><a className="subnav-link" data-target="api-docs-addresses-api-addresses" href="#api-docs-addresses-api-addresses">Addresses —/api/addresses</a><a className="subnav-link" data-target="api-docs-wishlist-api-wishlist-campaigns-api" href="#api-docs-wishlist-api-wishlist-campaigns-api">Wishlist —/api/wishlist, Campaigns —/api/campaigns, Communications —/api/communications</a><a className="subnav-link" data-target="api-docs-reports-api-reports-analytics-api" href="#api-docs-reports-api-reports-analytics-api">Reports —/api/reports&amp; Analytics —/api/analytics</a><a className="subnav-link" data-target="api-docs-standard-error-shape" href="#api-docs-standard-error-shape">Standard error shape</a></div></div>
<div className="nav-item"><div className="nav-link-row"><a className="nav-link" data-target="frontend-architecture" href="#frontend-architecture"><span className="ic">💻</span><span className="lbl">Frontend Architecture</span></a><button aria-expanded="false" aria-label="Toggle subsections" className="nav-toggle" type="button"><span className="chev">›</span></button></div><div className="subnav"><a className="subnav-link" data-target="frontend-architecture-two-portals-one-router" href="#frontend-architecture-two-portals-one-router">Two portals, one router</a><a className="subnav-link" data-target="frontend-architecture-project-structure" href="#frontend-architecture-project-structure">Project structure</a></div></div>
<a className="nav-link" data-target="security" href="#security"><span className="ic">🛡</span><span className="lbl">Security</span></a>
<div className="nav-group-title">Operations</div>
<div className="nav-item"><div className="nav-link-row"><a className="nav-link" data-target="environment-config" href="#environment-config"><span className="ic">✎</span><span className="lbl">Configuration</span></a><button aria-expanded="false" aria-label="Toggle subsections" className="nav-toggle" type="button"><span className="chev">›</span></button></div><div className="subnav"><a className="subnav-link" data-target="environment-config-backend-env" href="#environment-config-backend-env">Backend (.env)</a><a className="subnav-link" data-target="environment-config-frontend-env" href="#environment-config-frontend-env">Frontend (.env)</a></div></div>
<div className="nav-item"><div className="nav-link-row"><a className="nav-link" data-target="deployment" href="#deployment"><span className="ic">☁</span><span className="lbl">Deployment</span></a><button aria-expanded="false" aria-label="Toggle subsections" className="nav-toggle" type="button"><span className="chev">›</span></button></div><div className="subnav"><a className="subnav-link" data-target="deployment-local-development-setup" href="#deployment-local-development-setup">Local development setup</a></div></div>
<a className="nav-link" data-target="troubleshooting" href="#troubleshooting"><span className="ic">🔧</span><span className="lbl">Troubleshooting</span></a>

          </nav>

          <div className="sidebar-footer">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>v1.0 · Sep 2026</span>
              <a href={swaggerUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", fontWeight: "bold" }}>
                Swagger ⚡
              </a>
            </div>
          </div>
        </aside>

        <div className="main-col">
          <header className="topbar">
            <button
              aria-label="Open navigation"
              className="mobile-menu-btn"
              id="mobileMenuBtn"
              type="button"
              onClick={() => setIsMobileOpen(true)}
            >
              ☰
            </button>
            <div className="topbar-title-badge">
              <div className="topbar-title">
                <strong>Retail Mart</strong>
                <span>Technical Documentation</span>
              </div>
            </div>
            <div className="topbar-section-indicator" id="sectionIndicator">
              {indicatorText}
            </div>

            <div className="search-wrap">
              <span className="search-icon">🔍</span>
              <input
                ref={searchInputRef}
                autoComplete="off"
                className="search-input"
                id="searchInput"
                placeholder="Search documentation..."
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                onFocus={() => searchQuery.trim() && setIsSearchOpen(true)}
              />
              <span className="search-kbd">/</span>

              <div className={`search-results ${isSearchOpen ? "open" : ""}`} id="searchResults">
                {searchResults.length === 0 && searchQuery.trim() && (
                  <div className="search-empty">No matching sections for &ldquo;{searchQuery}&rdquo;</div>
                )}
                {searchResults.map((item) => (
                  <div
                    key={item.id}
                    className="search-result-item"
                    onClick={() => handleSearchResultClick(item.id)}
                  >
                    <span className="sr-title">{item.title}</span>
                    <span className="sr-snip">{item.snippet}&hellip;</span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              to={ROUTES.helpApi}
              className="icon-btn"
              title="View API Documentation"
              style={{ width: "auto", padding: "0 10px", fontSize: "12px", fontWeight: "700", gap: "4px" }}
            >
              API Documentation →
            </Link>

            <a
              href={swaggerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="icon-btn"
              title="Open Swagger UI"
            >
              ⚡
            </a>

            <button
              aria-label="Toggle dark mode"
              className="icon-btn"
              id="themeToggle"
              title="Toggle theme"
              type="button"
              onClick={toggleTheme}
            >
              {theme === "dark" ? "☼" : "☾"}
            </button>

            <button
              aria-label="Print documentation"
              className="icon-btn"
              id="printBtn"
              title="Print documentation"
              type="button"
              onClick={() => window.print()}
            >
              🖶
            </button>
          </header>

          <main className="content-wrap" id="contentWrap">

<svg aria-hidden="true" height="0" style={{ position: "absolute" }} width="0">
<defs>
<marker id="arrow" markerHeight="7" markerWidth="7" orient="auto-start-reverse" refX="8" refY="5" viewBox="0 0 10 10">
<path d="M0,0 L10,5 L0,10 z" style={{ fill: "var(--border2)" }}></path>
</marker>
<marker id="arrowAccent" markerHeight="7" markerWidth="7" orient="auto-start-reverse" refX="8" refY="5" viewBox="0 0 10 10">
<path d="M0,0 L10,5 L0,10 z" style={{ fill: "var(--accent)" }}></path>
</marker>
<marker id="arrowCancel" markerHeight="7" markerWidth="7" orient="auto-start-reverse" refX="8" refY="5" viewBox="0 0 10 10">
<path d="M0,0 L10,5 L0,10 z" style={{ fill: "#dc2626" }}></path>
</marker>
</defs>
</svg>
<div className="hero" id="top">
  <DocumentationHeroAtmosphere />
  <div className="hero-inner">
<span className="hero-badge">Technical Documentation</span>
<h1>Retail <em>Mart</em></h1>
<div className="hero-sub">Enterprise Retail &amp; E-Commerce Management Platform</div>
<p className="hero-desc">A full-stack retail operations system pairing a React 18 + TypeScript storefront and admin console with a Python 3.10 + Flask REST API, covering catalog management, checkout, payments, shipping and courier tracking, marketing campaigns, transactional email, executive reporting, and AI-assisted revenue forecasting.</p>

        <div className="hero-actions" style={{ display: "flex", gap: "12px", marginTop: "20px", flexWrap: "wrap" }}>
          <Link to="/help/api" className="hero-cta-btn" style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", padding: "8px 16px", borderRadius: "8px", fontWeight: "700", fontSize: "13px" }}>
            View API Documentation →
          </Link>
          <a href={swaggerUrl} target="_blank" rel="noopener noreferrer" className="hero-cta-btn swagger-link" style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", padding: "8px 16px", borderRadius: "8px", fontWeight: "700", fontSize: "13px" }}>
            Open Swagger UI <span className="swagger-arrow">⚡</span>
          </a>
        </div>

<div className="hero-meta">
<div><strong>React 18 + TypeScript + Vite</strong>Frontend</div>
<div><strong>Flask 3.0 + SQLAlchemy 2.0</strong>Backend</div>
<div><strong>MySQL 8.0</strong>Database (SQLite local fallback)</div>
<div><strong>JWT (Flask-JWT-Extended)</strong>Authentication</div>
</div>
</div>
</div>
<section className="section" id="introduction">
<div className="sec-header"><div className="sec-num">01</div><h2>Introduction</h2></div>
<p>Retail Mart is an enterprise-grade retail and e-commerce management platform that unifies a customer-facing storefront with back-office operations: order fulfillment, logistics, and executive business intelligence. A single MySQL-backed Flask REST API serves both a customer storefront and an internal operations console, sharing one JWT-based identity system across four roles.</p>
<p>This documentation is generated directly from the Retail Mart source code — every endpoint, database column, role restriction, and workflow described here reflects what is actually implemented in the <code>retail-mart-backend</code> and <code>retail-mart-frontend-connected</code> codebases.</p>
<div className="cards">
<div aria-haspopup="dialog" className="card" data-card="storefront" onClick={() => openCard("storefront")} role="button" tabIndex={0}><div className="card-icon blue">🛍</div><h4>Storefront</h4><p>Catalog browsing, cart, checkout, wishlist, order history and account dashboard for customers.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
<div aria-haspopup="dialog" className="card" data-card="ops-console" onClick={() => openCard("ops-console")} role="button" tabIndex={0}><div className="card-icon green">⚙</div><h4>Operations Console</h4><p>Admin/Manager/Staff tools for products, orders, payments, shipping, couriers and campaigns.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
<div aria-haspopup="dialog" className="card" data-card="exec-intelligence" onClick={() => openCard("exec-intelligence")} role="button" tabIndex={0}><div className="card-icon amber">📊</div><h4>Executive Intelligence</h4><p>PII-free aggregated reports, SVG charts, and statistical + AI-narrated revenue forecasts.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
</div>
</section>
<section className="section" id="system-overview">
<div className="sec-header"><div className="sec-num">02</div><h2>System Overview</h2></div>
<p>The platform is split into two independently deployed applications that communicate exclusively over a versioned JSON REST API:</p>
<div className="cards">
<div aria-haspopup="dialog" className="card" data-card="repo-frontend" onClick={() => openCard("repo-frontend")} role="button" tabIndex={0}><h4>retail-mart-frontend-connected</h4><p>React 18 + TypeScript + Vite SPA. Contains both the Operations Admin Console (<code>/dashboard</code>, <code>/products</code>, <code>/orders</code>…) and the Storefront (<code>/shop</code>, <code>/shop/cart</code>, <code>/shop/account</code>…) under one router, sharing a single AuthContext / JWT.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
<div aria-haspopup="dialog" className="card" data-card="repo-backend" onClick={() => openCard("repo-backend")} role="button" tabIndex={0}><h4>retail-mart-backend</h4><p>Flask 3.0 application factory (<code>app/__init__.py</code>) registering 17 modular blueprints under <code>/api/*</code>, backed by SQLAlchemy 2.0 models and a MySQL 8.0 database (SQLite fallback for local dev).</p><span className="card-more">View details <span className="arrow">→</span></span></div>
</div>
<h3 id="system-overview-two-portals-one-identity-system">Two Portals, One Identity System</h3>
<p>Both portals authenticate against the same <code>/api/auth/*</code> endpoints and carry the same JWT, but are gated by different role sets via <code>ProtectedRoute</code>:</p>
<ul>
<li>The <strong>Admin Console</strong> (routes below <code>/</code>) is gated to <code>Admin</code>, <code>Manager</code>, and <code>Staff</code> roles. A signed-in <code>Customer</code> visiting an admin URL is redirected to <code>/shop</code>.</li>
<li>The <strong>Storefront</strong> (<code>/shop</code> and below) is largely public for browsing; checkout, order history, account, and wishlist are gated to the <code>Customer</code> role, redirecting elsewhere to <code>/shop/login</code>.</li>
</ul>
</section>
<section className="section" id="architecture">
<div className="sec-header"><div className="sec-num">03</div><h2>System Architecture</h2></div>
<p>Requests flow from the React SPA through a REST/JSON boundary secured by JWT bearer tokens, into a Flask blueprint layer, through SQLAlchemy ORM, down to MySQL.</p>
<div style={{ display: "flex", gap: "12px", marginTop: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
  <a
    href="/docs/flow-diagram.html"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Open End-to-End Flow Diagram in a new tab"
    className="hero-cta-btn swagger-link"
    style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "var(--accent, #6366f1)", padding: "8px 16px", borderRadius: "8px", fontWeight: "700", fontSize: "13px" }}
  >
    Open End-to-End Workflow Diagram ↗
  </a>
  <a
    href={swaggerUrl}
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Open Swagger UI in a new tab"
    className="hero-cta-btn swagger-link"
    style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "var(--accent, #6366f1)", padding: "8px 16px", borderRadius: "8px", fontWeight: "700", fontSize: "13px" }}
  >
    Open Swagger UI <span className="swagger-arrow">⚡</span>
  </a>
</div>
<div className="figure" id="architecture-high-level-request-flow">
<div className="figure-title">High-level request flow</div>
<div className="diag-container">
<svg className="diagram-svg" viewBox="0 0 1080 200" xmlns="http://www.w3.org/2000/svg">
<rect className="node-accent" height="80" rx="12" width="180" x="10" y="60"></rect>
<text className="node-title" textAnchor="middle" x="100" y="93">React 18 + TS SPA</text>
<text className="node-sub" textAnchor="middle" x="100" y="110">Admin Console + Storefront</text>
<line className="edge" markerEnd="url(#arrow)" x1="190" x2="238" y1="100" y2="100"></line>
<text className="edge-label" textAnchor="middle" x="214" y="88">HTTPS</text>
<rect className="node" height="80" rx="12" width="180" x="240" y="60"></rect>
<text className="node-title" textAnchor="middle" x="330" y="93">REST / JSON</text>
<text className="node-sub" textAnchor="middle" x="330" y="110">Authorization: Bearer JWT</text>
<line className="edge" markerEnd="url(#arrow)" x1="420" x2="468" y1="100" y2="100"></line>
<rect className="node-accent" height="80" rx="12" width="180" x="470" y="60"></rect>
<text className="node-title" textAnchor="middle" x="560" y="93">Flask Blueprints</text>
<text className="node-sub" textAnchor="middle" x="560" y="110">18 route modules, @roles_required</text>
<line className="edge" markerEnd="url(#arrow)" x1="650" x2="698" y1="100" y2="100"></line>
<rect className="node" height="80" rx="12" width="170" x="700" y="60"></rect>
<text className="node-title" textAnchor="middle" x="785" y="93">SQLAlchemy ORM</text>
<text className="node-sub" textAnchor="middle" x="785" y="110">Declarative models</text>
<line className="edge" markerEnd="url(#arrow)" x1="870" x2="918" y1="100" y2="100"></line>
<rect className="node-accent" height="80" rx="12" width="150" x="920" y="60"></rect>
<text className="node-title" textAnchor="middle" x="995" y="93">MySQL 8.0</text>
<text className="node-sub" textAnchor="middle" x="995" y="110">SQLite local fallback</text>
</svg>
</div>
</div>
<div className="figure" id="architecture-external-integration-touchpoints">
<div className="figure-title">External integration touchpoints</div>
<div className="diag-container">
<svg className="diagram-svg" viewBox="0 0 900 340" xmlns="http://www.w3.org/2000/svg">
<rect className="node-accent" height="56" rx="10" width="180" x="360" y="10"></rect>
<text className="node-title" textAnchor="middle" x="450" y="43">Flask Backend</text>
<line className="edge" markerEnd="url(#arrow)" x1="450" x2="450" y1="66" y2="106"></line>
<rect className="node" height="52" rx="10" width="180" x="360" y="108"></rect>
<text className="node-title" textAnchor="middle" x="450" y="139">Authentication (JWT)</text>
<line className="edge" markerEnd="url(#arrow)" x1="450" x2="450" y1="160" y2="200"></line>
<rect className="node" height="52" rx="10" width="180" x="360" y="202"></rect>
<text className="node-title" textAnchor="middle" x="450" y="233">Orders &amp; Payments</text>
<line className="edge" markerEnd="url(#arrow)" x1="450" x2="450" y1="254" y2="294"></line>
<rect className="node" height="34" rx="10" width="180" x="360" y="296"></rect>
<text className="node-title" style={{ fontSize: "11.5px" }} textAnchor="middle" x="450" y="318">Shipping / Analytics</text>
<line className="edge" markerEnd="url(#arrow)" x1="360" x2="120" y1="185" y2="120"></line>
<rect className="node" height="56" rx="10" width="150" x="10" y="90"></rect>
<text className="node-title" style={{ fontSize: "11.5px" }} textAnchor="middle" x="85" y="113">RazorPay</text>
<text className="node-sub" textAnchor="middle" x="85" y="130">Payments (or mock)</text>
<line className="edge" markerEnd="url(#arrow)" x1="360" x2="120" y1="235" y2="210"></line>
<rect className="node" height="56" rx="10" width="150" x="10" y="182"></rect>
<text className="node-title" style={{ fontSize: "11.5px" }} textAnchor="middle" x="85" y="205">SMTP Email</text>
<text className="node-sub" textAnchor="middle" x="85" y="222">Transactional mail</text>
<line className="edge" markerEnd="url(#arrow)" x1="540" x2="780" y1="185" y2="120"></line>
<rect className="node" height="56" rx="10" width="150" x="740" y="90"></rect>
<text className="node-title" style={{ fontSize: "11.5px" }} textAnchor="middle" x="815" y="113">TrackingMore / Ship24</text>
<text className="node-sub" textAnchor="middle" x="815" y="130">Courier tracking (or sandbox)</text>
<line className="edge" markerEnd="url(#arrow)" x1="540" x2="780" y1="315" y2="230"></line>
<rect className="node" height="56" rx="10" width="150" x="740" y="202"></rect>
<text className="node-title" style={{ fontSize: "11.5px" }} textAnchor="middle" x="815" y="225">Google Gemini</text>
<text className="node-sub" textAnchor="middle" x="815" y="242">AI forecast narrative</text>
</svg>
</div>
<div className="figure-cap">Every external integration ships with a safe fallback — mock RazorPay client, console-logged email, Carrier Sandbox tracking, and a templated statistical narrative — so the platform runs end-to-end without any live third-party keys.</div>
</div>
<h3 id="architecture-backend-module-layout">Backend module layout</h3>
<div className="tbl-wrap">
<table>
<thead><tr><th>Layer</th><th>Location</th><th>Responsibility</th></tr></thead>
<tbody>
<tr><td><strong>Application factory</strong></td><td><code>app/__init__.py</code></td><td>Creates the Flask app, wires config, CORS, JWT, DB, registers all 17 blueprints under <code>/api/*</code>, and defines <code>/api/health</code> plus 400/404/500 handlers.</td></tr>
<tr><td><strong>Config</strong></td><td><code>app/config.py</code></td><td>Environment-driven settings: DB URI (auto MySQL SSL detection for Aiven-style hosts), JWT, CORS origins, SMTP, RazorPay, Twilio, Gemini.</td></tr>
<tr><td><strong>Models</strong></td><td><code>app/models/*.py</code></td><td>11 SQLAlchemy model files covering 17 tables (see <a href="#database">Database</a>).</td></tr>
<tr><td><strong>Routes</strong></td><td><code>app/routes/*.py</code></td><td>18 blueprint files, one per resource, each using <code>@roles_required(...)</code> guards.</td></tr>
<tr><td><strong>Utils / Engines</strong></td><td><code>app/utils/*.py</code></td><td>Email (SMTP), PDF (invoices/receipts), courier tracking, reports aggregation, revenue projections, RazorPay client, SMS/OTP, sequential ID generation.</td></tr>
</tbody>
</table>
</div>
<h3 id="architecture-external-integrations">External integrations</h3>
<div className="cards">
<div aria-haspopup="dialog" className="card" data-card="courier-tracking" onClick={() => openCard("courier-tracking")} role="button" tabIndex={0}><div className="card-icon blue">🚚</div><h4>Courier Tracking</h4><p>TrackingMore API, Ship24 API, or a built-in Carrier Sandbox adapter (<code>app/utils/courier_tracker.py</code>) simulating realistic checkpoints when no live key is configured.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
<div aria-haspopup="dialog" className="card" data-card="smtp-email" onClick={() => openCard("smtp-email")} role="button" tabIndex={0}><div className="card-icon green">✉</div><h4>SMTP Email</h4><p>Dual-protocol SMTP engine (SSL:465 / STARTTLS:587) with console fallback logging when unconfigured.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
<div aria-haspopup="dialog" className="card" data-card="razorpay" onClick={() => openCard("razorpay")} role="button" tabIndex={0}><div className="card-icon amber">💳</div><h4>RazorPay</h4><p>Order creation + signature verification, with a mock client (<code>app/utils/razorpay_client.py</code>) so checkout works end-to-end without live keys.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
<div aria-haspopup="dialog" className="card" data-card="gemini-ai" onClick={() => openCard("gemini-ai")} role="button" tabIndex={0}><div className="card-icon purple">🧠</div><h4>Gemini AI</h4><p>Google Gemini (<code>google.generativeai</code>) generates an executive narrative for revenue forecasts, strictly formatted in INR, with a thread-level timeout and a statistical fallback narrative.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
</div>
</section>
<section className="section" id="tech-stack">
<div className="sec-header"><div className="sec-num">04</div><h2>Technology Stack</h2></div>
<div className="tbl-wrap">
<table>
<thead><tr><th>Layer</th><th>Technology</th><th>Notes</th></tr></thead>
<tbody>
<tr><td>Frontend Framework</td><td><code>React 18.3</code></td><td>Component-based SPA</td></tr>
<tr><td>Client Language</td><td><code>TypeScript 5.5</code></td><td>Strict typing across <code>src/types/*.ts</code></td></tr>
<tr><td>Build Tool</td><td><code>Vite 5.4</code></td><td>Dev server + production bundler</td></tr>
<tr><td>Styling</td><td><code>Tailwind CSS 3.4</code></td><td>Utility-first, custom design tokens</td></tr>
<tr><td>Client Routing</td><td><code>React Router DOM 6.26</code></td><td>Two gated portals, one router (<code>src/app/router.tsx</code>)</td></tr>
<tr><td>Backend Framework</td><td><code>Flask 3.0</code> (Python 3.10)</td><td>Modular blueprint architecture</td></tr>
<tr><td>Authentication</td><td><code>Flask-JWT-Extended 4.6</code></td><td>HS256 signed access tokens, 8-hour expiry, role claims</td></tr>
<tr><td>ORM</td><td><code>SQLAlchemy 2.0</code> + <code>PyMySQL</code></td><td>Declarative models, relationship cascades</td></tr>
<tr><td>Database</td><td><code>MySQL 8.0</code></td><td>SQLite fallback (<code>retail_mart.db</code>) when <code>DATABASE_URL</code> is unset</td></tr>
<tr><td>Client Testing</td><td><code>Vitest</code> + <code>Testing Library</code></td><td>14 test suites, 53 tests</td></tr>
<tr><td>Server Testing</td><td><code>test_verification.py</code>, <code>test_e2e_wishlist.py</code></td><td>End-to-end API and business-flow verification</td></tr>
<tr><td>Cloud Hosting</td><td><code>Vercel</code></td><td>Static SPA + serverless Python WSGI function</td></tr>
</tbody>
</table>
</div>
</section>
<section className="section" id="core-features">
<div className="sec-header"><div className="sec-num">05</div><h2>Core Features</h2></div>
<h3 id="core-features-customer-experience">Customer Experience</h3>
<div className="cards">
<div aria-haspopup="dialog" className="card" data-card="feat-catalog" onClick={() => openCard("feat-catalog")} role="button" tabIndex={0}><h4>Catalog Browsing</h4><p>Search, category filter, and SKU/name matching via <code>GET /api/products</code>.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
<div aria-haspopup="dialog" className="card" data-card="feat-cart-checkout" onClick={() => openCard("feat-cart-checkout")} role="button" tabIndex={0}><h4>Cart &amp; Checkout</h4><p>Client-side cart, address selection, and order placement that auto-creates a linked payment.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
<div aria-haspopup="dialog" className="card" data-card="feat-wishlist" onClick={() => openCard("feat-wishlist")} role="button" tabIndex={0}><h4>Wishlist</h4><p>Idempotent per-customer product bookmarking with strict user isolation.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
<div aria-haspopup="dialog" className="card" data-card="feat-account-dashboard" onClick={() => openCard("feat-account-dashboard")} role="button" tabIndex={0}><h4>Account Dashboard</h4><p>Live purchase telemetry — total spent, orders, items, active shipments — via <code>/api/customer/stats/summary</code>.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
<div aria-haspopup="dialog" className="card" data-card="feat-order-history" onClick={() => openCard("feat-order-history")} role="button" tabIndex={0}><h4>Order History &amp; Tracking</h4><p><code>GET /api/orders/mine</code> plus live shipment checkpoint tracking.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
<div aria-haspopup="dialog" className="card" data-card="feat-invoices" onClick={() => openCard("feat-invoices")} role="button" tabIndex={0}><h4>Invoices &amp; Receipts</h4><p>Server-generated PDF invoices (orders) and receipts (payments), downloadable by the owning customer.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
</div>
<h3 id="core-features-operations-management">Operations Management</h3>
<div className="cards">
<div aria-haspopup="dialog" className="card" data-card="feat-user-admin" onClick={() => openCard("feat-user-admin")} role="button" tabIndex={0}><h4>User Administration</h4><p>Admin-only CRUD over Staff/Manager/Admin accounts with role assignment and status toggling.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
<div aria-haspopup="dialog" className="card" data-card="feat-catalog-admin" onClick={() => openCard("feat-catalog-admin")} role="button" tabIndex={0}><h4>Catalog Administration</h4><p>Full product/category CRUD with automatic stock/status synchronization.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
<div aria-haspopup="dialog" className="card" data-card="feat-order-lifecycle" onClick={() => openCard("feat-order-lifecycle")} role="button" tabIndex={0}><h4>Order Lifecycle</h4><p>Forward-only status workflow enforcement (<code>Pending → Processing → Shipped → Delivered</code>, or <code>Cancelled</code>).</p><span className="card-more">View details <span className="arrow">→</span></span></div>
<div aria-haspopup="dialog" className="card" data-card="feat-payments-refunds" onClick={() => openCard("feat-payments-refunds")} role="button" tabIndex={0}><h4>Payments &amp; Refunds</h4><p>Separate Payments and Refunds views; RazorPay order creation and signature verification.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
<div aria-haspopup="dialog" className="card" data-card="feat-courier-registry" onClick={() => openCard("feat-courier-registry")} role="button" tabIndex={0}><h4>Courier Registry</h4><p>Centralized courier partner records with active/inactive toggling and tracking URL templates.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
<div aria-haspopup="dialog" className="card" data-card="feat-awb-automation" onClick={() => openCard("feat-awb-automation")} role="button" tabIndex={0}><h4>Shipment &amp; AWB Automation</h4><p>Automatic carrier-spec AWB number generation and sequential delivery-state tracking.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
</div>
<h3 id="core-features-communications-analytics-marketing">Communications, Analytics &amp; Marketing</h3>
<div className="cards">
<div aria-haspopup="dialog" className="card" data-card="feat-trans-email" onClick={() => openCard("feat-trans-email")} role="button" tabIndex={0}><h4>Transactional Email</h4><p>8 automated lifecycle emails triggered by account, order, and shipment events.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
<div aria-haspopup="dialog" className="card" data-card="feat-campaigns" onClick={() => openCard("feat-campaigns")} role="button" tabIndex={0}><h4>Marketing Campaigns</h4><p>Festival/seasonal campaign records with discount codes and bulk email dispatch.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
<div aria-haspopup="dialog" className="card" data-card="feat-exec-reports" onClick={() => openCard("feat-exec-reports")} role="button" tabIndex={0}><h4>Executive Reports</h4><p>SQL-aggregated KPIs, SVG charts, and Daily/Monthly/Yearly report tables — zero customer PII.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
<div aria-haspopup="dialog" className="card" data-card="feat-ai-forecasting" onClick={() => openCard("feat-ai-forecasting")} role="button" tabIndex={0}><h4>AI Revenue Forecasting</h4><p>Linear-regression statistical projection plus an optional Gemini-generated executive narrative in INR.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
</div>
</section>
<section className="section" id="user-roles">
<div className="sec-header"><div className="sec-num">06</div><h2>User Roles &amp; Permissions</h2></div>
<p>Four roles exist in the <code>roles</code> table (<code>Admin</code>, <code>Manager</code>, <code>Staff</code>, <code>Customer</code>). Every protected endpoint is guarded server-side by the <code>@roles_required(...)</code> decorator in <code>app/utils/decorators.py</code>, which verifies the JWT and checks its <code>role</code> claim — role enforcement cannot be bypassed by editing frontend code.</p>
<div className="roles">
<div aria-haspopup="dialog" className="role-card admin" data-card="role-admin" onClick={() => openCard("role-admin")} role="button" tabIndex={0}><span className="role-tag">Full Access</span><h3>Admin</h3><ul><li>Create/edit/delete users</li><li>Delete products, categories, orders, campaigns, couriers</li><li>All Manager + Staff capabilities</li></ul><span className="card-more">View details <span className="arrow">→</span></span></div>
<div aria-haspopup="dialog" className="role-card manager" data-card="role-manager" onClick={() => openCard("role-manager")} role="button" tabIndex={0}><span className="role-tag">Operations Lead</span><h3>Manager</h3><ul><li>Products, categories, orders, shipments, couriers (create/edit)</li><li>Reports, analytics &amp; AI projections</li><li>Update order &amp; payment status</li></ul><span className="card-more">View details <span className="arrow">→</span></span></div>
<div aria-haspopup="dialog" className="role-card staff" data-card="role-staff" onClick={() => openCard("role-staff")} role="button" tabIndex={0}><span className="role-tag">Day-to-day Ops</span><h3>Staff</h3><ul><li>View orders, payments, shipments, couriers</li><li>Create shipments &amp; update shipment status</li><li>No delete rights; no reports/analytics access</li></ul><span className="card-more">View details <span className="arrow">→</span></span></div>
<div aria-haspopup="dialog" className="role-card customer" data-card="role-customer" onClick={() => openCard("role-customer")} role="button" tabIndex={0}><span className="role-tag">Storefront</span><h3>Customer</h3><ul><li>Browse, cart, checkout, wishlist</li><li>Own orders, addresses, payments, invoices only</li><li>No access to admin console endpoints</li></ul><span className="card-more">View details <span className="arrow">→</span></span></div>
</div>
<h3 id="user-roles-permission-matrix-verified-against">Permission matrix (verified against <code>@roles_required</code> guards)</h3>
<div className="tbl-wrap">
<table>
<thead><tr><th>Capability</th><th className="c">Admin</th><th className="c">Manager</th><th className="c">Staff</th><th className="c">Customer</th></tr></thead>
<tbody>
<tr><td>Manage users (create/edit/delete)</td><td className="c"><span className="tag tag-green">✓</span></td><td className="c"><span className="tag tag-red">✗</span></td><td className="c"><span className="tag tag-red">✗</span></td><td className="c"><span className="tag tag-red">✗</span></td></tr>
<tr><td>View users list</td><td className="c"><span className="tag tag-green">✓</span></td><td className="c"><span className="tag tag-green">✓</span></td><td className="c"><span className="tag tag-red">✗</span></td><td className="c"><span className="tag tag-red">✗</span></td></tr>
<tr><td>Create / edit products &amp; categories</td><td className="c"><span className="tag tag-green">✓</span></td><td className="c"><span className="tag tag-green">✓</span></td><td className="c"><span className="tag tag-red">✗</span></td><td className="c"><span className="tag tag-red">✗</span></td></tr>
<tr><td>Delete products / categories</td><td className="c"><span className="tag tag-green">✓</span></td><td className="c"><span className="tag tag-red">✗</span></td><td className="c"><span className="tag tag-red">✗</span></td><td className="c"><span className="tag tag-red">✗</span></td></tr>
<tr><td>View orders (admin list)</td><td className="c"><span className="tag tag-green">✓</span></td><td className="c"><span className="tag tag-green">✓</span></td><td className="c"><span className="tag tag-green">✓</span></td><td className="c"><span className="tag tag-red">✗</span></td></tr>
<tr><td>Create order (checkout / manual)</td><td className="c"><span className="tag tag-green">✓</span></td><td className="c"><span className="tag tag-green">✓</span></td><td className="c"><span className="tag tag-green">✓</span></td><td className="c"><span className="tag tag-green">✓</span></td></tr>
<tr><td>Update order status / delete order</td><td className="c"><span className="tag tag-green">✓</span></td><td className="c">status only</td><td className="c"><span className="tag tag-red">✗</span></td><td className="c"><span className="tag tag-red">✗</span></td></tr>
<tr><td>View / update payments</td><td className="c"><span className="tag tag-green">✓</span></td><td className="c"><span className="tag tag-green">✓</span></td><td className="c">view + create only</td><td className="c">own payment only</td></tr>
<tr><td>Create shipment</td><td className="c"><span className="tag tag-green">✓</span></td><td className="c"><span className="tag tag-green">✓</span></td><td className="c"><span className="tag tag-red">✗</span></td><td className="c"><span className="tag tag-red">✗</span></td></tr>
<tr><td>Update shipment status</td><td className="c"><span className="tag tag-green">✓</span></td><td className="c"><span className="tag tag-green">✓</span></td><td className="c"><span className="tag tag-green">✓</span></td><td className="c"><span className="tag tag-red">✗</span></td></tr>
<tr><td>Track own shipment</td><td className="c"><span className="tag tag-green">✓</span></td><td className="c"><span className="tag tag-green">✓</span></td><td className="c"><span className="tag tag-green">✓</span></td><td className="c">own only</td></tr>
<tr><td>Manage couriers (create/edit)</td><td className="c"><span className="tag tag-green">✓</span></td><td className="c"><span className="tag tag-green">✓</span></td><td className="c">view only</td><td className="c"><span className="tag tag-red">✗</span></td></tr>
<tr><td>Delete courier</td><td className="c"><span className="tag tag-green">✓</span></td><td className="c"><span className="tag tag-red">✗</span></td><td className="c"><span className="tag tag-red">✗</span></td><td className="c"><span className="tag tag-red">✗</span></td></tr>
<tr><td>Create / send campaigns</td><td className="c"><span className="tag tag-green">✓</span></td><td className="c"><span className="tag tag-green">✓</span></td><td className="c">view only</td><td className="c"><span className="tag tag-red">✗</span></td></tr>
<tr><td>Reports &amp; analytics summary</td><td className="c"><span className="tag tag-green">✓</span></td><td className="c"><span className="tag tag-green">✓</span></td><td className="c"><span className="tag tag-red">✗</span></td><td className="c"><span className="tag tag-red">✗</span></td></tr>
<tr><td>AI / statistical revenue projections</td><td className="c"><span className="tag tag-green">✓</span></td><td className="c"><span className="tag tag-green">✓</span></td><td className="c"><span className="tag tag-red">✗</span></td><td className="c"><span className="tag tag-red">✗</span></td></tr>
<tr><td>Wishlist &amp; addresses (own)</td><td className="c">n/a</td><td className="c">n/a</td><td className="c">n/a</td><td className="c"><span className="tag tag-green">✓</span></td></tr>
</tbody>
</table>
</div>
<div className="callout callout-info"><strong>Server-side enforcement:</strong> All role checks live in the Flask route layer via <code>@roles_required(...)</code>, not just in the React UI. Hiding a button in the frontend never substitutes for the backend guard.</div>
</section>
<section className="section" id="authentication">
<div className="sec-header"><div className="sec-num">07</div><h2>Authentication &amp; Authorization</h2></div>
<p>Authentication is stateless JWT (<code>Flask-JWT-Extended</code>), HS256-signed, carrying <code>role</code>, <code>email</code>, and <code>name</code> as additional claims and expiring after 8 hours. Tokens are sent as <code>Authorization: Bearer &lt;token&gt;</code> and read only from request headers (<code>JWT_TOKEN_LOCATION = ["headers"]</code>).</p>
<h3 id="authentication-three-ways-to-obtain-an-account">Three ways to obtain an account</h3>
<div className="cards">
<div aria-haspopup="dialog" className="card" data-card="auth-staff-password" onClick={() => openCard("auth-staff-password")} role="button" tabIndex={0}><h4>Email + Password (Staff)</h4><p><code>POST /api/auth/register</code> creates a self-service account defaulting to the <code>Staff</code> role.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
<div aria-haspopup="dialog" className="card" data-card="auth-customer-password" onClick={() => openCard("auth-customer-password")} role="button" tabIndex={0}><h4>Email + Password (Customer)</h4><p><code>POST /api/auth/signup</code> creates a <code>Customer</code> account and best-effort sends a welcome email.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
<div aria-haspopup="dialog" className="card" data-card="auth-otp" onClick={() => openCard("auth-otp")} role="button" tabIndex={0}><h4>Phone OTP (Customer)</h4><p><code>POST /api/auth/otp/request</code> then <code>/otp/verify</code> — a 6-digit code (10-minute TTL) either logs in an existing phone or silently creates a new <code>Customer</code> account.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
</div>
<h3 id="authentication-endpoints">Endpoints</h3>
<div className="endpoint">
<div className="endpoint-head"><span className="method post">POST</span><span className="endpoint-path">/api/auth/login</span></div>
<div className="endpoint-body"><p>Email + password login for any role. Returns 401 on bad credentials, 403 if the account status is not <code>active</code>.</p>
<pre className="code-block"><button type="button" className="copy-btn" onClick={(e) => handleCopyBlock(e)}>Copy</button>{`{
  "email": "user@example.com",
  "password": "********"
}`}</pre></div>
</div>
<div className="endpoint">
<div className="endpoint-head"><span className="method get">GET</span><span className="endpoint-path">/api/auth/me</span><span className="tag tag-blue">JWT required</span></div>
<div className="endpoint-body"><p>Returns the authenticated user's own profile, resolved from the JWT identity.</p></div>
</div>
<div className="callout callout-warning"><strong>Password policy:</strong> Registration and signup both require a password of at least 6 characters; emails are lower-cased and de-duplicated at the database level.</div>
</section>
<section className="section" id="products-categories">
<div className="sec-header"><div className="sec-num">08</div><h2>Product &amp; Category Management</h2></div>
<p>Products belong to exactly one category (<code>Product.category_id → Category.id</code>). Product status is <code>active</code>, <code>draft</code>, or <code>out-of-stock</code>, and is auto-synchronized whenever stock changes: <code>sync_status_with_stock()</code> forces a product to <code>out-of-stock</code> the moment <code>stock &lt;= 0</code>, and back to <code>active</code> once restocked (unless still marked <code>draft</code>).</p>
<h3 id="products-categories-read-endpoints-public">Read endpoints (public)</h3>
<div className="endpoint"><div className="endpoint-head"><span className="method get">GET</span><span className="endpoint-path">/api/products</span></div><div className="endpoint-body"><p>Supports <code>?category=</code>, <code>?status=</code>, and <code>?search=</code> (matches product name or SKU, case-insensitive).</p></div></div>
<div className="endpoint"><div className="endpoint-head"><span className="method get">GET</span><span className="endpoint-path">/api/products/&lt;id&gt;</span></div></div>
<div className="endpoint"><div className="endpoint-head"><span className="method get">GET</span><span className="endpoint-path">/api/categories</span></div><div className="endpoint-body"><p>Public read — categories carry a live <code>productCount</code> computed from the relationship.</p></div></div>
<h3 id="products-categories-write-endpoints-admin-manager">Write endpoints (Admin / Manager)</h3>
<div className="tbl-wrap">
<table>
<thead><tr><th>Method</th><th>Path</th><th>Role</th><th>Notes</th></tr></thead>
<tbody>
<tr><td><span className="tag tag-green">POST</span></td><td><code>/api/products</code></td><td>Admin, Manager</td><td>Requires unique SKU and an existing category name; auto-generates ID <code>p-1001</code>+.</td></tr>
<tr><td><span className="tag tag-amber">PUT</span></td><td><code>/api/products/&lt;id&gt;</code></td><td>Admin, Manager</td><td>Partial update; re-runs stock/status sync.</td></tr>
<tr><td><span className="tag tag-red">DELETE</span></td><td><code>/api/products/&lt;id&gt;</code></td><td>Admin</td><td>Hard delete.</td></tr>
<tr><td><span className="tag tag-green">POST</span></td><td><code>/api/categories</code></td><td>Admin, Manager</td><td>Unique name required; slug auto-derived.</td></tr>
<tr><td><span className="tag tag-amber">PUT</span></td><td><code>/api/categories/&lt;id&gt;</code></td><td>Admin, Manager</td><td>Renaming re-slugs the category.</td></tr>
<tr><td><span className="tag tag-red">DELETE</span></td><td><code>/api/categories/&lt;id&gt;</code></td><td>Admin</td><td>409 Conflict if the category still has products.</td></tr>
</tbody>
</table>
</div>
</section>
<section className="section" id="cart-checkout-orders">
<div className="sec-header"><div className="sec-num">09</div><h2>Cart, Checkout &amp; Order Management</h2></div>
<p>The cart is client-side state in the React app. Checkout submits directly to <code>POST /api/orders</code>, which is shared by both the storefront checkout and the admin console's manual order entry.</p>
<div className="figure" id="cart-checkout-orders-order-creation-sequence">
<div className="figure-title">Order creation sequence</div>
<div className="diag-container">
<svg className="diagram-svg" viewBox="0 0 900 300" xmlns="http://www.w3.org/2000/svg">
<line className="lane-line" x1="70" x2="70" y1="50" y2="280"></line>
<line className="lane-line" x1="270" x2="270" y1="50" y2="280"></line>
<line className="lane-line" x1="490" x2="490" y1="50" y2="280"></line>
<line className="lane-line" x1="690" x2="690" y1="50" y2="280"></line>
<line className="lane-line" x1="850" x2="850" y1="50" y2="280"></line>
<rect className="lane-head" height="30" rx="7" width="100" x="20" y="16"></rect>
<text className="lane-label" textAnchor="middle" x="70" y="36">Customer</text>
<rect className="lane-head" height="30" rx="7" width="120" x="210" y="16"></rect>
<text className="lane-label" textAnchor="middle" x="270" y="36">React SPA</text>
<rect className="lane-head" height="30" rx="7" width="140" x="420" y="16"></rect>
<text className="lane-label" textAnchor="middle" x="490" y="36">Flask API</text>
<rect className="lane-head" height="30" rx="7" width="120" x="630" y="16"></rect>
<text className="lane-label" textAnchor="middle" x="690" y="36">MySQL</text>
<rect className="lane-head" height="30" rx="7" width="110" x="795" y="16"></rect>
<text className="lane-label" textAnchor="middle" x="850" y="36">SMTP</text>
<line className="msg" markerEnd="url(#arrowAccent)" x1="70" x2="266" y1="70" y2="70"></line>
<text className="msg-label" textAnchor="middle" x="170" y="63">Places order at checkout</text>
<line className="msg" markerEnd="url(#arrowAccent)" x1="270" x2="486" y1="98" y2="98"></line>
<text className="msg-label" textAnchor="middle" x="380" y="91">POST /api/orders (Bearer JWT)</text>
<line className="msg" markerEnd="url(#arrowAccent)" x1="490" x2="686" y1="126" y2="126"></line>
<text className="msg-label" textAnchor="middle" x="588" y="119">INSERT order + order_items</text>
<line className="msg" markerEnd="url(#arrowAccent)" x1="490" x2="686" y1="154" y2="154"></line>
<text className="msg-label" textAnchor="middle" x="588" y="147">INSERT payment (status=Pending)</text>
<line className="msg" markerEnd="url(#arrowAccent)" x1="490" x2="846" y1="182" y2="182"></line>
<text className="msg-label" textAnchor="middle" x="668" y="175">Send order confirmation email</text>
<line className="msg-return" markerEnd="url(#arrow)" x1="490" x2="274" y1="210" y2="210"></line>
<text className="msg-label" textAnchor="middle" x="380" y="203">201 Created — order + payment JSON</text>
<line className="msg-return" markerEnd="url(#arrow)" x1="270" x2="74" y1="238" y2="238"></line>
<text className="msg-label" textAnchor="middle" x="170" y="231">Order confirmation screen</text>
</svg>
</div>
<div className="figure-cap">Every order automatically creates exactly one linked Payment record in "Pending" status — checkout never has to ask "does a payment exist yet?".</div>
</div>
<h3 id="cart-checkout-orders-order-status-workflow-forward-only">Order status workflow (forward-only, server-enforced)</h3>
<div className="figure">
<div className="diag-container">
<svg className="diagram-svg" viewBox="0 0 900 220" xmlns="http://www.w3.org/2000/svg">
<rect className="node-accent" height="60" rx="12" width="150" x="10" y="30"></rect>
<text className="node-title" textAnchor="middle" x="85" y="65">Pending</text>
<line className="edge" markerEnd="url(#arrow)" x1="160" x2="238" y1="60" y2="60"></line>
<rect className="node" height="60" rx="12" width="150" x="240" y="30"></rect>
<text className="node-title" textAnchor="middle" x="315" y="65">Processing</text>
<line className="edge" markerEnd="url(#arrow)" x1="390" x2="468" y1="60" y2="60"></line>
<rect className="node" height="60" rx="12" width="150" x="470" y="30"></rect>
<text className="node-title" textAnchor="middle" x="545" y="65">Shipped</text>
<line className="edge" markerEnd="url(#arrow)" x1="620" x2="698" y1="60" y2="60"></line>
<rect className="terminal" height="60" rx="12" width="180" x="700" y="30"></rect>
<text className="terminal-title" textAnchor="middle" x="790" y="65">Delivered</text>
<path className="edge-cancel" d="M85,90 C85,150 250,180 380,150" markerEnd="url(#arrowCancel)"></path>
<path className="edge-cancel" d="M315,90 C315,140 350,155 380,150" markerEnd="url(#arrowCancel)"></path>
<rect className="terminal-cancel" height="56" rx="12" width="150" x="380" y="130"></rect>
<text className="terminal-cancel-title" textAnchor="middle" x="455" y="163">Cancelled</text>
</svg>
</div>
</div>
<p>Pending and Processing can additionally transition to <span className="tag tag-red">Cancelled</span>. <code>PATCH /api/orders/&lt;id&gt;/status</code> rejects any transition not present in <code>ORDER_STATUS_TRANSITIONS</code> with a 409, and every accepted transition appends a row to <code>order_status_history</code>.</p>
<h3 id="cart-checkout-orders-key-endpoints">Key endpoints</h3>
<div className="tbl-wrap">
<table>
<thead><tr><th>Method</th><th>Path</th><th>Role</th><th>Purpose</th></tr></thead>
<tbody>
<tr><td><span className="tag tag-blue">GET</span></td><td><code>/api/orders</code></td><td>Admin, Manager, Staff</td><td>List all orders; filter by <code>status</code> / <code>paymentStatus</code>.</td></tr>
<tr><td><span className="tag tag-blue">GET</span></td><td><code>/api/orders/mine</code></td><td>Customer</td><td>Storefront "My Orders" — filtered to <code>user_id</code> from the JWT.</td></tr>
<tr><td><span className="tag tag-green">POST</span></td><td><code>/api/orders</code></td><td>Any authenticated role</td><td>Creates order + items + linked Pending payment; sends confirmation email.</td></tr>
<tr><td><span className="tag tag-purple">PATCH</span></td><td><code>/api/orders/&lt;id&gt;/status</code></td><td>Admin, Manager</td><td>Enforces <code>ORDER_STATUS_TRANSITIONS</code>; records who changed it.</td></tr>
<tr><td><span className="tag tag-purple">PATCH</span></td><td><code>/api/orders/&lt;id&gt;/payment-status</code></td><td>Admin, Manager</td><td>Sets <code>Pending / Paid / Failed / Refunded</code>.</td></tr>
<tr><td><span className="tag tag-blue">GET</span></td><td><code>/api/orders/&lt;id&gt;/invoice</code></td><td>Admin, Manager, Staff, Customer (own)</td><td>Streams a generated PDF invoice.</td></tr>
<tr><td><span className="tag tag-red">DELETE</span></td><td><code>/api/orders/&lt;id&gt;</code></td><td>Admin</td><td>Hard delete (cascades items &amp; history).</td></tr>
</tbody>
</table>
</div>
<div className="callout callout-info"><strong>Order ↔ Shipment sync:</strong> Advancing a shipment to <code>Shipped</code>, <code>Out for Delivery</code>, or <code>Delivered</code> automatically advances the parent order's status where the order's own workflow allows it — see <a href="#shipping-couriers">Shipping &amp; Couriers</a>.</div>
</section>
<section className="section" id="payments">
<div className="sec-header"><div className="sec-num">10</div><h2>Payment System</h2></div>
<p>Payment methods: <code>Card</code>, <code>UPI</code>, <code>Net Banking</code>, <code>Cash on Delivery</code>, <code>Wallet</code> (plus <code>RazorPay</code> once verified). Statuses: <code>Pending</code>, <code>Paid</code>, <code>Failed</code>, <code>Refunded</code> — kept in sync with the parent order's <code>paymentStatus</code> on every change.</p>
<h3 id="payments-razorpay-integration-2-step">RazorPay integration (2-step)</h3>
<div className="steps">
<div className="step"><div className="step-n">1</div><div className="step-body"><h4>POST /api/payments/razorpay/order</h4><p>Creates a RazorPay order for an existing Payment (amount converted to paise). Falls back to a mock client when no live keys are configured, so checkout is fully testable in development.</p></div></div>
<div className="step"><div className="step-n">2</div><div className="step-body"><h4>POST /api/payments/razorpay/verify</h4><p>Verifies the RazorPay signature; on success marks the Payment <code>Paid</code>, method <code>RazorPay</code>, syncs the order's <code>paymentStatus</code>, and triggers the automatic receipt email with a PDF attachment.</p></div></div>
</div>
<div className="figure" id="payments-razorpay-checkout-sequence">
<div className="figure-title">RazorPay checkout sequence</div>
<div className="diag-container">
<svg className="diagram-svg" viewBox="0 0 900 300" xmlns="http://www.w3.org/2000/svg">
<line className="lane-line" x1="70" x2="70" y1="50" y2="280"></line>
<line className="lane-line" x1="270" x2="270" y1="50" y2="280"></line>
<line className="lane-line" x1="490" x2="490" y1="50" y2="280"></line>
<line className="lane-line" x1="700" x2="700" y1="50" y2="280"></line>
<line className="lane-line" x1="850" x2="850" y1="50" y2="280"></line>
<rect className="lane-head" height="30" rx="7" width="100" x="20" y="16"></rect>
<text className="lane-label" textAnchor="middle" x="70" y="36">Customer</text>
<rect className="lane-head" height="30" rx="7" width="120" x="210" y="16"></rect>
<text className="lane-label" textAnchor="middle" x="270" y="36">React SPA</text>
<rect className="lane-head" height="30" rx="7" width="140" x="420" y="16"></rect>
<text className="lane-label" textAnchor="middle" x="490" y="36">Flask API</text>
<rect className="lane-head" height="30" rx="7" width="120" x="640" y="16"></rect>
<text className="lane-label" textAnchor="middle" x="700" y="36">RazorPay</text>
<rect className="lane-head" height="30" rx="7" width="110" x="795" y="16"></rect>
<text className="lane-label" textAnchor="middle" x="850" y="36">SMTP</text>
<line className="msg" markerEnd="url(#arrowAccent)" x1="270" x2="486" y1="70" y2="70"></line>
<text className="msg-label" textAnchor="middle" x="380" y="63">POST /payments/razorpay/order</text>
<line className="msg" markerEnd="url(#arrowAccent)" x1="490" x2="696" y1="98" y2="98"></line>
<text className="msg-label" textAnchor="middle" x="593" y="91">Create order (amount in paise)</text>
<line className="msg-return" markerEnd="url(#arrow)" x1="700" x2="494" y1="126" y2="126"></line>
<text className="msg-label" textAnchor="middle" x="597" y="119">razorpay_order_id</text>
<line className="msg" markerEnd="url(#arrowAccent)" x1="70" x2="266" y1="154" y2="154"></line>
<text className="msg-label" textAnchor="middle" x="170" y="147">Completes RazorPay checkout widget</text>
<line className="msg" markerEnd="url(#arrowAccent)" x1="270" x2="486" y1="182" y2="182"></line>
<text className="msg-label" textAnchor="middle" x="380" y="175">POST /payments/razorpay/verify</text>
<line className="msg" markerEnd="url(#arrowAccent)" x1="490" x2="846" y1="210" y2="210"></line>
<text className="msg-label" textAnchor="middle" x="668" y="203">Verify signature → mark Paid → send receipt (PDF)</text>
<line className="msg-return" markerEnd="url(#arrow)" x1="490" x2="274" y1="238" y2="238"></line>
<text className="msg-label" textAnchor="middle" x="380" y="231">200 OK — payment status: Paid</text>
</svg>
</div>
</div>
<h3 id="payments-endpoints">Endpoints</h3>
<div className="tbl-wrap">
<table>
<thead><tr><th>Method</th><th>Path</th><th>Role</th><th>Notes</th></tr></thead>
<tbody>
<tr><td><span className="tag tag-blue">GET</span></td><td><code>/api/payments</code></td><td>Admin, Manager, Staff</td><td>Filter by <code>status</code> / <code>orderId</code>.</td></tr>
<tr><td><span className="tag tag-blue">GET</span></td><td><code>/api/payments/&lt;id&gt;</code></td><td>+ Customer (owner only)</td><td>403 if a Customer requests a payment they don't own.</td></tr>
<tr><td><span className="tag tag-green">POST</span></td><td><code>/api/payments</code></td><td>Admin, Manager, Staff</td><td>Records a manual payment attempt against an existing order.</td></tr>
<tr><td><span className="tag tag-purple">PATCH</span></td><td><code>/api/payments/&lt;id&gt;/status</code></td><td>Admin, Manager</td><td>Marking <code>Paid</code> auto-triggers the receipt email (best-effort).</td></tr>
<tr><td><span className="tag tag-blue">GET</span></td><td><code>/api/payments/&lt;id&gt;/receipt</code></td><td>+ Customer (owner only)</td><td>Only available once status is <code>Paid</code>; lazily creates the <code>Receipt</code> row on first download.</td></tr>
</tbody>
</table>
</div>
<div className="callout callout-warning"><strong>Failed payments:</strong> A payment left in <code>Failed</code> status keeps the order's <code>paymentStatus</code> in sync as <code>Failed</code> too — the order itself is not automatically cancelled, allowing staff to retry or manually intervene.</div>
</section>
<section className="section" id="shipping-couriers">
<div className="sec-header"><div className="sec-num">11</div><h2>Shipping, Courier Registry &amp; Tracking</h2></div>
<h3 id="shipping-couriers-shipment-delivery-workflow-sequential">Shipment delivery workflow (sequential, server-enforced)</h3>
<div className="figure">
<div className="diag-container">
<svg className="diagram-svg" viewBox="0 0 1080 140" xmlns="http://www.w3.org/2000/svg">
<rect className="node-accent" height="60" rx="12" width="150" x="10" y="30"></rect>
<text className="node-title" textAnchor="middle" x="85" y="65">Pending</text>
<line className="edge" markerEnd="url(#arrow)" x1="160" x2="208" y1="60" y2="60"></line>
<rect className="node" height="60" rx="12" width="150" x="210" y="30"></rect>
<text className="node-title" textAnchor="middle" x="285" y="65">Packed</text>
<line className="edge" markerEnd="url(#arrow)" x1="360" x2="408" y1="60" y2="60"></line>
<rect className="node" height="60" rx="12" width="150" x="410" y="30"></rect>
<text className="node-title" textAnchor="middle" x="485" y="65">Shipped</text>
<line className="edge" markerEnd="url(#arrow)" x1="560" x2="608" y1="60" y2="60"></line>
<rect className="node" height="60" rx="12" width="200" x="610" y="30"></rect>
<text className="node-title" textAnchor="middle" x="710" y="65">Out for Delivery</text>
<line className="edge" markerEnd="url(#arrow)" x1="810" x2="858" y1="60" y2="60"></line>
<rect className="terminal" height="60" rx="12" width="200" x="860" y="30"></rect>
<text className="terminal-title" textAnchor="middle" x="960" y="65">Delivered</text>
</svg>
</div>
<div className="figure-cap">Each arrow is the only state <code>PATCH /shipments/&lt;id&gt;/status</code> will accept from the state before it — skipping a step returns 409 Conflict.</div>
</div>
<p><code>PATCH /api/shipments/&lt;id&gt;/status</code> only allows the single next state in <code>SHIPMENT_STATUS_TRANSITIONS</code> (409 otherwise), is idempotent if the same status is re-sent, and cascades to the parent order: reaching <code>Delivered</code> sets the order to <code>Delivered</code>; reaching <code>Shipped</code> or <code>Out for Delivery</code> advances a <code>Pending</code>/<code>Processing</code> order to <code>Shipped</code>; reaching <code>Packed</code> advances a <code>Pending</code> order to <code>Processing</code>.</p>
<h3 id="shipping-couriers-automatic-awb-tracking-number">Automatic AWB tracking-number generation</h3>
<p>When a shipment is created without a manual tracking number, <code>app/utils/courier_tracker.py</code> generates a carrier-spec Air Waybill (AWB) number:</p>
<div className="tbl-wrap">
<table>
<thead><tr><th>Courier</th><th>Format</th><th>Example</th></tr></thead>
<tbody>
<tr><td>Bluedart</td><td><code>BD</code> + 9 digits</td><td><code>BD813117411</code></td></tr>
<tr><td>Delhivery</td><td><code>DEL</code> + 10 digits</td><td><code>DEL6347751310</code></td></tr>
<tr><td>Ekart</td><td><code>EKT</code> + 9 digits</td><td><code>EKT890162069</code></td></tr>
<tr><td>DTDC</td><td><code>D</code> + 8 digits</td><td><code>D91252752</code></td></tr>
<tr><td>FedEx</td><td><code>FX</code> + 10 digits</td><td><code>FX8492019482</code></td></tr>
<tr><td>Other / standard</td><td><code>{`{CODE[:4]}-{8 digits}`}</code></td><td><code>DEFA-48201948</code></td></tr>
</tbody>
</table>
</div>
<p>A real carrier booking API is used automatically when <code>COURIER_BOOKING_API_URL</code> and <code>COURIER_BOOKING_API_KEY</code> are configured; otherwise the sandbox format above is used, and a manual tracking number can always be supplied instead.</p>
<h3 id="shipping-couriers-live-carrier-tracking-sync">Live carrier tracking &amp; sync</h3>
<div className="cards">
<div aria-haspopup="dialog" className="card" data-card="ship-endpoint-track" onClick={() => openCard("ship-endpoint-track")} role="button" tabIndex={0}><h4>GET /shipments/&lt;id&gt;/track</h4><p>Returns local tracking history plus a live external lookup (TrackingMore / Ship24 / Sandbox), a resolved <code>trackingUrl</code>, and normalized status. Customers can only track their own shipments.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
<div aria-haspopup="dialog" className="card" data-card="ship-endpoint-sync" onClick={() => openCard("ship-endpoint-sync")} role="button" tabIndex={0}><h4>POST /shipments/&lt;id&gt;/sync-tracking</h4><p>Fetches the external carrier's current status and, if it maps to a valid next state, advances the local shipment (and order) automatically.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
</div>
<h3 id="shipping-couriers-external-status-normalization">External status normalization</h3>
<div className="tbl-wrap">
<table>
<thead><tr><th>External carrier signal</th><th>Retail Mart status</th></tr></thead>
<tbody>
<tr><td><code>pending</code> / <code>info_received</code></td><td><span className="tag tag-grey">Pending</span></td></tr>
<tr><td><code>pickup_done</code> / <code>package_accepted</code></td><td><span className="tag tag-blue">Packed</span></td></tr>
<tr><td><code>in_transit</code> / <code>transshipment</code></td><td><span className="tag tag-amber">Shipped</span></td></tr>
<tr><td><code>out_for_delivery</code> / <code>with_courier</code></td><td><span className="tag tag-purple">Out for Delivery</span></td></tr>
<tr><td><code>delivered</code> / <code>signed</code></td><td><span className="tag tag-green">Delivered</span></td></tr>
<tr><td><code>exception</code> / <code>failed_attempt</code></td><td><span className="tag tag-red">Exception</span></td></tr>
</tbody>
</table>
</div>
<h3 id="shipping-couriers-courier-partner-registry">Courier partner registry</h3>
<p>Couriers are first-class records (<code>couriers</code> table) with <code>name</code>, <code>code</code>, optional contact email, and a <code>tracking_url_template</code> using the literal placeholder <code>{`{tracking_number}`}</code>. Staff can read the registry (so the Shipment form dropdown works) but only Admin/Manager can create or edit, and only Admin can delete — deletion is blocked with a 409 if any shipment still references the courier.</p>
</section>
<section className="section" id="wishlist">
<div className="sec-header"><div className="sec-num">12</div><h2>Wishlist</h2></div>
<p>Wishlist items (<code>wishlist_items</code> table) are strictly isolated per user via <code>user_id</code>, with a unique constraint on <code>(user_id, product_id)</code> preventing duplicates.</p>
<div className="tbl-wrap">
<table>
<thead><tr><th>Method</th><th>Path</th><th>Behavior</th></tr></thead>
<tbody>
<tr><td><span className="tag tag-blue">GET</span></td><td><code>/api/wishlist</code></td><td>Returns the authenticated user's items, newest first.</td></tr>
<tr><td><span className="tag tag-green">POST</span></td><td><code>/api/wishlist</code></td><td>Idempotent: adding an already-wishlisted product returns the existing item with a 200 instead of erroring.</td></tr>
<tr><td><span className="tag tag-red">DELETE</span></td><td><code>/api/wishlist/&lt;product_id&gt;</code></td><td>Accepts either a product ID or a wishlist item ID; always scoped to the caller's own <code>user_id</code>.</td></tr>
</tbody>
</table>
</div>
</section>
<section className="section" id="campaigns">
<div className="sec-header"><div className="sec-num">13</div><h2>Promotional Campaigns</h2></div>
<p>Campaigns (<code>campaigns</code> table) carry a unique discount <code>code</code>, a <code>discountType</code> of <code>percentage</code> or <code>flat</code>, an optional minimum purchase, a date range, and a lifecycle <code>status</code> of <code>scheduled</code>, <code>active</code>, or <code>ended</code>.</p>
<h3 id="campaigns-pre-configured-templates-frontend">Pre-configured templates (frontend: <code>CampaignForm.tsx</code>)</h3>
<div className="cards">
<div aria-haspopup="dialog" className="card" data-card="campaign-diwali" onClick={() => openCard("campaign-diwali")} role="button" tabIndex={0}><h4>Diwali Mega Sale</h4><p>Flat 40% off across all categories. Code <code>DIWALI40</code>.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
<div aria-haspopup="dialog" className="card" data-card="campaign-holi" onClick={() => openCard("campaign-holi")} role="button" tabIndex={0}><h4>Holi Festival Dhamaka</h4><p>Up to 50% off on festive collections. Code <code>HOLI50</code>.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
<div aria-haspopup="dialog" className="card" data-card="campaign-newyear" onClick={() => openCard("campaign-newyear")} role="button" tabIndex={0}><h4>New Year Bonanza</h4><p>Extra 25% savings. Code <code>NEWYEAR25</code>.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
<div aria-haspopup="dialog" className="card" data-card="campaign-independence" onClick={() => openCard("campaign-independence")} role="button" tabIndex={0}><h4>Independence Day Special</h4><p>Grand discounts across top brands. Code <code>INDIA77</code>.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
<div aria-haspopup="dialog" className="card" data-card="campaign-eid" onClick={() => openCard("campaign-eid")} role="button" tabIndex={0}><h4>Eid Celebration Offer</h4><p>Special savings for the family. Code <code>EIDMUBARAK</code>.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
<div aria-haspopup="dialog" className="card" data-card="campaign-eos" onClick={() => openCard("campaign-eos")} role="button" tabIndex={0}><h4>End of Season Clearance</h4><p>Last-chance seasonal pricing.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
</div>
<h3 id="campaigns-sending-a-campaign">Sending a campaign</h3>
<div className="endpoint">
<div className="endpoint-head"><span className="method post">POST</span><span className="endpoint-path">/api/campaigns/&lt;id&gt;/send</span><span className="tag tag-blue">Admin, Manager</span></div>
<div className="endpoint-body"><p>Emails every user with <code>status = active</code> via <code>send_bulk_email()</code>, which reuses a single authenticated SMTP session to avoid socket churn and provider rate limits. If the campaign was <code>scheduled</code>, it is automatically transitioned to <code>active</code>.</p></div>
</div>
</section>
<section className="section" id="notifications-email">
<div className="sec-header"><div className="sec-num">14</div><h2>Email &amp; Transactional Notifications</h2></div>
<p>The email engine (<code>app/utils/email.py</code>) supports both SSL (port 465) and STARTTLS (port 587/25) SMTP, reading credentials from environment variables. When <code>SMTP_HOST</code> is unset, outgoing emails are simply logged to the console instead of sent — every email-triggering flow still completes without failing the request (best-effort dispatch).</p>
<h3 id="notifications-email-automated-lifecycle-emails">Automated lifecycle emails</h3>
<div className="tbl-wrap">
<table>
<thead><tr><th>Trigger</th><th>Function</th><th>Fired from</th></tr></thead>
<tbody>
<tr><td>Account created (storefront)</td><td><code>welcome_email(user)</code></td><td><code>POST /api/auth/signup</code></td></tr>
<tr><td>Order placed</td><td><code>order_confirmation_email(order)</code></td><td><code>POST /api/orders</code></td></tr>
<tr><td>Payment succeeds (any path)</td><td><code>receipt_email(payment)</code></td><td><code>PATCH /payments/&lt;id&gt;/status</code> &amp; <code>POST /payments/razorpay/verify</code> — PDF receipt attached</td></tr>
<tr><td>Shipment → Shipped</td><td><code>shipment_shipped_email(shipment)</code></td><td><code>PATCH /shipments/&lt;id&gt;/status</code></td></tr>
<tr><td>Shipment reaches a hub (location supplied)</td><td><code>shipment_arrived_email(shipment, location)</code></td><td>Same as above, only if a <code>location</code> was passed with the Shipped update</td></tr>
<tr><td>Shipment → Out for Delivery</td><td><code>shipment_out_for_delivery_email(shipment)</code></td><td><code>PATCH /shipments/&lt;id&gt;/status</code></td></tr>
<tr><td>Shipment → Delivered</td><td><code>shipment_delivered_email(shipment)</code> + <code>shipment_thank_you_email(shipment)</code></td><td><code>PATCH /shipments/&lt;id&gt;/status</code> (two emails sent)</td></tr>
<tr><td>Marketing campaign sent</td><td><code>campaign_email(campaign)</code></td><td><code>POST /campaigns/&lt;id&gt;/send</code> (bulk, to all active users)</td></tr>
</tbody>
</table>
</div>
<div className="callout callout-info"><strong>Note on "Packed":</strong> the <code>Packed</code> shipment status is intentionally excluded from customer email — it is treated as an internal warehouse step, not a customer-facing milestone.</div>
<h3 id="notifications-email-diagnostics-manual-send">Diagnostics &amp; manual send</h3>
<div className="tbl-wrap">
<table>
<thead><tr><th>Method</th><th>Path</th><th>Purpose</th></tr></thead>
<tbody>
<tr><td><span className="tag tag-blue">GET</span></td><td><code>/api/communications/smtp-status</code></td><td>Validates the SMTP connection without exposing or logging the password.</td></tr>
<tr><td><span className="tag tag-green">POST</span></td><td><code>/api/communications/send</code></td><td>Generic <code>{`{to, subject, body}`}</code> escape hatch through the same pipeline.</td></tr>
<tr><td><span className="tag tag-green">POST</span></td><td><code>/api/communications/orders/&lt;id&gt;/confirmation</code></td><td>Re-sends the order confirmation email.</td></tr>
</tbody>
</table>
</div>
</section>
<section className="section" id="reports">
<div className="sec-header"><div className="sec-num">15</div><h2>Reports &amp; Analytics</h2></div>
<p>All reporting is computed with SQL-level aggregation in <code>app/utils/reports.py</code> — no customer name, email, phone, or password ever appears in an analytics payload. Both report endpoints are restricted to <code>Admin</code> and <code>Manager</code>.</p>
<h3 id="reports-period-sales-reports">Period sales reports</h3>
<div className="endpoint">
<div className="endpoint-head"><span className="method get">GET</span><span className="endpoint-path">/api/reports/&lt;period&gt;</span></div>
<div className="endpoint-body"><p><code>period</code> is one of <code>daily</code>, <code>monthly</code>, <code>yearly</code>. Returns an ordered list of <code>{`{ period, orderCount, revenue }`}</code> buckets, excluding <code>Cancelled</code> orders.</p></div>
</div>
<h3 id="reports-executive-analytics-summary">Executive analytics summary</h3>
<div className="endpoint">
<div className="endpoint-head"><span className="method get">GET</span><span className="endpoint-path">/api/reports/analytics-summary</span></div>
<div className="endpoint-body"><p>Returns one payload covering everything the Reports page charts:</p>
<ul>
<li><strong>executiveTotals</strong> — total revenue, total orders, delivered orders, active orders, average order value</li>
<li><strong>monthlyTrends</strong> — revenue/order-count series for the line chart</li>
<li><strong>categoryBreakdown</strong> — spend, order count and units per category</li>
<li><strong>orderStatusBreakdown</strong> — count and percentage per order status</li>
<li><strong>paymentMethodBreakdown</strong> — count and total amount per payment method (Failed payments excluded)</li>
<li><strong>topProducts</strong> — top 5 products by units sold</li>
</ul></div>
</div>
<h3 id="reports-frontend-visualizations">Frontend visualizations</h3>
<p>Rendered in <code>src/components/charts/ReportCharts.tsx</code> as pure inline SVG (no charting library dependency):</p>
<div className="cards">
<div aria-haspopup="dialog" className="card" data-card="chart-revenue" onClick={() => openCard("chart-revenue")} role="button" tabIndex={0}><h4>Revenue Trajectory</h4><p>Line chart with area gradient over the monthly trend series.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
<div aria-haspopup="dialog" className="card" data-card="chart-category" onClick={() => openCard("chart-category")} role="button" tabIndex={0}><h4>Category Performance</h4><p>Horizontal bar chart of spend per category.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
<div aria-haspopup="dialog" className="card" data-card="chart-lifecycle" onClick={() => openCard("chart-lifecycle")} role="button" tabIndex={0}><h4>Order Lifecycle Breakdown</h4><p>Segmented proportional bar across order statuses.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
<div aria-haspopup="dialog" className="card" data-card="chart-paymentmix" onClick={() => openCard("chart-paymentmix")} role="button" tabIndex={0}><h4>Payment Method Mix</h4><p>Proportional distribution across UPI, Card, Net Banking, COD, Wallet.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
</div>
</section>
<section className="section" id="analytics-projections">
<div className="sec-header"><div className="sec-num">16</div><h2>Revenue Projections &amp; AI Forecasting</h2></div>
<p>Two endpoints share one forecasting core in <code>app/utils/projections.py</code>: a plain statistical projection, and the same numbers plus an optional AI narrative.</p>
<h3 id="analytics-projections-statistical-model">Statistical model</h3>
<p>Forecasts are produced by <strong>ordinary least-squares linear regression</strong>, implemented by hand (no numpy/pandas dependency) over each period's historical revenue from <code>generate_sales_report()</code>: fitting <code>y = a + b·x</code> and projecting forward the requested number of periods (clamped 1–12), floored at zero.</p>
<div className="callout callout-info"><strong>Accuracy note:</strong> the projection engine is a hand-rolled OLS linear regression over period revenue — not a Holt-Winters exponential-smoothing model. It is documented here exactly as implemented in <code>app/utils/projections.py</code>.</div>
<div className="endpoint">
<div className="endpoint-head"><span className="method get">GET</span><span className="endpoint-path">/api/analytics/projections</span><span className="tag tag-blue">Admin, Manager</span></div>
<div className="endpoint-body"><p>Query params: <code>period</code> (<code>daily</code>/<code>monthly</code>/<code>yearly</code>, default <code>monthly</code>), <code>periodsAhead</code> (1–12, default 3). Returns <code>{`{ period, history, forecast }`}</code>.</p></div>
</div>
<h3 id="analytics-projections-ai-narrated-projection">AI-narrated projection</h3>
<div className="endpoint">
<div className="endpoint-head"><span className="method get">GET</span><span className="endpoint-path">/api/analytics/ai-projections</span><span className="tag tag-blue">Admin, Manager</span></div>
<div className="endpoint-body"><p>Wraps the statistical result and adds a <code>narrative</code> field plus <code>aiGenerated</code>:</p>
<ul>
<li>If <code>GEMINI_API_KEY</code> is set, Google Gemini (default model <code>gemini-2.0-flash</code>, overridable via <code>GEMINI_MODEL</code>) generates a 3–4 sentence executive summary, run in a worker thread with a hard 17-second wall-clock timeout so the request can never hang.</li>
<li>If unset, times out, or errors, a templated statistical narrative is returned instead and <code>aiGenerated: false</code> — the endpoint never fails outright.</li>
</ul></div>
</div>
<h3 id="analytics-projections-currency-compliance-strict-inr">Currency compliance (strict INR)</h3>
<p>The Gemini system prompt mandates Indian Rupee formatting and explicitly forbids the <code>$</code> symbol; any narrative text is additionally post-processed to replace stray <code>$</code> characters with <code>₹</code> as a safety net.</p>
</section>
<section className="section" id="database">
<div className="sec-header"><div className="sec-num">17</div><h2>Database Architecture</h2></div>
<p>17 tables, defined across 11 SQLAlchemy model files in <code>app/models/</code>. Primary keys are mostly human-readable string IDs (e.g. <code>ORD-a1b2c</code>, <code>u-003</code>) rather than raw auto-increment integers, matching the frontend's TypeScript response types 1:1.</p>
<h3 id="database-tables-relationships">Tables &amp; relationships</h3>
<div className="tbl-wrap">
<table>
<thead><tr><th>Table</th><th>Key columns</th><th>Relationships</th></tr></thead>
<tbody>
<tr><td><strong>roles</strong></td><td><code>role_id</code> PK, <code>role_name</code> unique</td><td>1–N → users</td></tr>
<tr><td><strong>users</strong></td><td><code>id</code> PK (<code>u-NNN</code>), <code>email</code>/<code>phone</code> unique, <code>password_hash</code>, <code>role_id</code> FK, <code>status</code></td><td>N–1 → roles; 1–N → orders, addresses, wishlist_items</td></tr>
<tr><td><strong>addresses</strong></td><td><code>id</code> PK (<code>ADDR-xxxxx</code>), <code>user_id</code> FK, <code>is_default</code></td><td>N–1 → users</td></tr>
<tr><td><strong>categories</strong></td><td><code>id</code> PK (<code>c-NN</code>), <code>name</code>/<code>slug</code> unique, <code>status</code></td><td>1–N → products</td></tr>
<tr><td><strong>products</strong></td><td><code>id</code> PK (<code>p-NNNN</code>), <code>sku</code> unique, <code>category_id</code> FK, <code>price</code>, <code>stock</code>, <code>status</code></td><td>N–1 → categories; referenced by wishlist_items</td></tr>
<tr><td><strong>orders</strong></td><td><code>id</code> PK (<code>ORD-xxxxx</code>), <code>user_id</code> FK (nullable), <code>amount</code>, <code>status</code>, <code>payment_status</code></td><td>1–N → order_items, order_status_history; 1–1(N) → payments, shipments</td></tr>
<tr><td><strong>order_items</strong></td><td><code>id</code> PK (autoincrement), <code>order_id</code> FK, denormalized <code>product_name</code>/<code>price</code></td><td>N–1 → orders</td></tr>
<tr><td><strong>order_status_history</strong></td><td><code>id</code> PK, <code>order_id</code> FK, <code>status</code>, <code>changed_by</code> FK → users</td><td>N–1 → orders</td></tr>
<tr><td><strong>payments</strong></td><td><code>id</code> PK (<code>PAY-xxxxx</code>), <code>order_id</code> FK, <code>method</code>, <code>status</code></td><td>N–1 → orders; 1–N → payment_status_history; 1–1 → receipts</td></tr>
<tr><td><strong>payment_status_history</strong></td><td><code>id</code> PK, <code>payment_id</code> FK, <code>status</code></td><td>N–1 → payments</td></tr>
<tr><td><strong>receipts</strong></td><td><code>id</code> PK (<code>RCT-xxxxx</code>), <code>payment_id</code> FK unique, <code>receipt_no</code> unique</td><td>1–1 → payments</td></tr>
<tr><td><strong>couriers</strong></td><td><code>id</code> PK (<code>CUR-xxxxx</code>), <code>name</code>/<code>code</code> unique, <code>is_active</code></td><td>1–N → shipments (FK, <code>ON DELETE SET NULL</code>)</td></tr>
<tr><td><strong>shipments</strong></td><td><code>id</code> PK (<code>SHP-xxxxx</code>), <code>order_id</code> FK, <code>courier_id</code> FK (nullable), <code>tracking_number</code>, <code>status</code></td><td>N–1 → orders, couriers; 1–N → shipment_status_history</td></tr>
<tr><td><strong>shipment_status_history</strong></td><td><code>id</code> PK, <code>shipment_id</code> FK, <code>status</code>, <code>location</code>, <code>note</code></td><td>N–1 → shipments</td></tr>
<tr><td><strong>campaigns</strong></td><td><code>id</code> PK (<code>CMP-xxxxx</code>), <code>code</code> unique, <code>discount_type</code>, <code>status</code></td><td>Standalone (emails resolved from active users)</td></tr>
<tr><td><strong>wishlist_items</strong></td><td><code>id</code> PK (UUID), <code>user_id</code> FK, <code>product_id</code> FK, unique <code>(user_id, product_id)</code></td><td>N–1 → users, products</td></tr>
<tr><td><strong>otp_verifications</strong></td><td><code>id</code> PK, <code>phone</code> (indexed), <code>otp_code</code>, <code>expires_at</code>, <code>verified_at</code></td><td>Standalone; matched by phone at verify time</td></tr>
</tbody>
</table>
</div>
<h3 id="database-relationship-diagram">Relationship diagram</h3>
<div className="figure">
<div className="figure-title">Core entity relationships</div>
<div className="erd">
<div className="erd-row"><div className="erd-table">roles</div><span className="erd-arrow">▸ 1:N ▸</span><div className="erd-table">users</div><span className="erd-arrow">▸ 1:N ▸</span><div className="erd-table">addresses</div></div>
<div className="erd-row"><div className="erd-table">users</div><span className="erd-arrow">▸ 1:N ▸</span><div className="erd-table">orders</div><span className="erd-arrow">▸ 1:N ▸</span><div className="erd-table">order_items</div></div>
<div className="erd-row"><div className="erd-table">orders</div><span className="erd-arrow">▸ 1:N ▸</span><div className="erd-table">order_status_history</div></div>
<div className="erd-row"><div className="erd-table">orders</div><span className="erd-arrow">▸ 1:1 ▸</span><div className="erd-table">payments</div><span className="erd-arrow">▸ 1:1 ▸</span><div className="erd-table">receipts</div></div>
<div className="erd-row"><div className="erd-table">payments</div><span className="erd-arrow">▸ 1:N ▸</span><div className="erd-table">payment_status_history</div></div>
<div className="erd-row"><div className="erd-table">orders</div><span className="erd-arrow">▸ 1:N ▸</span><div className="erd-table">shipments</div><span className="erd-arrow">▸ N:1 ▸</span><div className="erd-table">couriers</div></div>
<div className="erd-row"><div className="erd-table">shipments</div><span className="erd-arrow">▸ 1:N ▸</span><div className="erd-table">shipment_status_history</div></div>
<div className="erd-row"><div className="erd-table">categories</div><span className="erd-arrow">▸ 1:N ▸</span><div className="erd-table">products</div><span className="erd-arrow">▸ N:1 ▸</span><div className="erd-table">wishlist_items</div><span className="erd-arrow">▸ N:1 ▸</span><div className="erd-table">users</div></div>
</div>
</div>
<h3 id="database-example-schema-couriers-shipment-fk">Example schema (couriers &amp; shipment FK)</h3>
<pre className="code-block"><button type="button" className="copy-btn" onClick={(e) => handleCopyBlock(e)}>Copy</button>CREATE TABLE IF NOT EXISTS couriers (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    contact_email VARCHAR(120) NULL,
    contact_phone VARCHAR(20) NULL,
    tracking_url_template VARCHAR(255) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL
);

ALTER TABLE shipments
ADD COLUMN courier_id VARCHAR(36) NULL,
ADD CONSTRAINT fk_shipments_courier
FOREIGN KEY (courier_id) REFERENCES couriers(id)
ON DELETE SET NULL;</pre>
<div className="callout callout-success"><strong>Referential safety:</strong> Category deletion is blocked while products reference it; courier deletion is blocked while shipments reference it (409 Conflict) — deactivation is offered instead.</div>
</section>
<section className="section" id="api-docs">
<div className="sec-header"><div className="sec-num">18</div><h2>API Documentation</h2></div>
<p>Base URL: <code>/api</code>. 18 blueprints are registered in <code>app/__init__.py</code>; every protected route is guarded by <code>@roles_required(...)</code>. This section lists every route module and its endpoints as implemented.</p>
<h3 id="api-docs-health">Health</h3>
<div className="endpoint"><div className="endpoint-head"><span className="method get">GET</span><span className="endpoint-path">/api/health</span></div><div className="endpoint-body"><p>Public. Returns <code>{`{"status":"ok","service":"retail-mart-backend"}`}</code>.</p></div></div>
<h3 id="api-docs-auth-api-auth">Auth — <code>/api/auth</code></h3>
<div className="tbl-wrap"><table><thead><tr><th>Method</th><th>Path</th><th>Auth</th><th>Purpose</th></tr></thead><tbody>
<tr><td><span className="tag tag-green">POST</span></td><td><code>/login</code></td><td>Public</td><td>Email + password login, any role.</td></tr>
<tr><td><span className="tag tag-green">POST</span></td><td><code>/register</code></td><td>Public</td><td>Self-service admin-console signup, defaults to <code>Staff</code>.</td></tr>
<tr><td><span className="tag tag-green">POST</span></td><td><code>/signup</code></td><td>Public</td><td>Storefront customer signup; sends welcome email.</td></tr>
<tr><td><span className="tag tag-green">POST</span></td><td><code>/otp/request</code></td><td>Public</td><td>Issues a 6-digit OTP (10-min TTL) to a phone number.</td></tr>
<tr><td><span className="tag tag-green">POST</span></td><td><code>/otp/verify</code></td><td>Public</td><td>Verifies OTP; logs in or silently creates a Customer.</td></tr>
<tr><td><span className="tag tag-blue">GET</span></td><td><code>/me</code></td><td>JWT</td><td>Current user's profile.</td></tr>
</tbody></table></div>
<h3 id="api-docs-users-api-users">Users — <code>/api/users</code></h3>
<div className="tbl-wrap"><table><thead><tr><th>Method</th><th>Path</th><th>Role</th><th>Purpose</th></tr></thead><tbody>
<tr><td><span className="tag tag-blue">GET</span></td><td><code>/</code></td><td>Admin, Manager</td><td>Lists Admin/Manager/Staff accounts (Customers excluded).</td></tr>
<tr><td><span className="tag tag-blue">GET</span></td><td><code>/&lt;id&gt;</code></td><td>Admin, Manager</td><td>Single user detail.</td></tr>
<tr><td><span className="tag tag-green">POST</span></td><td><code>/</code></td><td>Admin</td><td>Create user; default password <code>changeme123</code> if none supplied.</td></tr>
<tr><td><span className="tag tag-amber">PUT</span></td><td><code>/&lt;id&gt;</code></td><td>Admin</td><td>Update name/email/role/status.</td></tr>
<tr><td><span className="tag tag-purple">PATCH</span></td><td><code>/&lt;id&gt;/status</code></td><td>Admin</td><td>Activate/deactivate.</td></tr>
<tr><td><span className="tag tag-red">DELETE</span></td><td><code>/&lt;id&gt;</code></td><td>Admin</td><td>Hard delete.</td></tr>
</tbody></table></div>
<h3 id="api-docs-products-api-products-categories-api">Products — <code>/api/products</code> &amp; Categories — <code>/api/categories</code></h3>
<p>See <a href="#products-categories">Products &amp; Categories</a> for the full endpoint table.</p>
<h3 id="api-docs-orders-api-orders-payments-api-payments">Orders — <code>/api/orders</code> &amp; Payments — <code>/api/payments</code> &amp; Receipts — <code>/api/receipts</code></h3>
<p>See <a href="#cart-checkout-orders">Cart, Checkout &amp; Orders</a> and <a href="#payments">Payments</a>. Receipts additionally exposes <code>GET /api/receipts</code> and <code>GET /api/receipts/&lt;id&gt;</code> (Admin/Manager/Staff) and <code>POST /api/receipts</code> (Admin/Manager, requires the payment to already be <code>Paid</code>).</p>
<h3 id="api-docs-shipments-api-shipments-couriers-api">Shipments — <code>/api/shipments</code> &amp; Couriers — <code>/api/couriers</code></h3>
<p>See <a href="#shipping-couriers">Shipping &amp; Couriers</a> for the full endpoint table.</p>
<h3 id="api-docs-dashboard-api-dashboard">Dashboard — <code>/api/dashboard</code></h3>
<div className="endpoint"><div className="endpoint-head"><span className="method get">GET</span><span className="endpoint-path">/api/dashboard/summary</span><span className="tag tag-blue">Admin, Manager, Staff</span></div><div className="endpoint-body"><p>Returns 5 live KPI cards for the admin dashboard: Active Users, Total Products, Pending Orders, Total Payments (Paid), Pending Shipments — each computed directly from the database.</p></div></div>
<h3 id="api-docs-customer-stats-api-customer-stats">Customer Stats — <code>/api/customer/stats</code></h3>
<div className="endpoint"><div className="endpoint-head"><span className="method get">GET</span><span className="endpoint-path">/api/customer/stats/summary</span><span className="tag tag-blue">Customer</span></div><div className="endpoint-body"><p>Returns <code>totalOrders</code>, <code>totalSpent</code>, <code>totalItemsPurchased</code>, <code>uniqueProductsPurchased</code>, <code>activeShipments</code>, <code>lastOrderDate</code>, <code>last30DaysOrders</code>, <code>last30DaysSpent</code>, and a <code>categoryBreakdown</code> array — all strictly scoped to the caller's own orders.</p></div></div>
<h3 id="api-docs-addresses-api-addresses">Addresses — <code>/api/addresses</code></h3>
<div className="tbl-wrap"><table><thead><tr><th>Method</th><th>Path</th><th>Role</th><th>Notes</th></tr></thead><tbody>
<tr><td><span className="tag tag-blue">GET</span></td><td><code>/</code></td><td>Customer</td><td>Own addresses only.</td></tr>
<tr><td><span className="tag tag-green">POST</span></td><td><code>/</code></td><td>Customer</td><td>First address for a user is auto-marked default; setting <code>isDefault</code> clears the previous default.</td></tr>
<tr><td><span className="tag tag-amber">PUT</span></td><td><code>/&lt;id&gt;</code></td><td>Customer</td><td>Owner-scoped update.</td></tr>
<tr><td><span className="tag tag-red">DELETE</span></td><td><code>/&lt;id&gt;</code></td><td>Customer</td><td>Owner-scoped delete.</td></tr>
</tbody></table></div>
<h3 id="api-docs-wishlist-api-wishlist-campaigns-api">Wishlist — <code>/api/wishlist</code>, Campaigns — <code>/api/campaigns</code>, Communications — <code>/api/communications</code></h3>
<p>See <a href="#wishlist">Wishlist</a>, <a href="#campaigns">Campaigns</a>, and <a href="#notifications-email">Email / Notifications</a> respectively.</p>
<h3 id="api-docs-reports-api-reports-analytics-api">Reports — <code>/api/reports</code> &amp; Analytics — <code>/api/analytics</code></h3>
<p>See <a href="#reports">Reports &amp; Analytics</a> and <a href="#analytics-projections">AI Revenue Projections</a>.</p>
<h3 id="api-docs-standard-error-shape">Standard error shape</h3>
<pre className="code-block"><button type="button" className="copy-btn" onClick={(e) => handleCopyBlock(e)}>Copy</button>{`{
  "error": "Human-readable description of what went wrong"
}`}</pre>
<p>404 for unknown routes, 400 for malformed input (also raised as Flask's default 400 handler), 500 for unhandled server errors — all three return this same JSON shape from the application factory's error handlers.</p>
</section>
<section className="section" id="frontend-architecture">
<div className="sec-header"><div className="sec-num">19</div><h2>Frontend Architecture</h2></div>
<p>Single React 18 + TypeScript SPA (<code>retail-mart-frontend-connected/retail-mart-week2-final</code>) built with Vite, routed by <code>react-router-dom</code> from one file, <code>src/app/router.tsx</code>.</p>
<h3 id="frontend-architecture-two-portals-one-router">Two portals, one router</h3>
<div className="cards">
<div aria-haspopup="dialog" className="card" data-card="portal-admin" onClick={() => openCard("portal-admin")} role="button" tabIndex={0}><h4>Admin Console</h4><p>Everything under <code>/</code>: <code>AdminLayout</code> wraps Dashboard, Users, Products, Categories, Orders, Payments, Refunds, Shipping, Couriers, Communications, Campaigns, Reports, Analytics, Profile — gated by <code>ProtectedRoute allowedRoles={["Admin","Manager","Staff"]}</code>, redirecting to <code>/login</code>.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
<div aria-haspopup="dialog" className="card" data-card="portal-storefront" onClick={() => openCard("portal-storefront")} role="button" tabIndex={0}><h4>Storefront</h4><p>Everything under <code>/shop</code>: <code>StorefrontLayout</code> wraps Home, Product Detail, and Cart (public); Checkout, My Orders, Account and Wishlist are gated by <code>ProtectedRoute allowedRoles={["Customer"]}</code>, redirecting to <code>/shop/login</code>.</p><span className="card-more">View details <span className="arrow">→</span></span></div>
</div>
<p><code>/payments/refunds</code> is deliberately its own static route (not a query param on <code>/payments</code>) so React Router's static-segment ranking guarantees it never collides with the dynamic <code>/payments/:id</code> route.</p>
<h3 id="frontend-architecture-project-structure">Project structure</h3>
<div className="tbl-wrap">
<table>
<thead><tr><th>Directory</th><th>Contents</th></tr></thead>
<tbody>
<tr><td><code>src/app/</code></td><td>Router (<code>router.tsx</code>) and top-level <code>App.tsx</code></td></tr>
<tr><td><code>src/layouts/</code></td><td><code>AdminLayout</code>, <code>StorefrontLayout</code></td></tr>
<tr><td><code>src/components/</code></td><td>UI primitives — auth guards, common components, layout chrome, SVG chart components (<code>charts/ReportCharts.tsx</code>), UI kit</td></tr>
<tr><td><code>src/features/</code></td><td>Domain modules: <code>auth</code>, <code>addresses</code>, <code>campaigns</code>, <code>cart</code>, <code>categories</code>, <code>communications</code>, <code>couriers</code>, <code>dashboard</code>, <code>orders</code>, <code>payments</code>, <code>products</code>, <code>razorpay</code>, <code>shipping</code>, <code>shop</code>, <code>users</code>, <code>wishlist</code></td></tr>
<tr><td><code>src/pages/</code></td><td>33 route-level page components (Dashboard, Products, Orders, Shipping, Reports, Analytics, Shop*, Account, Cart, Checkout, etc.)</td></tr>
<tr><td><code>src/services/api/</code></td><td>Centralized HTTP client — every request attaches the JWT and points at <code>VITE_API_BASE_URL</code></td></tr>
<tr><td><code>src/types/</code></td><td>Shared TypeScript interfaces mirrored 1:1 by every backend model's <code>to_dict()</code></td></tr>
<tr><td><code>src/context/</code>, <code>src/hooks/</code></td><td>AuthContext (shared JWT/role state) and reusable hooks</td></tr>
</tbody>
</table>
</div>
<div className="callout callout-info"><strong>Type-safe contract:</strong> Every SQLAlchemy model's <code>to_dict()</code> method is written with an explicit comment mapping it to a specific <code>src/types/*.ts</code> interface, keeping the API and frontend types in lockstep by convention.</div>
</section>
<section className="section" id="security">
<div className="sec-header"><div className="sec-num">20</div><h2>Security</h2></div>
<div className="tbl-wrap">
<table>
<thead><tr><th>Layer</th><th>Mechanism</th><th>Detail</th></tr></thead>
<tbody>
<tr><td><strong>Identity</strong></td><td><code>Flask-JWT-Extended</code> (HS256)</td><td>8-hour access tokens, <code>role</code>/<code>email</code>/<code>name</code> claims, header-only token location.</td></tr>
<tr><td><strong>Passwords</strong></td><td><code>werkzeug.security</code></td><td>Salted hashing via <code>generate_password_hash</code> / <code>check_password_hash</code> — never stored in plaintext.</td></tr>
<tr><td><strong>Authorization</strong></td><td><code>@roles_required(...)</code></td><td>Server-side decorator on every sensitive route; verifies JWT then checks the <code>role</code> claim against an allow-list.</td></tr>
<tr><td><strong>Data isolation</strong></td><td>Query-level scoping</td><td>Customer-facing endpoints (orders/mine, wishlist, addresses, customer stats, payment/shipment ownership checks) always filter by <code>get_jwt_identity()</code>.</td></tr>
<tr><td><strong>PII protection</strong></td><td>SQL aggregation</td><td>Reports/analytics endpoints aggregate strictly with <code>SUM</code>/<code>COUNT</code>/<code>AVG</code>/<code>GROUP BY</code>, never selecting name/email/phone columns.</td></tr>
<tr><td><strong>Transport</strong></td><td>CORS allow-list</td><td><code>flask-cors</code> restricted to explicit <code>CORS_ORIGINS</code>, with <code>Content-Disposition</code> explicitly exposed so PDF downloads get correct filenames.</td></tr>
<tr><td><strong>Referential integrity</strong></td><td>FK constraints + guards</td><td>Category/courier deletion blocked (409) while referenced; cascading deletes configured for order/payment/shipment child records.</td></tr>
<tr><td><strong>Secrets management</strong></td><td>Environment variables</td><td>No credentials checked into source; <code>.env</code> loaded via <code>python-dotenv</code>, with <code>.env.example</code> as the template.</td></tr>
<tr><td><strong>Database transport</strong></td><td>MySQL SSL auto-detection</td><td><code>app/config.py</code> detects SSL-requiring hosts (e.g. Aiven) from the connection string and configures PyMySQL's <code>ssl</code> connect args accordingly.</td></tr>
</tbody>
</table>
</div>
<div className="callout callout-info"><strong>Enforcement point:</strong> Role and ownership checks live entirely in the Flask route layer. Removing a button from the React UI is a UX convenience only — every protected endpoint independently re-validates the caller's role and, where relevant, resource ownership.</div>
</section>
<section className="section" id="environment-config">
<div className="sec-header"><div className="sec-num">21</div><h2>Environment Configuration</h2></div>
<h3 id="environment-config-backend-env">Backend (<code>.env</code>)</h3>
<div className="tbl-wrap">
<table>
<thead><tr><th>Variable</th><th>Purpose</th><th>Default / fallback</th></tr></thead>
<tbody>
<tr><td><code>FLASK_ENV</code></td><td>Selects config class</td><td><code>development</code></td></tr>
<tr><td><code>DATABASE_URL</code></td><td>MySQL connection string</td><td>Falls back to local SQLite (<code>retail_mart.db</code>) if unset</td></tr>
<tr><td><code>JWT_SECRET_KEY</code></td><td>JWT signing key</td><td><code>dev-jwt-secret-change-me</code> (dev only)</td></tr>
<tr><td><code>CORS_ORIGINS</code></td><td>Allowed frontend origins</td><td>Always includes local Vite ports 5173/5174</td></tr>
<tr><td><code>SMTP_HOST</code> / <code>SMTP_PORT</code> / <code>SMTP_USERNAME</code> / <code>SMTP_PASSWORD</code> / <code>MAIL_FROM</code></td><td>Transactional email delivery</td><td>Unset → emails logged to console instead of sent</td></tr>
<tr><td><code>RAZORPAY_KEY_ID</code> / <code>RAZORPAY_KEY_SECRET</code></td><td>Live RazorPay checkout</td><td>Unset → mock RazorPay client simulates the flow</td></tr>
<tr><td><code>TWILIO_ACCOUNT_SID</code> / <code>TWILIO_AUTH_TOKEN</code> / <code>TWILIO_FROM_NUMBER</code></td><td>SMS delivery for OTP login</td><td>Unset → OTP codes logged to console</td></tr>
<tr><td><code>GEMINI_API_KEY</code> / <code>GEMINI_MODEL</code></td><td>AI narrative for revenue projections</td><td>Unset → templated statistical narrative used instead</td></tr>
<tr><td><code>TRACKINGMORE_API_KEY</code> / <code>SHIP24_API_KEY</code></td><td>Live courier tracking lookups</td><td>Unset → Carrier Sandbox adapter simulates checkpoints</td></tr>
<tr><td><code>COURIER_BOOKING_API_URL</code> / <code>COURIER_BOOKING_API_KEY</code></td><td>Live AWB booking</td><td>Unset → carrier-spec AWB numbers generated locally</td></tr>
</tbody>
</table>
</div>
<h3 id="environment-config-frontend-env">Frontend (<code>.env</code>)</h3>
<div className="tbl-wrap">
<table>
<thead><tr><th>Variable</th><th>Purpose</th><th>Example</th></tr></thead>
<tbody>
<tr><td><code>VITE_API_BASE_URL</code></td><td>Base URL the browser calls</td><td><code>http://localhost:4000/api</code></td></tr>
</tbody>
</table>
</div>
</section>
<section className="section" id="deployment">
<div className="sec-header"><div className="sec-num">22</div><h2>Deployment</h2></div>
<p>Retail Mart deploys as two decoupled Vercel projects.</p>
<div className="steps">
<div className="step"><div className="step-n">1</div><div className="step-body"><h4>Frontend — static SPA</h4><p>Built with <code>npm run build</code> (<code>tsc -b &amp;&amp; vite build</code>) into optimized static assets; <code>vercel.json</code> rewrites deep links (<code>/login</code>, <code>/shop</code>, <code>/cart</code>, <code>/wishlist</code>, <code>/shipping</code>, etc.) to <code>index.html</code> so client-side routing survives a hard refresh.</p></div></div>
<div className="step"><div className="step-n">2</div><div className="step-body"><h4>Backend — serverless Flask</h4><p>Deployed via <code>api/index.py</code> as a serverless Python WSGI handler; <code>vercel.json</code> routes all <code>/api/*</code> traffic to that function; connects to a managed MySQL instance over SSL.</p></div></div>
</div>
<h3 id="deployment-local-development-setup">Local development setup</h3>
<pre className="code-block"><button type="button" className="copy-btn" onClick={(e) => handleCopyBlock(e)}>Copy</button># Backend
cd retail-mart-backend/retail-mart-backend
python -m venv venv &amp;&amp; source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python seed.py
python run.py            # http://localhost:4000

# Frontend
cd retail-mart-frontend-connected/retail-mart-week2-final
npm install
npm run dev               # http://localhost:5173</pre>
<div className="callout callout-success"><strong>Verify locally:</strong> <code>curl http://localhost:4000/api/health</code> should return <code>{`{"status":"ok","service":"retail-mart-backend"}`}</code>.</div>
</section>
<section className="section" id="troubleshooting">
<div className="sec-header"><div className="sec-num">23</div><h2>Troubleshooting</h2></div>
<div className="tbl-wrap">
<table>
<thead><tr><th>Symptom</th><th>Likely cause</th><th>Fix</th></tr></thead>
<tbody>
<tr><td>Frontend can't reach the API (network errors in console)</td><td><code>VITE_API_BASE_URL</code> not pointing at the running backend, or a CORS origin mismatch</td><td>Confirm the backend is running on the expected port and that its origin is listed in <code>CORS_ORIGINS</code></td></tr>
<tr><td>403 Forbidden on an admin endpoint</td><td>Logged-in role is not in the endpoint's <code>@roles_required(...)</code> allow-list</td><td>Check the <a href="#user-roles">permission matrix</a>; log in as a role with sufficient access</td></tr>
<tr><td>Emails not arriving</td><td><code>SMTP_HOST</code> unset (dev fallback logs to console) or wrong port/credentials</td><td>Check <code>GET /api/communications/smtp-status</code>; verify SSL uses port 465 and STARTTLS uses 587</td></tr>
<tr><td>Order/shipment status update returns 409</td><td>Requested status isn't the next allowed step in the workflow</td><td>Follow the sequential transitions in <a href="#cart-checkout-orders">Orders</a> / <a href="#shipping-couriers">Shipping</a> — statuses cannot be skipped</td></tr>
<tr><td>AI projection narrative missing / falls back to statistical text</td><td><code>GEMINI_API_KEY</code> unset, invalid, quota exhausted, or the call exceeded the 17s timeout</td><td>Check server logs (errors are logged, not silenced); the numeric forecast is still returned either way</td></tr>
<tr><td>Cannot delete a category or courier (409 Conflict)</td><td>Products still reference the category, or shipments still reference the courier</td><td>Reassign/remove the referencing records first, or deactivate the courier instead of deleting it</td></tr>
<tr><td>MySQL connection fails with an SSL error</td><td>Managed host (e.g. Aiven) requires SSL but no CA cert is mounted</td><td>Set <code>MYSQL_CA_CERT</code>/<code>AIVEN_CA_CERT</code>, or rely on the documented insecure-TLS fallback for local testing only</td></tr>
<tr><td>RazorPay checkout works but no real charge occurs</td><td><code>RAZORPAY_KEY_ID</code>/<code>RAZORPAY_KEY_SECRET</code> unset — mock client is active</td><td>Expected in development; set real keys for a live integration</td></tr>
</tbody>
</table>
</div>
</section>

          </main>

          <footer>
            <strong>Retail Mart</strong> — Official Technical Documentation<br />
            Enterprise Retail &amp; E-Commerce Management Platform · React 18 · Flask 3.0 · MySQL 8.0<br /><br />
            Generated from source · Version 1.0 · September 2026
          </footer>
        </div>
      </div>

      <button
        aria-label="Back to top"
        className={`btn-top ${showTopBtn ? "show" : ""}`}
        id="btnTop"
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        ↑
      </button>

      <div
        aria-labelledby="modalTitle"
        aria-modal="true"
        className={`modal-overlay ${activeModalData ? "open" : ""}`}
        id="cardModalOverlay"
        role="dialog"
        onClick={(e) => {
          if (e.target === e.currentTarget) setActiveCardKey(null);
        }}
      >
        {activeModalData && (
          <div className="modal-box" role="document" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div
                className="modal-icon"
                id="modalIcon"
                dangerouslySetInnerHTML={{ __html: activeModalData.icon || "◉" }}
              />
              <div className="modal-headtext">
                <span className="modal-tag" id="modalTag">{activeModalData.tag || "Detail"}</span>
                <h3 id="modalTitle">{activeModalData.title}</h3>
              </div>
              <button
                aria-label="Close"
                className="modal-close"
                id="modalClose"
                type="button"
                onClick={() => setActiveCardKey(null)}
              >
                ✕
              </button>
            </div>
            <div
              className="modal-body"
              id="modalBody"
              dangerouslySetInnerHTML={{ __html: activeModalData.body }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
