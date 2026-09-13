import type { CustomerStats } from "@/types";

interface AppreciationMarqueeProps {
  stats: CustomerStats | null;
  customerName: string;
}

/**
 * Scrolling appreciation banner displayed below the storefront header
 * for authenticated customers. The message is personalised using real
 * purchase data from the customer stats API.
 *
 * Accessibility:
 *   - role="marquee" + aria-live="polite" so screen readers announce the
 *     content without interrupting the user.
 *   - The animation respects prefers-reduced-motion: text is still visible
 *     but the scroll animation is paused.
 */
export function AppreciationMarquee({ stats, customerName }: AppreciationMarqueeProps) {
  const firstName = customerName.split(" ")[0];

  const message =
    stats && stats.totalItemsPurchased > 0
      ? `🎉 Thank you, ${firstName}! You've purchased ${stats.totalItemsPurchased} item${stats.totalItemsPurchased === 1 ? "" : "s"} from Retail Mart. We appreciate your loyalty! 🛍️`
      : `🛍️ Welcome to Retail Mart, ${firstName}! Discover great deals across thousands of products. Happy shopping! ✨`;

  // Repeat the message so the scroll feels continuous.
  const repeated = `${message}   •   ${message}   •   ${message}`;

  return (
    <div
      role="marquee"
      aria-live="polite"
      aria-label="Customer appreciation message"
      className="overflow-hidden whitespace-nowrap bg-emerald-700 py-1.5 text-xs font-medium text-white shadow-inner dark:bg-emerald-950/90 dark:border-b dark:border-emerald-900/60 dark:text-emerald-200 transition-colors"
      style={{ WebkitMaskImage: "linear-gradient(to right, transparent, black 5%, black 95%, transparent)" }}
    >
      <span
        className="inline-block animate-[marquee_30s_linear_infinite] motion-reduce:animate-none"
        style={{ paddingLeft: "100%" }}
      >
        {repeated}
      </span>
    </div>
  );
}
