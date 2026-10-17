import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import {
  fetchOpenApiSpec,
  flattenOperations,
  getApiBaseUrl,
  getSwaggerUrl,
  generateSampleJson,
} from "@/services/api/docs";
import type { OpenAPISpec, FlatOperation } from "@/types/openapi";
import { Logo } from "@/components/common/Logo";
import { DocumentationAmbientBackground } from "@/features/docs/components/DocumentationAmbientBackground";
import { DocumentationHeroAtmosphere } from "@/features/docs/components/DocumentationHeroAtmosphere";
import { useScrollReveal } from "@/features/docs/hooks/useScrollReveal";
import "./officialDocs.css";
import "./apiDocs.css";

interface SearchMatch {
  id: string;
  title: string;
  snippet: string;
  isEndpoint?: boolean;
}

const TAG_ICONS: Record<string, string> = {
  Authentication: "🔑",
  Users: "👤",
  Categories: "🏷",
  Products: "📦",
  Orders: "🛒",
  Payments: "💳",
  Receipts: "🧾",
  Shipments: "🚚",
  Addresses: "📍",
  Campaigns: "🎉",
  Couriers: "🚛",
  Analytics: "📈",
  Reports: "📊",
  Dashboard: "📱",
  "Customer Statistics": "🎯",
  Communications: "✉",
  Wishlist: "♡",
  System: "⚙",
};

const TAG_DESCRIPTIONS: Record<string, string> = {
  Authentication: "User authentication, credential validation, OTP mobile verification, and JWT session management.",
  Users: "Operations for managing staff accounts, user permissions, customer records, and administrative directory.",
  Categories: "Operations for product categories, catalog hierarchy, and category metadata.",
  Products: "Operations for retrieving and managing product information, including catalog data, filtering, and product administration where authorized.",
  Orders: "Order creation, lifecycle progression, order history retrieval, and invoice generation.",
  Payments: "Payment capture, Razorpay verification, payment records, and refund processing.",
  Receipts: "Official payment receipts, transaction proof, and financial audit history.",
  Shipments: "Package fulfillment, courier assignment, automated AWB tracking generation, and live carrier tracking.",
  Addresses: "Customer shipping and billing address book management with postal auto-fill.",
  Campaigns: "Promotional discount campaigns, marketing templates, and promotional email broadcasts.",
  Couriers: "Integrated shipping courier partners, carrier status tracking, and registry management.",
  Analytics: "Revenue projections, AI-assisted forecasting, and sales trend analytics.",
  Reports: "Periodic sales reports, top-performing product summaries, and executive business intelligence.",
  Dashboard: "Real-time KPI counters, executive summaries, and operational statistics.",
  "Customer Statistics": "Customer lifetime spend, order volume summaries, and customer segmentation metrics.",
  Communications: "Transactional email notifications, lifecycle email delivery, and mail system diagnostics.",
  Wishlist: "Customer saved favorite products, wishlist bookmarks, and cart migration.",
  System: "API health checks, database connectivity status, and backend operational vitals.",
};

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function getRoleTagClass(role: string): string {
  switch (role) {
    case "Public":
      return "tag-green";
    case "Customer":
      return "tag-blue";
    case "Staff, Manager, or Admin":
    case "Manager or Admin":
      return "tag-amber";
    case "Admin":
      return "tag-red";
    default:
      return "tag-grey";
  }
}

