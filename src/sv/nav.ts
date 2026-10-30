import {
  Bell,
  BookText,
  Cable,
  ListTree,
  MailCheck,
  PackageCheck,
  ShieldCheck,
  UsersRound,
  Workflow,
  Bot,
  Brain,
  Building2,
  Calendar,
  CalendarCog,
  CircleHelp,
  Clock,
  Compass,
  Contact,
  CreditCard,
  FileText,
  Folder,
  Globe,
  Handshake,
  Inbox,
  KeyRound,
  LayoutGrid,
  Layers,
  ListChecks,
  ListFilter,
  type LucideIcon,
  Mail,
  MessageSquareText,
  Newspaper,
  Package,
  Palette,
  Plug,
  Reply,
  Settings as SettingsIcon,
  Settings2,
  Shield,
  Sparkles,
  Timer,
  TrendingUp,
  User,
  UserMinus,
  Users,
  Video,
} from "lucide-react";

/** The new app owns the root of /app. (It lived under /v2 until the cut-over; old /v2 links are redirected in App.tsx.) */
export const SV_BASE = "";

export const svPath = (to: string) => `${SV_BASE}/${to}`.replace(/\/+$/, "");

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Path prefix that keeps the item highlighted on its sub-pages. Defaults to `to`. */
  match?: string;
  /** Only highlight on the exact path, not on its sub-pages. */
  exact?: boolean;
}

export interface NavGroup {
  label: string | null;
  items: NavItem[];
}

export const mainNav: NavGroup[] = [
  {
    label: null,
    items: [
      { to: "dashboard", label: "Dashboard", icon: LayoutGrid },
      { to: "crm/tasks", label: "CRM", icon: Users, match: "crm" },
      { to: "leads", label: "Leads", icon: Contact },
    ],
  },
  {
    label: "Outreach",
    items: [
      { to: "cold-email-campaign-agent", label: "Cold Email Agent", icon: Mail },
      { to: "ai-sdr", label: "AI SDR Inbox", icon: Inbox },
      { to: "replier", label: "Replier", icon: Reply, match: "replier" },
    ],
  },
  {
    label: "Build",
    items: [
      { to: "sites/websites", label: "Sites", icon: Globe, match: "sites" },
      { to: "growth-plan-creator", label: "Growth Plan Creator", icon: TrendingUp },
    ],
  },
  {
    label: "Go To Market",
    items: [
      { to: "niche-researcher", label: "Market Researcher", icon: Compass },
      { to: "offer-creator", label: "Offer Creator", icon: Package },
    ],
  },
  {
    label: "Tools",
    items: [
      { to: "workflows", label: "Workflows", icon: Workflow, match: "workflows" },
      { to: "ai-keys", label: "AI Keys", icon: KeyRound },
      { to: "integrations", label: "Integrations", icon: Cable },
      { to: "events", label: "Event Logs", icon: ListTree },
    ],
  },
];

/** Platform pages for super admins. Shown as their own collapsible group, never part of a person's sidebar choices. */
export const adminNav: NavGroup = {
  label: "Admin",
  items: [
    { to: "admin", label: "Dashboard", icon: ShieldCheck, exact: true },
    { to: "admin/workspaces", label: "Workspaces", icon: Building2, match: "admin/workspaces" },
    { to: "admin/users", label: "Users", icon: UsersRound },
    { to: "admin/domains", label: "Domains", icon: Globe },
    { to: "admin/orders", label: "Orders", icon: PackageCheck },
    { to: "admin/deliverability", label: "Deliverability", icon: MailCheck },
  ],
};

export const footerNav: NavItem[] = [
  { to: "whats-new", label: "What's New", icon: Newspaper },
  { to: "docs", label: "Help Center", icon: CircleHelp },
  { to: "settings/profile", label: "Settings", icon: SettingsIcon, match: "settings" },
];

export const chatRoute = "ai-growth-consultant";

export interface SettingsPage extends NavItem {
  keywords?: string;
}

export interface SettingsGroup {
  label: string;
  pages: SettingsPage[];
}

