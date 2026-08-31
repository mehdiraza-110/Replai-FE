import { Avatar, Chip, Dropdown, ScrollShadow } from "@heroui/react";
import {
  BarChart3,
  Bot,
  Boxes,
  Cable,
  ChevronUp,
  ClipboardCheck,
  HelpCircle,
  LayoutDashboard,
  ListTree,
  LogOut,
  MessageSquareText,
  Route,
  Settings,
  UsersRound,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const primaryNav = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Human Review", href: "/review", icon: ClipboardCheck },
  { label: "Messages", href: "/messages", icon: MessageSquareText },
  { label: "Leads", href: "/leads", icon: UsersRound },
  { label: "Lead Routing", href: "/lead-routing", icon: Route },
  { label: "AI Agents", href: "/agents", icon: Bot },
  { label: "Knowledge Base", href: "/knowledge", icon: Boxes },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
];

const secondaryNav = [
  { label: "Integrations", href: "/integrations", icon: Cable },
  { label: "Event Logs", href: "/events", icon: ListTree },
  { label: "Settings", href: "/settings", icon: Settings },
];

function NavItem({ item }: { item: (typeof primaryNav)[number] }) {
  const Icon = item.icon;

  return (
    <NavLink
      className={({ isActive }) =>
        [
          "group flex h-[32px] items-center gap-3 rounded-[13px] px-3 text-[12px] font-medium transition",
          isActive
            ? "bg-surface-tertiary/80 text-foreground"
            : "text-foreground/80 hover:bg-surface-tertiary/60 hover:text-foreground",
        ].join(" ")
      }
      to={item.href}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{item.label}</span>
      {item.label === "Human Review" ? (
        <Chip className="ml-auto px-1.5 text-[10px]" color="warning" size="sm" variant="soft">
          3
        </Chip>
      ) : item.label === "Messages" ? (
        <Chip className="ml-auto px-1.5 text-[10px]" color="accent" size="sm" variant="soft">
          17
        </Chip>
      ) : null}
    </NavLink>
  );
}

export function Sidebar() {
  const { logout, user } = useAuth();
  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.email || "ReplyOS user";
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const roleName = user?.roles?.[0]?.name ?? "Admin";

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-[212px] flex-col border-r border-border/70 bg-[#F4F5F6] px-3 py-4 lg:flex">
      <div className="mb-4 flex items-center gap-2.5 px-1">
        <div className="size-8 rounded-full bg-[radial-gradient(circle_at_30%_25%,oklch(0.94_0.07_205),oklch(0.79_0.16_254)_48%,oklch(0.78_0.17_310))]" />
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold leading-4 text-foreground">{displayName}</p>
          <p className="capitalize text-[11px] leading-3 text-muted">{roleName}</p>
        </div>
      </div>

      <ScrollShadow className="-mx-1 px-1">
        <nav className="space-y-1">
          {primaryNav.map((item) => (
            <NavItem item={item} key={item.href} />
          ))}
        </nav>

        <div className="my-4 h-px bg-border/70" />

        <nav className="space-y-1">
          {secondaryNav.map((item) => (
            <NavItem item={item} key={item.href} />
          ))}
        </nav>
      </ScrollShadow>

      <div className="mt-auto space-y-1 pb-4">
        <button className="flex h-[32px] w-full items-center gap-3 whitespace-nowrap rounded-[13px] px-3 text-left text-[12px] font-medium text-foreground/80 transition hover:bg-surface-tertiary/60 hover:text-foreground">
          <HelpCircle className="size-4 shrink-0" />
          Help & Support
        </button>
      </div>

      <Dropdown>
        <Dropdown.Trigger>
          <button className="flex h-[52px] w-full items-center gap-2.5 rounded-[14px] px-2.5 text-left transition hover:bg-surface">
            <Avatar className="size-8 shrink-0">
              <Avatar.Fallback>{initials}</Avatar.Fallback>
            </Avatar>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold leading-4 text-foreground">PLWH Sales</span>
              <span className="block truncate text-[12px] leading-4 text-muted">{user?.email}</span>
            </span>
            <ChevronUp className="size-4 shrink-0 text-muted" />
          </button>
        </Dropdown.Trigger>
        <Dropdown.Popover className="w-[188px]" placement="top start">
          <Dropdown.Menu aria-label="Workspace menu">
            <Dropdown.Item id="logout" className="text-danger-soft-foreground" onAction={logout}>
              <LogOut className="size-4" />
              Log Out
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </aside>
  );
}
