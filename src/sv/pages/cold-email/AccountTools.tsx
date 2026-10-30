import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, RefreshCw, Sparkles, Upload } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { PLATFORM_WORKSPACE_SLUG } from "../../../services/adminApi";
import { domainService, mailboxService, warmupPoolService, warmupService } from "../../../services/api";
import type { AiRampSchedule, Domain, MailboxCostQuote, MailboxCreateResult, MailboxInboxPage, MaildosoSyncSummary, ReputationTrendPoint, WarmupPoolStats, WarmupStrategy, WarmupSummary, WarmupTarget } from "../../../types";
import { Badge, Button, Card, Field, Modal, Skeleton, SkeletonCard, SkeletonRows } from "../../ui";
import { AreaChart } from "../../ui/AreaChart";
import { emailAccountsApi, type ApplyResult, type DomainDns, type OnboardOutcome, type SyncOutcome } from "../../api/emailAccounts";
import { Banner, Pager, useRemote } from "../crm/shared";
import { errorText, formatDate } from "./shared";

const when = (value: string | null) => (value ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)) : "—");
const money = (cents: number, currency = "USD") => new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);

/** What an inbox has sent and received through the app (not a real IMAP view). */
export function MessagesModal({ inbox, onClose }: { inbox: { id: number; email: string }; onClose: () => void }) {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<number | null>(null);
  const list = useRemote<MailboxInboxPage>(() => mailboxService.messages(inbox.id, { page, limit: 20 }), [inbox.id, page]);
  const data = list.data;
  return (
    <Modal wide open title={`Messages for ${inbox.email}`} onClose={onClose} footer={<Button onClick={onClose}>Close</Button>}>
      <Banner error={list.error} />
      {!data && !list.error ? <div className="sv-stack">{[0, 1, 2].map((i) => <SkeletonCard key={i} lines={2} />)}</div> : null}
      {data && data.items.length === 0 ? <p className="sv-hint">No messages have been sent or received on this inbox yet.</p> : null}
      <div className="sv-stack" style={{ maxHeight: 360, overflowY: "auto" }}>
        {data?.items.map((m) => (
          <Card key={m.id} className="sv-pad">
            <button type="button" style={{ textAlign: "left", width: "100%" }} onClick={() => setOpen(open === m.id ? null : m.id)} aria-expanded={open === m.id}>
              <span style={{ display: "flex", gap: 8, alignItems: "center" }}><Badge tone={m.direction === "inbound" ? "blue" : "neutral"}>{m.direction === "inbound" ? "Received" : "Sent"}</Badge><strong>{m.subject || "(no subject)"}</strong></span>
              <span className="sv-hint" style={{ display: "block" }}>{m.direction === "inbound" ? `From ${m.fromAddress}` : `To ${m.toAddress}`} · {when(m.createdAt)}</span>
            </button>
            {open === m.id ? <pre className="sv-transcript" style={{ marginTop: 8 }}>{m.bodyText || "(no text)"}</pre> : null}
          </Card>
        ))}
      </div>
      {data ? <Pager page={data.page} limit={data.limit} total={data.total} totalPages={data.totalPages} onPage={setPage} /> : null}
    </Modal>
  );
}

const dnsTone = (status: string) => (status === "Success" ? "green" : status === "Failed" ? "red" : status === "Unknown" ? "yellow" : "neutral") as "green" | "red" | "yellow" | "neutral";

