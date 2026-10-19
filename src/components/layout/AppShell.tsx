import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { getSystem, getSystemForPath, isSystemEnabled, SYSTEMS } from "../../constants/systems";
import { useAuth } from "../../context/AuthContext";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { ViewAsBanner } from "./ViewAsBanner";

export function AppShell() {
  const { activeWorkspace, workspaceEpoch } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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
        <Outlet />
      </main>
    </div>
  );
}
