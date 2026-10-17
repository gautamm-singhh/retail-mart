import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ApiDocumentationPage from "@/pages/help/ApiDocumentationPage";
import { ThemeProvider } from "@/context/ThemeContext";
import { getSwaggerUrl } from "@/services/api/docs";

describe("ApiDocumentationPage & OpenAPI Reference", () => {
  it("renders the hero overview, metrics, and getting started sections", async () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <ApiDocumentationPage />
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", { name: /Retail Mart REST API Documentation/i })
    ).toBeInTheDocument();

    expect(screen.getAllByText(/API Operations/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/API Resource Modules/i)).toBeInTheDocument();

    expect(screen.getAllByText(/Getting Started/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/STEP 1/i)).toBeInTheDocument();
    expect(screen.getByText(/STEP 2/i)).toBeInTheDocument();
    expect(screen.getByText(/STEP 3/i)).toBeInTheDocument();
    expect(screen.getByText(/STEP 4/i)).toBeInTheDocument();
  });

  it("renders Swagger UI button linking to the dynamic backend Swagger URL", async () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <ApiDocumentationPage />
        </ThemeProvider>
      </MemoryRouter>
    );

    const swaggerLinks = await screen.findAllByRole("link", { name: /Open Swagger UI/i });
    expect(swaggerLinks.length).toBeGreaterThan(0);
    const expectedUrl = getSwaggerUrl();
    expect(swaggerLinks[0]).toHaveAttribute("href", expectedUrl);
    expect(swaggerLinks[0].getAttribute("href")).toContain("/api/docs/");
    expect(swaggerLinks[0]).toHaveAttribute("target", "_blank");
  });

  it("filters endpoints when typing in the search bar", async () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <ApiDocumentationPage />
        </ThemeProvider>
      </MemoryRouter>
    );

    const searchInput = await screen.findByPlaceholderText(/Search by path/i);
    expect(searchInput).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: "/api/orders" } });
    const orderElements = screen.getAllByText(/\/api\/orders/i);
    expect(orderElements.length).toBeGreaterThan(0);
  });
});
