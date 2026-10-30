import { useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Copy, Download, FileText, MoreHorizontal, RefreshCw, Sparkles, Trash2, Upload } from "lucide-react";
import { aiApi, type Report, type ReportSlug } from "../../api/ai";
import { useSvTitle } from "../../layout/chrome";
import { svPath } from "../../nav";
import { Button, Card, EmptyState, Field, Menu, PageHeader, Skeleton, SkeletonCard } from "../../ui";
import { errorText } from "../cold-email/shared";
import { Banner, Pager, TableCard, useRemote } from "../crm/shared";
import { Prose, StatusBadge, downloadText, readTextFile, slugify, useCopy, usePolling, when } from "./shared";

type Values = Record<string, string>;
interface FieldDef { key: string; label: string; hint?: string; rows?: number; kind?: "input" | "email" }
interface Config { slug: ReportSlug; route: string; title: string; subtitle: string; noun: string; action: string; processing: string }

const CONFIGS: Record<ReportSlug, Config> = {
  "market-research": { slug: "market-research", route: "niche-researcher", title: "Market Researcher", subtitle: "Find niches that fit your background and how to enter them", noun: "report", action: "Generate Report", processing: "Researching" },
  offer: { slug: "offer", route: "offer-creator", title: "Offer Creator", subtitle: "Turn your results and skills into an offer buyers can say yes to", noun: "offer", action: "Generate Offer", processing: "Writing" },
  "growth-plan": { slug: "growth-plan", route: "growth-plan-creator", title: "Growth Plan Creator", subtitle: "Turn a discovery call into a plan you can present", noun: "plan", action: "Generate Plan", processing: "Writing" },
};

const MARKET_STEPS: Array<{ title: string; blurb: string; fields: FieldDef[] }> = [
  { title: "Professional Background", blurb: "Tell us about your professional experience and skills.", fields: [{ key: "background", label: "Professional Background & Experience", rows: 4 }, { key: "skills", label: "Key Professional Skills & Expertise", rows: 4 }] },
  { title: "Personal Insights & Constraints", blurb: "Share your interests, network, and any constraints you may have.", fields: [{ key: "interests", label: "Personal Interests & Passions", rows: 3 }, { key: "connections", label: "Industry Connections & Network", rows: 3 }, { key: "problems", label: "Observed Business Problems or Market Gaps", rows: 3 }, { key: "constraints", label: "Resource Constraints (Time, Money, etc.)", rows: 3 }] },
];
const OFFER_FIELDS: FieldDef[] = [
  { key: "results", label: "What specific results have you achieved in your professional background?", hint: "Include quantifiable metrics, client successes, and tangible outcomes.", rows: 3 },
  { key: "skills", label: "What skills have you developed that directly relate to business growth?", hint: "Focus on skills that have proven business impact.", rows: 3 },
  { key: "processes", label: "What processes or systems have you successfully implemented?", hint: "Include any standardized approaches or operational improvements.", rows: 3 },
  { key: "industry", label: "What specific industry knowledge do you possess?", hint: "Highlight specialized knowledge and industry insights.", rows: 3 },
];
const GROWTH_FIELDS: FieldDef[] = [
  { key: "prospectName", label: "Prospect contact name", kind: "input" }, { key: "prospectCompany", label: "Prospect company name", kind: "input" },
  { key: "prospectEmail", label: "Prospect email", kind: "email" }, { key: "industry", label: "Industry", kind: "input" },
  { key: "goals", label: "Their goals", hint: "What do they want to achieve?", rows: 3 }, { key: "currentSituation", label: "Where they are today", rows: 3 },
  { key: "challenges", label: "Challenges in the way", rows: 3 }, { key: "offer", label: "What you would offer them", rows: 3 },
  { key: "budget", label: "Budget", kind: "input" }, { key: "timeline", label: "Timeline", kind: "input" }, { key: "notes", label: "Anything else", rows: 3 },
];

