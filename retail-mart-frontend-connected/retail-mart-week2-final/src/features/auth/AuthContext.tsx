import { createContext, ReactNode, useCallback, useEffect, useState } from "react";
import { getAuthToken, setAuthToken } from "@/features/auth/authStorage";
import { request, ApiError } from "@/services/api/client";
import { signup as signupRequest, requestOtp as requestOtpApi, verifyOtp as verifyOtpApi } from "@/services/api/auth";
import type { Role } from "@/types";

export interface CurrentUser {
  id: string;
  name: string;
  email: string | null;
  phone?: string | null;
  role: Role;
}

interface LoginResponse {
  accessToken: string;
  user: CurrentUser;
}

export interface AuthContextValue {
  /** True as soon as a token exists locally - does not wait on /auth/me. */
  isAuthenticated: boolean;
  /** Null until /auth/me resolves (or when signed out). */
  currentUser: CurrentUser | null;
  /** True while /auth/me is resolving after a token is found on load. */
  isLoadingUser: boolean;
  /** Resolves with the signed-in user on success, null on invalid credentials. Throws on network/server errors. */
  login: (email: string, password: string) => Promise<CurrentUser | null>;
  /** Customer signup (storefront). Throws ApiError on validation failure (e.g. email already taken). */
  signup: (values: { name: string; email: string; password: string; phone?: string }) => Promise<void>;
  /** Step 1 of mobile OTP auth: sends a code to `phone`. */
  requestOtp: (phone: string) => Promise<void>;
  /** Step 2: verifies the code, logging in or auto-creating a Customer account. */
  verifyOtp: (phone: string, code: string, name?: string) => Promise<{ isNewUser: boolean }>;
  logout: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components -- context object is intentionally colocated with its provider
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Real authentication backed by Sorav's Flask API (JWT).
 *
 * - `login()` calls POST /api/auth/login, stores the returned token, and
 *   sets `currentUser` from the response immediately.
 * - On mount, if a token is already in sessionStorage (e.g. after a page
 *   refresh), this calls GET /api/auth/me to re-hydrate `currentUser`. If
 *   that call fails (expired/invalid token), the token is cleared and the
 *   user is treated as signed out.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getAuthToken());
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(() => Boolean(getAuthToken()));

  useEffect(() => {
    if (!token) {
      setCurrentUser(null);
      setIsLoadingUser(false);
      return;
    }

    let cancelled = false;
    setIsLoadingUser(true);

    request<CurrentUser>("/auth/me")
      .then((user) => {
        if (!cancelled) setCurrentUser(user);
      })
      .catch(() => {
        // Token is invalid/expired - drop it and fall back to signed-out.
        if (!cancelled) {
          setAuthToken(null);
          setToken(null);
          setCurrentUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingUser(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = useCallback(async (email: string, password: string): Promise<CurrentUser | null> => {
    try {
      const data = await request<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setAuthToken(data.accessToken);
      setToken(data.accessToken);
      setCurrentUser(data.user);
      return data.user;
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        return null;
      }
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setToken(null);
    setCurrentUser(null);
  }, []);

  const signup = useCallback(
    async (values: { name: string; email: string; password: string; phone?: string }) => {
      const data = await signupRequest(values);
      setAuthToken(data.accessToken);
      setToken(data.accessToken);
      setCurrentUser(data.user);
    },
    [],
  );

  const requestOtp = useCallback((phone: string) => requestOtpApi(phone).then(() => undefined), []);

  const verifyOtp = useCallback(async (phone: string, code: string, name?: string) => {
    const data = await verifyOtpApi(phone, code, name);
    setAuthToken(data.accessToken);
    setToken(data.accessToken);
    setCurrentUser(data.user);
    return { isNewUser: data.isNewUser };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: Boolean(token),
        currentUser,
        isLoadingUser,
        login,
        signup,
        requestOtp,
        verifyOtp,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
