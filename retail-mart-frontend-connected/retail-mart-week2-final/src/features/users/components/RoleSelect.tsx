import { SelectHTMLAttributes, forwardRef } from "react";
import { Select } from "@/components/ui/Select";
import { ROLES } from "@/constants/roles";

interface RoleSelectProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "children"
> {
  label?: string;
  hideLabel?: boolean;
  /** Adds an "All roles" option at the top, for use as a list filter rather than a form field. */
  includeAllOption?: boolean;
}

/**
 * Centralized role dropdown reused by user forms and management filters,
 * reflecting the RBAC console permission tiers (Admin / Manager / Staff).
 */
export const RoleSelect = forwardRef<HTMLSelectElement, RoleSelectProps>(
  ({ label = "Role", hideLabel, includeAllOption, ...props }, ref) => {
    const options = includeAllOption
      ? [
          { label: "All roles", value: "all" },
          ...ROLES.map((role) => ({ label: role, value: role })),
        ]
      : ROLES.map((role) => ({ label: role, value: role }));

    return (
      <Select
        ref={ref}
        label={label}
        hideLabel={hideLabel}
        options={options}
        {...props}
      />
    );
  },
);

RoleSelect.displayName = "RoleSelect";
