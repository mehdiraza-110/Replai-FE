import { Button } from "@heroui/react";
import { Bell, Menu, Search, Sidebar as SidebarIcon } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const titles: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Good morning, Kate", subtitle: "" },
  "/review": { title: "Human Review", subtitle: "Approve, edit, or take over AI replies before they are sent." },
  "/inbox": { title: "Inbox Managers", subtitle: "Configure PlusVibe inboxes, response rules, and automation." },
  "/messages": { title: "Messages", subtitle: "Review sales conversations, AI drafts, and lead intelligence." },
  "/leads": { title: "Leads", subtitle: "Inspect prospect context, campaign source, and AI-derived sales state." },
  "/lead-routing": { title: "Lead Routing", subtitle: "Forward qualified leads to connected CRMs, webhooks, and sales platforms." },
  "/agents": { title: "AI Agents", subtitle: "Manage agent roles, objectives, behavior, and activation status." },
  "/agents/new": { title: "Create Agent", subtitle: "Configure persona, company context, AI model, review gates, and automation." },
  "/campaigns": { title: "PlusVibe Campaigns", subtitle: "Sync campaigns and assign AI agents to reply workflows." },
  "/knowledge": { title: "Knowledge Base", subtitle: "Control the facts and examples available to every AI reply." },
  "/training": { title: "Training", subtitle: "Curate historical examples that guide response behavior." },
  "/analytics": { title: "Analytics", subtitle: "Track reply volume, automation quality, and human intervention." },
  "/integrations": { title: "Integrations", subtitle: "Connect outbound sources, email providers, and automation tools." },
  "/events": { title: "Event Logs", subtitle: "Trace webhooks, AI processing, review decisions, and PlusVibe delivery." },
  "/debugging": { title: "AI Debugging", subtitle: "Understand structured inputs, decisions, and safety results for AI runs." },
  "/settings": { title: "Settings", subtitle: "Workspace, security, notifications, and AI defaults." },
};

export function TopBar() {
  const { user } = useAuth();
  const location = useLocation();
  const current = titles[location.pathname] ?? titles["/"];
  const firstName = user?.first_name || user?.email?.split("@")[0] || "there";
  const title = location.pathname === "/" ? `Good morning, ${firstName}` : current.title;

  return (
    <header className="sticky top-0 z-20 h-[56px] bg-background/90 px-4 backdrop-blur-xl sm:px-5 lg:ml-[212px]">
      <div className="flex h-full items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button className="lg:hidden" size="sm" variant="secondary" aria-label="Open navigation">
            <Menu className="size-4" />
          </Button>
          <SidebarIcon className="hidden size-4 text-foreground lg:block" />
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-normal text-foreground">{title}</h1>
            {current.subtitle ? <p className="hidden truncate text-sm text-muted sm:block">{current.subtitle}</p> : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button className="size-[34px] min-w-[34px] rounded-full p-0 text-foreground" size="sm" variant="secondary" aria-label="Search">
            <Search className="size-[17px]" strokeWidth={2} />
          </Button>
          <Button className="size-[34px] min-w-[34px] rounded-full p-0 text-foreground" size="sm" variant="secondary" aria-label="Notifications">
            <Bell className="size-[17px]" strokeWidth={2} />
          </Button>
        </div>
      </div>
    </header>
  );
}