function FieldInputs({ fields, values, set }: { fields: FieldDef[]; values: Values; set: (key: string, value: string) => void }) {
  return (
    <>
      {fields.map((f) => (
        <Field key={f.key} label={`${f.label} (optional)`} htmlFor={`f-${f.key}`}>
          {f.kind ? <input id={`f-${f.key}`} type={f.kind === "email" ? "email" : "text"} className="sv-input" value={values[f.key] ?? ""} onChange={(event) => set(f.key, event.target.value)} />
            : <textarea id={`f-${f.key}`} className="sv-textarea" style={{ minHeight: (f.rows ?? 3) * 24 }} value={values[f.key] ?? ""} onChange={(event) => set(f.key, event.target.value)} />}
          {f.hint ? <span className="sv-hint">{f.hint}</span> : null}
        </Field>
      ))}
    </>
  );
}

function TranscriptBox({ value, onChange, onError }: { value: string; onChange: (next: string) => void; onError: (message: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <div className="sv-dropzone">
        <Upload className="sv-icon" aria-hidden />
        <p style={{ margin: 0 }}>Upload a transcript file (.txt, .vtt or .srt), or paste it below</p>
        <p className="sv-hint" style={{ margin: 0 }}>Audio and video recordings can't be transcribed yet.</p>
        <input ref={fileRef} type="file" accept=".txt,.md,.vtt,.srt,text/plain" hidden onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) readTextFile(file).then((t) => { onChange(t); onError(""); }, (e) => onError(errorText(e))); }} />
        <Button size="sm" onClick={() => fileRef.current?.click()}>Choose file</Button>
      </div>
      <Field label="Transcript" htmlFor="transcript-box">
        <textarea id="transcript-box" className="sv-textarea" style={{ minHeight: 140, fontFamily: "ui-monospace, monospace", fontSize: 12 }} placeholder={"Speaker 1: ...\nProspect: ..."} value={value} onChange={(event) => onChange(event.target.value)} />
      </Field>
      <p className="sv-hint" style={{ margin: 0 }}>{value.length.toLocaleString()} / 300,000 characters (1,000 minimum). Speaker labels required, for example “Speaker 1:”, “John:”, or “Prospect:”.</p>
    </>
  );
}

function Steps({ labels, current }: { labels: string[]; current: number }) {
  return (
    <ol className="sv-stepper" aria-label="Progress">
      {labels.map((label, index) => (
        <li key={label} className={`${current === index ? "is-current" : ""}${current > index ? " is-done" : ""}`} aria-current={current === index ? "step" : undefined}>
          <span>{current > index ? <Check className="sv-icon" aria-hidden /> : index + 1}</span><em>{label}</em>
        </li>
      ))}
    </ol>
  );
}

function History({ config, reload: reloadKey }: { config: Config; reload: number }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const list = useRemote(() => aiApi.reports(config.slug, { page }), [config.slug, page, reloadKey]);
  usePolling(Boolean(list.data?.items.some((r) => r.status === "processing")), list.reload);
  const open = (r: Report) => navigate(svPath(`${config.route}/${r.id}`));
  async function remove(r: Report) {
    if (!window.confirm(`Delete "${r.title || config.noun}"? This can't be undone.`)) return;
    try { await aiApi.deleteReport(config.slug, r.id); list.reload(); } catch (caught) { setError(errorText(caught)); }
  }
  const data = list.data;
  const growth = config.slug === "growth-plan";
  return (
    <section style={{ marginTop: 32 }}>
      <h2 className="sv-set-title" style={{ marginBottom: 12 }}>History</h2>
      <Banner error={error || list.error} />
      <TableCard head={<><th>Date</th><th>Status</th><th>{growth ? "Prospect" : "Report"}</th><th>Created by</th><th style={{ width: 48 }} /></>} loading={!data && !list.error} empty={data && data.items.length === 0 ? `No ${config.noun}s yet.` : undefined}>
        {data?.items.map((r) => (
          <tr key={r.id}>
            <td>{when(r.createdAt)}</td>
            <td><StatusBadge status={r.status} processingLabel={config.processing} /></td>
            <td><Link className="sv-link" style={{ fontWeight: 500 }} to={svPath(`${config.route}/${r.id}`)}>{growth ? r.prospectName || r.prospectCompany || r.title || "Growth plan" : r.title || config.noun}</Link>{growth && r.prospectCompany && r.prospectName ? <div className="sv-hint">{r.prospectCompany}</div> : null}</td>
            <td>{r.createdBy || "—"}<div className="sv-hint">{r.createdByEmail}</div></td>
            <td><Menu className="sv-icon-btn" align="right" label={`Actions for ${r.title || config.noun}`} trigger={<MoreHorizontal className="sv-icon" aria-hidden />} items={[{ label: "Open", icon: FileText, onSelect: () => open(r) }, { label: "Delete", icon: Trash2, danger: true, onSelect: () => void remove(r) }]} /></td>
          </tr>
        ))}
      </TableCard>
      {data ? <Pager page={data.page} limit={data.limit} total={data.total} totalPages={data.totalPages} onPage={setPage} /> : null}
    </section>
  );
}

