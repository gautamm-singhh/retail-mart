import { request } from "@/services/api/client";
import type { User, UserFormValues } from "@/types";

export function fetchUsers(): Promise<User[]> {
  return request<User[]>("/users");
}

export function createUser(values: UserFormValues): Promise<User> {
  return request<User>("/users", { method: "POST", body: JSON.stringify(values) });
}

export function updateUser(id: string, values: UserFormValues): Promise<User> {
  return request<User>(`/users/${id}`, { method: "PUT", body: JSON.stringify(values) });
}

export function setUserStatus(id: string, status: User["status"]): Promise<User> {
  return request<User>(`/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function deleteUser(id: string): Promise<void> {
  return request<void>(`/users/${id}`, { method: "DELETE" });
}
