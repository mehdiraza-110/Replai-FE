import { PLATFORM_WORKSPACE_SLUG, type AdminDomain } from "../../services/adminApi";
import { StatusPill } from "../ui/StatusPill";
import type { StatusTone } from "../../types";

export function domainStatusTone(status: string): StatusTone {
  const s = status.toLowerCase();
  if (s === "active" || s === "verified" || s === "ready") return "success";
  if (/pend|setup|provision|verif|warm/.test(s)) return "warning";
  if (/fail|error|suspend|block|revok|delete/.test(s)) return "danger";
  return "default";
}

export function DomainStatusPill({ status }: { status: string }) {
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ") : "Unknown";
  return <StatusPill tone={domainStatusTone(status)}>{label}</StatusPill>;
}

export const isPoolDomain = (d: Pick<AdminDomain, "workspace">) => d.workspace.slug === PLATFORM_WORKSPACE_SLUG;

export function shortDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function stageLabel(key: string, count?: number) {
  const text = key.replace(/[_-]+/g, " ").replace(/^./, (c) => c.toUpperCase());
  return count === undefined ? text : `${text} ${count}`;
}

/** The prominent "who has this domain" cell. */
export function AssignedTo({ domain }: { domain: AdminDomain }) {
  const pool = isPoolDomain(domain);
  const assignedDate = shortDate(domain.assigned_at);
  const fromName = domain.previous_workspace?.name;
  return (
    <div className="min-w-[200px]">
      {pool ? (
        <>
          <p className="font-medium text-muted">Platform pool ({domain.workspace.name})</p>
          <p className="text-[12px] text-muted">Not assigned to a client</p>
        </>
      ) : (
        <>
          <p className="font-semibold text-foreground">{domain.workspace.name}</p>
          <p className="text-[12px] text-foreground/80">{domain.owner?.email ?? "No owner"}</p>
        </>
      )}
      {domain.assigned_at && assignedDate ? (
        <p className="mt-0.5 text-[11px] leading-4 text-muted">
          {pool ? "returned" : "assigned"} {assignedDate}
          {domain.assigned_by_email ? ` by ${domain.assigned_by_email}` : ""}
          {fromName ? ` from ${fromName}` : ""}
        </p>
      ) : null}
    </div>
  );
}

export function WarmupCell({ domain }: { domain: AdminDomain }) {
  const entries = Object.entries(domain.warmup?.stages ?? {}).filter(([, n]) => n > 0);
  if (entries.length === 0) return <span className="text-muted">Not warming</span>;
  return (
    <div className="grid gap-1">
      <div className="flex flex-wrap gap-1">
        {entries.map(([key, n]) => (
          <StatusPill key={key} tone="accent">{stageLabel(key, n)}</StatusPill>
        ))}
      </div>
      {domain.warmup.avg_daily_limit != null ? (
        <span className="text-[11px] text-muted">avg {Math.round(domain.warmup.avg_daily_limit)}/day</span>
      ) : null}
    </div>
  );
}