export const settingsNav: SettingsGroup[] = [
  {
    label: "Personal",
    pages: [
      { to: "settings/profile", label: "Profile", icon: User },
      { to: "settings/notifications", label: "Notifications", icon: Bell },
      { to: "settings/appearance", label: "Appearance", icon: Palette, keywords: "theme dark light sidebar" },
      { to: "settings/security", label: "Security", icon: Shield, keywords: "password two-factor sessions" },
      { to: "settings/availability", label: "Availability", icon: Timer, keywords: "hours timezone booking" },
      { to: "settings/email-calendar", label: "Email & Calendar", icon: Calendar, keywords: "google outlook" },
      { to: "settings/conferencing", label: "Conferencing", icon: Video, keywords: "zoom meeting link" },
      { to: "settings/access-tokens", label: "Access Tokens", icon: KeyRound, keywords: "api token" },
    ],
  },
  {
    label: "Workspace",
    pages: [
      { to: "settings/workspace", label: "General", icon: Settings2, keywords: "logo name color onboarding" },
      { to: "settings/members", label: "Members", icon: Users, keywords: "invite team roles" },
      { to: "settings/workspace-snapshots", label: "Workspace Snapshots", icon: Layers },
      { to: "settings/billing", label: "Billing", icon: CreditCard, keywords: "plan usage limits domains inboxes" },
      { to: "settings/scheduling", label: "Scheduling", icon: CalendarCog, keywords: "meeting types" },
      { to: "settings/blocklist", label: "Cold Email Blocklist", icon: UserMinus, keywords: "unsubscribe suppress" },
      { to: "settings/email-templates", label: "Email Templates", icon: FileText },
      { to: "settings/sharing", label: "Sharing", icon: MessageSquareText },
      { to: "settings/crm-custom-fields", label: "CRM Custom Fields", icon: ListFilter },
      { to: "settings/crm-outcomes", label: "Call & Meeting Outcomes", icon: ListChecks },
      { to: "settings/api-keys", label: "Connected Apps & API Keys", icon: Plug },
    ],
  },
  {
    label: "AI Agents",
    pages: [
      { to: "settings/brain", label: "Brain", icon: Brain, keywords: "company knowledge what we sell" },
      { to: "settings/cold-email-agent", label: "Cold Email Agent", icon: Mail },
      { to: "settings/ai-sdr-agent", label: "AI SDR Agent", icon: Bot, keywords: "knowledge base rules" },
    ],
  },
  {
    label: "Developer",
    pages: [{ to: "settings/developer-docs", label: "Developer Docs", icon: BookText }],
  },
];

export const crmTabs: NavItem[] = [
  { to: "crm/tasks", label: "Tasks", icon: ListChecks },
  { to: "crm/deals", label: "Deals", icon: Handshake },
  { to: "crm/appointments", label: "Appointments", icon: Calendar },
  { to: "crm/people", label: "People", icon: Users },
  { to: "crm/lead-submissions", label: "Lead submissions", icon: ListFilter },
  { to: "crm/companies", label: "Companies", icon: Building2 },
  { to: "crm/notes", label: "Notes", icon: FileText },
  { to: "crm/files", label: "Files", icon: Folder },
  { to: "crm/scheduled-messages", label: "Scheduled", icon: Clock },
];

export const allDestinations: NavItem[] = [
  ...mainNav.flatMap((group) => group.items),
  ...crmTabs.map((tab) => ({ ...tab, label: `CRM · ${tab.label}` })),
  ...footerNav,
  ...settingsNav.flatMap((group) => group.pages.map((page) => ({ ...page, label: `Settings · ${page.label}` }))),
  { to: chatRoute, label: "AI Consultant", icon: Sparkles },
];

/** Applies a person's sidebar choices: hidden pages, renamed groups and reordered pages. Unknown entries are ignored. */
export function applySidebarPrefs(groups: NavGroup[], prefs: { hidden: string[]; groupNames: Record<string, string>; order: Record<string, string[]> } | undefined): NavGroup[] {
  if (!prefs) return groups;
  return groups.map((group) => {
    const order = group.label ? prefs.order[group.label] : undefined;
    const rank = (to: string) => { const i = order?.indexOf(to) ?? -1; return i === -1 ? Number.MAX_SAFE_INTEGER : i; };
    const items = group.items.filter((item) => !prefs.hidden.includes(item.to)).map((item, index) => ({ item, index })).sort((a, b) => rank(a.item.to) - rank(b.item.to) || a.index - b.index).map((x) => x.item);
    return { ...group, label: group.label ? prefs.groupNames[group.label] ?? group.label : null, items };
  }).filter((group) => group.items.length > 0);
}
