import { useCallback, useEffect, useState } from "react";
import { Button, Card, Spinner } from "@heroui/react";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { StatusPill } from "../components/ui/StatusPill";
import { eventLogService } from "../services/api";
import type { EventLogPage, EventLogRecord, StatusTone } from "../types";

const PAGE_SIZE = 10;

export function EventLogs() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<EventLogPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async (nextPage: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await eventLogService.list({ page: nextPage, limit: PAGE_SIZE });
      setData(response);
      setPage(response.page);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load event logs");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents(1);
  }, []);

  const events = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  return (
    <div className="mx-auto max-w-[1400px]">
      <Card className="apple-shadow border border-border/70 bg-surface">
        <Card.Header className="flex-row items-center justify-between gap-4">
          <div>
            <Card.Title>Event Logs</Card.Title>
            <Card.Description>Webhook, AI processing, review, and PlusVibe delivery events.</Card.Description>
          </div>
          <Button size="sm" variant="secondary" onPress={() => loadEvents(page)} isDisabled={isLoading}>
            {isLoading ? <Spinner color="accent" size="sm" /> : <RefreshCw className="size-4" />}
            Refresh
          </Button>
        </Card.Header>

        <Card.Content className="p-0">
          {error ? (
            <div className="mx-4 mb-4 rounded-lg border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left text-sm">
              <thead className="border-y border-border/70 text-xs text-muted">
                <tr>
                  {["Time", "Event", "Source", "Workspace / Campaign", "Lead", "Thread", "Status", "Duration", "Error"].map((header) => (
                    <th className="px-4 py-3 font-medium" key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading && events.length === 0 ? <LoadingRows /> : null}
                {!isLoading && events.length === 0 ? <EmptyRow /> : null}
                {events.map((event) => (
                  <tr className="border-b border-border/60 align-top last:border-0" key={event.id}>
                    <td className="whitespace-nowrap px-4 py-4 text-muted">{formatDateTime(event.createdAt)}</td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-foreground">{formatEventType(event.eventType)}</div>
                      <div className="mt-1 text-xs text-muted">{event.eventType}</div>
                    </td>
                    <td className="px-4 py-4 text-muted">{formatSource(event.source)}</td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-foreground">{event.workspaceName || "Workspace unknown"}</div>
                      <div className="mt-1 max-w-[240px] truncate text-xs text-muted">{event.campaignName || event.campaignId || "No campaign"}</div>
                    </td>
                    <td className="max-w-[210px] truncate px-4 py-4 text-muted">{event.leadEmail || "None"}</td>
                    <td className="max-w-[180px] truncate px-4 py-4 text-muted">{event.threadId || event.messageId || "None"}</td>
                    <td className="px-4 py-4"><StatusPill tone={getStatusTone(event.status)}>{event.status}</StatusPill></td>
                    <td className="whitespace-nowrap px-4 py-4 text-muted">{formatDuration(event.durationMs)}</td>
                    <td className="max-w-[220px] truncate px-4 py-4 text-muted">{event.errorMessage || "None"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 px-4 py-3 text-sm text-muted">
            <span>Showing {events.length} of {total} records · Page {page} of {totalPages}</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onPress={() => loadEvents(page - 1)} isDisabled={isLoading || page <= 1}>
                <ChevronLeft className="size-4" />
                Previous
              </Button>
              <Button size="sm" variant="secondary" onPress={() => loadEvents(page + 1)} isDisabled={isLoading || page >= totalPages}>
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: PAGE_SIZE }).map((_, index) => (
        <tr className="border-b border-border/60 last:border-0" key={index}>
          {Array.from({ length: 9 }).map((__, cellIndex) => (
            <td className="px-4 py-4" key={cellIndex}>
              <div className="h-4 w-full max-w-[180px] animate-pulse rounded bg-muted/15" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function EmptyRow() {
  return (
    <tr>
      <td className="px-4 py-10 text-center text-muted" colSpan={9}>
        No events have been logged yet.
      </td>
    </tr>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatEventType(value: string) {
  return value
    .split(".")
    .map((part) => part.replace(/_/g, " "))
    .join(" · ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatSource(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "System";
}

function formatDuration(value: EventLogRecord["durationMs"]) {
  if (value === null || value === undefined) return "None";
  if (value < 1000) return `${value} ms`;
  return `${(value / 1000).toFixed(1)} s`;
}

function getStatusTone(status: EventLogRecord["status"]): StatusTone {
  if (status === "Failed") return "danger";
  if (status === "Processing") return "warning";
  if (status === "Skipped") return "default";
  return "success";
}
