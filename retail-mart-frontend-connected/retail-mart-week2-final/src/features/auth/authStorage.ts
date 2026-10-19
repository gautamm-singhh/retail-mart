const TOKEN_KEY = "retail-mart-token";

export function getAuthToken(): string | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY);
    if (!raw || raw === "null" || raw === "undefined") return null;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token && token.trim().length > 0) {
      sessionStorage.setItem(TOKEN_KEY, token.trim());
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    /* ignore */
  }
}
