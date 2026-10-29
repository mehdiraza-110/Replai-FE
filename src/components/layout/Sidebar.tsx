import { Avatar, Chip, Dropdown, ScrollShadow } from "@heroui/react";
import { useEffect, useState } from "react";
import { ArrowLeft, ChevronUp, LogOut } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { adminNav, toolsNav, type NavEntry } from "../../constants/systems";
import { useRealtimeConnected } from "../../hooks/useRealtimeConnected";
import { adminOrderService } from "../../services/orderApi";

/** Fired by the top bar's menu button; below the lg breakpoint the sidebar is a slide-over opened by it. */
export const OPEN_NAV_EVENT = "replai:open-nav";

function NavItem({ item, orderCount = null }: { item: NavEntry; orderCount?: string | null }) {
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
      end={item.href === "/admin"}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{item.label}</span>
      {item.href === "/admin/orders" && orderCount ? (
        <Chip aria-label={`${orderCount} requests awaiting review`} className="ml-auto px-1.5 text-[10px]" color="warning" size="sm" variant="soft">
          {orderCount}
        </Chip>
      ) : null}
    </NavLink>
  );
}

function NavSection({ items, label, orderCount = null }: { items: NavEntry[]; label: string; orderCount?: string | null }) {
  return (
    <>
      <div className="my-4 h-px bg-border/70" />
      <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <nav aria-label={label} className="space-y-1">
        {items.map((item) => (
          <NavItem item={item} key={item.href} orderCount={orderCount} />
        ))}
      </nav>
    </>
  );
}

/** The few pages that still have no screen in the main app (workflows, AI keys, integrations, logs, platform admin). */
export function Sidebar() {
  const { isSuperAdmin, logout, user } = useAuth();
  const isLiveConnected = useRealtimeConnected();
  const [orderCount, setOrderCount] = useState<string | null>(null);
  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.email || "SendVybe user";
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const open = () => setMobileOpen(true);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener(OPEN_NAV_EVENT, open);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_NAV_EVENT, open);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    let isActive = true;
    adminOrderService
      .count()
      .then(({ requested }) => {
        if (isActive) setOrderCount(requested > 0 ? String(requested) : null);
      })
      .catch(() => undefined);
    return () => {
      isActive = false;
    };
  }, [isSuperAdmin]);

  return (
    <>
      {mobileOpen ? <div aria-hidden className="fixed inset-0 z-40 bg-foreground/30 lg:hidden" onClick={() => setMobileOpen(false)} /> : null}
      <aside
        aria-label="Navigation"
        className={`fixed inset-y-0 left-0 w-[212px] flex-col border-r border-border/70 bg-background px-3 py-4 lg:z-auto lg:flex ${mobileOpen ? "z-50 flex shadow-2xl" : "hidden"}`}
      >
      <Link className="mb-3 flex min-w-0 items-center gap-2.5 px-1" title="Home" to="/dashboard">
        <div className="size-8 shrink-0 rounded-full bg-[radial-gradient(circle_at_30%_25%,oklch(0.94_0.07_205),oklch(0.79_0.16_254)_48%,oklch(0.78_0.17_310))]" />
        <p className="truncate text-[14px] font-semibold leading-4 text-foreground">SendVybe</p>
      </Link>

      <Link className="mb-3 flex h-[32px] items-center gap-3 rounded-[13px] border border-border/70 px-3 text-[12px] font-medium text-foreground hover:bg-surface-tertiary/60" to="/dashboard">
        <ArrowLeft className="size-4 shrink-0" />
        Back to SendVybe
      </Link>

      <ScrollShadow className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
        <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wide text-muted">Tools</p>
        <nav aria-label="Tools" className="space-y-1">
          {toolsNav.map((item) => (
            <NavItem item={item} key={item.href} />
          ))}
        </nav>

        {isSuperAdmin ? <NavSection label="Admin" items={adminNav} orderCount={orderCount} /> : null}
      </ScrollShadow>

      <div className="mt-auto min-w-0">
        <Dropdown>
          <Dropdown.Trigger className="block w-full min-w-0">
            <div className="flex h-[52px] w-full min-w-0 items-center gap-2.5 rounded-[14px] px-2.5 text-left transition hover:bg-surface">
              <span className="relative inline-flex shrink-0">
                <Avatar className="size-8 shrink-0">
                  {user?.profile_image ? <Avatar.Image alt={displayName} src={user.profile_image} /> : null}
                  <Avatar.Fallback>{initials}</Avatar.Fallback>
                </Avatar>
                {isLiveConnected ? (
                  <span
                    aria-label="Live updates connected"
                    className="absolute -right-0.5 -bottom-0.5 size-[10px] rounded-full bg-success ring-2 ring-background"
                    title="Live updates connected"
                  />
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold leading-4 text-foreground">{displayName}</span>
                <span className="block truncate text-[12px] leading-4 text-muted">{user?.email}</span>
              </span>
              <ChevronUp className="size-4 shrink-0 text-muted" />
            </div>
          </Dropdown.Trigger>
          <Dropdown.Popover className="w-[188px]" placement="top start">
            <Dropdown.Menu aria-label="Account menu">
              <Dropdown.Item id="logout" className="text-danger-soft-foreground" onAction={() => void logout()}>
                <LogOut className="size-4" />
                Log Out
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>
    </aside>

    </>
  );
}
