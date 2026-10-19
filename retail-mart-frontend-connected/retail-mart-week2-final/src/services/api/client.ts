import { getAuthToken, setAuthToken } from "@/features/auth/authStorage";

const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").trim();
const API_BASE_URL =
  import.meta.env.PROD
    ? (!configuredBaseUrl || configuredBaseUrl.includes("localhost") || configuredBaseUrl.includes("127.0.0.1")
        ? "https://retail-mart-iota.vercel.app/api"
        : configuredBaseUrl)
    : (configuredBaseUrl || "http://localhost:4000/api");

export interface ApiClientConfig {
  baseUrl: string;
}

export const apiConfig: ApiClientConfig = {
  baseUrl: API_BASE_URL,
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

function extractErrorMessage(data: unknown, fallback: string): string {
  if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;
    if (typeof obj.error === "string" && obj.error.trim()) return obj.error.trim();
    if (typeof obj.msg === "string" && obj.msg.trim()) return obj.msg.trim();
    if (typeof obj.message === "string" && obj.message.trim()) return obj.message.trim();
  }
  return fallback;
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();

  const response = await fetch(`${apiConfig.baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = extractErrorMessage(data, `Request to ${path} failed with status ${response.status}`);
    if (response.status === 401) {
      if (!path.startsWith("/auth/login") && !path.startsWith("/auth/signup")) {
        setAuthToken(null);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("retail-mart:unauthorized", { detail: { path, message } }));
        }
      }
    }
    throw new ApiError(response.status, message);
  }

  return data as T;
}

export async function downloadFile(path: string, fallbackFilename: string): Promise<void> {
  const token = getAuthToken();

  const response = await fetch(`${apiConfig.baseUrl}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = extractErrorMessage(data, `Request to ${path} failed with status ${response.status}`);
    if (response.status === 401) {
      setAuthToken(null);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("retail-mart:unauthorized", { detail: { path, message } }));
      }
    }
    throw new ApiError(response.status, message);
  }

  const disposition = response.headers.get("Content-Disposition") ?? "";
  const filenameMatch = /filename="?([^"]+)"?/.exec(disposition);
  const filename = filenameMatch?.[1] ?? fallbackFilename;

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
