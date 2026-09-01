import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Dropdown } from "@heroui/react";
import { Bell, Menu, Sidebar as SidebarIcon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { LoadingState } from "../ui/LoadingState";
import { StatusPill } from "../ui/StatusPill";
import { NOTIFICATION_EVENT_TYPES } from "../../constants/notificationEventTypes";
import { useAuth } from "../../context/AuthContext";
import { useRealtimeEvent } from "../../hooks/useRealtimeEvent";
import { notificationService } from "../../services/api";
import { formatRelativeTime } from "../../utils/formatRelativeTime";
import type { NotificationItem } from "../../types";

const LAST_SEEN_STORAGE_KEY = "replyos.notifications.lastSeenAt";
// Live socket events keep this fresh instantly; the poll is just a fallback
// in case a socket reconnect is ever missed.
const POLL_INTERVAL_MS = 120_000;

const titles: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Good morning, Kate", subtitle: "" },
  "/review": { title: "Human Review", subtitle: "Approve, edit, or take over AI replies before they are sent." },
  "/inbox": { title: "Inbox Managers", subtitle: "Configure PlusVibe inboxes, response rules, and automation." },
  "/messages": { title: "Messages", subtitle: "Review sales conversations, AI drafts, and lead intelligence." },
  "/leads": { title: "Leads", subtitle: "Inspect prospect context, campaign source, and AI-derived sales state." },
  "/forwarded-leads": { title: "Forwarded Leads", subtitle: "Leads sent to external platforms after an AI agent's reply was auto-sent or approved." },
  "/agents": { title: "AI Agents", subtitle: "Manage agent roles, objectives, behavior, and activation status." },
  "/agents/new": { title: "Create Agent", subtitle: "Configure persona, company context, AI model, review gates, and automation." },
  "/campaigns": { title: "PlusVibe Campaigns", subtitle: "Sync campaigns and assign AI agents to reply workflows." },
  "/knowledge": { title: "Knowledge Base", subtitle: "Control the facts and examples available to every AI reply." },
  "/training": { title: "Training", subtitle: "Curate historical examples that guide response behavior." },
  "/analytics": { title: "Analytics", subtitle: "Track reply volume, automation quality, and human intervention." },
  "/integrations": { title: "Integrations", subtitle: "Connect outbound sources, email providers, and automation tools." },
  "/events": { title: "Event Logs", subtitle: "Trace webhooks, AI processing, review decisions, and PlusVibe delivery." },
  "/debugging": { title: "AI Debugging", subtitle: "Understand structured inputs, decisions, and safety results for AI runs." },
  "/settings": { title: "Settings", subtitle: "Manage your profile, avatar, and password." },
  "/notifications": { title: "Notifications", subtitle: "Everything that needs your attention across ReplyOS." },
};

function readLastSeenAt() {
  try {
    return localStorage.getItem(LAST_SEEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeLastSeenAt(value: string) {
  try {
    localStorage.setItem(LAST_SEEN_STORAGE_KEY, value);
  } catch {
    // Ignore storage failures (private browsing, quota, etc.) — unread state just won't persist.
  }
}

export function TopBar() {
  const { user } = useAuth();
  const location = useLocation();
  const current = titles[location.pathname] ?? titles["/"];
  const firstName = user?.first_name || user?.email?.split("@")[0] || "there";
  const title = location.pathname === "/" ? `Good morning, ${firstName}` : current.title;

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(() => readLastSeenAt());

  const loadNotifications = useCallback(async () => {
    try {
      const data = await notificationService.list({ limit: 6 });
      setNotifications(data.items);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load notifications");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = window.setInterval(loadNotifications, POLL_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [loadNotifications]);

  // Live push: the moment any other signed-in tab triggers a notification-worthy
  // event, this dropdown refreshes on its own — no refresh needed.
  useRealtimeEvent(NOTIFICATION_EVENT_TYPES, () => {
    loadNotifications();
  });

  const unreadCount = useMemo(() => {
    if (!lastSeenAt) return notifications.length;
    return notifications.filter((notification) => new Date(notification.createdAt) > new Date(lastSeenAt)).length;
  }, [notifications, lastSeenAt]);

  function handleOpenChange(isOpen: boolean) {
    if (isOpen || notifications.length === 0) return;

    const newest = notifications[0].createdAt;
    writeLastSeenAt(newest);
    setLastSeenAt(newest);
  }

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
          <Dropdown onOpenChange={handleOpenChange}>
            <Dropdown.Trigger>
              <Button className="relative size-[34px] min-w-[34px] rounded-full p-0 text-foreground" size="sm" variant="secondary" aria-label="Notifications">
                <Bell className="size-[17px]" strokeWidth={2} />
                {unreadCount > 0 ? (
                  <span className="absolute right-[3px] top-[3px] size-[8px] rounded-full bg-danger ring-2 ring-background" />
                ) : null}
              </Button>
            </Dropdown.Trigger>
            <Dropdown.Popover className="w-[340px] overflow-hidden rounded-[16px] border border-border/70 bg-surface p-0 shadow-[0_8px_30px_color-mix(in_oklch,var(--foreground)_18%,transparent)]" placement="bottom end">
              <div className="flex items-center justify-between gap-2 border-b border-border/70 px-4 py-3">
                <p className="text-sm font-semibold text-foreground">Notifications</p>
                {unreadCount > 0 ? <StatusPill tone="warning">{unreadCount} unread</StatusPill> : null}
              </div>
              <div className="thin-scrollbar max-h-[360px] overflow-y-auto">
                {isLoading ? (
                  <LoadingState minHeight={120} size="md" />
                ) : error ? (
                  <p className="px-4 py-6 text-center text-sm font-medium text-danger">{error}</p>
                ) : notifications.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted">You're all caught up.</p>
                ) : (
                  notifications.map((notification) => (
                    <div className="flex items-start gap-2.5 border-b border-border/50 px-4 py-3 last:border-b-0" key={notification.id}>
                      <span className={notificationDotTone[notification.tone] + " mt-1.5 size-[7px] shrink-0 rounded-full"} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold leading-4 text-foreground">{notification.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-[12px] leading-4 text-muted">{notification.description}</p>
                        <p className="mt-1 text-[11px] leading-4 text-muted">{formatRelativeTime(notification.createdAt)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-border/70 px-4 py-3 text-center">
                <Link className="text-[13px] font-semibold text-accent underline underline-offset-2" to="/notifications">
                  View All Notifications
                </Link>
              </div>
            </Dropdown.Popover>
          </Dropdown>
        </div>
      </div>
    </header>
  );
}

const notificationDotTone: Record<string, string> = {
  default: "bg-muted",
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};
