import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { ApiRequestError } from "../../../services/api";
import { adminOrderService, normalizeDomain, ORDER_STATUS_LABEL, type OrderRequest, type OrderStatus } from "../../../services/orderApi";
import { Badge, Button } from "../../ui";
import { Banner } from "../crm/shared";
import { ConfirmModal, Note } from "./domainParts";
import "./ops.css";

export const ORDER_TONE: Record<OrderStatus, "yellow" | "blue" | "green" | "red" | "neutral"> = {
  requested: "yellow", approved: "blue", in_progress: "blue", fulfilled: "green", rejected: "red", cancelled: "neutral",
};
export const OrderStatusBadge = ({ status }: { status: OrderStatus }) => <Badge tone={ORDER_TONE[status] ?? "neutral"}>{ORDER_STATUS_LABEL[status] ?? status}</Badge>;

const LIMIT_LABELS: Record<string, string> = { domains: "Domains", mailboxes: "Mailboxes", emails: "Emails sent", workflows: "Workflows", ai_requests: "AI requests" };
export const limitLabel = (key: string | undefined) => (key ? LIMIT_LABELS[key] ?? key : "Limit");

export function orderTitle(order: Pick<OrderRequest, "type" | "quantity"> & { details?: OrderRequest["details"] }) {
  if (order.type === "limits") {
    const d = order.details;
    return d?.requestedLimit ? `Raise ${limitLabel(d.limitKey).toLowerCase()} limit to ${d.requestedLimit.toLocaleString()}` : "More limits";
  }
  const one = order.type === "domains" ? "domain" : "mailbox";
  const many = order.type === "domains" ? "domains" : "mailboxes";
  return `${order.quantity} ${order.quantity === 1 ? one : many}`;
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const Chips = ({ values }: { values: string[] }) => <span className="ops-chips">{values.map((v) => <Badge key={v}>{v}</Badge>)}</span>;

/** Read-only view of everything the requester supplied. */
export function OrderDetailsList({ order }: { order: OrderRequest }) {
  const d = order.details ?? {};
  const hasAny = order.type === "limits" ? Boolean(d.notes) : Boolean(d.preferredDomains?.length || d.mailboxesPerDomain || d.mailboxNames?.length || d.notes || d.domainIds?.length);
  return (
    <dl className="ops-kv">
      <dt>Type</dt><dd>{order.type === "domains" ? "Domains" : order.type === "limits" ? "More limits" : "Mailboxes"}</dd>
      {order.type === "limits" ? (
        <>
          <dt>Limit</dt><dd>{limitLabel(d.limitKey)}{d.period ? ` (${d.period === "day" ? "per 24 hours" : "in total"})` : ""}</dd>
          {d.currentLimit != null ? <><dt>Limit when requested</dt><dd>{d.currentLimit.toLocaleString()}</dd></> : null}
          <dt>Requested limit</dt><dd className="ops-strong">{d.requestedLimit?.toLocaleString() ?? "-"}</dd>
        </>
      ) : <><dt>Quantity</dt><dd>{order.quantity}</dd></>}
      {d.preferredDomains?.length ? <><dt>Preferred domains</dt><dd><Chips values={d.preferredDomains} /></dd></> : null}
      {d.domainIds?.length ? <><dt>For domains</dt><dd><Chips values={d.domainIds.map((id) => `Domain #${id}`)} /></dd></> : null}
      {d.mailboxesPerDomain ? <><dt>Mailboxes per domain</dt><dd>{d.mailboxesPerDomain}</dd></> : null}
      {d.mailboxNames?.length ? <><dt>Mailbox names</dt><dd><Chips values={d.mailboxNames} /></dd></> : null}
      {d.notes ? <><dt>Notes</dt><dd style={{ whiteSpace: "pre-wrap" }}>{d.notes}</dd></> : null}
      {!hasAny ? <><dt>Details</dt><dd>No extra details were provided.</dd></> : null}
      <dt>Requested by</dt><dd>{order.requested_by ? `${order.requested_by.name || order.requested_by.email} (${order.requested_by.email})` : "-"}</dd>
      <dt>Submitted</dt><dd>{formatDateTime(order.created_at)}</dd>
      {order.fulfilled_at ? <><dt>Fulfilled</dt><dd>{formatDateTime(order.fulfilled_at)}</dd></> : null}
    </dl>
  );
}

interface ResultRow { domain: string; ok: boolean | null; message: string }

/** The server's per-domain result shape is not fixed, so read it defensively. */
function toRows(data: unknown): ResultRow[] {
  const list: unknown[] = Array.isArray(data) ? data : data && typeof data === "object"
    ? ((["results", "assigned", "moved", "domains", "items"] as const).map((key) => (data as Record<string, unknown>)[key]).find(Array.isArray) as unknown[] | undefined) ?? [] : [];
  return list.map((entry) => {
    if (typeof entry === "string") return { domain: entry, ok: true, message: "Moved to this workspace." };
    const r = (entry ?? {}) as Record<string, unknown>;
    const status = String(r.status ?? "").toLowerCase();
    const explicit = typeof r.ok === "boolean" ? r.ok : typeof r.success === "boolean" ? r.success : null;
    const failed = explicit === false || /refus|fail|error|skip|reject/.test(status) || Boolean(r.error);
    const ok = explicit ?? (failed ? false : status ? true : null);
    const mailboxCount = Array.isArray(r.mailboxes) ? r.mailboxes.length : null;
    const from = r.from_workspace && typeof r.from_workspace === "object" ? (r.from_workspace as Record<string, unknown>).name : r.from_workspace;
    const moved = mailboxCount !== null ? `Moved with ${mailboxCount} mailbox${mailboxCount === 1 ? "" : "es"}${from ? ` from ${String(from)}` : ""}.` : "Moved to this workspace.";
    return { domain: String(r.domain ?? r.name ?? "(unknown)"), ok: failed ? false : ok, message: String(r.message ?? r.error ?? r.reason ?? r.status ?? (ok === false ? "" : moved)) };
  });
}

/** Parses pasted/typed domains (comma, space or newline separated) into unique valid hostnames. */
export function parseDomains(text: string) {
  const seen = new Set<string>(); const bad: string[] = [];
  for (const raw of text.split(/[\s,;]+/).filter(Boolean)) {
    const d = normalizeDomain(raw);
    if (d) seen.add(d); else bad.push(raw);
  }
  return { domains: [...seen], bad };
}

export function AssignDomainsPanel({ workspaceId, workspaceName, orderId, onAssigned, linkable = true }: { workspaceId: number; workspaceName: string; orderId: number; onAssigned?: () => void; linkable?: boolean }) {
  const [text, setText] = useState("");
  const [linkOrder, setLinkOrder] = useState(linkable);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<ResultRow[] | null>(null);
  const [rawMessage, setRawMessage] = useState("");
  const [needsConfirm, setNeedsConfirm] = useState<string | null>(null);
  const { domains, bad } = parseDomains(text);
  const link = linkable && linkOrder;

  async function run(confirmFromPlatform: boolean) {
    setBusy(true); setError(""); setRows(null); setRawMessage("");
    try {
      const data = await adminOrderService.assignDomains(workspaceId, { domains, ...(link ? { orderId } : {}), ...(confirmFromPlatform ? { confirmFromPlatform: true } : {}) });
      const parsed = toRows(data);
      setRows(parsed);
      if (parsed.length === 0) setRawMessage("The server accepted the request.");
      setNeedsConfirm(null);
      if (parsed.some((r) => r.ok !== false)) { setText(""); onAssigned?.(); }
    } catch (e) {
      const message = e instanceof Error ? e.message : "The domains could not be assigned.";
      const platform = (e instanceof ApiRequestError && e.code === "CONFIRM_FROM_PLATFORM_REQUIRED") || /confirmFromPlatform/.test(message);
      if (!confirmFromPlatform && platform) setNeedsConfirm(message); else { setNeedsConfirm(null); setError(message); }
    } finally { setBusy(false); }
  }

  return (
    <section aria-label="Assign domains" className="ops-box">
      <h3>Assign domains to this workspace</h3>
      <p className="sv-hint">Moves existing domains, with their mailboxes, into {workspaceName}. The server refuses unsafe moves and says why.</p>
      <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
        <textarea aria-label="Domains to move" className="sv-textarea" rows={3} placeholder="Domains to move, e.g. example.com (comma or line separated)" value={text} onChange={(e) => setText(e.target.value)} />
        {bad.length ? <p className="sv-hint" style={{ color: "#e5484d" }}>Not a valid domain: {bad.join(", ")}</p> : null}
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
          <input type="checkbox" className="sv-check" checked={link} disabled={!linkable} onChange={(e) => setLinkOrder(e.target.checked)} />
          Link to request #{orderId}{linkable ? "" : " (closed requests can't be linked)"}
        </label>
        <Banner error={error} />
        <div><Button disabled={busy || domains.length === 0 || bad.length > 0} onClick={() => void run(false)}>{busy ? "Assigning…" : `Assign ${domains.length || ""} ${domains.length === 1 ? "domain" : "domains"}`.replace(/\s+/g, " ")}</Button></div>
        {rows && rows.length > 0 ? (
          <ul aria-label="Assignment results" className="ops-list">
            {rows.map((row) => <li key={row.domain}><div className="ops-list-head"><span className="ops-strong">{row.domain}</span><span style={{ color: row.ok === false ? "#e5484d" : "#30a46c" }}>{row.ok === false ? "Refused" : "Moved"}</span>{row.message ? <span className="ops-sub">{row.message}</span> : null}</div></li>)}
          </ul>
        ) : null}
        {rawMessage ? <p className="sv-hint" role="status">{rawMessage}</p> : null}
      </div>
      {needsConfirm !== null ? (
        <ConfirmModal title="Move domains out of the platform pool?" confirmLabel="Move from platform pool" danger busy={busy} onClose={() => setNeedsConfirm(null)} onConfirm={() => void run(true)}>
          <Note tone="red"><div style={{ display: "flex", gap: 8 }}><AlertTriangle className="sv-icon" aria-hidden style={{ color: "#e5484d", flexShrink: 0 }} /><div>These domains currently belong to the platform. Moving them to {workspaceName} also moves their mailboxes, and any platform campaigns or warm-up that use them will stop. Only continue if you are sure.{needsConfirm ? <p className="ops-sub" style={{ marginTop: 6 }}>Server message: {needsConfirm}</p> : null}</div></div></Note>
        </ConfirmModal>
      ) : null}
    </section>
  );
}
