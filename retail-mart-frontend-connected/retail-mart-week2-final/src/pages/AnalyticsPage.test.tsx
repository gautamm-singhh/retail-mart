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

    expect(await screen.findByText(/Analytics & Sales Projections/i)).toBeInTheDocument();

    const histRevLabels = await screen.findAllByText("Historical Revenue");
    expect(histRevLabels.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Historical Volume")).toBeInTheDocument();

    expect(screen.getByText("Statistical (OLS)")).toBeInTheDocument();

    expect(screen.getByText(/Statistical Linear Regression Model \(OLS\)/i)).toBeInTheDocument();

    expect(screen.getByText(/Historical Records/i)).toBeInTheDocument();
    expect(screen.getByText(/Forecast Trajectory Points/i)).toBeInTheDocument();
  });

  it("switches to Predictive Projection mode and renders real AI executive narrative", async () => {
    renderAnalyticsPage();

    await screen.findByText(/Analytics & Sales Projections/i);

    const predictiveBtn = screen.getByRole("button", { name: /Predictive Projection/i });
    await userEvent.click(predictiveBtn);

    expect(await screen.findByText(/Executive AI Narrative Briefing/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Strong monthly expansion recorded across Q3/i),
    ).toBeInTheDocument();

    expect(screen.getByText("Gemini AI")).toBeInTheDocument();

    expect(screen.getByText("AI Predictive Trajectory")).toBeInTheDocument();
  });

  it("updates data model and labels when switching granularity (Daily, Monthly, Yearly)", async () => {
    renderAnalyticsPage();

    await screen.findByText(/Analytics & Sales Projections/i);

    const dailyBtn = screen.getByRole("button", { name: "Daily" });
    await userEvent.click(dailyBtn);

    const dailyPeriods = await screen.findAllByText("2026-09-18");
    expect(dailyPeriods.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("2026-09-19").length).toBeGreaterThanOrEqual(1);

    const yearlyBtn = screen.getByRole("button", { name: "Yearly" });
    await userEvent.click(yearlyBtn);

    const yearlyPeriods = await screen.findAllByText("2024");
    expect(yearlyPeriods.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("2025").length).toBeGreaterThanOrEqual(1);
  });

  it("ensures KPI cards match exact forecast without synthetic multipliers", async () => {
    renderAnalyticsPage();

    await screen.findByText(/Analytics & Sales Projections/i);

    expect(await screen.findByText("36")).toBeInTheDocument();
    const peakElements = screen.getAllByText("₹1,80,500");
    expect(peakElements.length).toBeGreaterThanOrEqual(1);
  });

  it("switches back to Statistical mode cleanly", async () => {
    renderAnalyticsPage();

    await screen.findByText(/Analytics & Sales Projections/i);

    const predictiveBtn = screen.getByRole("button", { name: /Predictive Projection/i });
    await userEvent.click(predictiveBtn);
    expect(await screen.findByText(/Executive AI Narrative Briefing/i)).toBeInTheDocument();

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

      expect(await screen.findByText(/Statistical Fallback Briefing/i)).toBeInTheDocument();
      expect(screen.getByText("Statistical (Fallback)")).toBeInTheDocument();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
