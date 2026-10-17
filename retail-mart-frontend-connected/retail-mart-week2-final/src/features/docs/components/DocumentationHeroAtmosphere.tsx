import React, { memo } from "react";

export const DocumentationHeroAtmosphere: React.FC = memo(function DocumentationHeroAtmosphere() {
  return (
    <div className="docs-hero-atmosphere" aria-hidden="true" role="presentation">
      <div className="docs-hero-orb docs-hero-orb-1" />
      <div className="docs-hero-orb docs-hero-orb-2" />
      <div className="docs-hero-orb docs-hero-orb-3" />

      <div className="docs-hero-bloom" />

      <svg
        className="docs-hero-net"
        viewBox="0 0 1000 360"
        fill="none"
        preserveAspectRatio="none"
      >
        <path d="M 40,70 Q 260,130 460,80 T 880,110" className="docs-hero-net-line l1" />
        <path d="M 120,230 Q 360,170 600,250 T 940,180" className="docs-hero-net-line l2" />
        <circle cx="40" cy="70" r="2.5" className="docs-hero-node" />
        <circle cx="460" cy="80" r="3" className="docs-hero-node" />
        <circle cx="880" cy="110" r="2.5" className="docs-hero-node" />
        <circle cx="120" cy="230" r="2.5" className="docs-hero-node" />
        <circle cx="600" cy="250" r="3" className="docs-hero-node" />
        <circle cx="940" cy="180" r="2.5" className="docs-hero-node" />
      </svg>

      <div className="docs-hero-particles">
        <span className="docs-hero-pt docs-hero-pt-1" />
        <span className="docs-hero-pt docs-hero-pt-2" />
        <span className="docs-hero-pt docs-hero-pt-3" />
        <span className="docs-hero-pt docs-hero-pt-4" />
        <span className="docs-hero-pt docs-hero-pt-5" />
        <span className="docs-hero-pt docs-hero-pt-6" />
        <span className="docs-hero-pt docs-hero-pt-7" />
        <span className="docs-hero-pt docs-hero-pt-8" />
      </div>
    </div>
  );
});

export default DocumentationHeroAtmosphere;
