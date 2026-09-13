import { request } from "@/services/api/client";
import type { CustomerProfile } from "@/types";

interface AuthResponse {
  accessToken: string;
  user: CustomerProfile;
}

export function signup(values: { name: string; email: string; password: string; phone?: string }): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/signup", { method: "POST", body: JSON.stringify(values) });
}

export function requestOtp(phone: string): Promise<{ phone: string; expiresInMinutes: number }> {
  return request("/auth/otp/request", { method: "POST", body: JSON.stringify({ phone }) });
}

export function verifyOtp(phone: string, code: string, name?: string): Promise<AuthResponse & { isNewUser: boolean }> {
  return request("/auth/otp/verify", { method: "POST", body: JSON.stringify({ phone, code, name }) });
}