/** The DNS a domain on the own mail server needs, how it looks live right now, and (super admin) one click to add what's missing at Porkbun. */
export function DnsModal({ domain, onClose, onChanged }: { domain: { id: number; domain: string }; onClose: () => void; onChanged: () => void }) {
  const { isSuperAdmin } = useAuth();
  const dns = useRemote<DomainDns>(() => emailAccountsApi.domainDns(domain.id), [domain.id]);
  const [selector, setSelector] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState<ApplyResult | null>(null);
  const [copied, setCopied] = useState("");
  const [local, setLocal] = useState<DomainDns | null>(null);
  const data = local ?? dns.data;

  async function run(action: () => Promise<DomainDns | ApplyResult>) {
    setBusy(true); setError("");
    try {
      const out = await action();
      if ("dns" in out) { setApplied(out); setLocal(out.dns); } else setLocal(out);
      onChanged();
    } catch (caught) { setError(errorText(caught)); } finally { setBusy(false); }
  }
  const copy = async (key: string, value: string) => { try { await navigator.clipboard.writeText(value); setCopied(key); window.setTimeout(() => setCopied(""), 1200); } catch { /* clipboard blocked */ } };

  return (
    <Modal wide open title={`DNS records for ${domain.domain}`} onClose={onClose} footer={<Button onClick={onClose}>Close</Button>}>
      <Banner error={error || dns.error} />
      {!data ? <p className="sv-hint">Checking the live DNS…</p> : null}
      {data && !data.managed ? <p className="sv-hint" style={{ margin: 0 }}>{data.note}</p> : null}
      {data?.managed ? (
        <>
          <p className="sv-hint" style={{ margin: 0 }}>Add these at the domain's DNS host. Status is read live from DNS, so it can take a few minutes to change after you add a record.{data.unreliable ? " Some lookups didn't answer just now, so statuses marked Unknown are not final." : ""}</p>
          <div className="sv-table-wrap"><table className="sv-table">
            <thead><tr><th>Type</th><th>Name</th><th>Value</th><th>Status</th><th style={{ width: 60 }} /></tr></thead>
            <tbody>{data.records.map((r) => (
              <tr key={r.key}>
                <td>{r.type}</td>
                <td style={{ wordBreak: "break-all" }}>{r.name}<div className="sv-hint">{r.purpose}{r.required ? "" : " (recommended)"}</div></td>
                <td style={{ wordBreak: "break-all", fontFamily: "ui-monospace, monospace", fontSize: 12 }}>{r.value}</td>
                <td><Badge tone={dnsTone(r.status)}>{r.status === "Not started" ? "Not checked" : r.status}</Badge></td>
                <td>{r.manual ? null : <Button size="sm" onClick={() => void copy(r.key, r.value)}>{copied === r.key ? "Copied" : "Copy"}</Button>}</td>
              </tr>
            ))}</tbody>
          </table></div>
          {isSuperAdmin ? (
            <>
              <Field label="DKIM selector (shown in Postal for this domain, like postal-abc123)" htmlFor="dns-selector">
                <div style={{ display: "flex", gap: 8 }}>
                  <input id="dns-selector" className="sv-input" value={selector ?? data.dkimSelector ?? ""} onChange={(event) => setSelector(event.target.value)} />
                  <Button disabled={busy || selector === null} onClick={() => void run(() => emailAccountsApi.setDkim(domain.id, selector ?? ""))}>Save</Button>
                </div>
              </Field>
              <div>
                <Button variant="primary" disabled={busy || !data.canAutoApply} onClick={() => void run(() => emailAccountsApi.applyDns(domain.id))}>{busy ? "Working…" : "Add missing records at Porkbun"}</Button>
                {!data.canAutoApply ? <span className="sv-hint" style={{ marginLeft: 10 }}>{data.registrar && data.registrar !== "Porkbun" ? `Registered at ${data.registrar}: add them by hand.` : "Porkbun isn't connected on this server: add them by hand."}</span> : <span className="sv-hint" style={{ marginLeft: 10 }}>Only adds missing records. Never changes or deletes existing ones.</span>}
              </div>
            </>
          ) : null}
          {applied ? (
            <p className="sv-banner is-ok" role="status" style={{ margin: 0 }}>
              Added {applied.added.length ? applied.added.join(", ") : "nothing new"}{applied.alreadyThere.length ? `; already there: ${applied.alreadyThere.join(", ")}` : ""}.
              {applied.conflicts.length ? ` Left alone because a different record exists: ${applied.conflicts.map((c) => c.key).join(", ")}. Fix those by hand.` : ""}
            </p>
          ) : null}
        </>
      ) : null}
    </Modal>
  );
}

