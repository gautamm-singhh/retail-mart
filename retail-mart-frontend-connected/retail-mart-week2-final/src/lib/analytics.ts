/**
 * Google Analytics 4 integration for Retail Mart SPA.
 *
 * Requirements:
 * - Initializes gtag.js only once using VITE_GA_MEASUREMENT_ID.
 * - Disables automatic page_view in gtag config ({ send_page_view: false })
 *   to avoid collision with manual SPA route tracking.
 * - Tracks initial page load and every subsequent SPA route change.
 * - Prevents duplicate page views when navigating or re-rendering.
 * - Zero PII transmission (no passwords, emails, tokens, phone numbers, or user data).
 */

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

let isInitialized = false;
let lastTrackedPath: string | null = null;
let routerUnsubscribe: (() => void) | null = null;

/**
 * Returns the effective GA4 Measurement ID, or null if unconfigured/invalid.
 */
export function getMeasurementId(): string | null {
  const id = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!id || typeof id !== "string") {
    return null;
  }
  const trimmed = id.trim();
  // Safe-guard against empty strings and default placeholder templates
  if (!trimmed || trimmed === "G-XXXXXXXXXX") {
    return null;
  }
  return trimmed;
}

/**
 * Initializes Google Analytics gtag.js script and dataLayer exactly once.
 * Safe to call multiple times or in non-browser environments.
 */
export function initGA(): boolean {
  if (isInitialized) {
    return true;
  }

  const measurementId = getMeasurementId();
  if (!measurementId) {
    return false;
  }

  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }

  // Ensure dataLayer and gtag are available on window
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== "function") {
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments);
    };
  }

  // Inject gtag.js script if not already present in the DOM
  const existingScript = document.querySelector(
    `script[src*="googletagmanager.com/gtag/js?id=${measurementId}"]`,
  );
  if (!existingScript) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.appendChild(script);
  }

  window.gtag("js", new Date());
  // CRITICAL: Disable automatic page_view so manual SPA page_view tracking
  // does not generate duplicate events on initial load.
  window.gtag("config", measurementId, {
    send_page_view: false,
  });

  isInitialized = true;
  return true;
}

/**
 * Strips any potential sensitive parameters (e.g. token, secret, auth, code, password, email)
 * from URL query strings before reporting to Google Analytics.
 */
export function sanitizePath(rawPath: string): string {
  if (!rawPath) return "/";

  try {
    const parsed = new URL(rawPath, "https://retailmart.local");
    const sensitiveKeys = [
      "token",
      "access_token",
      "refresh_token",
      "jwt",
      "secret",
      "password",
      "email",
      "phone",
      "code",
      "auth",
    ];

    let hasSensitive = false;
    for (const key of sensitiveKeys) {
      if (parsed.searchParams.has(key)) {
        parsed.searchParams.delete(key);
        hasSensitive = true;
      }
    }

    if (hasSensitive) {
      const search = parsed.searchParams.toString();
      return parsed.pathname + (search ? `?${search}` : "");
    }
    return rawPath;
  } catch {
    // If URL parsing fails, return the path up to any query string
    return rawPath.split("?")[0] || "/";
  }
}

/**
 * Tracks a page view in Google Analytics.
 *
 * Guarantees:
 * 1. Safe no-op if Google Analytics is unconfigured or script is absent.
 * 2. Strictly deduplicates consecutive identical page paths (prevents double-tracking).
 * 3. Never transmits user credentials, tokens, or PII.
 */
export function trackPageView(path?: string, title?: string): void {
  const measurementId = getMeasurementId();
  if (!measurementId) {
    return;
  }

  if (!isInitialized) {
    initGA();
  }

  if (typeof window === "undefined") {
    return;
  }

  const currentPath =
    path !== undefined
      ? path
      : window.location.pathname + (window.location.search || "");

  const cleanPath = sanitizePath(currentPath || "/");

  // Duplicate prevention: do not fire page_view if already on this exact path
  if (lastTrackedPath === cleanPath) {
    return;
  }

  lastTrackedPath = cleanPath;

  const pageTitle =
    title ||
    (typeof document !== "undefined" && document.title
      ? document.title
      : "Retail Mart");

  if (typeof window.gtag === "function") {
    window.gtag("event", "page_view", {
      page_path: cleanPath,
      page_location: window.location.origin + cleanPath,
      page_title: pageTitle,
    });
  }
}

export interface RouterLike {
  state: {
    location: {
      pathname: string;
      search?: string;
    };
  };
  subscribe: (
    listener: (state: {
      location: {
        pathname: string;
        search?: string;
      };
    }) => void,
  ) => () => void;
}

/**
 * Integrates Google Analytics tracking with a React Router Data Router instance.
 *
 * Automatically:
 * 1. Emits one page_view event on the initial application load.
 * 2. Emits one page_view event whenever the SPA route changes (navigation, back, forward).
 * 3. Subscribes cleanly without creating duplicate listeners.
 */
export function setupRouterAnalytics(router: RouterLike): () => void {
  // If previously subscribed, cleanup existing listener to prevent duplicate listeners
  if (routerUnsubscribe) {
    routerUnsubscribe();
    routerUnsubscribe = null;
  }

  // 1. Initial application load page_view
  const initialPath =
    (router.state?.location?.pathname || "/") +
    (router.state?.location?.search || "");
  trackPageView(initialPath);

  // 2. Subsequent SPA route transitions (Link clicks, programmatic navigate, back, forward)
  routerUnsubscribe = router.subscribe((state) => {
    const nextPath =
      (state.location?.pathname || "/") + (state.location?.search || "");
    trackPageView(nextPath);
  });

  return () => {
    if (routerUnsubscribe) {
      routerUnsubscribe();
      routerUnsubscribe = null;
    }
  };
}

/**
 * Internal helper for testing only: resets internal tracking flags and script elements.
 */
export function _resetAnalyticsStateForTesting(): void {
  isInitialized = false;
  lastTrackedPath = null;
  if (routerUnsubscribe) {
    routerUnsubscribe();
    routerUnsubscribe = null;
  }
  if (typeof document !== "undefined") {
    const scripts = document.querySelectorAll(
      'script[src*="googletagmanager.com/gtag/js"]',
    );
    scripts.forEach((s) => s.remove());
  }
}
