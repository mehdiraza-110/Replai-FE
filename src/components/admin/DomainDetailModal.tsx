import { Button } from "@heroui/react";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { adminApi, errorMessage, type AdminDomain, type AdminDomainDetail } from "../../services/adminApi";
import { StatusPill } from "../ui/StatusPill";
import { Skeleton } from "../ui/Skeleton";
import { AdminModal, ErrorBanner } from "./AdminModal";
import { formatDate } from "./AdminBits";
import { AssignedTo, DomainStatusPill, stageLabel } from "./DomainBits";

export function DomainDetailModal({
  domain,
  onClose,
  onAssign,
}: {
  domain: AdminDomain | null;
  onClose: () => void;
  onAssign: (d: AdminDomain) => void;
}) {
  const [detail, setDetail] = useState<AdminDomainDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const id = domain?.id;

  useEffect(() => {
    if (id === undefined) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);
    adminApi
      .getDomain(id)
      .then((d) => !cancelled && setDetail(d))
      .catch((e) => !cancelled && setError(errorMessage(e, "Unable to load this domain.")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  const shown = detail ?? domain;

  return (
    <AdminModal
      description={shown ? `${shown.provider_label} · added ${formatDate(shown.created_at)}` : undefined}
      footer={
        <>
          <Button size="sm" variant="secondary" onClick={onClose}>Close</Button>
          {shown ? <Button size="sm" variant="primary" onClick={() => onAssign(shown)}>Assign / reassign</Button> : null}
        </>
      }
      isOpen={domain !== null}
      title={shown?.domain ?? "Domain"}
      width={720}
      onClose={onClose}
    >
      {shown ? (
        <div className="grid gap-5">
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border/70 p-3">
            <div>
              <p className="mb-1 text-[11px] uppercase tracking-wide text-muted">Assigned to</p>
              <AssignedTo domain={shown} />
            </div>
            <div className="text-right">
              <p className="mb-1 text-[11px] uppercase tracking-wide text-muted">Status</p>
              <DomainStatusPill status={shown.status} />
              <p className="mt-1 text-[12px] text-muted">{shown.active_mailbox_count}/{shown.mailbox_count} mailboxes active</p>
            </div>
          </div>

          {error ? <ErrorBanner message={error} onRetry={() => setAttempt((n) => n + 1)} /> : null}

          <section aria-label="Mailboxes">
            <h3 className="mb-2 text-sm font-semibold text-foreground">Mailboxes</h3>
            {loading ? (
              <div aria-busy="true" className="grid gap-2">
                {[0, 1, 2].map((i) => <Skeleton className="h-8 w-full max-w-none" key={i} />)}
              </div>
            ) : detail ? (
              detail.mailboxes.length === 0 ? (
                <p className="text-[13px] text-muted">This domain has no mailboxes.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border/70">
                  <table className="w-full min-w-[560px] text-left text-[13px]">
                    <thead className="border-b border-border/70 text-[11px] uppercase tracking-wide text-muted">
                      <tr>
                        <th className="px-3 py-2 font-medium">Mailbox</th>
                        <th className="px-2 py-2 font-medium">Provider</th>
                        <th className="px-2 py-2 font-medium">Status</th>
                        <th className="px-2 py-2 font-medium">Warm-up</th>
                        <th className="px-3 py-2 text-right font-medium">Daily limit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.mailboxes.map((m) => (
                        <tr className="border-b border-border/60 last:border-0" key={m.id}>
                          <td className="px-3 py-2 font-medium text-foreground">{m.email}</td>
                          <td className="px-2 py-2 text-muted">{m.provider_label}</td>
                          <td className="px-2 py-2"><DomainStatusPill status={m.status} /></td>
                          <td className="px-2 py-2">
                            {m.warmup_stage ? <StatusPill tone="accent">{stageLabel(m.warmup_stage)}</StatusPill> : <span className="text-muted">None</span>}
                            {m.warmup_strategy_name ? <p className="text-[11px] text-muted">{m.warmup_strategy_name}</p> : null}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{m.daily_limit ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : null}
          </section>

          <section aria-label="Assignment history">
            <h3 className="mb-2 text-sm font-semibold text-foreground">Assignment history</h3>
            {loading ? (
              <Skeleton className="h-10 w-full max-w-none" />
            ) : detail ? (
              detail.history.length === 0 ? (
                <p className="text-[13px] text-muted">This domain has never been moved.</p>
              ) : (
                <ol className="divide-y divide-border/60 rounded-xl border border-border/70 text-[13px]">
                  {detail.history.map((h, i) => (
                    <li className="px-3 py-2" key={`${h.at}-${i}`}>
                      <div className="flex flex-wrap items-center gap-x-2">
                        <span className="font-medium text-foreground">{h.from_workspace ?? "Unknown"}</span>
                        <ArrowRight className="size-3 text-muted" />
                        <span className="font-medium text-foreground">{h.to_workspace ?? "Unknown"}</span>
                        <span className="ml-auto text-[12px] text-muted">{formatDate(h.at)}</span>
                      </div>
                      <p className="text-[12px] text-muted">
                        {h.by_email ? `By ${h.by_email}` : "By the system"}
                        {h.notes ? ` · ${h.notes}` : ""}
                      </p>
                    </li>
                  ))}
                </ol>
              )
            ) : null}
          </section>
        </div>
      ) : null}
    </AdminModal>
  );
}