function useGenerate(config: Config) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [bump, setBump] = useState(0);
  async function run(values: Values, afterStart?: () => void) {
    setBusy(true); setError("");
    const body = Object.fromEntries(Object.entries(values).filter(([, v]) => v.trim()));
    try {
      const report = await aiApi.createReport(config.slug, body);
      afterStart?.();
      setBump((n) => n + 1);
      navigate(svPath(`${config.route}/${report.id}`));
    } catch (caught) { setError(errorText(caught)); } finally { setBusy(false); }
  }
  return { busy, error, setError, bump, run };
}

function Wizard({ config, children }: { config: Config; children: (gen: ReturnType<typeof useGenerate>) => ReactNode }) {
  useSvTitle([{ label: config.title }]);
  const gen = useGenerate(config);
  return (
    <div className="sv-page">
      <PageHeader title={config.title} subtitle={config.subtitle} />
      <Card className="sv-wizard" >
        <Banner error={gen.error} />
        {children(gen)}
      </Card>
      <History config={config} reload={gen.bump} />
    </div>
  );
}

export function MarketResearcher() {
  const config = CONFIGS["market-research"];
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>({});
  const set = (key: string, value: string) => setValues((v) => ({ ...v, [key]: value }));
  const current = MARKET_STEPS[step];
  return (
    <Wizard config={config}>
      {(gen) => (
        <>
          <Steps labels={["Background", "Insights"]} current={step} />
          <h2 className="sv-set-title">{current.title}</h2>
          <p className="sv-set-desc">{current.blurb}</p>
          <FieldInputs fields={current.fields} values={values} set={set} />
          <div className="sv-actions" style={{ justifyContent: "space-between" }}>
            {step > 0 ? <Button onClick={() => setStep(step - 1)}>Previous</Button> : <span />}
            {step < MARKET_STEPS.length - 1 ? <Button variant="primary" onClick={() => setStep(step + 1)}>Next</Button> : <Button variant="primary" icon={Sparkles} disabled={gen.busy} onClick={() => void gen.run(values)}>{gen.busy ? "Starting…" : config.action}</Button>}
          </div>
        </>
      )}
    </Wizard>
  );
}

