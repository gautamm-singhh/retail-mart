import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  initGA,
  trackPageView,
  setupRouterAnalytics,
  sanitizePath,
  _resetAnalyticsStateForTesting,
} from "@/lib/analytics";

describe("Google Analytics 4 Utility & Router Integration", () => {
  let eventCalls: any[] = [];

  beforeEach(() => {
    _resetAnalyticsStateForTesting();
    eventCalls = [];
    document.title = "Retail Mart - Test";

    // Setup mock window.gtag
    window.dataLayer = [];
    window.gtag = vi.fn((...args: any[]) => {
      window.dataLayer.push(args);
      if (args[0] === "event") {
        eventCalls.push({
          event: args[1],
          params: args[2],
        });
      }
    });
  });

  afterEach(() => {
    _resetAnalyticsStateForTesting();
    vi.restoreAllMocks();
  });

  it("1. Initializes gtag.js script and sets send_page_view to false", () => {
    const initialized = initGA();
    expect(initialized).toBe(true);

    const script = document.querySelector(
      'script[src*="googletagmanager.com/gtag/js?id=G-W9V37G74WZ"]',
    ) as HTMLScriptElement | null;
    expect(script).not.toBeNull();
    expect(script?.async).toBe(true);

    // Verify config called with send_page_view: false
    expect(window.gtag).toHaveBeenCalledWith(
      "config",
      "G-W9V37G74WZ",
      expect.objectContaining({ send_page_view: false }),
    );
  });

  it("2. Does not initialize twice if called multiple times", () => {
    initGA();
    const scriptCountBefore = document.querySelectorAll(
      'script[src*="googletagmanager.com/gtag/js"]',
    ).length;

    initGA();
    initGA();

    const scriptCountAfter = document.querySelectorAll(
      'script[src*="googletagmanager.com/gtag/js"]',
    ).length;

    expect(scriptCountBefore).toBe(1);
    expect(scriptCountAfter).toBe(1);
  });

  it("3. trackPageView sends page_view event with sanitized path and location", () => {
    trackPageView("/shop/login", "Customer Login");

    expect(eventCalls.length).toBe(1);
    expect(eventCalls[0]).toEqual({
      event: "page_view",
      params: expect.objectContaining({
        page_path: "/shop/login",
        page_location: expect.stringContaining("/shop/login"),
        page_title: "Customer Login",
      }),
    });
  });

  it("4. Prevents duplicate page views for identical consecutive routes", () => {
    trackPageView("/shop/login");
    trackPageView("/shop/login");
    trackPageView("/shop/login");

    expect(eventCalls.length).toBe(1);

    // Navigating to a new page fires an event
    trackPageView("/shop");
    expect(eventCalls.length).toBe(2);
    expect(eventCalls[1].params.page_path).toBe("/shop");

    // Returning to /shop/login fires again because path changed
    trackPageView("/shop/login");
    expect(eventCalls.length).toBe(3);
    expect(eventCalls[2].params.page_path).toBe("/shop/login");
  });

  it("5. Strips sensitive tokens, passwords, and PII from query strings", () => {
    const clean = sanitizePath("/login?token=xyz123&email=user@test.com&ref=search");
    expect(clean).toBe("/login?ref=search");

    trackPageView("/shop/checkout?jwt=secret-token&code=482910&category=electronics");
    expect(eventCalls[0].params.page_path).toBe("/shop/checkout?category=electronics");
    expect(eventCalls[0].params.page_location).not.toContain("secret-token");
  });

  it("6. setupRouterAnalytics tracks initial page load and route changes", () => {
    let subscriber: ((state: any) => void) | null = null;
    const fakeRouter = {
      state: {
        location: { pathname: "/shop/login", search: "" },
      },
      subscribe: vi.fn((fn: (state: any) => void) => {
        subscriber = fn;
        return () => {
          subscriber = null;
        };
      }),
    };

    const cleanup = setupRouterAnalytics(fakeRouter as any);

    // Initial load tracked
    expect(eventCalls.length).toBe(1);
    expect(eventCalls[0].params.page_path).toBe("/shop/login");

    // Route transition to /shop
    subscriber!({ location: { pathname: "/shop", search: "" } });
    expect(eventCalls.length).toBe(2);
    expect(eventCalls[1].params.page_path).toBe("/shop");

    // Route transition to /login (Admin)
    subscriber!({ location: { pathname: "/login", search: "" } });
    expect(eventCalls.length).toBe(3);
    expect(eventCalls[2].params.page_path).toBe("/login");

    // Browser back to /shop
    subscriber!({ location: { pathname: "/shop", search: "" } });
    expect(eventCalls.length).toBe(4);
    expect(eventCalls[3].params.page_path).toBe("/shop");

    // Browser forward to /login
    subscriber!({ location: { pathname: "/login", search: "" } });
    expect(eventCalls.length).toBe(5);
    expect(eventCalls[4].params.page_path).toBe("/login");

    // Cleanup unsubscribes
    cleanup();
  });

  it("7. Tracks all normal application routes cleanly without errors", () => {
    const testRoutes = [
      "/",
      "/shop/login",
      "/shop/signup",
      "/shop",
      "/shop/wishlist",
      "/cart",
      "/checkout",
      "/account",
      "/orders",
      "/login",
      "/dashboard",
      "/products",
      "/users",
      "/shipping",
      "/reports",
      "/analytics",
      "/campaigns",
    ];

    testRoutes.forEach((route) => {
      trackPageView(route);
    });

    expect(eventCalls.length).toBe(testRoutes.length);
    testRoutes.forEach((route, index) => {
      expect(eventCalls[index].params.page_path).toBe(route);
    });
  });
});
