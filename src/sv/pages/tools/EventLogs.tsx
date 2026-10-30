import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useRealtimeEvent } from "../../../hooks/useRealtimeEvent";
import { eventLogService } from "../../../services/api";
import type { EventLogPage, EventLogRecord } from "../../../types";
import { useSvTitle } from "../../layout/chrome";
import { Badge, type BadgeTone, Button, Modal, PageHeader, SkeletonRows } from "../../ui";
import { Banner, Pager, TableCard, errorText } from "../crm/shared";
import "./tools.css";

const PAGE_SIZE = 10;
const TONE: Record<EventLogRecord["status"], BadgeTone> = { Success: "green", Processing: "yellow", Failed: "red", Skipped: "neutral" };

const when = (value: string) => new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
const eventName = (value: string) => value.split(".").map((part) => part.replace(/_/g, " ")).join(" · ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const source = (value: string) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : "System");
const duration = (value: EventLogRecord["durationMs"]) => (value === null || value === undefined ? "None" : value < 1000 ? `${value} ms` : `${(value / 1000).toFixed(1)} s`);

export function EventLogs() {
  useSvTitle([{ label: "Tools" }, { label: "Event Logs" }]);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<EventLogPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<EventLogRecord | null>(null);

  const load = useCallback(async (next: number, quiet = false) => {
    if (!quiet) setLoading(true);
    setError("");
    try { const response = await eventLogService.list({ page: next, limit: PAGE_SIZE }); setData(response); setPage(response.page); }
    catch (caught) { setError(errorText(caught)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(1); }, [load]);
  // Live push: every event the app records shows up here the moment it happens, on every open tab.
  useRealtimeEvent([], () => { void load(page, true); });

  const events = data?.items ?? [];

  return (
    <div className="sv-page">
      <PageHeader title="Event Logs" subtitle="Webhook, AI processing, review and sending events" actions={<Button icon={RefreshCw} disabled={loading} onClick={() => void load(page)}>{loading ? "Refreshing…" : "Refresh"}</Button>} />
      <Banner error={error} />
      <TableCard
        head={<><th>Time</th><th>Event</th><th>Source</th><th>Workspace / Campaign</th><th>Lead</th><th>Thread</th><th>Status</th><th>Duration</th><th>Error</th></>}
        empty={!loading && events.length === 0 && !error ? "No events have been logged yet." : undefined}
      >
        {loading && events.length === 0 ? <SkeletonRows columns={9} /> : null}
        {events.map((event) => (
          <tr key={event.id} onClick={() => setOpen(event)} style={{ cursor: "pointer" }}>
            <td style={{ whiteSpace: "nowrap" }}>{when(event.createdAt)}</td>
            <td><div style={{ fontWeight: 500 }}>{eventName(event.eventType)}</div><div className="sv-hint">{event.eventType}</div></td>
            <td>{source(event.source)}</td>
            <td><div style={{ fontWeight: 500 }}>{event.workspaceName || "Workspace unknown"}</div><div className="sv-hint sv-tools-trunc">{event.campaignName || event.campaignId || "No campaign"}</div></td>
            <td className="sv-tools-trunc">{event.leadEmail || "None"}</td>
            <td className="sv-tools-trunc">{event.threadId || event.messageId || "None"}</td>
            <td><Badge tone={TONE[event.status]}>{event.status}</Badge></td>
            <td style={{ whiteSpace: "nowrap" }}>{duration(event.durationMs)}</td>
            <td className="sv-tools-trunc">{event.errorMessage || "None"}</td>
          </tr>
        ))}
      </TableCard>
      {data ? <Pager page={data.page} limit={data.limit} total={data.total} totalPages={data.totalPages} onPage={(next) => void load(next)} /> : null}
      {open ? <EventDetail event={open} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}

function EventDetail({ event, onClose }: { event: EventLogRecord; onClose: () => void }) {
  const rows: Array<[string, string]> = [
    ["Event", event.eventType], ["Time", new Date(event.createdAt).toLocaleString()], ["Source", source(event.source)], ["Status", event.status],
    ["Workspace", event.workspaceName || "Unknown"], ["Campaign", event.campaignName || event.campaignId || "None"], ["AI agent", event.aiAgentName || "None"],
    ["Lead", event.leadEmail || "None"], ["Thread", event.threadId || "None"], ["Message", event.messageId || "None"], ["Duration", duration(event.durationMs)],
  ];
  const hasMeta = event.metadata && Object.keys(event.metadata).length > 0;
  return (
    <Modal wide open title={eventName(event.eventType)} onClose={onClose} footer={<Button onClick={onClose}>Close</Button>}>
      <dl className="sv-tools-dl">{rows.map(([label, value]) => <><dt key={`${label}-t`}>{label}</dt><dd key={`${label}-d`}>{value}</dd></>)}</dl>
      {event.errorMessage ? <p className="sv-banner is-error" role="alert" style={{ margin: 0 }}>{event.errorMessage}</p> : null}
      {hasMeta ? <><p className="sv-hint" style={{ margin: 0 }}>Details</p><pre className="sv-tools-json">{JSON.stringify(event.metadata, null, 2)}</pre></> : null}
    </Modal>
  );
}
