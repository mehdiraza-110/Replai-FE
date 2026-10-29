import { settingsApi } from "../../api/settings";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, FileUp, Library, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import { RichTextEditor } from "../../../components/ui/RichTextEditor";
import { campaignService, mailboxService } from "../../../services/api";
import { leadLibraryService } from "../../../services/leadLibraryApi";
import type { LeadFileParseResult, LeadList, Mailbox } from "../../../types";
import { sequenceApi } from "../../api/campaigns";
import { useSvTitle } from "../../layout/chrome";
import { svPath } from "../../nav";
import { Badge, Button, Card, Checkbox, Field, Menu } from "../../ui";
import { DAYS, errorText, MERGE_VARIABLES } from "./shared";

interface StepDraft { key: number; delayDays: number; body: string }

/** Must match the server (routes/v1/campaign.routes.js) and the proxy in front of it. */
const LEAD_FILE_MAX_MB = 25;
const STEPS = ["Name", "Leads", "Sequence", "Email accounts"];

function OptionCard({ selected, icon: Icon, title, body, onClick, disabled }: { selected: boolean; icon: typeof Sparkles; title: string; body: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" className={`sv-option${selected ? " is-selected" : ""}`} aria-pressed={selected} disabled={disabled} onClick={onClick}>
      <Icon className="sv-icon" style={{ width: 22, height: 22 }} aria-hidden />
      <strong>{title}</strong>
      <span>{body}</span>
    </button>
  );
}