/** Super admin: bring new domains onto the own mail server in one go (Porkbun DNS, Postal domain, inboxes). A preview changes nothing. */
export function OnboardModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const status = useRemote(() => emailAccountsApi.postalStatus(), []);
  const [text, setText] = useState("");
  const [perDomain, setPerDomain] = useState(5);
  const [autoStart, setAutoStart] = useState(false);
  const [preview, setPreview] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [out, setOut] = useState<OnboardOutcome | null>(null);
  const domains = [...new Set(text.split(/[\s,;]+/).map((d) => d.trim().toLowerCase()).filter(Boolean))];
  const ready = status.data ? status.data.mailServer && status.data.dns : false;

  async function run() {
    setBusy(true); setError("");
    try { const result = await emailAccountsApi.onboard({ domains, mailboxesPerDomain: perDomain, autoStart, dryRun: preview }); setOut(result); if (!result.dryRun) onDone(); } catch (caught) { setError(errorText(caught)); } finally { setBusy(false); }
  }

  return (
    <Modal wide open title="Onboard domains" onClose={onClose} footer={out ? <><Button onClick={() => setOut(null)}>Back</Button><Button variant="primary" onClick={onClose}>Done</Button></> : <><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={Upload} disabled={busy || !ready || domains.length === 0 || domains.length > 50} onClick={() => void run()}>{busy ? "Working…" : preview ? `Preview ${domains.length || ""} domain${domains.length === 1 ? "" : "s"}` : `Onboard ${domains.length || ""} domain${domains.length === 1 ? "" : "s"}`}</Button></>}>
      <Banner error={error || status.error} />
      {status.data && !ready ? <p className="sv-banner is-warn" style={{ margin: 0 }}>Not ready: {[!status.data.mailServer && "the mail server connection (POSTAL_SSH_HOST, POSTAL_SSH_KEY_PATH)", !status.data.dns && "Porkbun (PORKBUN_API_KEY, PORKBUN_API_SECRET)"].filter(Boolean).join(" and ")} {status.data.mailServer || status.data.dns ? "isn't" : "aren't"} set up on this server.</p> : null}
      {out ? (
        <div className="sv-stack">
          <p className={`sv-banner ${out.failed ? "is-warn" : "is-ok"}`} style={{ margin: 0 }}>{out.dryRun ? "Preview only, nothing was changed. " : ""}{out.succeeded} of {out.requested} {out.dryRun ? "would go through" : "onboarded"}{out.failed ? `, ${out.failed} need attention` : ""}.</p>
          {out.results.map((r) => (
            <Card key={r.domain} className="sv-pad">
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><b>{r.domain}</b><Badge tone={r.ok ? (r.needsAttention ? "yellow" : "green") : "red"}>{r.ok ? (r.needsAttention ? "Done, check DNS" : out.dryRun ? "Ready" : "Onboarded") : "Failed"}</Badge>{r.pool ? <span className="sv-hint">sending IP {r.pool.ip ?? r.pool.name}</span> : null}</div>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>{r.steps.map((st, i) => <li key={i} style={{ color: st.ok ? undefined : "var(--ds-red-text)" }}>{st.ok ? "✓" : "✗"} {st.detail}</li>)}</ul>
            </Card>
          ))}
          {!out.dryRun && out.succeeded ? <p className="sv-hint" style={{ margin: 0 }}>DNS changes take a few minutes to spread. Use Re-check DNS on the Domains tab; inboxes start warming once the domain is verified.</p> : null}
        </div>
      ) : (
        <>
          <p className="sv-hint" style={{ margin: 0 }}>One domain per line (up to 50). Each must already be in your Porkbun account. For every domain we add it to the Hetzner mail server (with its reply route and a sending IP), add its DNS records at Porkbun, then register it here with inboxes queued for warm-up. Existing DNS records are never changed.</p>
          <textarea className="sv-textarea" style={{ minHeight: 140, fontFamily: "ui-monospace, monospace", fontSize: 12 }} aria-label="Domains" placeholder={"brand-one.com\nbrand-two.com"} value={text} onChange={(event) => setText(event.target.value)} />
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <label className="sv-hint" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>Inboxes per domain
              <select className="sv-select" style={{ width: 80, height: 32 }} value={perDomain} onChange={(event) => setPerDomain(Number(event.target.value))}>{[1, 2, 3, 4, 5, 6, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}</select>
            </label>
            <label className="sv-hint" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><input type="checkbox" className="sv-check" checked={autoStart} onChange={(event) => setAutoStart(event.target.checked)} /> Start warming immediately</label>
            <label className="sv-hint" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><input type="checkbox" className="sv-check" checked={preview} onChange={(event) => setPreview(event.target.checked)} /> Preview only (changes nothing)</label>
            <span className="sv-hint" style={{ marginLeft: "auto" }}>{domains.length} unique domain{domains.length === 1 ? "" : "s"}{domains.length > 50 ? " (too many)" : ""}</span>
          </div>
        </>
      )}
    </Modal>
  );
}

/** Super admin: adds domains that already exist in the mail server but not here. */
export function ImportPostalModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [out, setOut] = useState<SyncOutcome | null>(null);
  async function run() {
    setBusy(true); setError("");
    try { setOut(await emailAccountsApi.syncPostal()); onDone(); } catch (caught) { setError(errorText(caught)); } finally { setBusy(false); }
  }
  return (
    <Modal open title="Import from the mail server" onClose={onClose} footer={out ? <Button variant="primary" onClick={onClose}>Done</Button> : <><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={RefreshCw} disabled={busy} onClick={() => void run()}>{busy ? "Reading…" : "Import now"}</Button></>}>
      <Banner error={error} />
      {out ? (
        <>
          <p className="sv-banner is-ok" style={{ margin: 0 }}>{out.inPostal} domain{out.inPostal === 1 ? "" : "s"} on the mail server · {out.alreadyHere} already here · {out.added.length} added{out.added.length ? `: ${out.added.join(", ")}` : ""}.</p>
          {out.failed.length ? <p className="sv-hint">Could not add: {out.failed.map((f) => `${f.domain} (${f.error})`).join("; ")}</p> : null}
          <p className="sv-hint" style={{ margin: 0 }}>Sending IP pools: {out.pools.map((p) => `${p.name} ${p.domains}/${out.perPool}`).join(", ")}. Imported domains have no inboxes yet; use Create inboxes.</p>
        </>
      ) : <p className="sv-hint" style={{ margin: 0 }}>Reads the domains set up on the Hetzner mail server and adds any that this app doesn't know yet. Nothing on the mail server is changed.</p>}
    </Modal>
  );
}

