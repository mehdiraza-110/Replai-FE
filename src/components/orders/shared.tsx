import { StatusPill } from "../ui/StatusPill";
import { ORDER_STATUS_LABEL, type OrderRequest, type OrderStatus } from "../../services/orderApi";
import type { StatusTone } from "../../types";

const TONES: Record<OrderStatus, StatusTone> = {
  requested: "warning",
  approved: "accent",
  in_progress: "accent",
  fulfilled: "success",
  rejected: "danger",
  cancelled: "default",
};

export function OrderStatusPill({ status }: { status: OrderStatus }) {
  return <StatusPill tone={TONES[status] ?? "default"}>{ORDER_STATUS_LABEL[status] ?? status}</StatusPill>;
}

export function orderTitle(order: Pick<OrderRequest, "type" | "quantity">) {
  const one = order.type === "domains" ? "domain" : "mailbox";
  const many = order.type === "domains" ? "domains" : "mailboxes";
  return `${order.quantity} ${order.quantity === 1 ? one : many}`;
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[170px_1fr] sm:gap-3">
      <dt className="text-[12px] font-medium text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-[13px] text-foreground">{children}</dd>
    </div>
  );
}

function Chips({ values }: { values: string[] }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {values.map((value) => (
        <span className="rounded-full bg-default-100 px-2 py-0.5 text-[12px] text-foreground" key={value}>
          {value}
        </span>
      ))}
    </span>
  );
}

/** Read-only rendering of everything the requester supplied. Shared by the tenant list and the admin drawer. */
export function OrderDetailsList({ order, domainNames }: { order: OrderRequest; domainNames?: Record<number, string> }) {
  const d = order.details ?? {};
  const hasAny = Boolean(
    d.preferredDomains?.length || d.mailboxesPerDomain || d.mailboxNames?.length || d.notes || d.domainIds?.length,
  );

  return (
    <dl className="grid gap-2.5">
      <Row label="Type">{order.type === "domains" ? "Domains" : "Mailboxes"}</Row>
      <Row label="Quantity">{order.quantity}</Row>
      {d.preferredDomains?.length ? (
        <Row label="Preferred domains">
          <Chips values={d.preferredDomains} />
        </Row>
      ) : null}
      {d.domainIds?.length ? (
        <Row label="For domains">
          <Chips values={d.domainIds.map((id) => domainNames?.[id] ?? `Domain #${id}`)} />
        </Row>
      ) : null}
      {d.mailboxesPerDomain ? <Row label="Mailboxes per domain">{d.mailboxesPerDomain}</Row> : null}
      {d.mailboxNames?.length ? (
        <Row label="Mailbox names">
          <Chips values={d.mailboxNames} />
        </Row>
      ) : null}
      {d.notes ? <Row label="Notes"><span className="whitespace-pre-wrap">{d.notes}</span></Row> : null}
      {!hasAny ? <Row label="Details">No extra details were provided.</Row> : null}
      <Row label="Requested by">
        {order.requested_by ? `${order.requested_by.name || order.requested_by.email} (${order.requested_by.email})` : "-"}
      </Row>
      <Row label="Submitted">{formatDateTime(order.created_at)}</Row>
      {order.fulfilled_at ? <Row label="Fulfilled">{formatDateTime(order.fulfilled_at)}</Row> : null}
    </dl>
  );
}
