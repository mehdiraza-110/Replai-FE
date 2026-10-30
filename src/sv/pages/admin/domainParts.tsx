import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, Search } from "lucide-react";
import { adminApi, errorMessage, PLATFORM_WORKSPACE_SLUG, resolveAdminPlan, type AdminDomain, type AdminDomainDetail, type AdminWorkspace, type AssignDomainsResult, type AssignPreview } from "../../../services/adminApi";
import { ApiRequestError } from "../../../services/api";
import { Badge, Button, Modal, SkeletonRows, SkeletonLines } from "../../ui";
import { Banner } from "../crm/shared";
import "./ops.css";

type Tone = "neutral" | "green" | "yellow" | "red" | "blue" | "purple" | "orange";

const dateText = (value: string | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};
export { dateText };

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Maildoso and our own Postal server are live; Amazon SES is retired and only shows on old rows. */
export function providerLabel(provider: string | null | undefined, fallback?: string) {
  const key = String(provider ?? "").toLowerCase();
  if (key === "maildoso") return "Maildoso";
  if (key === "postal") return "Own server (Hetzner)";
  if (key === "ses" || key === "amazon ses" || key === "amazon_ses") return "Amazon SES (retired)";
  return fallback || provider || "Unknown";
}

export function domainTone(status: string): Tone {
  const s = status.toLowerCase();
  if (s === "active" || s === "verified" || s === "ready") return "green";
  if (/pend|setup|provision|verif|warm/.test(s)) return "yellow";
  if (/fail|error|suspend|block|revok|delete/.test(s)) return "red";
  return "neutral";
}

export function DomainStatus({ status }: { status: string }) {
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ") : "Unknown";
  return <Badge tone={domainTone(status)}>{label}</Badge>;
}

export const isPoolDomain = (d: Pick<AdminDomain, "workspace">) => d.workspace.slug === PLATFORM_WORKSPACE_SLUG;

export const stageLabel = (key: string, count?: number) => {
  const text = key.replace(/[_-]+/g, " ").replace(/^./, (c) => c.toUpperCase());
  return count === undefined ? text : `${text} ${count}`;
};

const shortDate = (value: string | null | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

export function AssignedTo({ domain }: { domain: AdminDomain }) {
  const pool = isPoolDomain(domain);
  const when = shortDate(domain.assigned_at);
  const from = domain.previous_workspace?.name;
  return (
    <div style={{ minWidth: 180 }}>
      {pool ? (
        <>
          <div className="ops-muted" style={{ fontWeight: 500 }}>Platform pool ({domain.workspace.name})</div>
          <p className="ops-sub">Not assigned to a client</p>
        </>
      ) : (
        <>
          <div className="ops-strong">{domain.workspace.name}</div>
          <p className="ops-sub">{domain.owner?.email ?? "No owner"}</p>
        </>
      )}
      {domain.assigned_at && when ? <p className="ops-sub">{pool ? "returned" : "assigned"} {when}{domain.assigned_by_email ? ` by ${domain.assigned_by_email}` : ""}{from ? ` from ${from}` : ""}</p> : null}
    </div>
  );
}

export function WarmupCell({ domain }: { domain: AdminDomain }) {
  const entries = Object.entries(domain.warmup?.stages ?? {}).filter(([, n]) => n > 0);
  if (entries.length === 0) return <span className="ops-muted">Not warming</span>;
  return (
    <div>
      <div className="ops-chips">{entries.map(([key, n]) => <Badge key={key} tone="blue">{stageLabel(key, n)}</Badge>)}</div>
      {domain.warmup.avg_daily_limit != null ? <p className="ops-sub">avg {Math.round(domain.warmup.avg_daily_limit)}/day</p> : null}
    </div>
  );
}

export function PlanBadge({ workspace }: { workspace: AdminWorkspace }) {
  const plan = resolveAdminPlan(workspace);
  if (plan.type !== "trial") return <Badge>Standard</Badge>;
  if (plan.ended) return <Badge tone="red">Trial ended</Badge>;
  return <Badge tone={plan.daysLeft <= 2 ? "red" : plan.daysLeft <= 7 ? "yellow" : "blue"}>Trial · {plan.daysLeft}d</Badge>;
}

export function Note({ tone, title, children }: { tone: "red" | "yellow" | "green" | "blue" | "plain"; title?: string; children: ReactNode }) {
  return <div className={`ops-note${tone === "plain" ? "" : ` is-${tone}`}`} role={tone === "red" ? "alert" : undefined}>{title ? <div style={{ fontWeight: 600 }}>{title}</div> : null}{children}</div>;
}

/** Confirmation dialog: the sv Modal with a cancel/confirm footer. */
export function ConfirmModal({ title, children, confirmLabel, danger, busy, onConfirm, onClose }: { title: string; children: ReactNode; confirmLabel: string; danger?: boolean; busy?: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal open title={title} onClose={onClose} footer={<><Button disabled={busy} onClick={onClose}>Cancel</Button><Button variant={danger ? "danger" : "primary"} disabled={busy} onClick={onConfirm}>{busy ? "Working…" : confirmLabel}</Button></>}>
      <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: "19px" }}>{children}</div>
    </Modal>
  );
}

