import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />
      <TopBar />
      <main className="min-w-0 overflow-x-hidden px-4 py-5 sm:px-5 lg:ml-[212px]">
        <Outlet />
      </main>
    </div>
  );
}
