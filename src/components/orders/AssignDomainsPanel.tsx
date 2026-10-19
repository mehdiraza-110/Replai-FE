import { Button } from "@heroui/react";
import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { ConfirmDialog, ErrorBanner } from "../admin/AdminModal";
import { ApiRequestError } from "../../services/api";
import { adminOrderService } from "../../services/orderApi";
import { DomainChipInput } from "./DomainChipInput";

interface ResultRow {
  domain: string;
  ok: boolean | null;
  message: string;
}

/** The server's per-domain result shape is not fixed, so read it defensively. */
function toRows(data: unknown): ResultRow[] {
  const list: unknown[] = Array.isArray(data)
    ? data
    : data && typeof data === "object"
      ? ((["results", "assigned", "moved", "domains", "items"] as const)
          .map((key) => (data as Record<string, unknown>)[key])
          .find(Array.isArray) as unknown[] | undefined) ?? []
      : [];

  return list.map((entry) => {
    if (typeof entry === "string") return { domain: entry, ok: true, message: "Moved to this workspace." };
    const r = (entry ?? {}) as Record<string, unknown>;
    const status = String(r.status ?? "").toLowerCase();
    const explicit = typeof r.ok === "boolean" ? r.ok : typeof r.success === "boolean" ? r.success : null;
    const failed = explicit === false || /refus|fail|error|skip|reject/.test(status) || Boolean(r.error);
    const ok = explicit ?? (failed ? false : status ? true : null);
    const mailboxCount = Array.isArray(r.mailboxes) ? r.mailboxes.length : null;
    const from = r.from_workspace && typeof r.from_workspace === "object"
      ? (r.from_workspace as Record<string, unknown>).name
      : r.from_workspace;
    const movedText =
      mailboxCount !== null
        ? `Moved with ${mailboxCount} mailbox${mailboxCount === 1 ? "" : "es"}${from ? ` from ${String(from)}` : ""}.`
        : "Moved to this workspace.";
    const message = String(r.message ?? r.error ?? r.reason ?? r.status ?? (ok === false ? "" : movedText));
    return { domain: String(r.domain ?? r.name ?? "(unknown)"), ok: failed ? false : ok, message };
  });
}

export function AssignDomainsPanel({
  workspaceId,
  workspaceName,
  orderId,
  onAssigned,
  linkable = true,
}: {
  workspaceId: number;
  workspaceName: string;
  orderId: number;
  onAssigned?: () => void;
  /** False once the request is closed (fulfilled, rejected, cancelled): it can no longer be linked to. */
  linkable?: boolean;
}) {
  const [domains, setDomains] = useState<string[]>([]);
  const [linkOrder, setLinkOrder] = useState(linkable);

  useEffect(() => {
    if (!linkable) setLinkOrder(false);
  }, [linkable]);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ResultRow[] | null>(null);
  const [rawMessage, setRawMessage] = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState<string | null>(null);

  async function run(confirmFromPlatform: boolean) {
    setIsBusy(true);
    setError(null);
    setRows(null);
    setRawMessage(null);
    try {
      const data = await adminOrderService.assignDomains(workspaceId, {
        domains,
        ...(linkOrder ? { orderId } : {}),
        ...(confirmFromPlatform ? { confirmFromPlatform: true } : {}),
      });
      const parsed = toRows(data);
      setRows(parsed);
      if (parsed.length === 0) setRawMessage("The server accepted the request.");
      setNeedsConfirm(null);
      if (parsed.some((r) => r.ok !== false)) {
        setDomains([]);
        onAssigned?.();
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "The domains could not be assigned.";
      const needsPlatformConfirm =
        (e instanceof ApiRequestError && e.code === "CONFIRM_FROM_PLATFORM_REQUIRED") ||
        /confirmFromPlatform/.test(message);
      if (!confirmFromPlatform && needsPlatformConfirm) {
        setNeedsConfirm(message);
      } else {
        setNeedsConfirm(null);
        setError(message);
      }
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section aria-labelledby="assign-heading" className="rounded-xl border border-border/70 p-4">
      <h3 className="text-sm font-semibold text-foreground" id="assign-heading">
        Assign domains to this workspace
      </h3>
      <p className="mt-1 text-[12px] text-muted">
        Moves existing domains, with their mailboxes, into {workspaceName}. The server refuses unsafe moves and says why.
      </p>

      <div className="mt-3 grid gap-3">
        <DomainChipInput id={`assign-domains-${orderId}`} max={100} placeholder="Domains to move, e.g. example.com" values={domains} onChange={setDomains} />
        <label className="flex items-center gap-2 text-[13px] text-foreground">
          <input checked={linkOrder} className="size-4" disabled={!linkable} type="checkbox" onChange={(e) => setLinkOrder(e.target.checked)} />
          Link to request #{orderId}{linkable ? "" : " (closed requests can't be linked)"}
        </label>
        {error ? <ErrorBanner message={error} /> : null}
        <div>
          <Button isDisabled={isBusy || domains.length === 0} size="sm" onClick={() => void run(false)}>
            {isBusy ? "Assigning..." : `Assign ${domains.length || ""} ${domains.length === 1 ? "domain" : "domains"}`.replace(/\s+/g, " ")}
          </Button>
        </div>

        {rows && rows.length > 0 ? (
          <ul aria-label="Assignment results" className="divide-y divide-border/60 rounded-xl border border-border/70 text-[13px]">
            {rows.map((row) => (
              <li className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-3 py-2" key={row.domain}>
                <span className="font-medium text-foreground">{row.domain}</span>
                <span className={row.ok === false ? "text-danger" : "text-success"}>{row.ok === false ? "Refused" : "Moved"}</span>
                {row.message ? <span className="text-muted">{row.message}</span> : null}
              </li>
            ))}
          </ul>
        ) : null}
        {rawMessage ? <p className="text-[13px] text-muted" role="status">{rawMessage}</p> : null}
      </div>

      <ConfirmDialog
        confirmLabel="Move from Koval Group"
        description="You are about to move domains out of the Koval Group platform workspace."
        isBusy={isBusy}
        isOpen={needsConfirm !== null}
        title="Move domains out of Koval Group?"
        tone="danger"
        onClose={() => setNeedsConfirm(null)}
        onConfirm={() => void run(true)}
      >
        <div className="mt-3 flex gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3 text-[13px] leading-5 text-foreground">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />
          <div>
            <p>
              These domains currently belong to the platform. Moving them to {workspaceName} also moves their mailboxes, and any platform
              campaigns or warmup that use them will stop. Only continue if you are sure.
            </p>
            {needsConfirm ? <p className="mt-2 text-muted">Server message: {needsConfirm}</p> : null}
          </div>
        </div>
      </ConfirmDialog>
    </section>
  );
}
