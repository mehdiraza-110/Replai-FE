import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { getSystem, getSystemForPath, isSystemEnabled, SYSTEMS } from "../../constants/systems";
import { useAuth } from "../../context/AuthContext";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { ViewAsBanner } from "./ViewAsBanner";
import { useViewAs } from "../../hooks/useViewAs";
import { PauseCircle } from "lucide-react";

export function AppShell() {
  const { activeWorkspace, workspaceEpoch, isSuperAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const viewAs = useViewAs();
  const onAdminPage = isSuperAdmin && (location.pathname === "/admin" || location.pathname.startsWith("/admin/"));
  // Members of a suspended workspace get one clear screen instead of a wall of failing pages.
  const isSuspended = activeWorkspace?.status === "suspended" && !viewAs && !onAdminPage;

  // If the current page belongs to a system this workspace (or member) can't use, send them to one they can.
  useEffect(() => {
    const pathSystem = getSystemForPath(location.pathname);
    if (!pathSystem || isSystemEnabled(pathSystem, activeWorkspace)) return;

    const fallback = SYSTEMS.find((system) => isSystemEnabled(system.id, activeWorkspace));
    navigate(fallback ? getSystem(fallback.id).homePath : "/", { replace: true });
  }, [activeWorkspace, location.pathname, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ViewAsBanner />
      <Sidebar />
      <TopBar />
      <main className="min-w-0 overflow-x-hidden px-4 py-5 sm:px-5 lg:ml-[212px]" key={workspaceEpoch}>
        {isSuspended ? (
          <div className="mx-auto mt-16 flex max-w-[460px] flex-col items-center gap-3 rounded-2xl border border-border/70 bg-surface p-8 text-center apple-shadow" role="alert">
            <PauseCircle aria-hidden className="size-8 text-warning" />
            <h2 className="text-lg font-semibold text-foreground">{activeWorkspace?.name} is suspended</h2>
            <p className="text-sm text-muted">
              This workspace has been suspended, so its data and tools are unavailable for now. Please contact support to get it reactivated.
              If you belong to another workspace, you can switch to it from the workspace menu.
            </p>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}