const LOCAL_PART = /^[a-z0-9](?:[a-z0-9._+-]{0,62}[a-z0-9])?$/i;

/** Super admin: create inboxes on a domain that is already onboarded (Maildoso). The cost is shown and must be accepted first. */
export function CreateInboxesModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const domains = useRemote(() => domainService.list({ limit: 200 }), []);
  const [domain, setDomain] = useState("");
  const [parts, setParts] = useState<string[]>(["sarah.connor"]);
  const [displayName, setDisplayName] = useState("");
  const [quote, setQuote] = useState<MailboxCostQuote | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<MailboxCreateResult[] | null>(null);

  const cleaned = useMemo(() => parts.map((p) => p.trim()).filter(Boolean), [parts]);
  const invalid = cleaned.filter((p) => !LOCAL_PART.test(p));

  // Re-price whenever the count changes; an earlier confirmation is voided so only the cost on screen can be accepted.
  useEffect(() => {
    setAccepted(false);
    if (cleaned.length === 0) { setQuote(null); return; }
    let cancelled = false;
    setQuoting(true); setQuoteError("");
    const timer = window.setTimeout(() => {
      mailboxService.quote(cleaned.length).then((q) => !cancelled && setQuote(q)).catch((e) => { if (!cancelled) { setQuote(null); setQuoteError(errorText(e)); } }).finally(() => !cancelled && setQuoting(false));
    }, 400);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [cleaned.length]);

  const needsAccept = Boolean(quote && quote.monthlyIncreaseCents > 0);
  const ready = Boolean(domain) && cleaned.length > 0 && invalid.length === 0 && Boolean(quote) && !quoting && (!needsAccept || accepted);

  async function submit() {
    setBusy(true); setError("");
    try {
      // The server re-checks this against a fresh quote and refuses if it no longer matches.
      setResults(await mailboxService.create({ domain, localParts: cleaned, displayName: displayName.trim() || undefined, acceptedMonthlyIncreaseCents: quote?.monthlyIncreaseCents ?? 0 }));
      onDone();
    } catch (caught) { setError(errorText(caught)); } finally { setBusy(false); }
  }

  return (
    <Modal open title="Create inboxes on an existing domain" onClose={onClose} footer={results ? <Button variant="primary" onClick={onClose}>Done</Button> : <><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!ready || busy} onClick={() => void submit()}>{busy ? "Creating…" : `Create ${cleaned.length} inbox${cleaned.length === 1 ? "" : "es"}`}</Button></>}>
      <Banner error={error} />
      {results ? (
        <div className="sv-stack">
          {results.map((r) => <div key={r.email} style={{ display: "flex", gap: 8, alignItems: "center" }}><Badge tone={r.error ? "red" : "green"}>{r.error ? "Failed" : "Created"}</Badge><span>{r.email}</span>{r.error ? <span className="sv-hint">{r.error}</span> : null}</div>)}
        </div>
      ) : (
        <>
          <Field label="Domain" htmlFor="ci-domain">
            <select id="ci-domain" className="sv-select" value={domain} onChange={(event) => setDomain(event.target.value)}>
              <option value="">{domains.data ? (domains.data.items.length ? "Choose a domain" : "No domains onboarded yet") : "Choose a domain"}</option>
              {domains.data?.items.filter((d: Domain) => d.provider === "Maildoso" || d.provider === "Postal").map((d: Domain) => <option key={d.id} value={d.domain}>{d.domain} ({d.provider}, {d.status})</option>)}
            </select>
          </Field>
          <Field label="Inbox names (the part before @)">
            <div className="sv-stack" style={{ gap: 6 }}>
              {parts.map((part, index) => (
                <div key={index} style={{ display: "flex", gap: 6 }}>
                  <input className="sv-input" aria-label={`Inbox name ${index + 1}`} value={part} onChange={(event) => setParts(parts.map((p, i) => (i === index ? event.target.value : p)))} />
                  <Button size="sm" aria-label={`Remove inbox ${index + 1}`} icon={Minus} disabled={parts.length === 1} onClick={() => setParts(parts.filter((_, i) => i !== index))} />
                </div>
              ))}
              <div><Button size="sm" icon={Plus} disabled={parts.length >= 50} onClick={() => setParts([...parts, ""])}>Add another</Button></div>
            </div>
            {invalid.length ? <span className="sv-hint" style={{ color: "var(--ds-red-text)" }}>Use letters, numbers and . _ + - only: {invalid.join(", ")}</span> : null}
          </Field>
          <Field label="Display name (optional)" htmlFor="ci-name"><input id="ci-name" className="sv-input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></Field>
          {quoteError ? <p className="sv-banner is-error" style={{ margin: 0 }}>{quoteError}</p> : null}
          {quote ? (
            <div className="sv-banner" style={{ margin: 0 }}>
              <b>{quote.summary}</b>
              <div className="sv-hint">{quote.coveredByPlan ? "Covered by your current plan." : `Monthly cost goes from ${money(quote.currentMonthlyCents, quote.currency)} to ${money(quote.newMonthlyCents, quote.currency)} (+${money(quote.monthlyIncreaseCents, quote.currency)}). Due today: ${money(quote.dueTodayCents, quote.currency)}.`}</div>
              {needsAccept ? <label style={{ display: "inline-flex", gap: 8, alignItems: "center", marginTop: 6 }}><input type="checkbox" className="sv-check" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /> I accept the monthly increase of {money(quote.monthlyIncreaseCents, quote.currency)}</label> : null}
            </div>
          ) : quoting ? <p className="sv-hint">Estimating the cost…</p> : null}
        </>
      )}
    </Modal>
  );
}