export function NewCampaign() {
  useSvTitle([{ label: "Cold Email Agent" }, { label: "Create Campaign" }]);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const requested = Math.min(Math.max(Number(params.get("step")) || 1, 1), 4);

  // step 1
  const [name, setName] = useState("");
  // step 2
  const [leadMode, setLeadMode] = useState<"upload" | "library">("upload");
  const [parsed, setParsed] = useState<LeadFileParseResult | null>(null);
  const [lists, setLists] = useState<LeadList[]>([]);
  const [listIds, setListIds] = useState<Set<number>>(new Set());
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // step 3
  const [seqMode, setSeqMode] = useState<"ai" | "own">("own");
  const [audience, setAudience] = useState("");
  const [generated, setGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [followUps, setFollowUps] = useState<StepDraft[]>([]);
  const [nextKey, setNextKey] = useState(1);
  const [editorKey, setEditorKey] = useState(0);
  const subjectRef = useRef<HTMLInputElement>(null);
  // step 4
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [chosenBoxes, setChosenBoxes] = useState<Set<number>>(new Set());
  const [days, setDays] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [windowStart, setWindowStart] = useState("09:00");
  const [windowEnd, setWindowEnd] = useState("17:00");
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [launch, setLaunch] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // The workspace's default sending schedule (Settings > Cold Email Agent), when someone has set one.
    settingsApi.workspace().then((w) => {
      if (!w.coldEmailConfigured) return;
      const sch = w.coldEmail.schedule;
      setDays(sch.days); setWindowStart(sch.from); setWindowEnd(sch.to); setTimezone(sch.timezone);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    leadLibraryService.listLists({ limit: 100 }).then((page) => setLists(page.items)).catch(() => undefined);
    mailboxService.list({ page: 1, limit: 100 }).then((page) => { setMailboxes(page.items); setChosenBoxes(new Set(page.items.filter((m) => m.status === "Active").map((m) => m.id))); }).catch(() => undefined);
  }, []);

  const hasLeads = leadMode === "upload" ? (parsed?.validCount ?? 0) > 0 : listIds.size > 0;
  const hasSequence = subject.trim().length > 0 && body.replace(/<[^>]*>/g, "").trim().length > 0;
  const valid: Record<number, boolean> = { 1: name.trim().length > 0, 2: hasLeads, 3: hasSequence, 4: chosenBoxes.size > 0 && days.length > 0 };

  // Deep links to a later step fall back to the first incomplete one, so nothing is created from missing data.
  const step = useMemo(() => { for (let s = 1; s < requested; s += 1) if (!valid[s]) return s; return requested; }, [requested, valid[1], valid[2], valid[3]]); // eslint-disable-line react-hooks/exhaustive-deps
  const go = (next: number) => { setError(""); setParams({ step: String(next) }, { replace: true }); };
  // When the guard sends a deep link back, put the real step in the URL so finishing a step does not skip ahead on its own.
  useEffect(() => {
    if (step !== requested) setParams({ step: String(step) }, { replace: true });
  }, [step, requested, setParams]);

  async function upload(file: File) {
    // Same cap as the server's, so an oversized file is refused right away instead of after a long upload.
    if (file.size > LEAD_FILE_MAX_MB * 1024 * 1024) { setError(`That file is larger than the ${LEAD_FILE_MAX_MB} MB limit. Split it into smaller files and upload them one at a time.`); return; }
    setUploading(true);
    setError("");
    try {
      setParsed(await campaignService.parseLeadsFile(file));
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setUploading(false);
    }
  }

  async function generate() {
    setGenerating(true);
    setError("");
    try {
      const result = await sequenceApi.generate({ name: name.trim(), audience, steps: 3 });
      const [first, ...rest] = result.steps;
      setSubject(first.subject);
      setBody(first.body);
      setFollowUps(rest.map((step, index) => ({ key: index, delayDays: step.delayDays, body: step.body })));
      setNextKey(rest.length);
      setEditorKey((k) => k + 1);
      setGenerated(true);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setGenerating(false);
    }
  }

  function insertInSubject(key: string) {
    const input = subjectRef.current;
    const token = `{{${key}}}`;
    const start = input?.selectionStart ?? subject.length;
    const end = input?.selectionEnd ?? subject.length;
    setSubject(subject.slice(0, start) + token + subject.slice(end));
  }

  async function create() {
    setCreating(true);
    setError("");
    try {
      const all = chosenBoxes.size === mailboxes.length;
      const created = await campaignService.create({
        name: name.trim(),
        subject: subject.trim(),
        body,
        ...(leadMode === "upload" ? { leads: parsed?.leads ?? [] } : { leadSource: { listIds: Array.from(listIds) } }),
        followUps: followUps.filter((f) => f.body.replace(/<[^>]*>/g, "").trim()).map((f) => ({ delayDays: f.delayDays, body: f.body })),
        mailboxMode: all ? "all" : "specific",
        mailboxIds: all ? [] : Array.from(chosenBoxes),
        sendingDays: days,
        windowStart,
        windowEnd,
        timezone,
        humanReviewRequired: false,
        launch,
      } as Parameters<typeof campaignService.create>[0] & { launch: boolean });
      navigate(svPath(`cold-email-campaign-agent/${created.id}`));
    } catch (caught) {
      setError(errorText(caught));
      setCreating(false);
    }
  }

  const zones = useMemo(() => { const list = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : ["UTC"]; return list.includes(timezone) ? list : [timezone, ...list]; }, [timezone]);
  const showEditor = seqMode === "own" || generated;

  return (
    <div className="sv-page" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <ol className="sv-stepper" aria-label="Progress">
        {STEPS.map((label, index) => (
          <li key={label} className={`${step === index + 1 ? "is-current" : ""}${step > index + 1 ? " is-done" : ""}`} aria-current={step === index + 1 ? "step" : undefined}>
            <span>{step > index + 1 ? <Check className="sv-icon" aria-hidden /> : index + 1}</span>
            <em>{label}</em>
          </li>
        ))}
      </ol>

      <Card className="sv-wizard">
        {error ? <p className="sv-banner is-error" role="alert" style={{ margin: 0 }}>{error}</p> : null}

        {step === 1 ? (
          <>
            <div><h2 className="sv-set-title" style={{ fontSize: 18 }}>Give your campaign a name</h2><p className="sv-set-desc">This will be the name of your campaign.</p></div>
            <input className="sv-input" aria-label="Campaign name" placeholder="Enter campaign name" value={name} maxLength={160} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && valid[1] && go(2)} autoFocus />
          </>
        ) : null}

        {step === 2 ? (
          <>
            <div><h2 className="sv-set-title" style={{ fontSize: 18 }}>Select your leads</h2><p className="sv-set-desc">Upload a CSV, or use leads you already saved in your lead library.</p></div>
            <div className="sv-options">
              <OptionCard selected={leadMode === "upload"} icon={Upload} title="Upload your own" body="Upload a CSV file of leads" onClick={() => setLeadMode("upload")} />
              <OptionCard selected={leadMode === "library"} icon={Library} title="Lead library" body="Pick lists you saved earlier" onClick={() => setLeadMode("library")} disabled={lists.length === 0} />
            </div>
            {lists.length === 0 ? <p className="sv-hint">Your lead library is empty. Upload a CSV, and you can save it to the library from the Leads tab later.</p> : null}
            {leadMode === "upload" ? (
              <>
                <button type="button" className="sv-drop" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  <FileUp className="sv-icon" style={{ width: 24, height: 24 }} aria-hidden />
                  <strong>{uploading ? "Reading your file…" : parsed ? "Choose a different CSV" : "Choose a .CSV file"}</strong>
                  <span>Needs an email column. Name, company and role are used to personalize. Up to 20,000 leads and {LEAD_FILE_MAX_MB} MB per file.</span>
                </button>
                <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ""; }} />
                {parsed ? (
                  <div className="sv-banner is-ok" role="status">
                    <Check className="sv-icon" aria-hidden />
                    <span><b>{parsed.validCount.toLocaleString()}</b> valid lead{parsed.validCount === 1 ? "" : "s"} found{parsed.invalidCount ? `, ${parsed.invalidCount} invalid` : ""}{parsed.duplicateCount ? `, ${parsed.duplicateCount} duplicate` : ""}. People who unsubscribed or bounced before are skipped automatically.</span>
                  </div>
                ) : null}
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {lists.map((list) => (
                  <label key={list.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: "1px solid var(--ds-border)" }}>
                    <Checkbox checked={listIds.has(list.id)} onChange={(next) => setListIds((current) => { const copy = new Set(current); if (next) copy.add(list.id); else copy.delete(list.id); return copy; })} label={`Use ${list.name}`} />
                    <span style={{ flex: 1, fontWeight: 500 }}>{list.name}</span>
                    <span className="sv-hint">{list.contactCount.toLocaleString()} leads</span>
                  </label>
                ))}
              </div>
            )}
          </>
        ) : null}

        {step === 3 ? (
          <>
            <div><h2 className="sv-set-title" style={{ fontSize: 18 }}>Create your sequences and write your scripts</h2><p className="sv-set-desc">The first email, then follow-ups that only go to people who have not replied.</p></div>
            <div className="sv-options">
              <OptionCard selected={seqMode === "ai"} icon={Sparkles} title="AI generated" body="Written from your Brain, in three emails" onClick={() => setSeqMode("ai")} />
              <OptionCard selected={seqMode === "own"} icon={Plus} title="Create your own" body="Write the emails yourself" onClick={() => setSeqMode("own")} />
            </div>
            {seqMode === "ai" && !generated ? (
              <>
                <Field label="Who is this campaign for? (optional)" htmlFor="ai-audience"><input id="ai-audience" className="sv-input" placeholder="e.g. General managers of busy restaurants" value={audience} onChange={(event) => setAudience(event.target.value)} maxLength={500} /></Field>
                <p className="sv-hint">The AI writes only from what you put in Settings → Brain and the AI SDR knowledge base. It will not invent facts. You can edit everything before launching.</p>
                <div><Button variant="primary" icon={Sparkles} disabled={generating} onClick={() => void generate()}>{generating ? "Writing your sequence…" : "Generate sequence"}</Button></div>
              </>
            ) : null}
            {showEditor ? (
              <>
                {seqMode === "ai" ? <div><Button size="sm" icon={Sparkles} disabled={generating} onClick={() => void generate()}>{generating ? "Writing…" : "Regenerate"}</Button></div> : null}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>Step 1 <span className="sv-hint">· Initial outreach</span></strong>
                  <Menu className="sv-filter" trigger={<>Variables</>} items={MERGE_VARIABLES.map((v) => ({ label: `${v.label}  {{${v.key}}}`, onSelect: () => insertInSubject(v.key) }))} align="right" label="Insert a variable into the subject" />
                </div>
                <Field label="Subject" htmlFor="wiz-subject"><input id="wiz-subject" ref={subjectRef} className="sv-input" value={subject} onChange={(event) => setSubject(event.target.value)} /></Field>
                <RichTextEditor value={body} onChange={setBody} ariaLabel="First email" variables={MERGE_VARIABLES} resetKey={`body-${editorKey}`} />
                {followUps.map((step2, index) => (
                  <div key={step2.key} style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 8, borderTop: "1px solid var(--ds-border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong>Step {index + 2} <span className="sv-hint">· Follow-up {index + 1}</span></strong>
                      <span className="sv-actions">
                        <label className="sv-hint" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>Wait<input type="number" min={1} max={60} className="sv-input" style={{ width: 64, height: 30 }} aria-label={`Days before follow-up ${index + 1}`} value={step2.delayDays} onChange={(event) => setFollowUps(followUps.map((f) => (f.key === step2.key ? { ...f, delayDays: Math.max(1, Number(event.target.value) || 1) } : f)))} />days</label>
                        <button type="button" className="sv-icon-btn" aria-label={`Remove follow-up ${index + 1}`} onClick={() => setFollowUps(followUps.filter((f) => f.key !== step2.key))}><Trash2 className="sv-icon" aria-hidden /></button>
                      </span>
                    </div>
                    <RichTextEditor value={step2.body} onChange={(html) => setFollowUps((list) => list.map((f) => (f.key === step2.key ? { ...f, body: html } : f)))} ariaLabel={`Follow-up ${index + 1}`} variables={MERGE_VARIABLES} resetKey={`fu-${editorKey}-${step2.key}`} />
                  </div>
                ))}
                <div><Button size="sm" icon={Plus} onClick={() => { setFollowUps([...followUps, { key: nextKey + 100, delayDays: 3, body: "" }]); setNextKey(nextKey + 1); }}>Add follow-up</Button></div>
              </>
            ) : null}
          </>
        ) : null}

        {step === 4 ? (
          <>
            <div><h2 className="sv-set-title" style={{ fontSize: 18 }}>Select email accounts</h2><p className="sv-set-desc">Choose which inboxes send this campaign.</p></div>
            <div className="sv-banner" style={{ background: "var(--ds-frame)", border: "1px solid var(--ds-border)", justifyContent: "space-between" }}>
              <span>{chosenBoxes.size} of {mailboxes.length} selected</span>
              <button type="button" className="sv-link" onClick={() => setChosenBoxes(chosenBoxes.size === mailboxes.length ? new Set() : new Set(mailboxes.map((m) => m.id)))}>{chosenBoxes.size === mailboxes.length ? "Unselect all" : "Select all"}</button>
            </div>
            <div className="sv-boxlist">
              {mailboxes.map((box) => (
                <label key={box.id} className="sv-boxrow">
                  <Checkbox checked={chosenBoxes.has(box.id)} onChange={(next) => setChosenBoxes((current) => { const copy = new Set(current); if (next) copy.add(box.id); else copy.delete(box.id); return copy; })} label={`Use ${box.email}`} />
                  <span style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 500 }}>{box.email}</div><div className="sv-hint">{box.displayName || box.domain}</div></span>
                  <Badge tone={box.status === "Active" ? "green" : "yellow"}>{box.warmupStage}</Badge>
                </label>
              ))}
              {mailboxes.length === 0 ? <p className="sv-hint">No inboxes yet. Add inboxes first, then come back.</p> : null}
            </div>
            <div style={{ borderTop: "1px solid var(--ds-border)", paddingTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <strong>Sending schedule</strong>
              <div className="sv-chips">
                {DAYS.map((day) => <button key={day} type="button" aria-pressed={days.includes(day)} className={`sv-btn is-sm${days.includes(day) ? " is-primary" : ""}`} onClick={() => setDays(days.includes(day) ? days.filter((d) => d !== day) : [...days, day])}>{day}</button>)}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 12 }}>
                <Field label="From" htmlFor="wiz-from"><input id="wiz-from" type="time" className="sv-input" value={windowStart} onChange={(event) => setWindowStart(event.target.value)} /></Field>
                <Field label="To" htmlFor="wiz-to"><input id="wiz-to" type="time" className="sv-input" value={windowEnd} onChange={(event) => setWindowEnd(event.target.value)} /></Field>
                <Field label="Time zone" htmlFor="wiz-tz"><select id="wiz-tz" className="sv-select" value={timezone} onChange={(event) => setTimezone(event.target.value)}>{zones.map((zone) => <option key={zone} value={zone}>{zone.replace(/_/g, " ")}</option>)}</select></Field>
              </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Checkbox checked={launch} onChange={setLaunch} label="Launch the campaign automatically" />
              <span>Launch the campaign as soon as it is created</span>
            </label>
          </>
        ) : null}

        <div className="sv-wizard-foot">
          {step === 1 ? <Button onClick={() => navigate(svPath("cold-email-campaign-agent"))}>Cancel</Button> : <Button onClick={() => go(step - 1)} disabled={creating}>Previous</Button>}
          {step < 4 ? <Button variant="primary" disabled={!valid[step]} onClick={() => go(step + 1)}>Next</Button> : <Button variant="primary" disabled={!valid[4] || creating} onClick={() => void create()}>{creating ? "Creating…" : launch ? "Create and launch" : "Create campaign"}</Button>}
        </div>
      </Card>
    </div>
  );
}