export function WorkspacePicker({ workspaces, value, onChange, disabledId }: { workspaces: AdminWorkspace[]; value: number | null; onChange: (id: number) => void; disabledId?: number | null }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return workspaces;
    return workspaces.filter((w) => `${w.name} ${w.slug} ${w.owner?.email ?? ""} ${w.owner?.name ?? ""}`.toLowerCase().includes(q));
  }, [workspaces, query]);
  return (
    <div className="ops-picker">
      <div style={{ position: "relative" }}>
        <Search className="sv-icon" aria-hidden style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", opacity: 0.5 }} />
        <input aria-label="Search workspaces" className="sv-input" style={{ paddingLeft: 34 }} placeholder="Search by workspace, slug or owner email" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <ul aria-label="Workspaces" role="listbox">
        {filtered.length === 0 ? <li className="sv-hint" style={{ padding: 20, textAlign: "center" }}>No workspaces match your search.</li> : filtered.map((w) => (
          <li key={w.id} role="option" aria-selected={w.id === value}>
            <button type="button" className={w.id === value ? "is-on" : undefined} disabled={w.id === disabledId} onClick={() => onChange(w.id)}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontWeight: 500 }}>{w.name}</span>
                <span className="ops-sub" style={{ display: "block" }}>{w.owner?.email ?? "No owner"}{w.id === disabledId ? " · current workspace" : ""}</span>
              </span>
              <PlanBadge workspace={w} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DomainDetailModal({ domain, onClose, onAssign }: { domain: AdminDomain | null; onClose: () => void; onAssign: (d: AdminDomain) => void }) {
  const [detail, setDetail] = useState<AdminDomainDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const id = domain?.id;
  useEffect(() => {
    if (id === undefined) return;
    let cancelled = false;
    setLoading(true); setError(""); setDetail(null);
    adminApi.getDomain(id).then((d) => !cancelled && setDetail(d)).catch((e) => !cancelled && setError(errorMessage(e, "Unable to load this domain."))).finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [id]);
  const shown = detail ?? domain;
  return (
    <Modal open={domain !== null} wide title={shown?.domain ?? "Domain"} onClose={onClose} footer={<><Button onClick={onClose}>Close</Button>{shown ? <Button variant="primary" onClick={() => onAssign(shown)}>Assign / reassign</Button> : null}</>}>
      {shown ? (
        <div style={{ display: "grid", gap: 18 }}>
          <p className="sv-hint">{providerLabel(shown.provider, shown.provider_label)} · added {dateText(shown.created_at)}</p>
          <div className="ops-box" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}>
            <div><p className="ops-label">Assigned to</p><AssignedTo domain={shown} /></div>
            <div style={{ textAlign: "right" }}><p className="ops-label">Status</p><DomainStatus status={shown.status} /><p className="ops-sub">{shown.active_mailbox_count}/{shown.mailbox_count} mailboxes active</p></div>
          </div>
          <Banner error={error} />
          <section aria-label="Mailboxes">
            <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>Mailboxes</h3>
            {loading ? <table className="sv-table"><tbody><SkeletonRows columns={5} rows={3} /></tbody></table> : detail ? (detail.mailboxes.length === 0 ? <p className="sv-hint">This domain has no mailboxes.</p> : (
              <div className="sv-table-wrap"><table className="sv-table ops-table"><thead><tr><th>Mailbox</th><th>Provider</th><th>Status</th><th>Warm-up</th><th className="is-right">Daily limit</th></tr></thead><tbody>
                {detail.mailboxes.map((m) => (
                  <tr key={m.id}>
                    <td className="ops-strong">{m.email}</td>
                    <td className="ops-muted">{providerLabel(m.provider, m.provider_label)}</td>
                    <td><DomainStatus status={m.status} /></td>
                    <td>{m.warmup_stage ? <Badge tone="blue">{stageLabel(m.warmup_stage)}</Badge> : <span className="ops-muted">None</span>}{m.warmup_strategy_name ? <p className="ops-sub">{m.warmup_strategy_name}</p> : null}</td>
                    <td className="is-right">{m.daily_limit ?? "-"}</td>
                  </tr>
                ))}
              </tbody></table></div>
            )) : null}
          </section>
          <section aria-label="Assignment history">
            <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>Assignment history</h3>
            {loading ? <SkeletonLines lines={3} /> : detail ? (detail.history.length === 0 ? <p className="sv-hint">This domain has never been moved.</p> : (
              <ol className="ops-list">
                {detail.history.map((h, i) => (
                  <li key={`${h.at}-${i}`}>
                    <div className="ops-list-head"><span className="ops-strong">{h.from_workspace ?? "Unknown"}</span><ArrowRight className="sv-icon" aria-hidden /><span className="ops-strong">{h.to_workspace ?? "Unknown"}</span><span className="ops-sub is-end">{dateText(h.at)}</span></div>
                    <p className="ops-sub">{h.by_email ? `By ${h.by_email}` : "By the system"}{h.notes ? ` · ${h.notes}` : ""}</p>
                  </li>
                ))}
              </ol>
            )) : null}
          </section>
        </div>
      ) : null}
    </Modal>
  );
}

export function AssignDomainsModal({ isOpen, onClose, domains, currentWorkspaceId, workspaces, workspacesError, fixedTarget, onDone }: { isOpen: boolean; onClose: () => void; domains: string[]; currentWorkspaceId?: number | null; workspaces: AdminWorkspace[]; workspacesError?: string; fixedTarget?: AdminWorkspace | null; onDone: () => void }) {
  const [targetId, setTargetId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState<AssignPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AssignDomainsResult | null>(null);
  const requestRef = useRef(0);
  const domainsKey = domains.join("|");

  useEffect(() => {
    if (!isOpen) return;
    setTargetId(fixedTarget?.id ?? null); setNotes(""); setPreview(null); setPreviewError(""); setConfirmed(false); setError(""); setResult(null);
  }, [isOpen, fixedTarget?.id]);

  useEffect(() => {
    if (!isOpen || targetId === null || domains.length === 0 || result) return;
    const id = ++requestRef.current;
    setPreviewing(true); setPreview(null); setPreviewError(""); setConfirmed(false);
    adminApi.previewAssign({ domains, workspaceId: targetId })
      .then((data) => { if (id === requestRef.current) setPreview(data); })
      .catch((e) => { if (id === requestRef.current) setPreviewError(errorMessage(e, "Unable to preview this move.")); })
      .finally(() => { if (id === requestRef.current) setPreviewing(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, targetId, domainsKey, result]);

  const target = useMemo(() => workspaces.find((w) => w.id === targetId) ?? fixedTarget ?? null, [workspaces, targetId, fixedTarget]);
  const toPool = target?.slug === PLATFORM_WORKSPACE_SLUG;
  const blocked = preview?.blocked ?? [];
  const needsConfirm = Boolean(preview?.requiresConfirmation ?? preview?.requiresPlatformConfirmation);
  const canSubmit = Boolean(target && preview && !previewing && !busy && blocked.length === 0 && (!needsConfirm || confirmed));

  async function submit() {
    if (!target || !canSubmit) return;
    setBusy(true); setError("");
    try {
      const data = await adminApi.assignDomains({ domains, workspaceId: target.id, ...(notes.trim() ? { notes: notes.trim() } : {}), ...(needsConfirm && confirmed ? { confirmFromPlatform: true } : {}) });
      setResult(data); onDone();
    } catch (e) {
      if (e instanceof ApiRequestError && e.code === "CONFIRM_FROM_PLATFORM_REQUIRED") setPreview((p) => (p ? { ...p, requiresConfirmation: true, requiresPlatformConfirmation: true } : p));
      setError(errorMessage(e, "The domains could not be assigned."));
    } finally { setBusy(false); }
  }

  const title = result ? (toPool ? "Returned to the pool" : "Domains assigned") : toPool ? "Return to platform pool" : "Assign domains";
  return (
    <Modal open={isOpen} wide title={title} onClose={onClose} footer={result ? <Button variant="primary" onClick={onClose}>Done</Button> : (
      <>
        {needsConfirm && !confirmed && !busy ? <span className="sv-hint" style={{ marginRight: "auto", color: "#e5484d" }}>Tick the confirmation above to continue.</span> : null}
        <Button disabled={busy} onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!canSubmit} onClick={() => void submit()}>{busy ? "Moving…" : toPool ? "Return to pool" : target ? `Assign to ${target.name}` : "Assign"}</Button>
      </>
    )}>
      {result ? <ResultView result={result} /> : (
        <div style={{ display: "grid", gap: 14 }}>
          <p className="sv-hint">{plural(domains.length, "domain")} selected: {domains.slice(0, 3).join(", ")}{domains.length > 3 ? ` and ${domains.length - 3} more` : ""}</p>
          {fixedTarget ? (
            <Note tone="plain"><div style={{ fontWeight: 500 }}>Target: {fixedTarget.name}</div><div className="ops-muted">The platform pool. Domains returned here are available to hand out again.</div></Note>
          ) : (
            <section aria-label="Target workspace" style={{ display: "grid", gap: 6 }}>
              <div style={{ fontWeight: 500, fontSize: 13 }}>Assign to workspace</div>
              <Banner error={workspacesError ?? ""} />
              <WorkspacePicker disabledId={currentWorkspaceId} value={targetId} workspaces={workspaces} onChange={setTargetId} />
            </section>
          )}
          <div className="sv-field">
            <label className="sv-field-label" htmlFor="assign-notes">Notes (optional)</label>
            <textarea id="assign-notes" className="sv-textarea" maxLength={500} rows={2} placeholder="Why is this moving? Shown in the domain history." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {target === null ? <p className="sv-hint">Choose a workspace to see exactly what will change before anything moves.</p>
            : previewing ? <p className="sv-hint" aria-busy="true">Checking the impact…</p>
            : previewError ? <Banner error={previewError} />
            : preview ? <PreviewView confirmed={confirmed} needsConfirm={needsConfirm} preview={preview} target={target} onConfirm={setConfirmed} /> : null}
          <Banner error={error} />
          <Note tone="plain">
            <ul style={{ margin: 0 }}>
              <li>Mailboxes move with their domain. Warm-up progress (stage and daily limit) is kept.</li>
              <li>Campaign history stays with the previous workspace.</li>
              <li>Campaigns that lose all of their mailboxes are paused automatically.</li>
              <li>The receiving workspace is notified by email.</li>
            </ul>
          </Note>
        </div>
      )}
    </Modal>
  );
}

function PreviewView({ preview, target, needsConfirm, confirmed, onConfirm }: { preview: AssignPreview; target: AdminWorkspace; needsConfirm: boolean; confirmed: boolean; onConfirm: (v: boolean) => void }) {
  return (
    <div aria-live="polite" style={{ display: "grid", gap: 12 }}>
      <div style={{ fontWeight: 500, fontSize: 13 }}>{plural(preview.domains.length, "domain")} and {plural(preview.mailboxesMoving, "mailbox", "mailboxes")} will move to {target.name}.</div>
      {preview.blocked.length > 0 ? <Note tone="red" title="This move is blocked"><ul>{preview.blocked.map((b) => <li key={b}>{b}</li>)}</ul></Note> : null}
      {preview.warnings.length > 0 ? <Note tone="yellow" title="Heads up"><ul>{preview.warnings.map((w) => <li key={w}>{w}</li>)}</ul></Note> : null}
      <ul aria-label="Domains moving" className="ops-list">
        {preview.domains.map((d) => {
          const ws = (d.workspace ?? d.current_workspace)?.name ?? "Unknown";
          const owner = d.owner_email ?? d.current_owner_email;
          return (
            <li key={d.domain}>
              <div className="ops-list-head"><span className="ops-strong">{d.domain}</span><span className="ops-sub">{providerLabel(d.provider_label, d.provider_label)}</span><span className="ops-sub is-end">{ws} → {target.name}</span></div>
              <p className="ops-sub">{owner ? `Currently owned by ${owner}. ` : ""}{plural(d.mailboxes.length, "mailbox", "mailboxes")}{d.mailboxes.length > 0 ? `: ${d.mailboxes.slice(0, 3).map((m) => m.email).join(", ")}${d.mailboxes.length > 3 ? ", …" : ""}` : ""}</p>
            </li>
          );
        })}
      </ul>
      <section aria-label="Affected campaigns">
        <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 6 }}>Campaigns affected</div>
        {preview.campaigns.length === 0 ? <p className="sv-hint">No campaigns use these mailboxes.</p> : (
          <ul className="ops-list">
            {preview.campaigns.map((c) => (
              <li key={c.id}><div className="ops-list-head"><span className="ops-strong">{c.name}</span><span className="ops-sub">{c.workspaceName}{c.isWarmup ? " · warm-up" : ""}</span>
                {c.willPause ? <span className="is-end" style={{ color: "#e5484d", fontWeight: 500, display: "inline-flex", gap: 4, alignItems: "center" }}><AlertTriangle className="sv-icon" aria-hidden />Will be paused</span> : <span className="is-end" style={{ color: "#30a46c" }}>Keeps running with {plural(c.remainingMailboxes, "mailbox", "mailboxes")}</span>}
              </div></li>
            ))}
          </ul>
        )}
      </section>
      {needsConfirm ? (
        <Note tone="red">
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
            <input type="checkbox" className="sv-check" checked={confirmed} onChange={(e) => onConfirm(e.target.checked)} style={{ marginTop: 3 }} />
            <span><span style={{ display: "block", fontWeight: 600, color: "#e5484d" }}>Moving out of the platform pool</span>These domains belong to the SendVybe platform pool. Moving them gives them to {target.name}. I understand and want to continue.</span>
          </label>
        </Note>
      ) : null}
    </div>
  );
}

function ResultView({ result }: { result: AssignDomainsResult }) {
  const paused = result.campaigns.filter((c) => c.outcome === "paused");
  return (
    <div style={{ display: "grid", gap: 12 }} role="status">
      <div style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 500 }}><CheckCircle2 className="sv-icon" aria-hidden style={{ color: "#30a46c" }} />{plural(result.domains.length, "domain")} and {plural(result.mailboxesMoved, "mailbox", "mailboxes")} moved to {result.workspace.name}.</div>
      <ul aria-label="Moved domains" className="ops-list">
        {result.domains.map((d) => {
          const from = typeof d.from_workspace === "string" ? d.from_workspace : d.from_workspace?.name;
          return <li key={d.id}><div className="ops-list-head"><span className="ops-strong">{d.domain}</span><span className="ops-sub">{from ? `from ${from}` : ""}</span><span className="is-end" style={{ color: "#30a46c" }}>Moved</span></div></li>;
        })}
      </ul>
      {result.campaigns.length > 0 ? (
        <section aria-label="Campaign outcomes">
          <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 6 }}>Campaigns</div>
          <ul className="ops-list">
            {result.campaigns.map((c) => <li key={c.id}><div className="ops-list-head"><span className="ops-strong">{c.name}</span>{c.outcome === "paused" ? <span className="is-end" style={{ color: "#e5484d", fontWeight: 500 }}>Paused (no mailboxes left)</span> : <span className="is-end" style={{ color: "#30a46c" }}>Kept running with {plural(c.remainingMailboxes, "mailbox", "mailboxes")}</span>}</div></li>)}
          </ul>
          {paused.length > 0 ? <p className="sv-hint" style={{ marginTop: 6 }}>Paused campaigns can be resumed once they have mailboxes again.</p> : null}
        </section>
      ) : null}
    </div>
  );
}
