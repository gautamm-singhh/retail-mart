import { SelectHTMLAttributes, forwardRef } from "react";
import { Select } from "@/components/ui/Select";
import { ROLES } from "@/constants/roles";

interface RoleSelectProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "children"
> {
  label?: string;
  hideLabel?: boolean;
  includeAllOption?: boolean;
}

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
