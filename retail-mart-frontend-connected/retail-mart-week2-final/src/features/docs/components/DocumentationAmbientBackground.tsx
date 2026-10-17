import React, { memo } from "react";

export const DocumentationAmbientBackground: React.FC = memo(function DocumentationAmbientBackground() {
  return (
    <div className="docs-ambient-bg" aria-hidden="true" role="presentation">
      <div className="docs-ambient-grain" />

      <div className="docs-ambient-glows">
        <div className="docs-glow docs-glow-1" />
        <div className="docs-glow docs-glow-2" />
        <div className="docs-glow docs-glow-3" />
      </div>

      <svg
        className="docs-ambient-network"
        viewBox="0 0 1440 900"
        fill="none"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="docsNetGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent, #079B70)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--primary, #048A75)" stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="docsNetGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--accent2, #048A75)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--accent, #079B70)" stopOpacity="0.03" />
          </linearGradient>
        </defs>

        <line x1="8%" y1="14%" x2="28%" y2="34%" stroke="url(#docsNetGrad1)" className="docs-net-line docs-net-line-1" strokeWidth="1" />
        <line x1="28%" y1="34%" x2="52%" y2="18%" stroke="url(#docsNetGrad2)" className="docs-net-line docs-net-line-2" strokeWidth="1" />
        <line x1="52%" y1="18%" x2="76%" y2="44%" stroke="url(#docsNetGrad1)" className="docs-net-line docs-net-line-3" strokeWidth="1" />
        <line x1="76%" y1="44%" x2="94%" y2="22%" stroke="url(#docsNetGrad2)" className="docs-net-line docs-net-line-4" strokeWidth="1" />
        <line x1="28%" y1="34%" x2="20%" y2="68%" stroke="url(#docsNetGrad1)" className="docs-net-line docs-net-line-5" strokeWidth="1" />
        <line x1="76%" y1="44%" x2="84%" y2="80%" stroke="url(#docsNetGrad2)" className="docs-net-line docs-net-line-6" strokeWidth="1" />

        <circle cx="8%" cy="14%" r="2.5" className="docs-net-node docs-net-node-1" />
        <circle cx="28%" cy="34%" r="3" className="docs-net-node docs-net-node-2" />
        <circle cx="52%" cy="18%" r="2.5" className="docs-net-node docs-net-node-3" />
        <circle cx="76%" cy="44%" r="3.5" className="docs-net-node docs-net-node-4" />
        <circle cx="94%" cy="22%" r="2.5" className="docs-net-node docs-net-node-5" />
        <circle cx="20%" cy="68%" r="2.5" className="docs-net-node docs-net-node-6" />
        <circle cx="84%" cy="80%" r="3" className="docs-net-node docs-net-node-7" />
      </svg>

      <div className="docs-ambient-particles">
        <span className="docs-particle p1" />
        <span className="docs-particle p2" />
        <span className="docs-particle p3" />
        <span className="docs-particle p4" />
        <span className="docs-particle p5" />
        <span className="docs-particle p6" />
        <span className="docs-particle p7" />
        <span className="docs-particle p8" />
        <span className="docs-particle p9" />
        <span className="docs-particle p10" />
        <span className="docs-particle p11" />
        <span className="docs-particle p12" />
      </div>
    </div>
  );
});

export default DocumentationAmbientBackground;
