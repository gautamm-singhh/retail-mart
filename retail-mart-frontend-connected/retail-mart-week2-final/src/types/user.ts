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

export type UserFormValues = Pick<User, "name" | "email" | "role" | "status">;
