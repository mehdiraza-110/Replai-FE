import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ApiRequestError, authService, SESSION_EXPIRED_EVENT, workspaceService, type LoginPayload, type RegisterPayload } from "../services/api";
import { reconnectRealtime } from "../services/realtime";
import type { AuthUser, WorkspaceSummary, WorkspaceType } from "../types";
import { clearViewAs } from "../utils/viewAs";
import { useViewAs } from "../hooks/useViewAs";

interface AuthSession {
  user: AuthUser;
  token: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  /** False only while a stored session is being re-validated against the server on app load. */
  isReady: boolean;
  isSuperAdmin: boolean;
  /** The workspace requests currently act in: the user's active workspace, or the one a super admin is viewing as. */
  activeWorkspace: WorkspaceSummary | null;
  /** Changes whenever the workspace changes; use as a React key to remount pages so they reload their data. */
  workspaceEpoch: number;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: AuthUser) => void;
  refreshUser: () => Promise<AuthUser | null>;
  switchWorkspace: (workspaceId: number) => Promise<void>;
  createWorkspace: (payload: { name: string; type: WorkspaceType }) => Promise<void>;
}

const STORAGE_KEY = "replai.auth";
export const SESSION_EXPIRED_NOTICE_KEY = "replai.sessionExpired";

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredSession(): AuthSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function storeSession(session: AuthSession) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession());
  const [isReady, setIsReady] = useState(() => !readStoredSession());
  const [workspaceEpoch, setWorkspaceEpoch] = useState(0);
  const [viewedWorkspace, setViewedWorkspace] = useState<WorkspaceSummary | null>(null);
  const viewAs = useViewAs();

  const commitSession = useCallback((nextSession: AuthSession) => {
    storeSession(nextSession);
    setSession(nextSession);
  }, []);

  const clearLocalSession = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    clearViewAs();
    setSession(null);
    setViewedWorkspace(null);
    setIsReady(true);
    reconnectRealtime();
  }, []);

  // The server no longer accepts this session (cookie expired or invalidated): leave a note for the login screen.
  const expireSession = useCallback(() => {
    try {
      window.sessionStorage.setItem(SESSION_EXPIRED_NOTICE_KEY, "1");
    } catch {
      /* the notice is a courtesy only */
    }
    clearLocalSession();
  }, [clearLocalSession]);

  const updateUser = useCallback((nextUser: AuthUser) => {
    setSession((current) => {
      if (!current) return current;

      const nextSession = { ...current, user: nextUser };
      storeSession(nextSession);
      return nextSession;
    });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const fresh = await authService.me();
      updateUser(fresh);
      return fresh;
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) expireSession();
      return null;
    }
  }, [expireSession, updateUser]);

  // Re-validate a stored session on load so workspace membership and flags are fresh.
  useEffect(() => {
    if (!readStoredSession()) return;

    let isActive = true;
    authService
      .me()
      .then((fresh) => {
        if (isActive) updateUser(fresh);
      })
      .catch((error) => {
        if (isActive && error instanceof ApiRequestError && error.status === 401) expireSession();
      })
      .finally(() => {
        if (isActive) setIsReady(true);
      });

    return () => {
      isActive = false;
    };
  }, [expireSession, updateUser]);

  useEffect(() => {
    window.addEventListener(SESSION_EXPIRED_EVENT, expireSession);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expireSession);
  }, [expireSession]);

  // The session cookie is shared by every tab, so a switch, login or logout in one tab changes what the others'
  // requests act on. Follow it here so a stale tab never shows one workspace while writing to another.
  const sessionRef = useRef(session);
  sessionRef.current = session;
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return;
      const next = readStoredSession();
      const current = sessionRef.current;

      if (!next) {
        clearViewAs();
        setSession(null);
        setViewedWorkspace(null);
        setIsReady(true);
        reconnectRealtime();
        return;
      }

      const changed = next.user?.id !== current?.user?.id || next.user?.active_workspace_id !== current?.user?.active_workspace_id;
      setSession(next);
      if (changed) {
        clearViewAs();
        setWorkspaceEpoch((epoch) => epoch + 1);
        reconnectRealtime();
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // While a super admin views as another workspace, load that workspace's flags so navigation matches it.
  useEffect(() => {
    if (!viewAs || !session) {
      setViewedWorkspace(null);
      return;
    }

    let isActive = true;
    workspaceService
      .current()
      .then((detail) => {
        if (isActive) setViewedWorkspace({ ...detail, role: "owner", permissions: { auto_responder: true, cold_mailer: true } });
      })
      .catch(() => {
        if (isActive) setViewedWorkspace(null);
      });

    return () => {
      isActive = false;
    };
  }, [viewAs, session]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const nextSession = await authService.login(payload);
      commitSession(nextSession);
      setIsReady(true);
      reconnectRealtime();
    },
    [commitSession],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const nextSession = await authService.register(payload);
      commitSession(nextSession);
      setIsReady(true);
      reconnectRealtime();
    },
    [commitSession],
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // The local session is cleared regardless; an expired cookie needs no server-side cleanup.
    }
    clearLocalSession();
  }, [clearLocalSession]);

  const adoptNewWorkspace = useCallback(
    async (token?: string) => {
      clearViewAs();
      if (token) {
        setSession((current) => {
          if (!current) return current;
          const nextSession = { ...current, token };
          storeSession(nextSession);
          return nextSession;
        });
      }
      await refreshUser();
      setWorkspaceEpoch((epoch) => epoch + 1);
      reconnectRealtime();
    },
    [refreshUser],
  );

  const switchWorkspace = useCallback(
    async (workspaceId: number) => {
      const result = await workspaceService.switchTo(workspaceId);
      await adoptNewWorkspace(result.token);
    },
    [adoptNewWorkspace],
  );

  const createWorkspace = useCallback(
    async (payload: { name: string; type: WorkspaceType }) => {
      const result = await workspaceService.create(payload);
      await adoptNewWorkspace(result.token);
    },
    [adoptNewWorkspace],
  );

  const user = session?.user ?? null;

  const activeWorkspace = useMemo<WorkspaceSummary | null>(() => {
    if (viewAs) {
      return (
        viewedWorkspace ?? {
          id: viewAs.id,
          name: viewAs.name,
          slug: "",
          type: "organization",
          status: "active",
          auto_responder_enabled: true,
          cold_mailer_enabled: true,
          role: "owner",
          permissions: { auto_responder: true, cold_mailer: true },
        }
      );
    }

    return user?.workspaces?.find((workspace) => workspace.id === user.active_workspace_id) ?? null;
  }, [user, viewAs, viewedWorkspace]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token: session?.token ?? null,
      isAuthenticated: Boolean(session?.token),
      isReady,
      isSuperAdmin: Boolean(user?.is_super_admin),
      activeWorkspace,
      workspaceEpoch,
      login,
      register,
      logout,
      updateUser,
      refreshUser,
      switchWorkspace,
      createWorkspace,
    }),
    [activeWorkspace, createWorkspace, isReady, login, logout, refreshUser, register, session, switchWorkspace, updateUser, user, workspaceEpoch],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
