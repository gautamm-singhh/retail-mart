// Stores the JWT issued by POST /api/auth/login. sessionStorage (not
// localStorage) so signing out of one tab doesn't silently affect others,
// and so the token doesn't linger indefinitely on a shared machine.
const TOKEN_KEY = "retail-mart-token";

export function getAuthToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    // sessionStorage can throw in some restricted environments (e.g. private
    // browsing on old browsers) - fail safe to "not authenticated".
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore - worst case the session doesn't persist across a refresh.
  }
}
