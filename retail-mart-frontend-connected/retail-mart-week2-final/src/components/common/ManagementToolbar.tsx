import { ReactNode } from "react";
import { SearchInput } from "@/components/ui/SearchInput";

interface ManagementToolbarProps {
  searchLabel: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters?: ReactNode;
  action?: ReactNode;
}

/**
 * The search + filter + primary action row is identical in shape across
 * Products, Categories, Orders, Payments, and Shipping, so it is one
 * component instead of five copies that would drift apart over time.
 */
export function ManagementToolbar({
  searchLabel,
  searchValue,
  onSearchChange,
  filters,
  action,
}: ManagementToolbarProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="w-full sm:w-80">
          <SearchInput
            label={searchLabel}
            placeholder={searchLabel}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        {filters && <div className="flex flex-wrap items-center gap-2.5">{filters}</div>}
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
}
