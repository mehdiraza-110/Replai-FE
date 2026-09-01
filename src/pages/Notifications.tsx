import { useCallback, useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { Bell as BellIcon } from "lucide-react";
import { LoadingState } from "../components/ui/LoadingState";
import { StatusPill } from "../components/ui/StatusPill";
import { NOTIFICATION_EVENT_TYPES } from "../constants/notificationEventTypes";
import { useRealtimeEvent } from "../hooks/useRealtimeEvent";
import { notificationService } from "../services/api";
import { formatRelativeTime } from "../utils/formatRelativeTime";
import type { NotificationItem } from "../types";

const limit = 20;

export function Notifications() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback((options: { quiet?: boolean } = {}) => {
    if (!options.quiet) setIsLoading(true);
    setError(null);

    notificationService
      .list({ page, limit })
      .then((data) => {
        setItems(data.items);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      })
      .catch((loadError: Error) => {
        setError(loadError.message || "We could not load notifications. Please try again.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [page]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Live push: another reviewer approving/rejecting a draft, a new knowledge
  // source, an integration issue — this list updates instantly for everyone
  // signed in, on this page or not.
  useRealtimeEvent(NOTIFICATION_EVENT_TYPES, () => {
    loadNotifications({ quiet: true });
  });

  return (
    <div className="flex w-full max-w-none flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-semibold leading-6 text-foreground">Notifications</h1>
          <p className="mt-1 text-[13px] leading-5 text-muted">Everything that needs your attention across ReplyOS.</p>
        </div>
        <StatusPill tone="default">{total} total</StatusPill>
      </div>

      <section className="apple-shadow rounded-[20px] bg-surface p-4">
        {error ? <p className="mb-3 rounded-xl bg-danger/10 p-3 text-sm font-medium text-danger">{error}</p> : null}

        {isLoading ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl bg-surface-secondary p-10 text-center">
            <BellIcon className="size-6 text-muted" strokeWidth={1.75} />
            <p className="text-sm font-medium text-foreground">You're all caught up.</p>
            <p className="text-sm text-muted">New notifications will show up here.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[14px] border border-border/70">
            {items.map((notification) => (
              <div
                className="flex items-start gap-3 border-b border-border/70 bg-surface px-4 py-4 last:border-b-0"
                key={notification.id}
              >
                <span className={notificationDotTone[notification.tone] + " mt-1.5 size-[8px] shrink-0 rounded-full"} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[14px] font-semibold leading-5 text-foreground">{notification.title}</p>
                    <span className="text-[12px] leading-4 text-muted">{formatRelativeTime(notification.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-[13px] leading-5 text-muted">{notification.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button isDisabled={page <= 1 || isLoading} size="sm" variant="secondary" onClick={() => setPage((current) => Math.max(1, current - 1))}>
                Previous
              </Button>
              <Button isDisabled={page >= totalPages || isLoading} size="sm" variant="secondary" onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

const notificationDotTone: Record<string, string> = {
  default: "bg-muted",
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};
