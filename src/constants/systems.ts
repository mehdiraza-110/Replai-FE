import { Building2, Cable, Globe, KeyRound, ListTree, MailCheck, PackageCheck, ShieldCheck, UsersRound, Workflow } from "lucide-react";
import type { ComponentType } from "react";

export interface NavEntry {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}

/** Pages the main app has no screen for yet. Everything else moved into the new app (old addresses redirect, see App.tsx). */
export const toolsNav: NavEntry[] = [
  { label: "Workflows", href: "/workflows", icon: Workflow },
  { label: "AI Keys", href: "/ai-keys", icon: KeyRound },
  { label: "Integrations", href: "/integrations", icon: Cable },
  { label: "Event Logs", href: "/events", icon: ListTree },
];

/** Platform-level pages, shown to super admins only. */
export const adminNav: NavEntry[] = [
  { label: "Dashboard", href: "/admin", icon: ShieldCheck },
  { label: "Workspaces", href: "/admin/workspaces", icon: Building2 },
  { label: "Users", href: "/admin/users", icon: UsersRound },
  { label: "Domains", href: "/admin/domains", icon: Globe },
  { label: "Orders", href: "/admin/orders", icon: PackageCheck },
  { label: "Deliverability", href: "/admin/deliverability", icon: MailCheck },
];
