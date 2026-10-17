import { useEffect } from "react";

export function useScrollReveal(dependency?: unknown) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const prefersReducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const revealAll = () => {
      document
        .querySelectorAll(".docs-reveal, main .section")
        .forEach((el) => {
          el.classList.add("is-revealed");
        });
    };

    if (typeof IntersectionObserver === "undefined" || prefersReducedMotion) {
      revealAll();
      return;
    }

    if (window.location.hash) {
      try {
        const hashEl = document.querySelector(window.location.hash);
        if (hashEl) {
          hashEl.classList.add("is-revealed");
        }
      } catch {
      /* ignore */
    }
    }

    const unrevealedElements = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".docs-reveal:not(.is-revealed), main .section:not(.is-revealed)"
      )
    );

    if (!unrevealedElements.length) return;

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            obs.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: "0px 0px -20px 0px",
        threshold: 0.04,
      }
    );

    unrevealedElements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [dependency]);
}

export default useScrollReveal;
