import { Avatar, Chip, Dropdown, ScrollShadow, Spinner } from "@heroui/react";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, ChevronUp, LogOut } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getNavForSystem, getSystem, SYSTEMS, type SystemDefinition, type NavEntry } from "../../constants/systems";
import { useActiveSystem } from "../../hooks/useActiveSystem";
import { useRealtimeConnected } from "../../hooks/useRealtimeConnected";
import { messageService, reviewService } from "../../services/api";

const WORKSPACE_SWITCH_DELAY_MS = 700;

function NavItem({
  item,
  messageCount,
  reviewCount,
}: {
  item: NavEntry;
  messageCount: string | null;
  reviewCount: string | null;
}) {
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
      end={item.href === "/responder" || item.href === "/mailer"}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{item.label}</span>
      {item.label === "Human Review" ? (
        reviewCount ? (
          <Chip className="ml-auto px-1.5 text-[10px]" color="warning" size="sm" variant="soft">
            {reviewCount}
          </Chip>
        ) : null
      ) : item.label === "Messages" ? (
        messageCount ? (
          <Chip className="ml-auto px-1.5 text-[10px]" color="accent" size="sm" variant="soft">
            {messageCount}
          </Chip>
        ) : null
      ) : null}
    </NavLink>
  );
}

export function Sidebar() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const isLiveConnected = useRealtimeConnected();
  const activeSystem = useActiveSystem();
  const { primary, secondary } = getNavForSystem(activeSystem);
  const [messageCount, setMessageCount] = useState<string | null>(null);
  const [reviewCount, setReviewCount] = useState<string | null>(null);
  const [switchingTo, setSwitchingTo] = useState<SystemDefinition | null>(null);
  const switchTimeoutRef = useRef<number | null>(null);
  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.email || "ReplyOS user";
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const roleName = user?.roles?.[0]?.name ?? "Admin";

  useEffect(() => {
    let isActive = true;

    messageService
      .countConversations({ cap: 100 })
      .then(({ count, hasMore }) => {
        if (!isActive) return;
        setMessageCount(hasMore ? "100+" : String(count));
      })
      .catch(() => {
        if (isActive) setMessageCount(null);
      });

    reviewService
      .count({ cap: 100 })
      .then(({ count, hasMore }) => {
        if (!isActive) return;
        setReviewCount(count > 0 ? (hasMore ? "100+" : String(count)) : null);
      })
      .catch(() => {
        if (isActive) setReviewCount(null);
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (switchTimeoutRef.current) window.clearTimeout(switchTimeoutRef.current);
    };
  }, []);

  function handleSelectSystem(system: SystemDefinition) {
    if (system.id === activeSystem) return;

    setSwitchingTo(system);
    switchTimeoutRef.current = window.setTimeout(() => {
      navigate(system.homePath);
      setSwitchingTo(null);
    }, WORKSPACE_SWITCH_DELAY_MS);
  }

  const currentSystem = getSystem(activeSystem);
  const CurrentSystemIcon = currentSystem.icon;

  return (
    <>
      <aside className="fixed inset-y-0 left-0 hidden w-[212px] flex-col border-r border-border/70 bg-[#F4F5F6] px-3 py-4 lg:flex">
      <Link className="mb-4 flex min-w-0 items-center gap-2.5 px-1" title="All systems" to="/">
        <div className="size-8 rounded-full bg-[radial-gradient(circle_at_30%_25%,oklch(0.94_0.07_205),oklch(0.79_0.16_254)_48%,oklch(0.78_0.17_310))]" />
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold leading-4 text-foreground">{displayName}</p>
          <p className="capitalize text-[11px] leading-3 text-muted">{roleName}</p>
        </div>
      </Link>

      <div className="mb-3">
        <Dropdown>
          <Dropdown.Trigger className="block w-full">
            <div className="flex w-full items-center gap-2.5 rounded-[13px] border border-border/70 bg-surface px-2.5 py-2 text-left transition hover:bg-surface-secondary/70">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-default-100 text-foreground">
                <CurrentSystemIcon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-semibold leading-4 text-foreground">{currentSystem.shortLabel}</span>
                <span className="block truncate text-[10px] leading-3 text-muted">Current workspace</span>
              </span>
              <ChevronsUpDown className="size-3.5 shrink-0 text-muted" />
            </div>
          </Dropdown.Trigger>
          <Dropdown.Popover className="w-[236px]" placement="bottom start">
            <Dropdown.Menu aria-label="Switch workspace">
              {SYSTEMS.map((system) => {
                const Icon = system.icon;
                const isActive = system.id === activeSystem;

                return (
                  <Dropdown.Item id={system.id} key={system.id} onAction={() => handleSelectSystem(system)}>
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-default-100 text-foreground">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold leading-4 text-foreground">{system.label}</span>
                      <span className="block truncate text-[11px] leading-4 text-muted">{system.description}</span>
                    </span>
                    {isActive ? <Check className="size-4 shrink-0 text-accent" /> : null}
                  </Dropdown.Item>
                );
              })}
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>

      <ScrollShadow className="-mx-1 px-1">
        <nav className="space-y-1">
          {primary.map((item) => (
            <NavItem item={item} key={item.href} messageCount={messageCount} reviewCount={reviewCount} />
          ))}
        </nav>

        <div className="my-4 h-px bg-border/70" />

        <nav className="space-y-1">
          {secondary.map((item) => (
            <NavItem item={item} key={item.href} messageCount={messageCount} reviewCount={reviewCount} />
          ))}
        </nav>
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
                    className="absolute -right-0.5 -bottom-0.5 size-[10px] rounded-full bg-success ring-2 ring-[#F4F5F6]"
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
              <Dropdown.Item id="logout" className="text-danger-soft-foreground" onAction={logout}>
                <LogOut className="size-4" />
                Log Out
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>
    </aside>

    {switchingTo ? (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
        <Spinner color="accent" size="lg" />
        <p className="text-sm font-semibold text-foreground">Switching to {switchingTo.label}…</p>
      </div>
    ) : null}
    </>
  );
}