/** Super admin: pulls every mailbox on the Maildoso account into the app (new domains land in the platform pool). */
export function SyncMaildosoModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<MaildosoSyncSummary | null>(null);
  async function run() {
    setBusy(true); setError("");
    try { setSummary(await mailboxService.syncMaildoso()); onDone(); } catch (caught) { setError(errorText(caught)); } finally { setBusy(false); }
  }
  return (
    <Modal open title="Sync from Maildoso" onClose={onClose} footer={summary ? <Button variant="primary" onClick={onClose}>Done</Button> : <><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={RefreshCw} disabled={busy} onClick={() => void run()}>{busy ? "Syncing…" : "Sync now"}</Button></>}>
      <Banner error={error} />
      {summary ? (
        <>
          <p className="sv-banner is-ok" style={{ margin: 0 }}>{summary.domains} domain{summary.domains === 1 ? "" : "s"} checked · {summary.mailboxesCreated} inbox{summary.mailboxesCreated === 1 ? "" : "es"} added · {summary.mailboxesUpdated} updated{summary.warmupAssigned ? ` · ${summary.warmupAssigned} queued for warm-up` : ""}.</p>
          {summary.skipped.length ? <div style={{ maxHeight: 180, overflowY: "auto" }}><p className="sv-hint">Skipped:</p>{summary.skipped.map((s) => <div key={s.email} className="sv-hint">{s.email}: {s.reason}</div>)}</div> : null}
        </>
      ) : <p className="sv-hint" style={{ margin: 0 }}>Reads every mailbox on the Maildoso account and adds or updates it here. Domains and inboxes already in the app are matched by address, so running it twice is safe.</p>}
    </Modal>
  );
}

const targetLabel = (t: WarmupTarget) => (t.all ? "all inboxes" : t.domain ? t.domain : "selected inboxes");

function TargetPicker({ domains, target, onChange }: { domains: Domain[]; target: WarmupTarget; onChange: (next: WarmupTarget) => void }) {
  return (
    <Field label="Apply to" htmlFor="wt-target">
      <select id="wt-target" className="sv-select" value={target.domain ?? (target.all ? "__all" : "")} onChange={(event) => onChange(event.target.value === "__all" ? { all: true } : event.target.value ? { domain: event.target.value } : {})}>
        <option value="">Don't assign yet</option>
        <option value="__all">All inboxes</option>
        {domains.map((d) => <option key={d.id} value={d.domain}>Inboxes on {d.domain}</option>)}
      </select>
    </Field>
  );
}

