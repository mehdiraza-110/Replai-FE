import {
  BarChart3,
  Bot,
  Boxes,
  Cable,
  ClipboardCheck,
  Flame,
  FolderKanban,
  Globe,
  HeartPulse,
  Inbox,
  LayoutDashboard,
  ListTree,
  Mails,
  MessageSquareText,
  Route,
  Send,
  Settings,
  UsersRound,
} from "lucide-react";
import type { ComponentType } from "react";

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
  { label: "Inbox", href: "/mailer/inbox", icon: MessageSquareText },
  { label: "Warmup", href: "/mailer/warmup", icon: Flame },
  { label: "Health", href: "/mailer/health", icon: HeartPulse },
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
