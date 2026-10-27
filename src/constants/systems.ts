import {
  BarChart3,
  Bot,
  Boxes,
  KeyRound,
  Building2,
  Users,
  ShieldCheck,
  Workflow,
  Cable,
  ClipboardCheck,
  Contact,
  Flame,
  FolderKanban,
  Globe,
  HeartPulse,
  Inbox,
  LayoutDashboard,
  ListTree,
  Mails,
  PackageCheck,
  MessageSquareText,
  Route,
  Send,
  Settings,
  UsersRound,
} from "lucide-react";
import type { ComponentType } from "react";
import type { WorkspaceSummary } from "../types";

export type SystemId = "mailer" | "responder";

export interface NavEntry {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}

export interface SystemDefinition {
  id: SystemId;
  label: string;
  shortLabel: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  homePath: string;
}

export const SYSTEMS: SystemDefinition[] = [
  {
    id: "mailer",
    label: "AI Cold Mailer",
    shortLabel: "Cold Mailer",
    description: "Domains, mailboxes, warmup, and cold outbound delivery.",
    icon: Mails,
    homePath: "/mailer",
  },
  {
    id: "responder",
    label: "AI Auto Responder",
    shortLabel: "Auto Responder",
    description: "AI agents, reply automation, and human review.",
    icon: Bot,
    homePath: "/responder",
  },
];

export const mailerPrimaryNav: NavEntry[] = [
  { label: "Dashboard", href: "/mailer", icon: LayoutDashboard },
  { label: "Domains", href: "/mailer/domains", icon: Globe },
  { label: "Mailboxes", href: "/mailer/mailboxes", icon: Inbox },
  { label: "Orders", href: "/mailer/orders", icon: PackageCheck },
  { label: "Inbox", href: "/mailer/inbox", icon: MessageSquareText },
  { label: "Warmup", href: "/mailer/warmup", icon: Flame },
  { label: "Health", href: "/mailer/health", icon: HeartPulse },
  { label: "Leads", href: "/mailer/leads", icon: Contact },
  { label: "Campaigns", href: "/mailer/campaigns", icon: Send },
];

export const mailerSecondaryNav: NavEntry[] = [
  { label: "Settings", href: "/settings", icon: Settings },
];

export const responderPrimaryNav: NavEntry[] = [
  { label: "Overview", href: "/responder", icon: LayoutDashboard },
  { label: "Human Review", href: "/review", icon: ClipboardCheck },
  { label: "Messages", href: "/messages", icon: MessageSquareText },
  { label: "Leads", href: "/leads", icon: UsersRound },
  { label: "Forwarded Leads", href: "/forwarded-leads", icon: Route },
  { label: "AI Agents", href: "/agents", icon: Bot },
  { label: "Campaigns", href: "/campaigns", icon: FolderKanban },
  { label: "Knowledge Base", href: "/knowledge", icon: Boxes },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
];

export const responderSecondaryNav: NavEntry[] = [
  { label: "Integrations", href: "/integrations", icon: Cable },
  { label: "Event Logs", href: "/events", icon: ListTree },
  { label: "Settings", href: "/settings", icon: Settings },
];

/** Shared across both systems: things that belong to the workspace (tenant) rather than to one product area. */
export const workspaceNav: NavEntry[] = [
  { label: "Workflows", href: "/workflows", icon: Workflow },
  { label: "Team", href: "/team", icon: Users },
  { label: "AI Keys", href: "/ai-keys", icon: KeyRound },
];

/** Platform-level pages, shown to super admins only. */
export const adminNav: NavEntry[] = [
  { label: "Dashboard", href: "/admin", icon: ShieldCheck },
  { label: "Workspaces", href: "/admin/workspaces", icon: Building2 },
  { label: "Users", href: "/admin/users", icon: UsersRound },
  { label: "Domains", href: "/admin/domains", icon: Globe },
  { label: "Orders", href: "/admin/orders", icon: PackageCheck },
];

const PATH_SYSTEM_MAP: Record<string, SystemId> = {};

for (const entry of [...mailerPrimaryNav, ...mailerSecondaryNav]) {
  if (entry.href !== "/settings") PATH_SYSTEM_MAP[entry.href] = "mailer";
}

for (const entry of [...responderPrimaryNav, ...responderSecondaryNav]) {
  if (entry.href !== "/settings") PATH_SYSTEM_MAP[entry.href] = "responder";
}

PATH_SYSTEM_MAP["/agents/new"] = "responder";
PATH_SYSTEM_MAP["/knowledge/new"] = "responder";
PATH_SYSTEM_MAP["/debugging"] = "responder";
PATH_SYSTEM_MAP["/notifications"] = "responder";

/** Returns the system a given path belongs to, or null for shared/unmapped paths (e.g. "/", "/settings"). */
export function getSystemForPath(pathname: string): SystemId | null {
  if (PATH_SYSTEM_MAP[pathname]) return PATH_SYSTEM_MAP[pathname];

  const dynamicMatch = Object.keys(PATH_SYSTEM_MAP).find(
    (path) => path !== "/" && pathname.startsWith(`${path}/`)
  );

  return dynamicMatch ? PATH_SYSTEM_MAP[dynamicMatch] : null;
}

export function getSystem(id: SystemId): SystemDefinition {
  return SYSTEMS.find((system) => system.id === id) ?? SYSTEMS[0];
}

export function getNavForSystem(id: SystemId): { primary: NavEntry[]; secondary: NavEntry[] } {
  return id === "mailer"
    ? { primary: mailerPrimaryNav, secondary: mailerSecondaryNav }
    : { primary: responderPrimaryNav, secondary: responderSecondaryNav };
}

/**
 * Whether a system (product area) is usable in the given workspace: the workspace must have the product enabled and,
 * for plain members, their own permission flag must allow it. Owners/admins are limited only by the workspace flags.
 * With no workspace (e.g. a super admin outside any workspace) nothing is hidden.
 */
export function isSystemEnabled(id: SystemId, workspace: WorkspaceSummary | null): boolean {
  if (!workspace) return true;

  const workspaceFlag = id === "mailer" ? workspace.cold_mailer_enabled : workspace.auto_responder_enabled;
  if (!workspaceFlag) return false;
  if (workspace.role !== "member") return true;

  return Boolean(id === "mailer" ? workspace.permissions?.cold_mailer : workspace.permissions?.auto_responder);
}
