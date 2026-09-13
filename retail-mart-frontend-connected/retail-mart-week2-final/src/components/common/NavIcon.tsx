import { NavRoute } from "@/constants/routes";

interface NavIconProps {
  name: NavRoute["icon"];
  className?: string;
}

/**
 * One small icon set for the sidebar, kept as inline SVG paths instead of
 * an icon library dependency - six icons don't justify an extra package.
 */
export function NavIcon({ name, className }: NavIconProps) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };

  switch (name) {
    case "dashboard":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="8" height="8" rx="1.5" />
          <rect x="13" y="3" width="8" height="5" rx="1.5" />
          <rect x="13" y="10" width="8" height="11" rx="1.5" />
          <rect x="3" y="13" width="8" height="8" rx="1.5" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 20a5.5 5.5 0 0111 0" />
          <circle cx="17.5" cy="9" r="2.4" />
          <path d="M15 20a4.2 4.2 0 018.5 0" strokeOpacity="0.7" />
        </svg>
      );
    case "products":
      return (
        <svg {...common}>
          <path d="M21 8l-9-5-9 5 9 5 9-5z" />
          <path d="M3 8v8l9 5 9-5V8" />
          <path d="M12 13v8" />
        </svg>
      );
    case "categories":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "orders":
      return (
        <svg {...common}>
          <path d="M4 7h16M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12" />
          <path d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2" />
        </svg>
      );
    case "payments":
      return (
        <svg {...common}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
          <path d="M6 15h4" />
        </svg>
      );
    case "shipping":
      return (
        <svg {...common}>
          <rect x="1" y="6" width="14" height="11" rx="1.5" />
          <path d="M15 10h4l3 3v4h-7z" />
          <circle cx="6" cy="19" r="1.6" />
          <circle cx="17.5" cy="19" r="1.6" />
        </svg>
      );
    case "couriers":
      return (
        <svg {...common}>
          <rect x="1" y="3" width="15" height="13" rx="1" />
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      );
    case "communications":
      return (
        <svg {...common}>
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M22 6l-10 8L2 6" />
        </svg>
      );
    case "campaigns":
      return (
        <svg {...common}>
          <path d="M3 11l16-7-4 16-5-6-6-3z" />
          <path d="M15 4L9 14" />
        </svg>
      );
    case "reports":
      return (
        <svg {...common}>
          <path d="M4 20V10M10 20V4M16 20v-7M20 20H4" />
        </svg>
      );
    case "analytics":
      return (
        <svg {...common}>
          <path d="M3 17l6-6 4 4 8-8" />
          <path d="M17 7h4v4" />
        </svg>
      );
    default:
      return null;
  }
}