export function OfferCreator() {
  const config = CONFIGS.offer;
  const [mode, setMode] = useState<"manual" | "transcript">("manual");
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>({});
  const [transcript, setTranscript] = useState("");
  const set = (key: string, value: string) => setValues((v) => ({ ...v, [key]: value }));
  return (
    <Wizard config={config}>
      {(gen) => (
        <>
          <div className="sv-seg" role="tablist" aria-label="Input method">
            {([["manual", "Manual Input"], ["transcript", "From Transcript"]] as const).map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={mode === key} className={mode === key ? "is-active" : ""} onClick={() => { setMode(key); gen.setError(""); }}>{label}</button>)}
          </div>
          {mode === "manual" ? (
            <>
              <Steps labels={["Background & Results", "Review"]} current={step} />
              {step === 0 ? (
                <><h2 className="sv-set-title">Professional Background & Results</h2><p className="sv-set-desc">Share your professional achievements, skills, and expertise.</p><FieldInputs fields={OFFER_FIELDS} values={values} set={set} /><div className="sv-actions" style={{ justifyContent: "flex-end" }}><Button variant="primary" onClick={() => setStep(1)}>Next</Button></div></>
              ) : (
                <>
                  <h2 className="sv-set-title">Review</h2>
                  <p className="sv-set-desc">We only use what you wrote here. Results you don't mention won't be invented.</p>
                  {OFFER_FIELDS.map((f) => <div key={f.key}><p className="sv-hint" style={{ margin: 0 }}>{f.label}</p><p style={{ margin: "2px 0 12px", whiteSpace: "pre-wrap" }}>{values[f.key]?.trim() || "—"}</p></div>)}
                  <div className="sv-actions" style={{ justifyContent: "space-between" }}><Button onClick={() => setStep(0)}>Previous</Button><Button variant="primary" icon={Sparkles} disabled={gen.busy} onClick={() => void gen.run(values)}>{gen.busy ? "Starting…" : config.action}</Button></div>
                </>
              )}
            </>
          ) : (
            <>
              <h2 className="sv-set-title" style={{ marginTop: 16 }}>Build an offer from a call</h2>
              <p className="sv-set-desc">Use a transcript of a call where you talked through your results and what clients get from you.</p>
              <TranscriptBox value={transcript} onChange={setTranscript} onError={gen.setError} />
              <div className="sv-actions" style={{ justifyContent: "flex-end" }}><Button variant="primary" icon={Sparkles} disabled={gen.busy || transcript.trim().length < 1000} onClick={() => void gen.run({ transcript })}>{gen.busy ? "Starting…" : config.action}</Button></div>
            </>
          )}
        </>
      )}
    </Wizard>
  );
}

export function GrowthPlanCreator() {
  const config = CONFIGS["growth-plan"];
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>({});
  const [transcript, setTranscript] = useState("");
  const [reading, setReading] = useState(false);
  const [notice, setNotice] = useState("");
  const set = (key: string, value: string) => setValues((v) => ({ ...v, [key]: value }));
  return (
    <Wizard config={config}>
      {(gen) => (
        <>
          <Steps labels={["Discovery call", "Review details"]} current={step} />
          {step === 0 ? (
            <>
              <h2 className="sv-set-title">Start with your discovery call</h2>
              <p className="sv-set-desc">We'll read the call, prefill the plan details, and you review everything before anything is generated.</p>
              <TranscriptBox value={transcript} onChange={setTranscript} onError={gen.setError} />
              <div className="sv-actions" style={{ justifyContent: "space-between" }}>
                <Button onClick={() => { gen.setError(""); setNotice(""); setStep(1); }}>Continue without AI</Button>
                <span className="sv-actions">
                  {transcript ? <Button onClick={() => setTranscript("")}>Start over</Button> : null}
                  <Button variant="primary" icon={Sparkles} disabled={reading || transcript.trim().length < 1000} onClick={() => { setReading(true); gen.setError(""); aiApi.prefillGrowth(transcript).then((out) => { setValues(out.fields); setNotice(out.filled ? `We filled in ${out.filled} detail${out.filled === 1 ? "" : "s"} from the call. Check them before you generate.` : "The call didn't contain enough to prefill anything. Fill in the details below."); setStep(1); }, (e) => gen.setError(errorText(e))).finally(() => setReading(false)); }}>{reading ? "Reading the call…" : "Prefill with AI"}</Button>
                </span>
              </div>
            </>
          ) : (
            <>
              <h2 className="sv-set-title">Review details</h2>
              {notice ? <p className="sv-banner is-ok" role="status" style={{ margin: "0 0 12px" }}>{notice}</p> : null}
              <p className="sv-set-desc">Add at least their goals or challenges. The plan only uses what's here.</p>
              <div className="sv-grid-2"><FieldInputs fields={GROWTH_FIELDS.slice(0, 4)} values={values} set={set} /></div>
              <FieldInputs fields={GROWTH_FIELDS.slice(4)} values={values} set={set} />
              <div className="sv-actions" style={{ justifyContent: "space-between" }}><Button onClick={() => setStep(0)}>Previous</Button><Button variant="primary" icon={Sparkles} disabled={gen.busy} onClick={() => void gen.run(values)}>{gen.busy ? "Starting…" : config.action}</Button></div>
            </>
          )}
        </>
      )}
    </Wizard>
  );
}

