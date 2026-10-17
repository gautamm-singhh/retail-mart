import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FsdDocumentationPage from "@/pages/help/FsdDocumentationPage";
import { ThemeProvider } from "@/context/ThemeContext";
import { getSwaggerUrl } from "@/services/api/docs";

describe("FsdDocumentationPage - Original Technical Documentation", () => {
  it("renders the hero section, title, and metadata", () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <FsdDocumentationPage />
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getAllByText(/Enterprise Retail & E-Commerce Management Platform/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/React 18/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Flask 3\.0/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/MySQL 8\.0/i).length).toBeGreaterThan(0);
  });

  it("renders all major original technical documentation sections", () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <FsdDocumentationPage />
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /Introduction/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /System Overview/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /System Architecture/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Technology Stack/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Core Features/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /User Roles & Permissions/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Authentication & Authorization/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Product & Category Management/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Cart, Checkout & Order Management/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Payment System/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Shipping, Courier Registry & Tracking/i, level: 2 })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: /Wishlist/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /Promotional Campaigns/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Email & Transactional Notifications/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Reports & Analytics/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Revenue Projections & AI Forecasting/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Database Architecture/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /API Documentation/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Frontend Architecture/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Security/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Environment Configuration/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Deployment/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Troubleshooting/i, level: 2 })).toBeInTheDocument();
  });

  it("links to API documentation and backend Swagger UI", () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <FsdDocumentationPage />
        </ThemeProvider>
      </MemoryRouter>
    );

    const apiDocLinks = screen.getAllByRole("link", { name: /API/i });
    expect(apiDocLinks.length).toBeGreaterThan(0);

    const swaggerLinks = screen.getAllByRole("link", { name: /Swagger/i });
    expect(swaggerLinks.length).toBeGreaterThan(0);
    expect(swaggerLinks[0]).toHaveAttribute("href", getSwaggerUrl());
    expect(swaggerLinks[0]).toHaveAttribute("target", "_blank");
  });

  it("opens interactive card modal dialog when a card is clicked", () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <FsdDocumentationPage />
        </ThemeProvider>
      </MemoryRouter>
    );

    const storefrontCards = screen.getAllByText(/Storefront/i, { selector: "h4" });
    expect(storefrontCards.length).toBeGreaterThan(0);
    const clickableCard = storefrontCards[0].closest("[data-card]") || storefrontCards[0];
    fireEvent.click(clickableCard);

    expect(screen.getByRole("heading", { name: "Storefront", level: 3 })).toBeInTheDocument();
    expect(screen.getByText(/The customer-facing half of the single React SPA/i)).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: /Close/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByText(/The customer-facing half of the single React SPA/i)).not.toBeInTheDocument();
  });
});
