// Roles supported across the Retail Mart platform.
// Internal administrative console roles: Admin, Manager, Staff.
// Customer role: Authenticated shoppers accessing the storefront.
export type Role = "Admin" | "Manager" | "Staff" | "Customer";

export type UserStatus = "active" | "inactive";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
}

/** Fields collected by UserForm when creating or editing a user. */
export type UserFormValues = Pick<User, "name" | "email" | "role" | "status">;
