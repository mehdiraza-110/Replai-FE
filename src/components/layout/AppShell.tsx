import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { ViewAsBanner } from "./ViewAsBanner";
import { useViewAs } from "../../hooks/useViewAs";
import { Hourglass, PauseCircle } from "lucide-react";
import { TrialEndedNotice } from "../trial/TrialEndedNotice";
import { TrialModal } from "../trial/TrialModal";
import { usePlanFreshness } from "../trial/LimitReachedAlert";

const SIDEBAR_COLLAPSED_KEY = "sendvybe.sidebar.collapsed";

export function AppShell() {
  const { activeWorkspace, workspaceEpoch, isSuperAdmin, isTrialEnded } = useAuth();
  const location = useLocation();
  const viewAs = useViewAs();
  const onAdminPage = isSuperAdmin && (location.pathname === "/admin" || location.pathname.startsWith("/admin/"));
  // Members of a suspended workspace get one clear screen instead of a wall of failing pages.
  const isSuspended = activeWorkspace?.status === "suspended" && !viewAs && !onAdminPage;

  const showTrialEnded = isTrialEnded && !isSuperAdmin && !viewAs && !isSuspended;
  const showTrialEndedWarning = isTrialEnded && Boolean(viewAs);

  // Keep the plan fresh so the red limit notice appears (and clears) without a reload.
  usePlanFreshness(!viewAs && !isSuspended);

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  function toggleSidebar() {
    setCollapsed((value) => {
      const next = !value;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // Storage unavailable: the collapsed state just won't persist.
      }
      return next;
    });
  }

  const marginClass = `transition-[margin] duration-300 ease-in-out ${collapsed ? "lg:ml-0" : "lg:ml-[212px]"}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ViewAsBanner />
      {showTrialEndedWarning ? (
        <div className={`flex items-center gap-2 border-b border-warning/30 bg-warning/10 px-4 py-1.5 text-[12px] font-medium text-foreground sm:px-5 ${marginClass}`} role="status">
          <Hourglass aria-hidden className="size-3.5 shrink-0 text-warning" />
          This workspace's trial has ended. Its members are locked out; you can still view it as a super admin.
        </div>
      ) : null}
      <TrialModal />
      <Sidebar collapsed={collapsed} />
      <TopBar className={marginClass} collapsed={collapsed} onToggleSidebar={toggleSidebar} />
      <main className={`min-w-0 overflow-x-hidden px-4 py-5 sm:px-5 ${marginClass}`} key={workspaceEpoch}>
        {isSuspended ? (
          <div className="mx-auto mt-16 flex max-w-[460px] flex-col items-center gap-3 rounded-2xl border border-border/70 bg-surface p-8 text-center apple-shadow" role="alert">
            <PauseCircle aria-hidden className="size-8 text-warning" />
            <h2 className="text-lg font-semibold text-foreground">{activeWorkspace?.name} is suspended</h2>
            <p className="text-sm text-muted">
              This workspace has been suspended, so its data and tools are unavailable for now. Please contact support to get it reactivated.
              If you belong to another workspace, you can switch to it from the workspace menu.
            </p>
          </div>
        ) : showTrialEnded ? (
          <TrialEndedNotice />
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}