export default function ApiDocumentationPage() {
  const swaggerUrl = getSwaggerUrl();
  const apiBaseUrl = getApiBaseUrl();

  const [spec, setSpec] = useState<OpenAPISpec | null>(null);
  useScrollReveal(spec);
  const [isLive, setIsLive] = useState(true);
  const [sourceUrl, setSourceUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [indicatorText, setIndicatorText] = useState("Overview");
  const [showTopBtn, setShowTopBtn] = useState(false);

  const [theme, setTheme] = useState<string>(() => {
    try {
      return localStorage.getItem("rm-doc-theme") || (document.documentElement.getAttribute("data-theme") || "dark");
    } catch {
      return "dark";
    }
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchMatch[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [selectedMethod, setSelectedMethod] = useState<string>("ALL");
  const [filterQuery, setFilterQuery] = useState<string>("");
  const [expandedEndpoints, setExpandedEndpoints] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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

  const loadSpecification = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const result = await fetchOpenApiSpec();
      setSpec(result.spec);
      setIsLive(result.isLive);
      setSourceUrl(result.sourceUrl);
      if (result.error && !result.isLive) {
        setErrorMsg(result.error);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to load live API specification.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSpecification();
  }, [loadSpecification]);

  const allOperations = useMemo(() => {
    if (!spec) return [];
    return flattenOperations(spec);
  }, [spec]);

  const allTags = useMemo(() => {
    if (spec?.tags && spec.tags.length > 0) {
      return spec.tags.map((t) => t.name);
    }
    const tagsFromOps = Array.from(new Set(allOperations.map((o) => o.tag)));
    return tagsFromOps.sort();
  }, [spec, allOperations]);

  const methodCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: allOperations.length,
      GET: 0,
      POST: 0,
      PUT: 0,
      PATCH: 0,
      DELETE: 0,
    };
    for (const op of allOperations) {
      const m = op.method.toUpperCase();
      if (counts[m] !== undefined) {
        counts[m] += 1;
      }
    }
    return counts;
  }, [allOperations]);

  const filteredOperations = useMemo(() => {
    const q = filterQuery.toLowerCase().trim();
    return allOperations.filter((op) => {
      const matchesMethod = selectedMethod === "ALL" || op.method.toUpperCase() === selectedMethod;
      if (!matchesMethod) return false;

      if (!q) return true;
      return (
        op.path.toLowerCase().includes(q) ||
        op.method.toLowerCase().includes(q) ||
        op.summary.toLowerCase().includes(q) ||
        op.description.toLowerCase().includes(q) ||
        op.tag.toLowerCase().includes(q) ||
        op.role.toLowerCase().includes(q)
      );
    });
  }, [allOperations, selectedMethod, filterQuery]);

  const groupedByTag = useMemo(() => {
    const map = new Map<string, FlatOperation[]>();
    for (const tag of allTags) {
      map.set(tag, []);
    }
    for (const op of filteredOperations) {
      if (!map.has(op.tag)) {
        map.set(op.tag, []);
      }
      map.get(op.tag)!.push(op);
    }
    return map;
  }, [allTags, filteredOperations]);

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
        setIsSearchOpen(true);
      } else if (e.key === "Escape") {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined" || loading) return;
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
  }, [loading, spec]);

  useEffect(() => {
    document.querySelectorAll(".nav-link").forEach((l) => {
      if (l.getAttribute("data-target") === activeSection) {
        l.classList.add("active");
      } else {
        l.classList.remove("active");
      }
    });
  }, [activeSection]);

  const handleTopSearch = (value: string) => {
    setSearchQuery(value);
    const q = value.trim().toLowerCase();
    if (!q) {
      setSearchResults([]);
      setIsSearchOpen(false);
      return;
    }

    const matches: SearchMatch[] = [];

    const staticSecs = [
      { id: "overview", title: "API Documentation Overview", desc: "Base URL, architecture overview, and core protocols." },
      { id: "getting-started", title: "Getting Started Guide", desc: "4-step quickstart authentication and request flow." },
      { id: "authentication", title: "Authentication (JWT & OTP)", desc: "Stateless Bearer JWT login, signup, and OTP endpoints." },
      { id: "roles-permissions", title: "Roles & Permissions Matrix", desc: "Admin, Manager, Staff, Customer authorization rules." },
      { id: "error-handling", title: "API Error Handling", desc: "HTTP status codes and standard JSON error response shape." },
      { id: "interactive-swagger", title: "Interactive Swagger UI", desc: "Direct browser-based interactive endpoint testing." },
      { id: "ecosystem", title: "Documentation Ecosystem", desc: "Comparison between FSD, API Documentation, and Swagger." },
    ];

    for (const sec of staticSecs) {
      if (sec.title.toLowerCase().includes(q) || sec.desc.toLowerCase().includes(q)) {
        matches.push({ id: sec.id, title: sec.title, snippet: sec.desc });
      }
    }

    for (const op of allOperations) {
      const pathMatch = op.path.toLowerCase().includes(q);
      const methodMatch = op.method.toLowerCase() === q;
      const sumMatch = op.summary.toLowerCase().includes(q);
      const descMatch = op.description.toLowerCase().includes(q);
      const tagMatch = op.tag.toLowerCase().includes(q);

      if (pathMatch || methodMatch || sumMatch || descMatch || tagMatch) {
        matches.push({
          id: op.id,
          title: `${op.method.toUpperCase()} ${op.path}`,
          snippet: `${op.tag}: ${op.summary || op.description || "Endpoint operation"}`,
          isEndpoint: true,
        });
        if (matches.length >= 10) break;
      }
    }

    setSearchResults(matches);
    setIsSearchOpen(true);
  };

  const handleSearchResultClick = (targetId: string, isEndpoint?: boolean) => {
    setIsSearchOpen(false);
    setSearchQuery("");
    setIsMobileOpen(false);

    if (isEndpoint) {
      setExpandedEndpoints((prev) => ({ ...prev, [targetId]: true }));
    }

    setTimeout(() => {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);
  };

  const toggleEndpoint = (id: string) => {
    setExpandedEndpoints((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const allExp: Record<string, boolean> = {};
    for (const op of filteredOperations) {
      allExp[op.id] = true;
    }
    setExpandedEndpoints(allExp);
  };

  const collapseAll = () => {
    setExpandedEndpoints({});
  };

  const handleCopyText = (text: string, key: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 1500);
      });
    }
  };

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
                <span>API Documentation</span>
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
                  fontWeight: "600",
                  background: "var(--sidebar-bg2)",
                  color: "var(--sidebar-text-muted)",
                  border: "1px solid var(--sidebar-border)",
                  textDecoration: "none",
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
                  fontWeight: "700",
                  background: "var(--sidebar-active-bg)",
                  color: "var(--sidebar-active-text)",
                  border: "1px solid var(--accent)",
                  textDecoration: "none",
                }}
              >
                API Documentation →
              </Link>
            </div>
          </div>

          <nav aria-label="API Documentation navigation" className="sidebar-nav" id="sidebarNav">
            <div className="nav-group-title">Overview</div>
            <a
              className="nav-link"
              data-target="overview"
              href="#overview"
              onClick={() => setIsMobileOpen(false)}
            >
              <span className="ic">◉</span>
              <span className="lbl">Overview</span>
            </a>
            <a
              className="nav-link"
              data-target="getting-started"
              href="#getting-started"
              onClick={() => setIsMobileOpen(false)}
            >
              <span className="ic">⚡</span>
              <span className="lbl">Getting Started</span>
            </a>
            <a
              className="nav-link"
              data-target="authentication"
              href="#authentication"
              onClick={() => setIsMobileOpen(false)}
            >
              <span className="ic">🔑</span>
              <span className="lbl">Authentication</span>
            </a>
            <a
              className="nav-link"
              data-target="roles-permissions"
              href="#roles-permissions"
              onClick={() => setIsMobileOpen(false)}
            >
              <span className="ic">👥</span>
              <span className="lbl">Roles &amp; Permissions</span>
            </a>

            <div className="nav-group-title">
              API Modules ({allTags.length})
            </div>
            {allTags.map((tag) => {
              const targetId = `module-${slugify(tag)}`;
              const count = allOperations.filter((o) => o.tag === tag).length;
              const icon = TAG_ICONS[tag] || "📦";
              return (
                <a
                  key={tag}
                  className="nav-link"
                  data-target={targetId}
                  href={`#${targetId}`}
                  onClick={() => setIsMobileOpen(false)}
                >
                  <span className="ic">{icon}</span>
                  <span className="lbl" style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                    <span>{tag}</span>
                    <span style={{ opacity: 0.65, fontSize: "11px", fontWeight: 700 }}>{count}</span>
                  </span>
                </a>
              );
            })}

            <div className="nav-group-title">Developer Reference</div>
            <a
              className="nav-link"
              data-target="error-handling"
              href="#error-handling"
              onClick={() => setIsMobileOpen(false)}
            >
              <span className="ic">🛡</span>
              <span className="lbl">Error Handling</span>
            </a>
            <a
              className="nav-link"
              data-target="interactive-swagger"
              href="#interactive-swagger"
              onClick={() => setIsMobileOpen(false)}
            >
              <span className="ic">⚡</span>
              <span className="lbl">Swagger UI</span>
            </a>
            <a
              className="nav-link"
              data-target="ecosystem"
              href="#ecosystem"
              onClick={() => setIsMobileOpen(false)}
            >
              <span className="ic">⊞</span>
              <span className="lbl">Documentation Ecosystem</span>
            </a>
          </nav>

          <div className="sidebar-footer">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>v1.0 · Sep 2026</span>
              <a
                href={swaggerUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--accent)", fontWeight: "bold", textDecoration: "none" }}
              >
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
                <span>REST API Documentation</span>
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
                onChange={(e) => handleTopSearch(e.target.value)}
                onFocus={() => searchQuery.trim() && setIsSearchOpen(true)}
              />
              <span className="search-kbd">/</span>

              <div className={`search-results ${isSearchOpen ? "open" : ""}`} id="searchResults">
                {searchResults.length === 0 && searchQuery.trim() && (
                  <div className="search-empty">No matching items for &ldquo;{searchQuery}&rdquo;</div>
                )}
                {searchResults.map((item) => (
                  <div
                    key={item.id}
                    className="search-result-item"
                    onClick={() => handleSearchResultClick(item.id, item.isEndpoint)}
                  >
                    <span className="sr-title">{item.title}</span>
                    <span className="sr-snip">{item.snippet}&hellip;</span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              to={ROUTES.helpFsd}
              className="icon-btn"
              title="View Functional Documentation"
              style={{ width: "auto", padding: "0 10px", fontSize: "12px", fontWeight: "700", gap: "4px", textDecoration: "none" }}
            >
              Functional Documentation →
            </Link>

            <a
              href={swaggerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="icon-btn"
              title="Open Interactive Swagger UI in a new tab"
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
            <div className="hero" id="top">
              <DocumentationHeroAtmosphere />
              <div className="hero-inner">
                <span className="hero-badge">API DOCUMENTATION</span>
                <h1 id="hero-title" aria-label="Retail Mart REST API Documentation">
                  Retail Mart REST <em>API Documentation</em>
                </h1>
                <div className="hero-sub">
                  Developer documentation for the Retail Mart REST API, including authentication, resources, request and response formats, permissions, and API usage.
                </div>
                <p className="hero-desc">
                  Developer reference for authentication, resources, business operations, request formats, responses, permissions, and API integration.
                </p>

                <div className="hero-actions" style={{ display: "flex", gap: "12px", marginTop: "20px", flexWrap: "wrap" }}>
                  <Link
                    to={ROUTES.helpFsd}
                    className="hero-cta-btn"
                    style={{
                      background: "rgba(255,255,255,0.15)",
                      border: "1px solid rgba(255,255,255,0.3)",
                      color: "#fff",
                      padding: "8px 16px",
                      borderRadius: "8px",
                      fontWeight: "700",
                      fontSize: "13px",
                      textDecoration: "none",
                    }}
                  >
                    View Functional Documentation →
                  </Link>
                  <a
                    href={swaggerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hero-cta-btn swagger-link"
                    style={{
                      background: "rgba(255,255,255,0.15)",
                      border: "1px solid rgba(255,255,255,0.3)",
                      color: "#fff",
                      padding: "8px 16px",
                      borderRadius: "8px",
                      fontWeight: "700",
                      fontSize: "13px",
                      textDecoration: "none",
                    }}
                  >
                    Open Swagger UI <span className="swagger-arrow">⚡</span>
                  </a>
                </div>

                <div className="hero-meta">
                  <div><strong>REST / JSON</strong>API Architecture</div>
                  <div><strong>JWT Bearer</strong>Authentication</div>
                  <div><strong>Role-Based Access</strong>Authorization</div>
                  <div><strong>Swagger UI</strong>Interactive Testing</div>
                </div>
              </div>
            </div>

            <div className="cards">
              <div className="card">
                <div className="card-icon blue">⚡</div>
                <h4>API Operations</h4>
                <p>
                  <strong>{loading ? "..." : allOperations.length} Operations</strong> dynamically retrieved from the OpenAPI specification across all resources.
                </p>
              </div>
              <div className="card">
                <div className="card-icon green">📦</div>
                <h4>API Resource Modules</h4>
                <p>
                  <strong>{loading ? "..." : allTags.length} Modules</strong> grouping business operations, endpoints, workflows, and catalog data.
                </p>
              </div>
              <div className="card">
                <div className="card-icon amber">🔑</div>
                <h4>Authentication</h4>
                <p>
                  <strong>JWT Bearer Authentication</strong> with role claims and token expiry for secure stateless API access.
                </p>
              </div>
              <div className="card">
                <div className="card-icon purple">⚡</div>
                <h4>Interactive Testing</h4>
                <p>
                  <strong>Swagger UI</strong> integration enabling live schema exploration and interactive request execution.
                </p>
              </div>
            </div>

            {loading && (
              <section className="section">
                <div className="sec-header">
                  <div className="sec-num">01</div>
                  <h2>Loading Live API Specification...</h2>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div className="skeleton-box" style={{ height: "48px", width: "100%" }} />
                  <div className="skeleton-box" style={{ height: "120px", width: "100%" }} />
                  <div className="skeleton-box" style={{ height: "80px", width: "100%" }} />
                </div>
              </section>
            )}

            {errorMsg && !spec && !loading && (
              <section className="section" style={{ borderColor: "#dc2626" }}>
                <div className="sec-header">
                  <div className="sec-num" style={{ background: "#fbe6e6", color: "#7f1d1d", borderColor: "#fca5a5" }}>!</div>
                  <h2 style={{ color: "#7f1d1d" }}>Unable to load API specification</h2>
                </div>
                <p>
                  The live API specification could not be retrieved. Please check the backend service and try again.
                </p>
                <div className="callout callout-warning">
                  <strong>Diagnostic message:</strong> {errorMsg}
                </div>
                <button
                  type="button"
                  onClick={loadSpecification}
                  className="endpoint-btn endpoint-btn-primary"
                  style={{ marginTop: "12px", padding: "8px 18px", fontSize: "13px" }}
                >
                  ↻ Retry Loading Specification
                </button>
              </section>
            )}

            {!loading && spec && (
              <>
                <section className="section" id="overview">
                  <div className="sec-header">
                    <div className="sec-num">01</div>
                    <h2>API Documentation</h2>
                  </div>
                  <p>
                    The Retail Mart REST API provides the backend interface used by the storefront and administrative applications. It exposes authenticated and public resources for users, products, categories, carts, orders, payments, shipments, campaigns, reporting, analytics and supporting services.
                  </p>

                  <h3 id="overview-base-url">Base URL</h3>
                  <div
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      padding: "16px 20px",
                      margin: "14px 0",
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: "800", textTransform: "uppercase", letterSpacing: ".5px", color: "var(--muted)", marginBottom: "4px" }}>
                        Configured Server Base URL
                      </div>
                      <div style={{ fontFamily: "var(--font-mono, 'SF Mono', monospace)", fontSize: "15px", fontWeight: "700", color: "var(--primary2)" }}>
                        {apiBaseUrl}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
                        All endpoints documented below are accessed relative to this root path.
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      {isLive ? (
                        <span className="tag tag-green">● Live Spec Connected</span>
                      ) : (
                        <span className="tag tag-amber" title={`Loaded from ${sourceUrl}`}>● Offline Snapshot</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCopyText(apiBaseUrl, "baseUrl")}
                        className="endpoint-btn endpoint-btn-primary"
                        style={{ padding: "6px 14px", fontSize: "12px" }}
                      >
                        {copiedKey === "baseUrl" ? "✓ Copied!" : "Copy Base URL"}
                      </button>
                    </div>
                  </div>
                </section>

                <section className="section" id="getting-started">
                  <div className="sec-header">
                    <div className="sec-num">02</div>
                    <h2>Getting Started</h2>
                  </div>
                  <p>
                    Follow this quick four-step integration guide to authenticate requests and interact with Retail Mart resources:
                  </p>

                  <div className="steps">
                    <div className="step">
                      <div className="step-n">1</div>
                      <div className="step-body">
                        <h4>STEP 1 — Authenticate</h4>
                        <p>
                          Authenticate with valid user credentials and obtain a JWT access token. Send a JSON request to <code>POST /api/auth/login</code> containing your email and password.
                        </p>
                      </div>
                    </div>

                    <div className="step">
                      <div className="step-n">2</div>
                      <div className="step-body">
                        <h4>STEP 2 — Receive the Token</h4>
                        <p>
                          The login response provides an access token that identifies the authenticated user and encodes their system role (<code>Customer</code>, <code>Staff</code>, <code>Manager</code>, or <code>Admin</code>).
                        </p>
                      </div>
                    </div>

                    <div className="step">
                      <div className="step-n">3</div>
                      <div className="step-body">
                        <h4>STEP 3 — Authorize Requests</h4>
                        <p>
                          Use the JWT token when calling protected API endpoints. Attach the bearer token to the standard HTTP <code>Authorization</code> header:
                        </p>
                        <pre className="code-block" style={{ marginTop: "10px" }}>
                          <button
                            type="button"
                            className="copy-btn"
                            onClick={() => handleCopyText("Authorization: Bearer <access_token>", "header")}
                          >
                            {copiedKey === "header" ? "Copied!" : "Copy"}
                          </button>
                          {`Authorization: Bearer <access_token>`}
                        </pre>
                      </div>
                    </div>

                    <div className="step">
                      <div className="step-n">4</div>
                      <div className="step-body">
                        <h4>STEP 4 — Call Protected Endpoints</h4>
                        <p>
                          After authentication, use the token to access endpoints allowed for the user&apos;s role. Unauthenticated requests or calls with insufficient privileges will return <code>401 Unauthorized</code> or <code>403 Forbidden</code> respectively.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="section" id="authentication">
                  <div className="sec-header">
                    <div className="sec-num">03</div>
                    <h2>Authentication</h2>
                  </div>
                  <p>
                    Retail Mart implements stateless JWT authentication powered by <code>Flask-JWT-Extended</code> with HS256 cryptographic signatures. All protected endpoints verify the token signature and extract identity claims (user ID, role, and email). Tokens expire after 8 hours.
                  </p>

                  <div className="callout callout-info">
                    <strong>Header format:</strong> Send the token in every authenticated request as <code>Authorization: Bearer &lt;token&gt;</code>. Cookie or query parameter token transmission is not supported.
                  </div>

                  <h3>Authentication Endpoints</h3>
                  <div className="tbl-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Method</th>
                          <th>Path</th>
                          <th>Access</th>
                          <th>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><span className="method post">POST</span></td>
                          <td><code>/api/auth/login</code></td>
                          <td><span className="tag tag-green">Public</span></td>
                          <td>Authenticate a user using email and password and return an access token.</td>
                        </tr>
                        <tr>
                          <td><span className="method post">POST</span></td>
                          <td><code>/api/auth/register</code></td>
                          <td><span className="tag tag-green">Public</span></td>
                          <td>Register a new user account with default role.</td>
                        </tr>
                        <tr>
                          <td><span className="method post">POST</span></td>
                          <td><code>/api/auth/otp/request</code></td>
                          <td><span className="tag tag-green">Public</span></td>
                          <td>Request a 6-digit one-time password sent to customer phone number.</td>
                        </tr>
                        <tr>
                          <td><span className="method post">POST</span></td>
                          <td><code>/api/auth/otp/verify</code></td>
                          <td><span className="tag tag-green">Public</span></td>
                          <td>Verify a received 6-digit OTP code and obtain an access token.</td>
                        </tr>
                        <tr>
                          <td><span className="method get">GET</span></td>
                          <td><code>/api/auth/profile</code></td>
                          <td><span className="tag tag-blue">Authenticated</span></td>
                          <td>Returns current authenticated user profile details.</td>
                        </tr>
                        <tr>
                          <td><span className="method get">GET</span></td>
                          <td><code>/api/auth/me</code></td>
                          <td><span className="tag tag-blue">Authenticated</span></td>
                          <td>Validates JWT token validity and returns basic session credentials.</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <h4>Example Login Request</h4>
                  <pre className="code-block">
                    <button
                      type="button"
                      className="copy-btn"
                      onClick={() => handleCopyText(`{\n  "email": "user@example.com",\n  "password": "your_password"\n}`, "loginReq")}
                    >
                      {copiedKey === "loginReq" ? "Copied!" : "Copy"}
                    </button>
                    {`POST /api/auth/login HTTP/1.1
Host: api.retailmart.local
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password"
}`}
                  </pre>

                  <h4>Example Success Response (200 OK)</h4>
                  <pre className="code-block">
                    <button
                      type="button"
                      className="copy-btn"
                      onClick={() => handleCopyText(`{\n  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",\n  "user": {\n    "id": 1,\n    "name": "Ananya Rao",\n    "email": "user@example.com",\n    "role": "Customer"\n  }\n}`, "loginRes")}
                    >
                      {copiedKey === "loginRes" ? "Copied!" : "Copy"}
                    </button>
                    {`HTTP/1.1 200 OK
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Ananya Rao",
    "email": "user@example.com",
    "role": "Customer"
  }
}`}
                  </pre>
                </section>

                <section className="section" id="roles-permissions">
                  <div className="sec-header">
                    <div className="sec-num">04</div>
                    <h2>Roles &amp; Permissions</h2>
                  </div>
                  <p>
                    Every protected endpoint is governed server-side by the <code>@roles_required(...)</code> decorator in <code>app/utils/decorators.py</code>. The role embedded inside the caller&apos;s verified JWT is checked against an endpoint allow-list:
                  </p>

                  <div className="roles">
                    <div className="role-card customer">
                      <span className="role-tag">Customer</span>
                      <h3>Storefront Shopper</h3>
                      <ul>
                        <li>Browse product catalog and categories</li>
                        <li>Cart, checkout, and personal order placement</li>
                        <li>Manage own shipping addresses and wishlist</li>
                        <li>Track own shipment delivery status</li>
                      </ul>
                    </div>

                    <div className="role-card staff">
                      <span className="role-tag">Staff</span>
                      <h3>Fulfillment Operations</h3>
                      <ul>
                        <li>View all customer orders across portals</li>
                        <li>Update shipment dispatch &amp; tracking statuses</li>
                        <li>Process in-store payments and refunds</li>
                        <li>View courier registry and delivery partners</li>
                      </ul>
                    </div>

                    <div className="role-card manager">
                      <span className="role-tag">Manager</span>
                      <h3>Store Administration</h3>
                      <ul>
                        <li>Create and edit products and categories</li>
                        <li>Update order lifecycle and process refunds</li>
                        <li>Manage courier carriers and create shipments</li>
                        <li>Launch marketing campaigns &amp; view period reports</li>
                      </ul>
                    </div>

                    <div className="role-card admin">
                      <span className="role-tag">Admin</span>
                      <h3>Full System Authority</h3>
                      <ul>
                        <li>Full CRUD on user accounts and staff roles</li>
                        <li>Delete products, categories, orders, and couriers</li>
                        <li>AI revenue forecasting &amp; executive analytics</li>
                        <li>Server diagnostics, email triggers &amp; system health</li>
                      </ul>
                    </div>
                  </div>

                  <h3>Permission Matrix (Verified against <code>@roles_required</code>)</h3>
                  <div className="tbl-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>API Area</th>
                          <th style={{ textAlign: "center" }}>Customer</th>
                          <th style={{ textAlign: "center" }}>Staff</th>
                          <th style={{ textAlign: "center" }}>Manager</th>
                          <th style={{ textAlign: "center" }}>Admin</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><strong>Public Catalog</strong> (<code>/api/products</code>, <code>/api/categories</code>)</td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-green">Read</span></td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-green">Read</span></td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-amber">Read / Write</span></td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-red">Full CRUD</span></td>
                        </tr>
                        <tr>
                          <td><strong>Orders &amp; Checkout</strong> (<code>/api/orders</code>)</td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-green">Own Orders</span></td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-green">View All</span></td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-amber">View / Status</span></td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-red">Full Control</span></td>
                        </tr>
                        <tr>
                          <td><strong>Payments &amp; Refunds</strong> (<code>/api/payments</code>)</td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-green">Own Payments</span></td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-green">View &amp; Create</span></td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-amber">Refunds / Updates</span></td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-red">Full Access</span></td>
                        </tr>
                        <tr>
                          <td><strong>Shipments &amp; Tracking</strong> (<code>/api/shipments</code>)</td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-green">Own Tracking</span></td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-green">Dispatch / Sync</span></td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-amber">Create / Manage</span></td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-red">Full Control</span></td>
                        </tr>
                        <tr>
                          <td><strong>Couriers Registry</strong> (<code>/api/couriers</code>)</td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-grey">No Access</span></td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-green">View Only</span></td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-amber">Create / Edit</span></td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-red">Full CRUD</span></td>
                        </tr>
                        <tr>
                          <td><strong>Marketing Campaigns</strong> (<code>/api/campaigns</code>)</td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-green">Public Codes</span></td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-green">View Only</span></td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-amber">Create &amp; Send</span></td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-red">Full Control</span></td>
                        </tr>
                        <tr>
                          <td><strong>User Management</strong> (<code>/api/users</code>)</td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-grey">No Access</span></td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-grey">No Access</span></td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-amber">View Staff</span></td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-red">Full CRUD</span></td>
                        </tr>
                        <tr>
                          <td><strong>Executive Reports</strong> (<code>/api/reports</code>)</td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-grey">No Access</span></td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-grey">No Access</span></td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-amber">View Reports</span></td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-red">Full Access</span></td>
                        </tr>
                        <tr>
                          <td><strong>AI Forecasting &amp; Analytics</strong> (<code>/api/analytics</code>)</td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-grey">No Access</span></td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-grey">No Access</span></td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-amber">View Forecasts</span></td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-red">Full Access</span></td>
                        </tr>
                        <tr>
                          <td><strong>Customer Wishlist &amp; Addresses</strong></td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-green">Own Data</span></td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-grey">No Access</span></td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-grey">No Access</span></td>
                          <td style={{ textAlign: "center" }}><span className="tag tag-red">Admin Audit</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                <div className="api-filter-bar">
                  <div className="api-method-chips">
                    <span style={{ fontSize: "11.5px", fontWeight: "800", color: "var(--muted)", marginRight: "4px" }}>
                      METHODS:
                    </span>
                    {(["ALL", "GET", "POST", "PUT", "PATCH", "DELETE"] as const).map((method) => {
                      const count = methodCounts[method] || 0;
                      const isActive = selectedMethod === method;
                      const chipClass = `method-chip chip-${method.toLowerCase()} ${isActive ? "active" : ""}`;
                      return (
                        <button
                          key={method}
                          type="button"
                          className={chipClass}
                          onClick={() => setSelectedMethod(method)}
                        >
                          {method} ({count})
                        </button>
                      );
                    })}
                  </div>

                  <div className="api-search-input-wrap">
                    <span className="api-search-icon">🔍</span>
                    <input
                      type="text"
                      className="api-search-input"
                      placeholder="Search by path, method, module, or description..."
                      value={filterQuery}
                      onChange={(e) => setFilterQuery(e.target.value)}
                    />
                  </div>

                  <div className="api-filter-actions">
                    <button type="button" className="api-filter-btn" onClick={expandAll}>
                      Expand All
                    </button>
                    <button type="button" className="api-filter-btn" onClick={collapseAll}>
                      Collapse All
                    </button>
                  </div>
                </div>

                {(selectedMethod !== "ALL" || filterQuery.trim()) && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "10px 0 20px", fontSize: "12.5px", color: "var(--muted)" }}>
                    <div>
                      Showing <strong>{filteredOperations.length}</strong> matching endpoints
                      {selectedMethod !== "ALL" && <span> for method <strong>{selectedMethod}</strong></span>}
                      {filterQuery.trim() && <span> matching &ldquo;<strong>{filterQuery}</strong>&rdquo;</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMethod("ALL");
                        setFilterQuery("");
                      }}
                      className="api-filter-btn"
                      style={{ fontSize: "11px", padding: "3px 8px" }}
                    >
                      Clear Filters
                    </button>
                  </div>
                )}

                {allTags.map((tag, tagIdx) => {
                  const tagOps = groupedByTag.get(tag) || [];
                  const targetId = `module-${slugify(tag)}`;
                  const secNum = String(tagIdx + 5).padStart(2, "0");
                  const tagDesc = TAG_DESCRIPTIONS[tag] || spec?.tags?.find((t) => t.name === tag)?.description || `Operations related to ${tag}.`;

                  if (tagOps.length === 0 && (selectedMethod !== "ALL" || filterQuery.trim())) {
                    return null;
                  }

                  return (
                    <section className="section" id={targetId} key={tag}>
                      <div className="sec-header">
                        <div className="sec-num">{secNum}</div>
                        <h2>{tag}</h2>
                      </div>
                      <p>{tagDesc}</p>

                      {tagOps.length === 0 ? (
                        <div style={{ padding: "20px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
                          No endpoints in {tag} match current filter criteria.
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "18px" }}>
                          {tagOps.map((op) => {
                            const isExpanded = !!expandedEndpoints[op.id];
                            const methodClass = `method ${op.method.toLowerCase()}`;
                            const sampleReq = op.requestBodySchema ? generateSampleJson(op.requestBodySchema) : null;
                            const responsesList = Object.entries(op.responses);
                            const roleTagClass = getRoleTagClass(op.role);

                            return (
                              <div className={`endpoint-card ${isExpanded ? "is-expanded" : ""}`} id={op.id} key={op.id}>
                                <div
                                  className="endpoint-card-head"
                                  onClick={() => toggleEndpoint(op.id)}
                                >
                                  <span className={methodClass}>{op.method.toUpperCase()}</span>
                                  <span className="endpoint-path">{op.path}</span>
                                  <span className="endpoint-summary">{op.summary}</span>
                                  <span className={`tag ${roleTagClass}`}>
                                    {op.role}
                                  </span>

                                  <div className="endpoint-actions" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      type="button"
                                      className="endpoint-btn"
                                      onClick={() => toggleEndpoint(op.id)}
                                      aria-expanded={isExpanded}
                                    >
                                      {isExpanded ? "Hide Details ▴" : "View Details ▾"}
                                    </button>
                                    <a
                                      href={`${swaggerUrl}#/${encodeURIComponent(op.tag)}/${encodeURIComponent(op.id)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="endpoint-btn endpoint-btn-primary swagger-link"
                                      title="Open in Swagger UI"
                                    >
                                      Open Swagger <span className="swagger-arrow">⚡</span>
                                    </a>
                                  </div>
                                </div>

                                {isExpanded && (
                                  <div className="endpoint-details">
                                    <div>
                                      <div className="endpoint-subhead">Description</div>
                                      <p style={{ margin: 0, fontSize: "13.5px", color: "var(--ink2)" }}>
                                        {op.description || op.summary || "No detailed description provided."}
                                      </p>
                                    </div>

                                    <div>
                                      <div className="endpoint-subhead">Access Requirement</div>
                                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span className={`tag ${roleTagClass}`}>{op.role}</span>
                                        <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                                          {op.securityRequired ? "Bearer JWT token required in Authorization header." : "Public endpoint — no authentication required."}
                                        </span>
                                      </div>
                                    </div>

                                    {op.parameters && op.parameters.length > 0 && (
                                      <div>
                                        <div className="endpoint-subhead">Parameters</div>
                                        <div className="tbl-wrap" style={{ margin: "4px 0" }}>
                                          <table className="param-table">
                                            <thead>
                                              <tr>
                                                <th>Name</th>
                                                <th>Location</th>
                                                <th>Type</th>
                                                <th>Required</th>
                                                <th>Description</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {op.parameters.map((param, pIdx) => (
                                                <tr key={param.name || pIdx}>
                                                  <td><code>{param.name}</code></td>
                                                  <td><span className="tag tag-grey">{param.in}</span></td>
                                                  <td><code>{param.type || (param.schema ? "object" : "string")}</code></td>
                                                  <td>
                                                    {param.required ? (
                                                      <span className="tag tag-red">Required</span>
                                                    ) : (
                                                      <span className="tag tag-grey">Optional</span>
                                                    )}
                                                  </td>
                                                  <td style={{ color: "var(--muted)" }}>{param.description || "—"}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    )}

                                    {sampleReq && (
                                      <div>
                                        <div className="endpoint-subhead">Sample Request Payload (JSON)</div>
                                        <pre className="code-block">
                                          <button
                                            type="button"
                                            className="copy-btn"
                                            onClick={() => handleCopyText(sampleReq, `req-${op.id}`)}
                                          >
                                            {copiedKey === `req-${op.id}` ? "Copied!" : "Copy"}
                                          </button>
                                          {sampleReq}
                                        </pre>
                                      </div>
                                    )}

                                    {responsesList.length > 0 && (
                                      <div>
                                        <div className="endpoint-subhead">Response Status Codes</div>
                                        <div className="tbl-wrap" style={{ margin: "4px 0" }}>
                                          <table className="param-table">
                                            <thead>
                                              <tr>
                                                <th>Code</th>
                                                <th>Description</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {responsesList.map(([code, resp]) => (
                                                <tr key={code}>
                                                  <td>
                                                    <span className={code.startsWith("2") ? "tag tag-green" : code.startsWith("4") ? "tag tag-amber" : "tag tag-red"}>
                                                      {code}
                                                    </span>
                                                  </td>
                                                  <td style={{ color: "var(--ink2)" }}>{resp.description || "Operation response"}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    )}

                                    <div style={{ paddingTop: "6px" }}>
                                      <a
                                        href={`${swaggerUrl}#/${encodeURIComponent(op.tag)}/${encodeURIComponent(op.id)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ fontSize: "12px", fontWeight: "700", color: "var(--accent)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                                      >
                                        Open in Swagger UI →
                                      </a>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  );
                })}

                <section className="section" id="error-handling">
                  <div className="sec-header">
                    <div className="sec-num">{String(allTags.length + 5).padStart(2, "0")}</div>
                    <h2>API Error Handling</h2>
                  </div>
                  <p>
                    The Retail Mart REST API standardizes response status codes. Every client error or server failure returns a consistent JSON payload indicating the error description:
                  </p>

                  <div className="tbl-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Status Code</th>
                          <th>Status Name</th>
                          <th>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><span className="tag tag-green">200</span></td>
                          <td><code>OK</code></td>
                          <td>Successful request execution with response payload.</td>
                        </tr>
                        <tr>
                          <td><span className="tag tag-green">201</span></td>
                          <td><code>Created</code></td>
                          <td>Resource successfully created (e.g. order, user, payment).</td>
                        </tr>
                        <tr>
                          <td><span className="tag tag-green">204</span></td>
                          <td><code>No Content</code></td>
                          <td>Request completed successfully without a response body.</td>
                        </tr>
                        <tr>
                          <td><span className="tag tag-amber">400</span></td>
                          <td><code>Bad Request</code></td>
                          <td>The request contains invalid syntax, missing parameters, or failed validation.</td>
                        </tr>
                        <tr>
                          <td><span className="tag tag-amber">401</span></td>
                          <td><code>Unauthorized</code></td>
                          <td>Authentication is required or the provided JWT access token has expired or is invalid.</td>
                        </tr>
                        <tr>
                          <td><span className="tag tag-amber">403</span></td>
                          <td><code>Forbidden</code></td>
                          <td>The authenticated user does not have permission for this resource under their assigned role.</td>
                        </tr>
                        <tr>
                          <td><span className="tag tag-amber">404</span></td>
                          <td><code>Not Found</code></td>
                          <td>The requested resource, endpoint, or database record does not exist.</td>
                        </tr>
                        <tr>
                          <td><span className="tag tag-amber">409</span></td>
                          <td><code>Conflict</code></td>
                          <td>The request conflicts with the current business or resource state (e.g. duplicate email).</td>
                        </tr>
                        <tr>
                          <td><span className="tag tag-red">500</span></td>
                          <td><code>Internal Server Error</code></td>
                          <td>Unexpected server-side failure. Consult backend application logs.</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <h3>Standard Error Response Payload</h3>
                  <pre className="code-block">
                    <button
                      type="button"
                      className="copy-btn"
                      onClick={() => handleCopyText(`{\n  "error": "The requested resource was not found.",\n  "status": 404\n}`, "errJson")}
                    >
                      {copiedKey === "errJson" ? "Copied!" : "Copy"}
                    </button>
                    {`HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "error": "The requested resource was not found.",
  "status": 404
}`}
                  </pre>
                </section>

                <section className="section" id="interactive-swagger">
                  <div className="sec-header">
                    <div className="sec-num">{String(allTags.length + 6).padStart(2, "0")}</div>
                    <h2>Interactive API Documentation</h2>
                  </div>
                  <p>
                    Retail Mart exposes an interactive OpenAPI Swagger UI deployed alongside the backend service. Developers can explore endpoint definitions, authorize sessions with JWT tokens, and execute live API calls:
                  </p>

                  <div
                    style={{
                      background: "linear-gradient(135deg, var(--bg2), var(--blue-bg))",
                      border: "1px solid var(--accent2)",
                      borderRadius: "var(--radius)",
                      padding: "28px 32px",
                      margin: "20px 0",
                    }}
                  >
                    <h3 style={{ margin: "0 0 8px", color: "var(--primary)" }}>Test Endpoints Live in Swagger UI</h3>
                    <p style={{ margin: "0 0 16px", color: "var(--ink2)", fontSize: "14px", lineHeight: "1.7" }}>
                      Use Swagger UI to authorize requests and test the Retail Mart APIs directly. Test catalog filtering, simulate checkout flows, verify courier tracking sync, and test permissions interactively.
                    </p>
                    <a
                      href={swaggerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="endpoint-btn endpoint-btn-primary"
                      style={{ padding: "9px 20px", fontSize: "13px" }}
                    >
                      Open Swagger UI →
                    </a>
                  </div>
                </section>

                <section className="section" id="ecosystem">
                  <div className="sec-header">
                    <div className="sec-num">{String(allTags.length + 7).padStart(2, "0")}</div>
                    <h2>Documentation Ecosystem</h2>
                  </div>
                  <p>
                    Retail Mart provides three complementary documentation experiences tailored for stakeholders, engineers, and API integrators:
                  </p>

                  <div className="cards">
                    <div className="card">
                      <div className="card-icon blue">📖</div>
                      <h4>Functional Specification</h4>
                      <p>
                        Explains what the Retail Mart system does and how its workflows behave across storefront, operations console, and executive reporting.
                      </p>
                      <div style={{ marginTop: "14px" }}>
                        <Link
                          to={ROUTES.helpFsd}
                          className="endpoint-btn"
                          style={{ textDecoration: "none", fontSize: "12px" }}
                        >
                          View Functional Specification →
                        </Link>
                      </div>
                    </div>

                    <div className="card" style={{ borderColor: "var(--accent)" }}>
                      <div className="card-icon green">⚡</div>
                      <h4>API Documentation</h4>
                      <p>
                        Explains how developers interact with the Retail Mart backend, detailing request/response formats, endpoints, schemas, and permissions.
                      </p>
                      <div style={{ marginTop: "14px" }}>
                        <span className="tag tag-green">Current Page</span>
                      </div>
                    </div>

                    <div className="card">
                      <div className="card-icon amber">🚀</div>
                      <h4>Swagger UI</h4>
                      <p>
                        Provides interactive API exploration and request testing directly against the running backend server instance.
                      </p>
                      <div style={{ marginTop: "14px" }}>
                        <a
                          href={swaggerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="endpoint-btn"
                          style={{ textDecoration: "none", fontSize: "12px" }}
                        >
                          Open Swagger →
                        </a>
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}
          </main>

          <footer>
            <strong>Retail Mart Enterprise Retail &amp; E-Commerce Management Platform</strong>
            <div>Full-Stack Technical Documentation &amp; REST API Reference · v1.0 · Sep 2026</div>
          </footer>
        </div>
      </div>

      <a
        aria-label="Back to top"
        className={`btn-top ${showTopBtn ? "show" : ""}`}
        href="#top"
        id="btnTop"
        title="Back to top"
        onClick={(e) => {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      >
        ▲
      </a>
    </div>
  );
}