const asMarkdown = (r: Report) => [`# ${r.output?.title || r.title || "Report"}`, ...(r.output?.sections ?? []).flatMap((s) => [`\n## ${s.heading}`, s.body, ...s.bullets.map((b) => `- ${b}`)].filter(Boolean))].join("\n");

export function ReportDetail({ slug }: { slug: ReportSlug }) {
  const config = CONFIGS[slug];
  const { id } = useParams();
  const reportId = Number(id);
  useSvTitle([{ label: config.title }, { label: "Result" }]);
  const navigate = useNavigate();
  const report = useRemote(() => aiApi.report(slug, reportId), [slug, reportId]);
  const [error, setError] = useState("");
  const { done, copy } = useCopy();
  const r = report.data;
  usePolling(r?.status === "processing", report.reload, 2500);
  async function act(fn: () => Promise<unknown>) { setError(""); try { await fn(); } catch (caught) { setError(errorText(caught)); } }

  if (!r) return <div className="sv-page"><Banner error={report.error} />{report.error ? <Link className="sv-link" to={svPath(config.route)}>Back to {config.title}</Link> : <div role="status" aria-label="Loading" style={{ display: "grid", gap: 16 }}><div className="sv-skel-stack"><Skeleton width={260} height={24} /><Skeleton width={180} /></div><SkeletonCard lines={4} /><SkeletonCard lines={6} /></div>}</div>;
  // Growth plan titles name the prospect from the form; the model must not rename them.
  const title = (slug === "growth-plan" ? r.title : r.output?.title || r.title) || config.title;
  return (
    <div className="sv-page">
      <Link className="sv-link" to={svPath(config.route)} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16 }}><ArrowLeft className="sv-icon" aria-hidden /> Back to {config.title}</Link>
      <PageHeader
        title={title}
        subtitle={`${r.createdBy ? `By ${r.createdBy} · ` : ""}${when(r.createdAt)}`}
        actions={
          <>
            <StatusBadge status={r.status} processingLabel={config.processing} />
            {r.output ? <><Button size="sm" icon={done === "copy" ? Check : Copy} onClick={() => void copy("copy", asMarkdown(r))}>{done === "copy" ? "Copied" : "Copy"}</Button><Button size="sm" icon={Download} onClick={() => downloadText(`${slugify(title)}.md`, asMarkdown(r))}>Download</Button></> : null}
            <Button size="sm" icon={Trash2} onClick={() => void act(async () => { if (window.confirm("Delete this? This can't be undone.")) { await aiApi.deleteReport(slug, r.id); navigate(svPath(config.route)); } })}>Delete</Button>
          </>
        }
      />
      <Banner error={error} />
      {r.status === "processing" ? <EmptyState title={`${config.processing}…`} body="This usually takes under a minute. You can leave this page; the result will be in your history." /> : null}
      {r.status === "failed" ? <EmptyState title={`We couldn't generate this ${config.noun}`} body={r.error || "Something went wrong."} action={<Button variant="primary" icon={RefreshCw} onClick={() => void act(async () => { await aiApi.retryReport(slug, r.id); report.reload(); })}>Try again</Button>} /> : null}
      {r.output ? (
        <div className="sv-stack">
          {r.output.sections.map((s, index) => (
            <Card key={`${s.heading}-${index}`} className="sv-pad">
              <h3 className="sv-set-title" style={{ fontSize: 15 }}>{s.heading}</h3>
              {s.body ? <Prose text={s.body} /> : null}
              {s.bullets.length ? <ul className="sv-prose-list">{s.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul> : null}
            </Card>
          ))}
          <p className="sv-hint">Written by AI from what you provided. Check the details before you share it.</p>
        </div>
      ) : null}
    </div>
  );
}
