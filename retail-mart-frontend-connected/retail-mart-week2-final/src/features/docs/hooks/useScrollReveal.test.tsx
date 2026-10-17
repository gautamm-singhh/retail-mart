import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useScrollReveal } from "@/features/docs/hooks/useScrollReveal";

describe("useScrollReveal hook", () => {
  it("marks all .docs-reveal and main .section elements with .is-revealed when IntersectionObserver is not available or reduced-motion is active", () => {
    const div1 = document.createElement("div");
    div1.className = "docs-reveal";
    document.body.appendChild(div1);

    const mainEl = document.createElement("main");
    const div2 = document.createElement("section");
    div2.className = "section";
    mainEl.appendChild(div2);
    document.body.appendChild(mainEl);

    renderHook(() => useScrollReveal());

    expect(div1.classList.contains("is-revealed")).toBe(true);
    expect(div2.classList.contains("is-revealed")).toBe(true);

    document.body.removeChild(div1);
    document.body.removeChild(mainEl);
  });
});
