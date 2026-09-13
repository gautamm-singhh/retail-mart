import type { Role } from "@/types";

// Single source of truth for the fixed Week-2 role set. Referenced by
// RoleSelect (forms) and the Users page role filter so the two never drift.
export const ROLES: Role[] = ["Admin", "Manager", "Staff"];
