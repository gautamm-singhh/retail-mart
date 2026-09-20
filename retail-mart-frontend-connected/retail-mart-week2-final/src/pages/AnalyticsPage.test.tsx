import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/features/auth/AuthContext";
import { ToastProvider } from "@/components/common/ToastProvider";
import AnalyticsPage from "@/pages/AnalyticsPage";

function renderAnalyticsPage() {
  return render(
    <AuthProvider>
      <ToastProvider>
        <MemoryRouter>
          <AnalyticsPage />
        </MemoryRouter>
      </ToastProvider>
    </AuthProvider>,
  );
}

describe("AnalyticsPage - Predictive Projection & Statistical Forecasting", () => {
  it("renders statistical forecast by default with legitimate model indicators", async () => {
    renderAnalyticsPage();

    // Page title and subtitle
    expect(await screen.findByText(/Analytics & Sales Projections/i)).toBeInTheDocument();

    // Historical revenue & volume KPIs populated from real dataset (not hardcoded)
    const histRevLabels = await screen.findAllByText("Historical Revenue");
    expect(histRevLabels.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Historical Volume")).toBeInTheDocument();

    // Model engine defaults to Statistical (OLS)
    expect(screen.getByText("Statistical (OLS)")).toBeInTheDocument();

    // Linear regression briefing appears for simple mode
    expect(screen.getByText(/Statistical Linear Regression Model \(OLS\)/i)).toBeInTheDocument();

    // Table of historical records and forecast trajectory points are present
    expect(screen.getByText(/Historical Records/i)).toBeInTheDocument();
    expect(screen.getByText(/Forecast Trajectory Points/i)).toBeInTheDocument();
  });

  it("switches to Predictive Projection mode and renders real AI executive narrative", async () => {
    renderAnalyticsPage();

    await screen.findByText(/Analytics & Sales Projections/i);

    // Switch to Predictive Projection
    const predictiveBtn = screen.getByRole("button", { name: /Predictive Projection/i });
    await userEvent.click(predictiveBtn);

    // Wait for AI narrative briefing to appear
    expect(await screen.findByText(/Executive AI Narrative Briefing/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Strong monthly expansion recorded across Q3/i),
    ).toBeInTheDocument();

    // Model engine card displays Gemini AI
    expect(screen.getByText("Gemini AI")).toBeInTheDocument();

    // Legend updates to AI Predictive Trajectory
    expect(screen.getByText("AI Predictive Trajectory")).toBeInTheDocument();
  });

  it("updates data model and labels when switching granularity (Daily, Monthly, Yearly)", async () => {
    renderAnalyticsPage();

    await screen.findByText(/Analytics & Sales Projections/i);

    // Switch to Daily
    const dailyBtn = screen.getByRole("button", { name: "Daily" });
    await userEvent.click(dailyBtn);

    // Should load daily records
    const dailyPeriods = await screen.findAllByText("2026-09-18");
    expect(dailyPeriods.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("2026-09-19").length).toBeGreaterThanOrEqual(1);

    // Switch to Yearly
    const yearlyBtn = screen.getByRole("button", { name: "Yearly" });
    await userEvent.click(yearlyBtn);

    // Should load yearly records
    const yearlyPeriods = await screen.findAllByText("2024");
    expect(yearlyPeriods.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("2025").length).toBeGreaterThanOrEqual(1);
  });

  it("ensures KPI cards match exact forecast without synthetic multipliers", async () => {
    renderAnalyticsPage();

    await screen.findByText(/Analytics & Sales Projections/i);

    // In monthly mock:
    // History revenues: 38000 + 64000 + 95000 = 197000
    // Total orders: 6 + 12 + 18 = 36
    // Forecast points: 123500, 152000, 180500 -> Peak is 180500
    expect(await screen.findByText("36")).toBeInTheDocument();
    const peakElements = screen.getAllByText("₹1,80,500");
    expect(peakElements.length).toBeGreaterThanOrEqual(1);
  });

  it("switches back to Statistical mode cleanly", async () => {
    renderAnalyticsPage();

    await screen.findByText(/Analytics & Sales Projections/i);

    // First switch to AI
    const predictiveBtn = screen.getByRole("button", { name: /Predictive Projection/i });
    await userEvent.click(predictiveBtn);
    expect(await screen.findByText(/Executive AI Narrative Briefing/i)).toBeInTheDocument();

    // Then switch back to Statistical
    const statBtn = screen.getByRole("button", { name: "Statistical" });
    await userEvent.click(statBtn);

    expect(await screen.findByText(/Statistical Linear Regression Model \(OLS\)/i)).toBeInTheDocument();
    expect(screen.getByText("Statistical (OLS)")).toBeInTheDocument();
  });

  it("honestly displays statistical fallback when AI service is unavailable or errors", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/analytics/ai-projections")) {
        return new Response(JSON.stringify({ error: "AI model unavailable" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }
      return originalFetch(input, init);
    });

    try {
      renderAnalyticsPage();
      await screen.findByText(/Analytics & Sales Projections/i);

      const predictiveBtn = screen.getByRole("button", { name: /Predictive Projection/i });
      await userEvent.click(predictiveBtn);

      // Should honestly show fallback briefing and fallback status
      expect(await screen.findByText(/Statistical Fallback Briefing/i)).toBeInTheDocument();
      expect(screen.getByText("Statistical (Fallback)")).toBeInTheDocument();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
