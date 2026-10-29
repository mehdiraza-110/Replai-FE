import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, ChevronDown, Copy, FileText, MoreHorizontal, PhoneCall, Radio, RefreshCw, Settings as SettingsIcon, Trash2, Upload } from "lucide-react";
import { aiApi, type Call, type CallType, type Stage } from "../../api/ai";
import { useSvTitle } from "../../layout/chrome";
import { svPath } from "../../nav";
import { Badge, Button, Card, EmptyState, Field, Menu, Modal, PageHeader } from "../../ui";
import { errorText, formatDate } from "../cold-email/shared";
import { Banner, Pager, SearchBox, TableCard, useDebounced, useRemote } from "../crm/shared";
import { ScoreChip, StatusBadge, readTextFile, scoreTone, useCopy, usePolling, when } from "./shared";

const TYPES: Array<{ value: CallType; label: string }> = [{ value: "discovery", label: "Discovery Call" }, { value: "sales", label: "Sales Call" }, { value: "interview", label: "Interview Call" }, { value: "podcast", label: "Podcast Call" }];
const BASE = "sales-call-analysis";

function NewCallModal({ onClose, onCreated }: { onClose: () => void; onCreated: (call: Call) => void }) {
  const [mode, setMode] = useState<"choose" | "review">("choose");
  const [type, setType] = useState<CallType>("discovery");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [date, setDate] = useState("");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    try { setTranscript(await readTextFile(file)); setError(""); } catch (caught) { setError(errorText(caught)); }
  }
  async function submit() {
    setBusy(true); setError("");
    try { onCreated(await aiApi.createCall({ type, prospectName: name, prospectEmail: email, company, role, callDate: date, transcript })); onClose(); } catch (caught) { setError(errorText(caught)); setBusy(false); }
  }

  if (mode === "choose") {
    return (
      <Modal open title="How would you like to analyze your sales call?" onClose={onClose} footer={<Button onClick={onClose}>Close</Button>}>
        <p className="sv-hint" style={{ marginTop: 0 }}>Choose the option that best fits your needs</p>
        <div className="sv-choice-list">
          <button type="button" className="sv-choice" onClick={() => setMode("review")}>
            <FileText className="sv-icon" aria-hidden />
            <span><strong>Review an existing call transcript</strong><span className="sv-hint">Best if the call has already happened and you want in-depth feedback</span></span>
          </button>
          <button type="button" className="sv-choice" disabled aria-disabled="true">
            <Radio className="sv-icon" aria-hidden />
            <span><strong>Join the call live <Badge>Not available yet</Badge></strong><span className="sv-hint">Real-time AI coaching during the call isn't available yet</span></span>
          </button>
        </div>
        <p className="sv-hint" style={{ marginBottom: 0 }}>Audio and video recordings can't be transcribed yet. Paste or upload the transcript from your recording tool.</p>
      </Modal>
    );
  }
  return (
    <Modal open title="Review an existing call" onClose={onClose} footer={<><Button onClick={() => setMode("choose")}>Back</Button><Button variant="primary" disabled={busy || transcript.trim().length < 300} onClick={() => void submit()}>{busy ? "Submitting…" : "Analyze call"}</Button></>}>
      <Banner error={error} />
      <Field label="Call type" htmlFor="call-type"><select id="call-type" className="sv-select" value={type} onChange={(event) => setType(event.target.value as CallType)}>{TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
      <div className="sv-grid-2">
        <Field label="Prospect name" htmlFor="call-name"><input id="call-name" className="sv-input" value={name} onChange={(event) => setName(event.target.value)} /></Field>
        <Field label="Prospect email" htmlFor="call-email"><input id="call-email" type="email" className="sv-input" value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
        <Field label="Company" htmlFor="call-company"><input id="call-company" className="sv-input" value={company} onChange={(event) => setCompany(event.target.value)} /></Field>
        <Field label="Their role" htmlFor="call-role"><input id="call-role" className="sv-input" value={role} onChange={(event) => setRole(event.target.value)} /></Field>
      </div>
      <Field label="Call date" htmlFor="call-date"><input id="call-date" type="date" className="sv-input" value={date} onChange={(event) => setDate(event.target.value)} /></Field>
      <Field label="Transcript" htmlFor="call-transcript">
        <textarea id="call-transcript" className="sv-textarea" style={{ minHeight: 160, fontFamily: "ui-monospace, monospace", fontSize: 12 }} placeholder={"Host: Hi Kent, thanks for joining.\nKent: Happy to be here."} value={transcript} onChange={(event) => setTranscript(event.target.value)} />
      </Field>
      <div className="sv-actions" style={{ justifyContent: "space-between" }}>
        <span className="sv-hint">{transcript.length.toLocaleString()} / 300,000 characters (300 minimum). Speaker labels required, for example "Host:" and "Prospect:".</span>
        <span>
          <input ref={fileRef} type="file" accept=".txt,.md,.vtt,.srt,text/plain" hidden onChange={(event) => { void pick(event.target.files?.[0]); event.target.value = ""; }} />
          <Button size="sm" icon={Upload} onClick={() => fileRef.current?.click()}>Upload transcript</Button>
        </span>
      </div>
    </Modal>
  );
}

