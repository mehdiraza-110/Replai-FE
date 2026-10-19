import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ApiRequestError, authService, SESSION_EXPIRED_EVENT, TRIAL_ENDED_EVENT, workspaceService, type LoginPayload, type RegisterPayload } from "../services/api";
import { reconnectRealtime } from "../services/realtime";
import type { AuthUser, WorkspacePlan, WorkspaceSummary, WorkspaceType } from "../types";
import { clearViewAs, getViewAs } from "../utils/viewAs";
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
  /** The active workspace's plan (trial or standard), when known. */
  plan: WorkspacePlan | null;
  /** True when the active workspace's trial has ended (from its plan or from a TRIAL_ENDED API response). */
  isTrialEnded: boolean;
  /** Re-reads the active workspace's plan and usage from the server. */
  refreshPlan: () => Promise<void>;
  /** The trial info modal: opens once per sign-in, and again whenever the trial chip is clicked. */
  trialModalOpen: boolean;
  openTrialModal: () => void;
  closeTrialModal: () => void;
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
  const [trialEndedWorkspaceId, setTrialEndedWorkspaceId] = useState<number | null>(null);
  // Set on every email/password sign-in (never on reloads or tab restores); consumed when the modal is dismissed.
  const [signInNoticePending, setSignInNoticePending] = useState(false);
  const [trialModalManual, setTrialModalManual] = useState(false);
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
    setSignInNoticePending(false);
    setTrialModalManual(false);
    setTrialEndedWorkspaceId(null);
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

  // Fetches the active workspace's fresh plan/usage and merges it into the stored user's workspace summary.
  const refreshPlan = useCallback(async () => {
    const stored = readStoredSession();
    const workspaceId = stored?.user?.active_workspace_id;
    if (!workspaceId || getViewAs()) return;

    try {
      const detail = await workspaceService.current();
      if (!detail.plan) return;
      const plan = detail.plan;
      setSession((current) => {
        if (!current?.user.workspaces) return current;
        const nextSession = {
          ...current,
          user: { ...current.user, workspaces: current.user.workspaces.map((w) => (w.id === workspaceId ? { ...w, plan } : w)) },
        };
        storeSession(nextSession);
        return nextSession;
      });
      setTrialEndedWorkspaceId((id) => (plan.ended ? workspaceId : id === workspaceId ? null : id));
    } catch {
      /* the plan is informational; a failed refresh keeps what the sign-in response carried */
    }
  }, []);

  // Re-validate a stored session on load so workspace membership and flags are fresh.
  useEffect(() => {
    if (!readStoredSession()) return;

    let isActive = true;
    authService
      .me()
      .then((fresh) => {
        if (!isActive) return;
        updateUser(fresh);
        void refreshPlan();
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
  }, [expireSession, refreshPlan, updateUser]);

  useEffect(() => {
    window.addEventListener(SESSION_EXPIRED_EVENT, expireSession);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expireSession);
  }, [expireSession]);

  // Any API call that answers TRIAL_ENDED means the active workspace's trial is over: show the notice right away.
  useEffect(() => {
    function handleTrialEnded() {
      const workspaceId = readStoredSession()?.user?.active_workspace_id ?? null;
      setTrialEndedWorkspaceId(workspaceId);
      void refreshPlan();
    }

    window.addEventListener(TRIAL_ENDED_EVENT, handleTrialEnded);
    return () => window.removeEventListener(TRIAL_ENDED_EVENT, handleTrialEnded);
  }, [refreshPlan]);

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
      // Refresh usage first so the sign-in trial notice shows current numbers.
      void refreshPlan().finally(() => setSignInNoticePending(true));
    },
    [commitSession, refreshPlan],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const nextSession = await authService.register(payload);
      commitSession(nextSession);
      setIsReady(true);
      reconnectRealtime();
      // Refresh usage first so the sign-in trial notice shows current numbers.
      void refreshPlan().finally(() => setSignInNoticePending(true));
    },
    [commitSession, refreshPlan],
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

  const plan = activeWorkspace?.plan ?? null;
  const isTrialEnded = Boolean(plan?.ended) || (activeWorkspace != null && trialEndedWorkspaceId === activeWorkspace.id);
  const canShowTrialNotice = Boolean(plan && plan.type === "trial" && !plan.ended && !isTrialEnded && !viewAs);
  const trialModalOpen = trialModalManual || (signInNoticePending && canShowTrialNotice);

  // A sign-in notice that doesn't apply (standard plan, ended trial, view as) is dropped rather than shown later.
  useEffect(() => {
    if (signInNoticePending && activeWorkspace && !canShowTrialNotice) setSignInNoticePending(false);
  }, [activeWorkspace, canShowTrialNotice, signInNoticePending]);

  const openTrialModal = useCallback(() => setTrialModalManual(true), []);
  const closeTrialModal = useCallback(() => {
    setTrialModalManual(false);
    setSignInNoticePending(false);
  }, []);

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
      plan,
      isTrialEnded,
      refreshPlan,
      trialModalOpen,
      openTrialModal,
      closeTrialModal,
    }),
    [activeWorkspace, closeTrialModal, createWorkspace, isTrialEnded, openTrialModal, plan, refreshPlan, trialModalOpen, isReady, login, logout, refreshUser, register, session, switchWorkspace, updateUser, user, workspaceEpoch],
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
