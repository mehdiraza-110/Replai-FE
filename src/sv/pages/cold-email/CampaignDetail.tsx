import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Calendar, ChevronLeft, FileUp, Lightbulb, Mail, Pause, Phone, Play, Plus, Search, Settings as SettingsIcon, ThumbsUp, Trash2, TrendingUp, Users } from "lucide-react";
import { RichTextEditor } from "../../../components/ui/RichTextEditor";
import { campaignService, mailboxService } from "../../../services/api";
import type { CampaignDetail as CampaignDetailType, CampaignLeadsPage, LeadFileParseResult, Mailbox } from "../../../types";
import { campaignInsightsApi, type CampaignAnalytics } from "../../api/campaigns";
import { useSvTitle } from "../../layout/chrome";
import { svPath } from "../../nav";
import { AreaChart } from "../../ui/AreaChart";
import { Badge, type BadgeTone, Button, Card, Checkbox, EmptyState, Field, Menu, Modal } from "../../ui";
import { DAYS, errorText, MERGE_VARIABLES, pctText, STATUS_TONE } from "./shared";

type Tab = "analytics" | "leads" | "sequences" | "options";
const TABS: Array<{ id: Tab; label: string; icon: typeof TrendingUp }> = [
  { id: "analytics", label: "Analytics", icon: TrendingUp },
  { id: "leads", label: "Leads", icon: Users },
  { id: "sequences", label: "Sequences", icon: Mail },
  { id: "options", label: "Options", icon: SettingsIcon },
];
const SERIES = [
  { key: "contacted", label: "Contacted", color: "#4ea1d4" },
  { key: "replied", label: "Replied", color: "#e8863a" },
  { key: "positive", label: "Positive", color: "#2d8a5f" },
];

function Notice({ error, notice }: { error: string; notice: string }) {
  return (
    <>
      {error ? <p className="sv-banner is-error" role="alert" style={{ margin: "0 0 16px" }}>{error}</p> : null}
      {notice ? <p className="sv-banner is-ok" role="status" style={{ margin: "0 0 16px" }}>{notice}</p> : null}
    </>
  );
}

// ---------------------------------------------------------------- analytics

function TargetStat({ icon: Icon, label, value, rate, target, onTarget, hint, progress }: { icon: typeof Users; label: string; value: string; rate?: string; target?: number; onTarget?: (next: number) => void; hint?: string; progress?: number }) {
  const [draft, setDraft] = useState(target === undefined ? "" : String(target));
  useEffect(() => setDraft(target === undefined ? "" : String(target)), [target]);
  return (
    <Card className="sv-stat" >
      <div className="sv-stat-top">
        <span className="sv-stat-label" title={hint}>{label}</span>
        <Icon className="sv-icon" aria-hidden />
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span className="sv-stat-value">{value}</span>
        {rate ? <span className="sv-hint" style={{ fontSize: 14 }}>{rate}</span> : null}
        {target !== undefined && onTarget ? (
          <label className="sv-hint" style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6 }}>
            target:
            <input
              className="sv-input"
              style={{ width: 72, height: 28, padding: "0 8px" }}
              inputMode="decimal"
              aria-label={`${label} target percent`}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={() => { const next = Number(draft); if (Number.isFinite(next) && next >= 0 && next <= 100 && next !== target) onTarget(next); else setDraft(String(target)); }}
              onKeyDown={(event) => event.key === "Enter" && (event.target as HTMLInputElement).blur()}
            />
            %
          </label>
        ) : null}
      </div>
      {progress !== undefined ? <div className="sv-progress" aria-hidden><span style={{ width: `${Math.min(100, progress)}%` }} /></div> : null}
    </Card>
  );
}

