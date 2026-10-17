
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

let isInitialized = false;
let lastTrackedPath: string | null = null;
let routerUnsubscribe: (() => void) | null = null;

export function getMeasurementId(): string | null {
  const id = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!id || typeof id !== "string") {
    return null;
  }
  const trimmed = id.trim();
  if (!trimmed || trimmed === "G-XXXXXXXXXX") {
    return null;
  }
  return trimmed;
}

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

  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== "function") {
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments);
    };
  }

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
  window.gtag("config", measurementId, {
    send_page_view: false,
  });

  isInitialized = true;
  return true;
}

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
    return rawPath.split("?")[0] || "/";
  }
}

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

export function setupRouterAnalytics(router: RouterLike): () => void {
  if (routerUnsubscribe) {
    routerUnsubscribe();
    routerUnsubscribe = null;
  }

  const initialPath =
    (router.state?.location?.pathname || "/") +
    (router.state?.location?.search || "");
  trackPageView(initialPath);

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