export function CallsList() {
  useSvTitle([{ label: "Sales Call Analyzer" }]);
  const navigate = useNavigate();
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const q = useDebounced(search);
  const calls = useRemote(() => aiApi.calls({ type, status, search: q, page }), [type, status, q, page]);
  usePolling(Boolean(calls.data?.items.some((c) => c.status === "processing")), calls.reload);

  async function remove(call: Call) {
    if (!window.confirm(`Delete the call with ${call.prospectName || "this prospect"}? This can't be undone.`)) return;
    try { await aiApi.deleteCall(call.id); calls.reload(); } catch (caught) { setError(errorText(caught)); }
  }
  const data = calls.data;
  return (
    <div className="sv-page">
      <PageHeader title="Sales Calls" subtitle="View and manage your AI-analyzed sales calls" actions={<><Button icon={SettingsIcon} onClick={() => navigate(svPath("settings/sales-call-analyzer"))}>Settings</Button><Button variant="primary" icon={PhoneCall} onClick={() => setCreating(true)}>New Call</Button></>} />
      <Banner error={error || calls.error} />
      <div className="sv-type-cards">
        {(data?.types ?? []).map((t) => (
          <Card key={t.type} className="sv-pad">
            <p className="sv-hint" style={{ margin: 0 }}>{t.label}s</p>
            {t.enough ? <><p className="sv-type-score">{t.average?.toFixed(1)}<span>/10 average</span></p><p className="sv-hint" style={{ margin: 0 }}>{t.calls} calls · latest {t.latest?.toFixed(1)}</p></> : <><p className="sv-type-score is-empty">No Data Yet</p><p className="sv-hint" style={{ margin: 0 }}>Need at least 2 calls ({t.calls} so far)</p></>}
          </Card>
        ))}
      </div>
      <div className="sv-toolbar">
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search prospects…" />
        <select className="sv-select" aria-label="Type" style={{ width: 160 }} value={type} onChange={(event) => { setType(event.target.value); setPage(1); }}><option value="">All types</option>{TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
        <select className="sv-select" aria-label="Status" style={{ width: 150 }} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">All statuses</option><option value="completed">Completed</option><option value="processing">Analyzing</option><option value="failed">Failed</option></select>
      </div>
      <TableCard head={<><th>Meeting/Call</th><th>Status</th><th>Date</th><th>Score</th><th>Insights</th><th style={{ width: 48 }} /></>} empty={data && data.items.length === 0 ? (type || status || q ? "No calls match these filters." : "No calls yet. Click New Call to analyze your first one.") : undefined}>
        {data?.items.map((c) => (
          <tr key={c.id}>
            <td><Link className="sv-link" style={{ fontWeight: 500 }} to={svPath(`${BASE}/${c.id}`)}>{c.prospectName || "Unnamed prospect"}</Link><div className="sv-hint">{[c.company, c.typeLabel].filter(Boolean).join(" | ")}</div></td>
            <td><StatusBadge status={c.status} /></td>
            <td>{c.callDate ? formatDate(c.callDate) : when(c.createdAt)}</td>
            <td>{c.totalScore !== null ? <ScoreChip score={c.totalScore} /> : "—"}</td>
            <td>{c.hasInsights ? "Available" : "—"}</td>
            <td><Menu className="sv-icon-btn" align="right" label={`Actions for ${c.prospectName || "call"}`} trigger={<MoreHorizontal className="sv-icon" aria-hidden />} items={[{ label: "Open", icon: FileText, onSelect: () => navigate(svPath(`${BASE}/${c.id}`)) }, { label: "Delete", icon: Trash2, danger: true, onSelect: () => void remove(c) }]} /></td>
          </tr>
        ))}
      </TableCard>
      {data ? <Pager page={data.page} limit={data.limit} total={data.total} totalPages={data.totalPages} onPage={setPage} /> : null}
      {creating ? <NewCallModal onClose={() => setCreating(false)} onCreated={(call) => { calls.reload(); navigate(svPath(`${BASE}/${call.id}`)); }} /> : null}
    </div>
  );
}

function StageCard({ stage }: { stage: Stage }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <button type="button" className="sv-stage-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <ChevronDown className="sv-icon" aria-hidden style={{ transform: open ? "none" : "rotate(-90deg)" }} />
        <strong>{stage.name}</strong>
        <span className="sv-meter" aria-hidden><span className={`is-${scoreTone(stage.score)}`} style={{ width: `${stage.score * 10}%` }} /></span>
        <ScoreChip score={stage.score} />
      </button>
      {open ? (
        <div className="sv-stage-body">
          {stage.criteria.map((c) => (
            <section key={c.name}>
              <h4>{c.name} <ScoreChip score={c.score} /></h4>
              {c.feedback.length ? <><p className="sv-hint" style={{ margin: "8px 0 4px" }}>Feedback</p><ul>{c.feedback.map((f, i) => <li key={i}>{f}</li>)}</ul></> : null}
              {c.examples.length ? <><p className="sv-hint" style={{ margin: "8px 0 4px" }}>Transcript examples</p><ul>{c.examples.map((f, i) => <li key={i}>“{f}”</li>)}</ul></> : null}
              {c.improvement ? <><p className="sv-hint" style={{ margin: "8px 0 4px" }}>Improvement example</p><blockquote>{c.improvement}</blockquote></> : null}
            </section>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

const asText = (c: Call) => {
  const r = c.result;
  if (!r) return "";
  return [`# ${c.typeLabel}: ${c.prospectName || "Unnamed prospect"}${c.company ? ` (${c.company})` : ""}`, `Total score: ${r.totalScore}/10 · Average: ${r.averageScore}/10`, r.summary, ...r.stages.flatMap((s) => [`\n## ${s.name} — ${s.score}/10`, ...s.criteria.flatMap((k) => [`### ${k.name} — ${k.score}/10`, ...k.feedback.map((f) => `- ${f}`), k.improvement ? `Improvement: ${k.improvement}` : ""])])].filter(Boolean).join("\n");
};

export function CallDetail() {
  const { id } = useParams();
  const callId = Number(id);
  useSvTitle([{ label: "Sales Call Analyzer" }, { label: "Call Details" }]);
  const navigate = useNavigate();
  const call = useRemote(() => aiApi.call(callId), [callId]);
  const [tab, setTab] = useState<"analysis" | "insights" | "transcript">("analysis");
  const [error, setError] = useState("");
  const { done, copy } = useCopy();
  const c = call.data;
  usePolling(c?.status === "processing", call.reload, 2500);

  async function act(fn: () => Promise<unknown>) {
    setError("");
    try { await fn(); } catch (caught) { setError(errorText(caught)); }
  }

  if (!c) return <div className="sv-page"><Banner error={call.error} />{call.error ? <Link className="sv-link" to={svPath(BASE)}>Back to calls</Link> : <p className="sv-hint">Loading…</p>}</div>;
  const r = c.result;
  return (
    <div className="sv-page">
      <Link className="sv-link" to={svPath(BASE)} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16 }}><ArrowLeft className="sv-icon" aria-hidden /> All calls</Link>
      <PageHeader
        title={`${c.prospectName || "Unnamed prospect"} · ${c.typeLabel}`}
        subtitle={`Submission ID: ${c.submissionId}`}
        actions={
          <>
            <StatusBadge status={c.status} />
            <Button size="sm" icon={done === "id" ? Check : Copy} onClick={() => void copy("id", c.submissionId)}>{done === "id" ? "Copied" : "Copy ID"}</Button>
            <Menu className="sv-btn" align="right" label="Actions" trigger={<>Actions <ChevronDown className="sv-icon" aria-hidden /></>} items={[
              { label: "Re-analyze", icon: RefreshCw, disabled: c.status === "processing", onSelect: () => void act(async () => { await aiApi.reanalyze(c.id); call.reload(); }) },
              { label: "Copy report as text", icon: Copy, disabled: !r, onSelect: () => void copy("report", asText(c)) },
              { label: "Delete", icon: Trash2, danger: true, onSelect: () => void act(async () => { if (window.confirm("Delete this call? This can't be undone.")) { await aiApi.deleteCall(c.id); navigate(svPath(BASE)); } }) },
            ]} />
          </>
        }
      />
      <Banner error={error} />
      <div className="sv-grid-2" style={{ marginBottom: 16 }}>
        <Card className="sv-pad"><h3 className="sv-set-title" style={{ fontSize: 14 }}>Submission information</h3><p style={{ margin: 0 }}>{c.submittedBy || "—"}</p><p className="sv-hint" style={{ margin: 0 }}>Submitted {when(c.createdAt)}</p></Card>
        <Card className="sv-pad"><h3 className="sv-set-title" style={{ fontSize: 14 }}>Call context</h3><p style={{ margin: 0 }}>{[c.prospectName, c.role].filter(Boolean).join(", ") || "—"}{c.company ? ` at ${c.company}` : ""}</p><p className="sv-hint" style={{ margin: 0 }}>{c.prospectEmail || "No email"}{c.callDate ? ` · Call date: ${formatDate(c.callDate)}` : ""}</p></Card>
      </div>

      {c.status === "processing" ? <EmptyState title="Analyzing your call…" body="This usually takes under a minute. You can leave this page; the result will be here when you come back." /> : null}
      {c.status === "failed" ? <EmptyState title="We couldn't analyze this call" body={c.error || "Something went wrong."} action={<Button variant="primary" icon={RefreshCw} onClick={() => void act(async () => { await aiApi.reanalyze(c.id); call.reload(); })}>Re-analyze</Button>} /> : null}

      {r ? (
        <>
          <div className="sv-seg" role="tablist" aria-label="Call sections" style={{ marginBottom: 16 }}>
            {([["analysis", "Analysis"], ["insights", "Marketing Insights"], ["transcript", "Transcript"]] as const).map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? "is-active" : ""} onClick={() => setTab(key)}>{label}</button>)}
          </div>
          {tab === "analysis" ? (
            <>
              <div className="sv-grid-2" style={{ marginBottom: 16 }}>
                <Card className="sv-pad"><p className="sv-hint" style={{ margin: 0 }}>Total Score</p><p className={`sv-big-score is-${scoreTone(r.totalScore)}`}>{r.totalScore.toFixed(1)}<span>/10</span></p><p className="sv-hint" style={{ margin: 0 }}>Average across the stages of the call.</p></Card>
                <Card className="sv-pad"><p className="sv-hint" style={{ margin: 0 }}>Average Score</p><p className={`sv-big-score is-${scoreTone(r.averageScore)}`}>{r.averageScore.toFixed(1)}<span>/10</span></p><p className="sv-hint" style={{ margin: 0 }}>Average across every criterion scored.</p></Card>
              </div>
              {r.summary ? <p style={{ margin: "0 0 16px" }}>{r.summary}</p> : null}
              <h3 className="sv-set-title">Call Stages Analysis</h3>
              <p className="sv-hint" style={{ marginTop: 0 }}>Click a stage to open its analysis</p>
              <div className="sv-stack">{r.stages.map((s) => <StageCard key={s.name} stage={s} />)}</div>
              <p className="sv-hint" style={{ marginTop: 16 }}>Scored by AI from the transcript. Treat scores as coaching input, not a verdict.</p>
            </>
          ) : null}
          {tab === "insights" ? (
            <div className="sv-grid-2">
              {([["Pain points", r.marketingInsights.painPoints], ["Objections", r.marketingInsights.objections], ["Buying signals", r.marketingInsights.buyingSignals], ["Topics discussed", r.marketingInsights.topics], ["In their words", r.marketingInsights.quotes]] as const).map(([label, items]) => (
                <Card key={label} className="sv-pad"><h3 className="sv-set-title" style={{ fontSize: 14 }}>{label}</h3>{items.length ? <ul style={{ margin: 0, paddingLeft: 18 }}>{items.map((item, i) => <li key={i}>{label === "In their words" ? `“${item}”` : item}</li>)}</ul> : <p className="sv-hint" style={{ margin: 0 }}>Nothing found in this call.</p>}</Card>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
      {tab === "transcript" || (!r && c.transcript) ? (
        <>
          {!r ? <h3 className="sv-set-title" style={{ marginTop: 16 }}>Transcript</h3> : null}
          <Card className="sv-pad"><pre className="sv-transcript">{c.transcript}</pre></Card>
        </>
      ) : null}
    </div>
  );
}