/** Ramp-up schedules for inboxes: strategies, assigning them, AI-suggested schedules and the shared warm-up lead pool. */
export function WarmupPanel() {
  const { activeWorkspace, isSuperAdmin } = useAuth();
  const strategies = useRemote<WarmupStrategy[]>(() => warmupService.listStrategies(), []);
  const summary = useRemote<WarmupSummary>(() => warmupService.getSummary(), []);
  const pool = useRemote<WarmupPoolStats>(() => warmupPoolService.getStats(), []);
  const domains = useRemote(() => domainService.list({ limit: 200 }), []);
  const [assigning, setAssigning] = useState<WarmupStrategy | null>(null);
  const [creating, setCreating] = useState<AiRampSchedule | "manual" | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const reloadAll = () => { strategies.reload(); summary.reload(); };
  const canUpload = isSuperAdmin && activeWorkspace?.slug === PLATFORM_WORKSPACE_SLUG;
  const domainList = domains.data?.items ?? [];
  const s = summary.data;

  async function upload(file: File | undefined) {
    if (!file) return;
    setUploading(true); setError(""); setNotice("");
    try {
      const out = await warmupPoolService.addLeadsFromFile(file);
      setNotice(`Added ${out.added.toLocaleString()} lead${out.added === 1 ? "" : "s"} to the warm-up pool. ${out.skippedSuppressed + out.skippedAlreadyInPool} skipped (suppressed or already there).`);
      pool.reload();
    } catch (caught) { setError(errorText(caught)); } finally { setUploading(false); }
  }

  return (
    <div className="sv-stack">
      <Banner error={error || strategies.error} />
      {notice ? <p className="sv-banner is-ok" role="status" style={{ margin: 0 }}>{notice}</p> : null}
      <div className="sv-type-cards">
        {([["In warm-up", s?.inWarmup], ["At steady state", s?.atSteadyState], ["Average progress", s ? `${s.avgProgress}%` : undefined], ["Active strategies", s?.activeStrategies]] as const).map(([label, value]) => (
          <Card key={label} className="sv-pad"><p className="sv-hint" style={{ margin: 0 }}>{label}</p><p className="sv-type-score">{value ?? "—"}</p></Card>
        ))}
      </div>

      <Card className="sv-pad">
        <div className="sv-page-head" style={{ margin: 0 }}>
          <div><h3 className="sv-set-title" style={{ margin: 0 }}>Warm-up strategies</h3><p className="sv-hint" style={{ margin: 0 }}>How fast an inbox ramps up its daily sending limit.</p></div>
          <div className="sv-actions"><Button icon={Sparkles} onClick={() => setAiOpen(true)}>Suggest with AI</Button><Button variant="primary" icon={Plus} onClick={() => setCreating("manual")}>New strategy</Button></div>
        </div>
        <div className="sv-table-wrap">
          <table className="sv-table">
            <thead><tr><th>Strategy</th><th className="is-num">Start / day</th><th className="is-num">Steady state / day</th><th>Ramp</th><th className="is-num">Inboxes</th><th style={{ width: 90 }} /></tr></thead>
            <tbody>
              {!strategies.data && !strategies.error ? <SkeletonRows columns={6} /> : null}
              {strategies.data?.length === 0 ? <tr><td colSpan={6} className="sv-hint" style={{ padding: 16 }}>No strategies yet. Create one, or let the AI suggest a schedule.</td></tr> : null}
              {strategies.data?.map((st) => (
                <tr key={st.id}>
                  <td style={{ fontWeight: 500 }}>{st.name} {st.isAiGenerated ? <Badge tone="purple">AI</Badge> : null}{st.description ? <div className="sv-hint">{st.description}</div> : null}</td>
                  <td className="is-num">{st.startDailyLimit}</td>
                  <td className="is-num">{st.steadyStateDailyLimit}</td>
                  <td>+{st.incrementPerStage} every {st.stageDurationDays} day{st.stageDurationDays === 1 ? "" : "s"}</td>
                  <td className="is-num">{st.assignedMailboxCount}</td>
                  <td><Button size="sm" onClick={() => setAssigning(st)}>Assign</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="sv-pad">
        <div className="sv-page-head" style={{ margin: 0 }}>
          <div><h3 className="sv-set-title" style={{ margin: 0 }}>Warm-up lead pool</h3><p className="sv-hint" style={{ margin: 0 }}>Shared, single-use contacts that the always-on warm-up lane writes to.</p></div>
          {canUpload ? <><input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ""; }} /><Button icon={Upload} disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? "Uploading…" : "Upload CSV"}</Button></> : null}
        </div>
        {pool.data ? <p style={{ margin: 0 }}><b>{pool.data.available.toLocaleString()}</b> available · {pool.data.used.toLocaleString()} used · {pool.data.suppressed.toLocaleString()} suppressed · {pool.data.failed.toLocaleString()} failed · {pool.data.total.toLocaleString()} total</p> : pool.error ? <p className="sv-hint" style={{ margin: 0 }}>{pool.error}</p> : <Skeleton width="55%" />}
        {!canUpload ? <p className="sv-hint" style={{ margin: "6px 0 0" }}>Only the platform team adds to the pool.</p> : null}
      </Card>

      {assigning ? <AssignModal strategy={assigning} domains={domainList} onClose={() => setAssigning(null)} onDone={(message) => { setNotice(message); reloadAll(); }} /> : null}
      {creating ? <StrategyModal seed={creating === "manual" ? null : creating} domains={domainList} onClose={() => setCreating(null)} onDone={(message) => { setNotice(message); reloadAll(); }} /> : null}
      {aiOpen ? <AiModal domains={domainList} onClose={() => setAiOpen(false)} onUse={(schedule) => { setAiOpen(false); setCreating(schedule); }} /> : null}
    </div>
  );
}

