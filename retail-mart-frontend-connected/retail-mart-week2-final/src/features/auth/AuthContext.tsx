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
  isAuthenticated: boolean;
  currentUser: CurrentUser | null;
  isLoadingUser: boolean;
  login: (
    email: string,
    password: string,
    targetPortal?: "customer" | "admin",
  ) => Promise<CurrentUser | null>;
  signup: (values: { name: string; email: string; password: string; phone?: string }) => Promise<void>;
  requestOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, code: string, name?: string) => Promise<{ isNewUser: boolean }>;
  logout: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components -- context object is intentionally colocated with its provider
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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

  const login = useCallback(
    async (
      email: string,
      password: string,
      targetPortal?: "customer" | "admin",
    ): Promise<CurrentUser | null> => {
      const cleanEmail = email.trim().toLowerCase();
      try {
        const data = await request<LoginResponse>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: cleanEmail, password }),
        });

        if (targetPortal === "customer" && data.user.role !== "Customer") {
          throw new ApiError(
            403,
            "This account is registered as an administrator. Please switch to Admin mode to sign in.",
          );
        } else if (
          targetPortal === "admin" &&
          !["Admin", "Manager", "Staff"].includes(data.user.role)
        ) {
          throw new ApiError(
            403,
            "This account is not registered as an administrator.",
          );
        }

        setAuthToken(data.accessToken);
        setToken(data.accessToken);
        setCurrentUser(data.user);
        return data.user;
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 401) {
            return null;
          }
          throw err;
        }
        throw err;
      }
    },
    [],
  );

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
