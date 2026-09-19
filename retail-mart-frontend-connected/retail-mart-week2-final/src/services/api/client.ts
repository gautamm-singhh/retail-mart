/**
 * Central HTTP client communicating with the Retail Mart backend API.
 * Configures authentication headers, error shapes, and base endpoints.
 */
import { getAuthToken } from "@/features/auth/authStorage";

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

/** Thrown for any non-2xx response. `status` lets callers branch on 401/403/404/409 etc. */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
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

  // DELETE endpoints return 204 No Content - nothing to parse.
  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data === "object" && data && "error" in data
        ? String((data as { error: unknown }).error)
        : `Request to ${path} failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return data as T;
}

/**
 * For endpoints that return a file (PDF invoices/receipts) rather than
 * JSON. Fetches the file as a blob, then triggers a normal browser
 * "Save As" download using a temporary object URL - no separate tab, no
 * navigating away from the current page.
 */
export async function downloadFile(path: string, fallbackFilename: string): Promise<void> {
  const token = getAuthToken();

  const response = await fetch(`${apiConfig.baseUrl}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message =
      typeof data === "object" && data && "error" in data
        ? String((data as { error: unknown }).error)
        : `Request to ${path} failed with status ${response.status}`;
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