function AssignModal({ strategy, domains, onClose, onDone }: { strategy: WarmupStrategy; domains: Domain[]; onClose: () => void; onDone: (message: string) => void }) {
  const [target, setTarget] = useState<WarmupTarget>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run() {
    setBusy(true); setError("");
    try {
      const out = await warmupService.assignStrategy(strategy.id, target);
      onDone(`"${strategy.name}" is now on ${out.assignedCount} inbox${out.assignedCount === 1 ? "" : "es"}${out.alreadyAssignedCount ? ` (${out.alreadyAssignedCount} already had it)` : ""}.`);
      onClose();
    } catch (caught) { setError(errorText(caught)); setBusy(false); }
  }
  return (
    <Modal open title={`Assign "${strategy.name}"`} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={busy || (!target.all && !target.domain)} onClick={() => void run()}>{busy ? "Assigning…" : "Assign"}</Button></>}>
      <Banner error={error} />
      <p className="sv-hint" style={{ marginTop: 0 }}>Inboxes using it ramp from {strategy.startDailyLimit} to {strategy.steadyStateDailyLimit} emails a day.</p>
      <TargetPicker domains={domains} target={target} onChange={setTarget} />
    </Modal>
  );
}

function StrategyModal({ seed, domains, onClose, onDone }: { seed: AiRampSchedule | null; domains: Domain[]; onClose: () => void; onDone: (message: string) => void }) {
  const [name, setName] = useState(seed ? "AI ramp schedule" : "");
  const [start, setStart] = useState(seed?.startDailyLimit ?? 5);
  const [steady, setSteady] = useState(seed?.steadyStateDailyLimit ?? 40);
  const [inc, setInc] = useState(seed?.incrementPerStage ?? 5);
  const [days, setDays] = useState(seed?.stageDurationDays ?? 7);
  const [target, setTarget] = useState<WarmupTarget>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const valid = name.trim() && start >= 1 && steady >= start && inc >= 1 && days >= 1;
  async function run() {
    setBusy(true); setError("");
    try {
      const out = await warmupService.createStrategy({ name: name.trim(), startDailyLimit: start, steadyStateDailyLimit: steady, incrementPerStage: inc, stageDurationDays: days, ...(seed ? { isAiGenerated: true, aiRationale: seed.rationale } : {}), ...(target.all || target.domain ? { applyTo: target } : {}) });
      onDone(`Strategy "${out.strategy.name}" created${out.assignedCount ? ` and assigned to ${out.assignedCount} inbox${out.assignedCount === 1 ? "" : "es"}` : ""}.`);
      onClose();
    } catch (caught) { setError(errorText(caught)); setBusy(false); }
  }
  const num = (value: number, set: (n: number) => void, id: string, label: string) => <Field label={label} htmlFor={id}><input id={id} type="number" min={1} className="sv-input" value={value} onChange={(event) => set(Number(event.target.value) || 0)} /></Field>;
  return (
    <Modal open title={seed ? "Use the suggested schedule" : "New warm-up strategy"} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={busy || !valid} onClick={() => void run()}>{busy ? "Saving…" : "Save strategy"}</Button></>}>
      <Banner error={error} />
      {seed?.rationale ? <p className="sv-hint" style={{ marginTop: 0 }}>{seed.rationale}</p> : null}
      <Field label="Name" htmlFor="st-name"><input id="st-name" className="sv-input" value={name} onChange={(event) => setName(event.target.value)} autoFocus /></Field>
      <div className="sv-grid-2">{num(start, setStart, "st-start", "Start emails per day")}{num(steady, setSteady, "st-steady", "Steady-state emails per day")}{num(inc, setInc, "st-inc", "Increase per stage")}{num(days, setDays, "st-days", "Days per stage")}</div>
      {steady < start ? <p className="sv-hint" style={{ color: "var(--ds-red-text)", margin: 0 }}>Steady state must be at least the start limit.</p> : null}
      <TargetPicker domains={domains} target={target} onChange={setTarget} />
    </Modal>
  );
}

