import { createContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { ApiError } from "../../lib/api";
import { toast } from "../../state/toast-store";
import {
  getCurrentUserRequest,
  logoutRequest,
  refreshRequest
} from "./auth-api";
import { authStorage } from "./auth-storage";
import type {
  AccessState,
  AuthOrganization,
  AuthUser,
  CurrentUserResponse,
  LoginResponse,
  PersistedSession,
  PlatformRole
} from "./auth.types";

type AuthStatus = "restoring" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  accessState: AccessState | null;
  accessToken: string | null;
  isPlatformAdmin: boolean;
  isAuthenticated: boolean;
  isRestoring: boolean;
  logout: () => Promise<void>;
  organizations: AuthOrganization[];
  platformRole: PlatformRole | null;
  restoreSession: () => Promise<void>;
  setAuthenticatedSession: (payload: LoginResponse | CurrentUserResponse, persisted?: PersistedSession) => void;
  user: AuthUser | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const accessStateFor = (value: LoginResponse | CurrentUserResponse) => value.accessState;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<AuthStatus>("restoring");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessState, setAccessState] = useState<AccessState | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [organizations, setOrganizations] = useState<AuthOrganization[]>([]);
  const [platformRole, setPlatformRole] = useState<PlatformRole | null>(null);

  const clearSession = () => {
    authStorage.clear();
    setAccessState(null);
    setAccessToken(null);
    setIsPlatformAdmin(false);
    setOrganizations([]);
    setPlatformRole(null);
    setStatus("unauthenticated");
    setUser(null);
  };

  const setAuthenticatedSession = (
    payload: LoginResponse | CurrentUserResponse,
    persisted?: PersistedSession
  ) => {
    setUser(payload.user);
    setAccessState(accessStateFor(payload));
    setIsPlatformAdmin(payload.isPlatformAdmin);
    setOrganizations(payload.organizations);
    setPlatformRole(payload.platformRole);
    setStatus("authenticated");

    if (persisted) {
      authStorage.write(persisted);
      setAccessToken(persisted.accessToken);
    }
  };

  const restoreSession = async () => {
    setStatus("restoring");

    const storedSession = authStorage.read();

    if (!storedSession) {
      clearSession();
      return;
    }

    try {
      const profile = await getCurrentUserRequest(storedSession.accessToken);
      setAuthenticatedSession(profile, storedSession);
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;

      if (!apiError || apiError.status !== 401) {
        clearSession();
        return;
      }

      try {
        const refreshed = await refreshRequest(storedSession.refreshToken);
        setAuthenticatedSession(refreshed, {
          accessToken: refreshed.accessToken,
          expiresAt: refreshed.expiresAt,
          refreshToken: refreshed.refreshToken
        });
      } catch {
        clearSession();
      }
    }
  };

  const logout = async () => {
    try {
      if (accessToken) {
        await logoutRequest(accessToken);
      }
    } catch {
      toast.info("Signed out locally", "The session was cleared on this device.");
    } finally {
      clearSession();
    }
  };

  useEffect(() => {
    void restoreSession();
  }, []);

  const value = useMemo(
    () => ({
      accessState,
      accessToken,
      isPlatformAdmin,
      isAuthenticated: status === "authenticated",
      isRestoring: status === "restoring",
      logout,
      organizations,
      platformRole,
      restoreSession,
      setAuthenticatedSession,
      user
    }),
    [accessState, accessToken, isPlatformAdmin, organizations, platformRole, status, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export { AuthContext };
