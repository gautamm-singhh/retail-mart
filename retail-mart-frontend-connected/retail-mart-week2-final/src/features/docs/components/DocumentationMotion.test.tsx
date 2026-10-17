import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { DocumentationAmbientBackground } from "@/features/docs/components/DocumentationAmbientBackground";
import { DocumentationHeroAtmosphere } from "@/features/docs/components/DocumentationHeroAtmosphere";

describe("Documentation Motion Components", () => {
  it("renders DocumentationAmbientBackground with grain, glows, network lines, and particles", () => {
    const { container } = render(<DocumentationAmbientBackground />);
    
    const ambientBg = container.querySelector(".docs-ambient-bg");
    expect(ambientBg).toBeInTheDocument();
    expect(ambientBg).toHaveAttribute("aria-hidden", "true");
    expect(ambientBg).toHaveAttribute("role", "presentation");

    expect(container.querySelector(".docs-ambient-grain")).toBeInTheDocument();

    expect(container.querySelectorAll(".docs-ambient-glows .docs-glow").length).toBe(3);

    expect(container.querySelector(".docs-ambient-network")).toBeInTheDocument();
    expect(container.querySelectorAll(".docs-net-line").length).toBeGreaterThanOrEqual(6);
    expect(container.querySelectorAll(".docs-net-node").length).toBeGreaterThanOrEqual(7);

    expect(container.querySelectorAll(".docs-particle").length).toBe(12);
  });

  it("renders DocumentationHeroAtmosphere with orbs, light bloom, and hero particles", () => {
    const { container } = render(<DocumentationHeroAtmosphere />);

    const heroAtmo = container.querySelector(".docs-hero-atmosphere");
    expect(heroAtmo).toBeInTheDocument();
    expect(heroAtmo).toHaveAttribute("aria-hidden", "true");
    expect(heroAtmo).toHaveAttribute("role", "presentation");

    expect(container.querySelectorAll(".docs-hero-orb").length).toBe(3);

    expect(container.querySelector(".docs-hero-bloom")).toBeInTheDocument();

    expect(container.querySelector(".docs-hero-net")).toBeInTheDocument();

    expect(container.querySelectorAll(".docs-hero-pt").length).toBe(8);
  });
});