function AiModal({ domains, onClose, onUse }: { domains: Domain[]; onClose: () => void; onUse: (schedule: AiRampSchedule) => void }) {
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [schedule, setSchedule] = useState<AiRampSchedule | null>(null);
  async function run() {
    setBusy(true); setError("");
    try { setSchedule(await warmupService.generateAiSchedule(domain ? { domain } : {})); } catch (caught) { setError(errorText(caught)); } finally { setBusy(false); }
  }
  return (
    <Modal open title="Suggest a warm-up schedule" onClose={onClose} footer={schedule ? <><Button onClick={() => setSchedule(null)}>Try again</Button><Button variant="primary" onClick={() => onUse(schedule)}>Use this schedule</Button></> : <><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={Sparkles} disabled={busy} onClick={() => void run()}>{busy ? "Thinking…" : "Suggest"}</Button></>}>
      <Banner error={error} />
      {schedule ? (
        <>
          <p style={{ marginTop: 0 }}>Start at <b>{schedule.startDailyLimit}</b> a day, add <b>{schedule.incrementPerStage}</b> every <b>{schedule.stageDurationDays}</b> day{schedule.stageDurationDays === 1 ? "" : "s"}, up to <b>{schedule.steadyStateDailyLimit}</b> a day.</p>
          {schedule.rationale ? <p className="sv-hint">{schedule.rationale}</p> : null}
          <ul style={{ margin: 0, paddingLeft: 18 }}>{schedule.weeklySchedule.map((w) => <li key={w.label}><b>{w.label}</b>: {w.range}</li>)}</ul>
        </>
      ) : (
        <>
          <p className="sv-hint" style={{ marginTop: 0 }}>The AI looks at the age and health of the inboxes and suggests a ramp. You review it before anything is saved.</p>
          <Field label="Look at" htmlFor="ai-domain"><select id="ai-domain" className="sv-select" value={domain} onChange={(event) => setDomain(event.target.value)}><option value="">All my inboxes</option>{domains.map((d) => <option key={d.id} value={d.domain}>{d.domain}</option>)}</select></Field>
        </>
      )}
    </Modal>
  );
}

/** Sending reputation over time, and which domains and inboxes need attention. */
export function HealthPanel() {
  const [days, setDays] = useState(14);
  const trend = useRemote<ReputationTrendPoint[]>(() => domainService.getReputationTrend({ days }), [days]);
  const domains = useRemote(() => domainService.list({ limit: 200 }), []);
  const data = trend.data ?? [];
  const risky = (domains.data?.items ?? []).filter((d: Domain) => d.status === "Failed" || d.spfStatus === "Failed" || d.dkimStatus === "Failed" || d.dmarcStatus === "Failed" || (d.bounceRate ?? 0) >= 2 || (d.complaintRate ?? 0) >= 0.1);
  const totals = data.reduce((a, p) => a + p.sentVolume, 0);
  return (
    <div className="sv-stack">
      <Banner error={trend.error || domains.error} />
      <Card className="sv-pad">
        <div className="sv-page-head" style={{ margin: 0 }}>
          <div><h3 className="sv-set-title" style={{ margin: 0 }}>Sending reputation</h3><p className="sv-hint" style={{ margin: 0 }}>{totals.toLocaleString()} emails sent in the last {days} days. Keep bounces under 2% and complaints under 0.1%.</p></div>
          <select className="sv-select" aria-label="Period" style={{ width: 130 }} value={days} onChange={(event) => setDays(Number(event.target.value))}>{[7, 14, 30].map((d) => <option key={d} value={d}>Last {d} days</option>)}</select>
        </div>
        <AreaChart data={data.map((p) => ({ date: p.date, bounce: p.bounceRate, complaints: p.complaintRate }))} series={[{ key: "bounce", label: "Bounce rate %", color: "var(--ds-red-text)" }, { key: "complaints", label: "Complaint rate %", color: "var(--ds-orange-text)" }]} height={220} />
      </Card>
      <Card className="sv-pad">
        <h3 className="sv-set-title" style={{ marginTop: 0 }}>Domains that need attention</h3>
        {domains.data && risky.length === 0 ? <p className="sv-hint" style={{ margin: 0 }}>All domains look healthy.</p> : null}
        <div className="sv-stack" style={{ gap: 8 }}>
          {risky.map((d) => (
            <div key={d.id} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <b>{d.domain}</b><Badge tone={d.status === "Verified" ? "green" : "red"}>{d.status}</Badge>
              <span className="sv-hint">SPF {d.spfStatus} · DKIM {d.dkimStatus} · DMARC {d.dmarcStatus} · bounce {d.bounceRate ?? "—"}% · complaints {d.complaintRate ?? "—"}% · checked {formatDate(d.lastCheckedAt)}</span>
              {d.lastError ? <span className="sv-hint" style={{ color: "var(--ds-red-text)" }}>{d.lastError}</span> : null}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}