function AnalyticsTab({ id }: { id: number }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<CampaignAnalytics | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(() => campaignInsightsApi.analytics(id, days).then((next) => { setData(next); setError(""); }).catch((caught) => setError(errorText(caught))), [id, days]);
  useEffect(() => { void load(); }, [load]);

  async function saveTargets(patch: Partial<{ positiveRate: number; bookedRate: number }>) {
    if (!data) return;
    setNotice("");
    try {
      await campaignInsightsApi.saveTargets(id, { positiveRate: data.targets.positiveRate, bookedRate: data.targets.bookedRate, ...patch });
      setNotice("Target saved.");
      await load();
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  if (!data) return <p className={error ? "sv-banner is-error" : "sv-hint"}>{error || "Loading…"}</p>;
  const uploadedPct = data.leadsUploaded > 0 ? (Math.min(data.leadsContacted, data.leadsUploaded) / data.leadsUploaded) * 100 : 0;

  return (
    <>
      <Notice error={error} notice={notice} />
      <div className="sv-stats" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        <TargetStat icon={Users} label="Leads Contacted" value={data.leadsContacted.toLocaleString()} rate={`/ ${data.leadsUploaded.toLocaleString()} leads uploaded`} progress={uploadedPct} hint="Emails sent, out of the leads you uploaded" />
        <TargetStat icon={Mail} label="Replies" value={data.replies.toLocaleString()} rate={pctText(data.replyRate)} hint="Replies as a share of emails sent" />
        <TargetStat icon={ThumbsUp} label="Positive Replies" value={data.positiveReplies.toLocaleString()} rate={pctText(data.positiveReplyRate)} target={data.targets.positiveRate} onTarget={(positiveRate) => void saveTargets({ positiveRate })} progress={data.targets.positiveRate > 0 ? (data.positiveReplyRate / data.targets.positiveRate) * 100 : 0} hint="Replies the AI SDR scored as high or very high interest" />
        <TargetStat icon={Phone} label="Booked Calls" value={data.bookedCalls.toLocaleString()} rate={pctText(data.bookedCallRate)} target={data.targets.bookedRate} onTarget={(bookedRate) => void saveTargets({ bookedRate })} progress={data.targets.bookedRate > 0 ? (data.bookedCallRate / data.targets.bookedRate) * 100 : 0} hint="Share of positive replies that became a booked call" />
      </div>

      <h2 className="sv-set-title" style={{ margin: "20px 0 8px" }}>Delivery</h2>
      <div className="sv-stats" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        <TargetStat icon={Mail} label="Delivered" value={data.delivery.delivered.toLocaleString()} rate={`of ${data.delivery.sent.toLocaleString()} sent`} hint="Emails that were accepted and did not bounce" />
        <TargetStat icon={Mail} label="Bounced" value={data.delivery.bounced.toLocaleString()} rate={pctText(data.delivery.bounceRate)} hint="Emails that came back undeliverable. Keep this under 2%." />
        <TargetStat icon={Users} label="Still to send" value={data.delivery.pending.toLocaleString()} rate={`${data.delivery.suppressed.toLocaleString()} skipped (unsubscribed or blocked)${data.delivery.failed ? `, ${data.delivery.failed.toLocaleString()} failed` : ""}`} hint="Leads that have not been emailed yet" />
        <TargetStat icon={ThumbsUp} label="Inbox placement" value={data.placement ? pctText(data.placement.inboxRate) : "Not measured"} rate={data.placement ? `${data.placement.spam} of ${data.placement.tests} test emails went to spam` : "Needs warm-up tests"} hint="Whether emails land in the inbox or in spam can't be seen for real recipients. This comes from our warm-up test emails sent from the same inboxes to monitored accounts." />
      </div>
      {data.byInbox.length ? (
        <Card className="sv-pad">
          <h2 className="sv-set-title" style={{ marginBottom: 12 }}>By inbox</h2>
          <div className="sv-table-wrap">
            <table className="sv-table">
              <thead><tr><th>Inbox</th><th className="is-num">Sent</th><th className="is-num">Bounced</th><th className="is-num">Replies</th></tr></thead>
              <tbody>{data.byInbox.map((b) => <tr key={b.id}><td>{b.email}</td><td className="is-num">{b.sent.toLocaleString()}</td><td className="is-num">{b.bounced.toLocaleString()} <span className="sv-hint">| {pctText(b.bounceRate)}</span></td><td className="is-num">{b.replied.toLocaleString()} <span className="sv-hint">| {pctText(b.replyRate)}</span></td></tr>)}</tbody>
            </table>
          </div>
        </Card>
      ) : null}

      <Card className="sv-pad" >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <h2 className="sv-set-title">Campaign Performance Trend</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {SERIES.map((s) => <span key={s.key} className="sv-hint" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><i style={{ width: 8, height: 8, borderRadius: 999, background: s.color, display: "inline-block" }} /> {s.label}</span>)}
            <Menu className="sv-filter" trigger={<><Calendar className="sv-icon" aria-hidden /> Last {days} days</>} items={[7, 30, 90].map((value) => ({ label: `Last ${value} days`, selected: days === value, onSelect: () => setDays(value) }))} align="right" label="Chart range" />
          </div>
        </div>
        <AreaChart data={data.series} series={SERIES} />
      </Card>

      <Card className="sv-pad">
        <h2 className="sv-set-title" style={{ marginBottom: 12 }}>Sequence steps</h2>
        <div className="sv-table-wrap">
          <table className="sv-table">
            <thead><tr><th>Step</th><th>Variant</th><th className="is-num">Sent</th></tr></thead>
            <tbody>
              {data.steps.map((step) => <tr key={step.step}><td>Step {step.step} <span className="sv-hint">· {step.label}</span></td><td>A</td><td className="is-num">{step.sent.toLocaleString()}</td></tr>)}
              <tr><td style={{ fontWeight: 600 }}>Total emails sent</td><td /><td className="is-num" style={{ fontWeight: 600 }}>{data.leadsContacted.toLocaleString()}</td></tr>
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------- leads

const LEAD_STATUSES = ["Pending", "Sent", "Replied", "Bounced", "Suppressed", "Failed"];

/** Lead statuses at runtime are broader than the shared type lists. */
const leadTone = (status: string): BadgeTone => (status === "Replied" ? "green" : status === "Bounced" || status === "Failed" ? "red" : status === "Suppressed" ? "yellow" : "neutral");

function LeadsTab({ id, onChanged }: { id: number; onChanged: () => void }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<CampaignLeadsPage | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [parsed, setParsed] = useState<LeadFileParseResult | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { const t = window.setTimeout(() => { setSearch(searchText); setPage(1); }, 300); return () => window.clearTimeout(t); }, [searchText]);
  useEffect(() => {
    let cancelled = false;
    campaignService.listLeads(id, { page, status, search }).then((next) => !cancelled && setData(next)).catch((caught) => !cancelled && setError(errorText(caught)));
    return () => { cancelled = true; };
  }, [id, page, status, search, version]);

  async function upload(file: File) {
    setBusy(true);
    setError("");
    try {
      setParsed(await campaignService.parseLeadsFile(file));
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  async function confirmAdd() {
    if (!parsed) return;
    setBusy(true);
    try {
      const result = await campaignService.addLeads(id, { leads: parsed.leads });
      setNotice(`${result.added} lead${result.added === 1 ? "" : "s"} added${result.suppressed ? `, ${result.suppressed} skipped because they unsubscribed or bounced before` : ""}.`);
      setParsed(null);
      setVersion((v) => v + 1);
      onChanged();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  async function removeSelected() {
    setBusy(true);
    try {
      const result = await campaignService.removeLeads(id, { ids: Array.from(selected) });
      setNotice(`${result.removed} lead${result.removed === 1 ? "" : "s"} removed.`);
      setSelected(new Set());
      setVersion((v) => v + 1);
      onChanged();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  const items = data?.items ?? [];
  return (
    <>
      <Notice error={error} notice={notice} />
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <Menu className="sv-filter" trigger={<>{status || "Status"}</>} items={[{ label: "All statuses", selected: !status, onSelect: () => { setStatus(""); setPage(1); } }, ...LEAD_STATUSES.map((value) => ({ label: value, selected: status === value, onSelect: () => { setStatus(value); setPage(1); } }))]} label="Filter leads by status" />
        <label className="sv-settings-search" style={{ margin: 0, width: 260, height: 36 }}>
          <Search className="sv-icon" aria-hidden />
          <input placeholder="Search leads…" aria-label="Search leads" value={searchText} onChange={(event) => setSearchText(event.target.value)} />
        </label>
        <div style={{ flex: 1 }} />
        {selected.size > 0 ? <Button variant="danger" icon={Trash2} disabled={busy} onClick={() => void removeSelected()}>Remove {selected.size}</Button> : null}
        <Button icon={FileUp} disabled={busy} onClick={() => fileRef.current?.click()}>Add leads from CSV</Button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ""; }} />
      </div>
      <Card>
        <div className="sv-table-wrap">
          <table className="sv-table">
            <thead><tr><th style={{ width: 36 }}><Checkbox checked={items.length > 0 && items.every((l) => selected.has(l.id))} onChange={(next) => setSelected(next ? new Set(items.map((l) => l.id)) : new Set())} label="Select all leads" /></th><th>Name</th><th>Email</th><th>Company</th><th>Role</th><th>Status</th></tr></thead>
            <tbody>
              {!data ? <tr><td colSpan={6} className="sv-hint" style={{ padding: 20 }}>Loading…</td></tr> : null}
              {data && items.length === 0 ? <tr><td colSpan={6} className="sv-hint" style={{ padding: 20 }}>No leads match.</td></tr> : null}
              {items.map((lead) => (
                <tr key={lead.id}>
                  <td><Checkbox checked={selected.has(lead.id)} onChange={(next) => setSelected((current) => { const copy = new Set(current); if (next) copy.add(lead.id); else copy.delete(lead.id); return copy; })} label={`Select ${lead.email}`} /></td>
                  <td>{lead.fullName || [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "—"}</td>
                  <td>{lead.email}</td>
                  <td>{lead.company || "—"}</td>
                  <td>{lead.role || "—"}</td>
                  <td><Badge tone={leadTone(String(lead.status))}>{String(lead.status)}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {data ? (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
          <span className="sv-hint">{data.total} lead{data.total === 1 ? "" : "s"}</span>
          <span className="sv-actions"><Button size="sm" disabled={page <= 1} onClick={() => setPage((c) => c - 1)}>Previous</Button><Button size="sm" disabled={page >= data.totalPages} onClick={() => setPage((c) => c + 1)}>Next</Button></span>
        </div>
      ) : null}
      <Modal
        open={parsed !== null}
        title="Add leads from CSV"
        onClose={() => setParsed(null)}
        footer={<><Button onClick={() => setParsed(null)}>Cancel</Button><Button variant="primary" disabled={busy || !parsed || parsed.validCount === 0} onClick={() => void confirmAdd()}>Add {parsed?.validCount ?? 0} leads</Button></>}
      >
        {parsed ? (
          <>
            <p style={{ margin: 0 }}><b>{parsed.validCount}</b> valid, {parsed.invalidCount} invalid, {parsed.duplicateCount} duplicate (of {parsed.totalRows} rows).</p>
            <p className="sv-hint">Leads who unsubscribed or bounced before are skipped automatically.</p>
          </>
        ) : null}
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------- sequences

interface StepDraft { key: number; delayDays: number; body: string }

function SequencesTab({ detail, onSaved }: { detail: CampaignDetailType; onSaved: () => void }) {
  const [subject, setSubject] = useState(detail.subject);
  const [body, setBody] = useState(detail.body);
  const [followUps, setFollowUps] = useState<StepDraft[]>(detail.followUps.map((f, i) => ({ key: i, delayDays: f.delayDays, body: f.body })));
  const [nextKey, setNextKey] = useState(detail.followUps.length);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const subjectRef = useRef<HTMLInputElement>(null);

  const initial = useMemo(() => JSON.stringify({ subject: detail.subject, body: detail.body, f: detail.followUps.map((f) => [f.delayDays, f.body]) }), [detail]);
  const current = JSON.stringify({ subject, body, f: followUps.map((f) => [f.delayDays, f.body]) });
  const dirty = current !== initial;

  function insertInSubject(key: string) {
    const input = subjectRef.current;
    const token = `{{${key}}}`;
    const start = input?.selectionStart ?? subject.length;
    const end = input?.selectionEnd ?? subject.length;
    setSubject(subject.slice(0, start) + token + subject.slice(end));
  }

  async function save() {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await campaignService.update(detail.id, { subject, body, followUps: followUps.filter((f) => f.body.replace(/<[^>]*>/g, "").trim()).map((f) => ({ delayDays: f.delayDays, body: f.body })) });
      setNotice("Sequence saved. Changes apply to the next send; emails already sent are not changed.");
      onSaved();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Notice error={error} notice={notice} />
      <Card className="sv-pad">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="sv-set-title">Step 1 <span className="sv-hint">· Initial outreach</span></h2>
          <Menu className="sv-filter" trigger={<>Variables</>} items={MERGE_VARIABLES.map((v) => ({ label: `${v.label}  {{${v.key}}}`, onSelect: () => insertInSubject(v.key) }))} align="right" label="Insert a variable into the subject" />
        </div>
        <Field label="Subject" htmlFor="seq-subject"><input id="seq-subject" ref={subjectRef} className="sv-input" value={subject} onChange={(event) => setSubject(event.target.value)} /></Field>
        <Field label="Email"><RichTextEditor value={body} onChange={setBody} ariaLabel="Email body" variables={MERGE_VARIABLES} resetKey={detail.id} /></Field>
      </Card>
      {followUps.map((step, index) => (
        <Card key={step.key} className="sv-pad">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <h2 className="sv-set-title">Step {index + 2} <span className="sv-hint">· Follow-up {index + 1}</span></h2>
            <div className="sv-actions">
              <label className="sv-hint" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                Wait
                <input type="number" min={1} max={60} className="sv-input" style={{ width: 70, height: 30 }} aria-label={`Days before follow-up ${index + 1}`} value={step.delayDays} onChange={(event) => setFollowUps(followUps.map((f) => (f.key === step.key ? { ...f, delayDays: Math.max(1, Number(event.target.value) || 1) } : f)))} />
                days
              </label>
              <button type="button" className="sv-icon-btn" aria-label={`Remove follow-up ${index + 1}`} onClick={() => setFollowUps(followUps.filter((f) => f.key !== step.key))}><Trash2 className="sv-icon" aria-hidden /></button>
            </div>
          </div>
          <p className="sv-hint">Sent in the same thread as a reply to your first email, only if they have not answered.</p>
          <RichTextEditor value={step.body} onChange={(html) => setFollowUps((list) => list.map((f) => (f.key === step.key ? { ...f, body: html } : f)))} ariaLabel={`Follow-up ${index + 1} body`} variables={MERGE_VARIABLES} resetKey={`${detail.id}-${step.key}`} />
        </Card>
      ))}
      <div><Button icon={Plus} onClick={() => { setFollowUps([...followUps, { key: nextKey, delayDays: 3, body: "" }]); setNextKey(nextKey + 1); }}>Add follow-up</Button></div>
      <div className="sv-savebar">
        <span>{dirty ? "You have unsaved changes." : "Sequence is up to date."}</span>
        <Button variant="primary" disabled={!dirty || saving || !subject.trim()} onClick={() => void save()}>{saving ? "Saving…" : "Save"}</Button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- options

function OptionsTab({ detail, onSaved }: { detail: CampaignDetailType; onSaved: () => void }) {
  const [days, setDays] = useState<string[]>(detail.sendingDays);
  const [windowStart, setWindowStart] = useState(detail.windowStart);
  const [windowEnd, setWindowEnd] = useState(detail.windowEnd);
  const [timezone, setTimezone] = useState(detail.timezone);
  const [limit, setLimit] = useState(detail.dailyLimitOverride ? String(detail.dailyLimitOverride) : "");
  const [mode, setMode] = useState(detail.mailboxMode);
  const [mailboxIds, setMailboxIds] = useState<number[]>(detail.mailboxIds);
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { mailboxService.list({ page: 1, limit: 100 }).then((page) => setMailboxes(page.items)).catch(() => undefined); }, []);

  const zones = useMemo(() => { const list = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : ["UTC"]; return list.includes(timezone) ? list : [timezone, ...list]; }, [timezone]);
  const initial = JSON.stringify([detail.sendingDays, detail.windowStart, detail.windowEnd, detail.timezone, detail.dailyLimitOverride ? String(detail.dailyLimitOverride) : "", detail.mailboxMode, detail.mailboxIds]);
  const dirty = JSON.stringify([days, windowStart, windowEnd, timezone, limit, mode, mailboxIds]) !== initial;

  async function save() {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await campaignService.update(detail.id, { sendingDays: days, windowStart, windowEnd, timezone, dailyLimitOverride: limit.trim() ? Number(limit) : null, mailboxMode: mode, mailboxIds: mode === "specific" ? mailboxIds : [] });
      setNotice("Options saved. They apply from the next send.");
      onSaved();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Notice error={error} notice={notice} />
      <Card className="sv-pad">
        <h2 className="sv-set-title">Sending schedule</h2>
        <p className="sv-set-desc">Emails go out only on these days and between these hours. This does not affect when meetings can be booked.</p>
        <div className="sv-chips" style={{ marginTop: 12 }}>
          {DAYS.map((day) => (
            <button key={day} type="button" aria-pressed={days.includes(day)} className={`sv-btn is-sm${days.includes(day) ? " is-primary" : ""}`} onClick={() => setDays(days.includes(day) ? days.filter((d) => d !== day) : [...days, day])}>{day}</button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 16, marginTop: 16 }}>
          <Field label="From" htmlFor="opt-from"><input id="opt-from" type="time" className="sv-input" value={windowStart} onChange={(event) => setWindowStart(event.target.value)} /></Field>
          <Field label="To" htmlFor="opt-to"><input id="opt-to" type="time" className="sv-input" value={windowEnd} onChange={(event) => setWindowEnd(event.target.value)} /></Field>
          <Field label="Time zone" htmlFor="opt-tz"><select id="opt-tz" className="sv-select" value={timezone} onChange={(event) => setTimezone(event.target.value)}>{zones.map((zone) => <option key={zone} value={zone}>{zone.replace(/_/g, " ")}</option>)}</select></Field>
        </div>
        <Field label="Daily limit for this campaign (optional)" htmlFor="opt-limit">
          <input id="opt-limit" className="sv-input" inputMode="numeric" placeholder="Use each inbox's own daily limit" value={limit} onChange={(event) => setLimit(event.target.value.replace(/\D/g, ""))} />
        </Field>
      </Card>
      <Card className="sv-pad">
        <h2 className="sv-set-title">Email accounts</h2>
        <p className="sv-set-desc">Which inboxes send this campaign.</p>
        <div className="sv-chips" style={{ margin: "12px 0" }}>
          <button type="button" className={`sv-btn is-sm${mode === "all" ? " is-primary" : ""}`} aria-pressed={mode === "all"} onClick={() => setMode("all")}>All inboxes</button>
          <button type="button" className={`sv-btn is-sm${mode === "specific" ? " is-primary" : ""}`} aria-pressed={mode === "specific"} onClick={() => setMode("specific")}>Choose inboxes</button>
        </div>
        {mode === "specific" ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {mailboxes.map((box) => (
              <label key={box.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid var(--ds-border)" }}>
                <Checkbox checked={mailboxIds.includes(box.id)} onChange={(next) => setMailboxIds(next ? [...mailboxIds, box.id] : mailboxIds.filter((id) => id !== box.id))} label={`Use ${box.email}`} />
                <span style={{ flex: 1 }}>{box.email}</span>
                <Badge tone={box.status === "Active" ? "green" : "yellow"}>{box.warmupStage}</Badge>
              </label>
            ))}
            {mailboxes.length === 0 ? <p className="sv-hint">No inboxes yet.</p> : null}
          </div>
        ) : null}
      </Card>
      <div className="sv-savebar">
        <span>{dirty ? "You have unsaved changes." : "Options are up to date."}</span>
        <Button variant="primary" disabled={!dirty || saving || days.length === 0 || (mode === "specific" && mailboxIds.length === 0)} onClick={() => void save()}>{saving ? "Saving…" : "Save"}</Button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- page

export function CampaignDetail() {
  const { id: rawId } = useParams();
  const id = Number(rawId);
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.id === params.get("tab"))?.id ?? "analytics") as Tab;
  const [detail, setDetail] = useState<CampaignDetailType | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);

  useSvTitle([{ label: "Cold Email Agent" }, { label: detail?.name ?? "Campaign" }]);

  useEffect(() => {
    let cancelled = false;
    campaignService.get(id).then((next) => !cancelled && setDetail(next)).catch((caught) => !cancelled && setError(errorText(caught)));
    return () => { cancelled = true; };
  }, [id, version]);

  async function toggle() {
    if (!detail) return;
    setBusy(true);
    try {
      await campaignService.update(detail.id, { status: detail.status === "Active" ? "Paused" : "Active" });
      setVersion((v) => v + 1);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  if (!Number.isInteger(id) || id <= 0) return <div className="sv-page"><EmptyState title="Campaign not found" /></div>;
  if (!detail) {
    return (
      <div className="sv-page">
        <Link className="sv-link" to={svPath("cold-email-campaign-agent")} style={{ display: "inline-flex", gap: 4, marginBottom: 16 }}><ChevronLeft className="sv-icon" aria-hidden /> All campaigns</Link>
        {error ? <p className="sv-banner is-error" role="alert">{error}</p> : <p className="sv-hint">Loading…</p>}
      </div>
    );
  }
  const running = detail.status === "Active";

  return (
    <div className="sv-page">
      <div className="sv-page-head" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h1 className="sv-h1">{detail.name}</h1>
          <Badge tone={STATUS_TONE[detail.status]}>{detail.status}</Badge>
        </div>
        <div className="sv-actions">
          <Button variant={running ? "primary" : "default"} icon={running ? Pause : Play} disabled={busy} onClick={() => void toggle()}>{running ? "Pause campaign" : detail.status === "Draft" ? "Launch campaign" : "Resume campaign"}</Button>
        </div>
      </div>
      <nav className="sv-tabs" aria-label="Campaign sections" style={{ marginBottom: 20 }}>
        {TABS.map((item) => (
          <button key={item.id} type="button" className={`sv-tab${tab === item.id ? " is-active" : ""}`} aria-current={tab === item.id ? "page" : undefined} onClick={() => setParams({ tab: item.id }, { replace: true })}>
            <item.icon className="sv-icon" aria-hidden /> {item.label}
          </button>
        ))}
      </nav>
      {error ? <p className="sv-banner is-error" role="alert" style={{ marginBottom: 16 }}>{error}</p> : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {tab === "analytics" ? <AnalyticsTab id={id} /> : null}
        {tab === "leads" ? <LeadsTab id={id} onChanged={() => setVersion((v) => v + 1)} /> : null}
        {tab === "sequences" ? <SequencesTab key={detail.id} detail={detail} onSaved={() => setVersion((v) => v + 1)} /> : null}
        {tab === "options" ? <OptionsTab key={detail.id} detail={detail} onSaved={() => setVersion((v) => v + 1)} /> : null}
      </div>
      <p className="sv-hint" style={{ marginTop: 24, display: "flex", gap: 6, alignItems: "center" }}><Lightbulb className="sv-icon" aria-hidden /> Replies to this campaign land in the AI SDR Inbox, where the AI SDR handles them.</p>
    </div>
  );
}
