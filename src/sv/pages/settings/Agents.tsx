import { useEffect, useMemo, useState } from "react";
import { settingsApi } from "../../api/settings";
import { useSvTitle } from "../../layout/chrome";
import { Badge, Button, Field, SettingsCard } from "../../ui";
import { Notice, ReadOnlyNote, SettingsPageFrame, useCanManage, useRemote, useSaver } from "./shared";

// ---- Cold Email Agent ----
export function SettingsColdEmailAgent() {
  useSvTitle([{ label: "Cold Email Agent" }]);
  const canManage = useCanManage();
  const { data, reload } = useRemote(() => settingsApi.workspace(), []);
  const billing = useRemote(() => settingsApi.billing(), []);
  const saver = useSaver();
  const [days, setDays] = useState<string[]>([]);
  const [from, setFrom] = useState("09:00");
  const [to, setTo] = useState("17:00");
  const [timezone, setTimezone] = useState("UTC");
  useEffect(() => { if (data) { const s = data.coldEmail.schedule; setDays(s.days); setFrom(s.from); setTo(s.to); setTimezone(data.coldEmailConfigured ? s.timezone : Intl.DateTimeFormat().resolvedOptions().timeZone || s.timezone); } }, [data]);
  const zones = useMemo(() => { const list = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : ["UTC"]; return list.includes(timezone) ? list : [timezone, ...list]; }, [timezone]);
  const saved = data?.coldEmail.schedule;
  const dirty = !data?.coldEmailConfigured || (saved ? JSON.stringify([days, from, to, timezone]) !== JSON.stringify([saved.days, saved.from, saved.to, saved.timezone]) : false);
  const meters = billing.data?.plan?.limits ?? [];

  return (
    <SettingsPageFrame title="Cold Email Agent" subtitle="Defaults for new campaigns">
      {!canManage ? <ReadOnlyNote /> : null}
      <SettingsCard title="Default sending schedule" description="New campaigns start with these days and hours. You can still change them per campaign.">
        {saver.notice ? <Notice tone={saver.notice.tone}>{saver.notice.text}</Notice> : null}
        <div className="sv-chips">{(data?.weekdays ?? []).map((d) => <button key={d} type="button" disabled={!canManage} aria-pressed={days.includes(d)} className={`sv-btn is-sm${days.includes(d) ? " is-primary" : ""}`} onClick={() => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d])}>{d}</button>)}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 12 }}>
          <Field label="From" htmlFor="ce-from"><input id="ce-from" type="time" className="sv-input" disabled={!canManage} value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="To" htmlFor="ce-to"><input id="ce-to" type="time" className="sv-input" disabled={!canManage} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          <Field label="Time zone" htmlFor="ce-tz"><select id="ce-tz" className="sv-select" disabled={!canManage} value={timezone} onChange={(e) => setTimezone(e.target.value)}>{zones.map((z) => <option key={z} value={z}>{z.replace(/_/g, " ")}</option>)}</select></Field>
        </div>
        <div><Button variant="primary" disabled={!canManage || !dirty || saver.busy} onClick={() => void saver.run(async () => { await settingsApi.saveWorkspace({ coldEmail: { schedule: { days, from, to, timezone } } }); reload(); }, "Default schedule saved.")}>Save schedule</Button></div>
      </SettingsCard>
      <SettingsCard title="Usage" description="What your plan allows for outreach.">
        {meters.length ? meters.map((l) => { const pct = l.limit ? Math.min(100, Math.round((l.used / l.limit) * 100)) : 0; return (
          <div key={l.key}><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontWeight: 500 }}>{l.label}</span><span className="sv-hint">{l.used.toLocaleString()} of {l.limit === null ? "unlimited" : l.limit.toLocaleString()}{l.period === "day" ? " per day" : ""}</span></div><div className="sv-meter" aria-hidden><i style={{ width: `${pct}%`, background: pct >= 90 ? "var(--ds-red-text)" : "var(--ds-green-text)" }} /></div></div>
        ); }) : <p className="sv-hint">{billing.data ? "Your plan has no usage limits." : "Loading…"}</p>}
      </SettingsCard>
      <SettingsCard title="AI campaign management" description="Let the AI adjust running campaigns for you.">
        <div><Badge>Not available yet</Badge></div>
        <p className="sv-hint">Campaigns run exactly as you set them. The AI SDR handles replies; it doesn't change your campaigns.</p>
      </SettingsCard>
    </SettingsPageFrame>
  );
}

// ---- Sales Call Analyzer ----
const CALL_TYPES: Array<[string, string, string]> = [
  ["discovery", "Discovery calls", "First conversations to understand a prospect's needs."],
  ["interview", "Interviews", "Customer or candidate interviews."],
  ["sales", "Sales calls", "Calls where you present and ask for a decision."],
  ["podcast", "Podcasts", "Recorded conversations for content."],
  ["coaching", "Real-time coaching", "Guidance while a call is happening."],
];

export function SettingsCallAnalyzer() {
  useSvTitle([{ label: "Sales Call Analyzer" }]);
  const { data, reload } = useRemote(() => settingsApi.workspace(), []);
  const canManage = useCanManage();
  const saver = useSaver();
  const [language, setLanguage] = useState("en-US");
  const [frameworks, setFrameworks] = useState<Record<string, string>>({});
  useEffect(() => { if (data) { setLanguage(data.callAnalyzer.language); setFrameworks(data.callAnalyzer.frameworks); } }, [data]);
  const dirty = data ? JSON.stringify([language, frameworks]) !== JSON.stringify([data.callAnalyzer.language, data.callAnalyzer.frameworks]) : false;
  return (
    <SettingsPageFrame title="Sales Call Analyzer" subtitle="How your calls are scored and transcribed">
      {!canManage ? <ReadOnlyNote /> : null}
      {saver.notice ? <Notice tone={saver.notice.tone}>{saver.notice.text}</Notice> : null}
      <SettingsCard title="Transcription language" description="The English variant used when transcribing your calls.">
        <select className="sv-select" aria-label="Transcription language" disabled={!canManage} value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="en-US">English (US)</option><option value="en-GB">English (UK)</option><option value="en-AU">English (Australia)</option>
        </select>
      </SettingsCard>
      {CALL_TYPES.map(([key, title, hint]) => (
        <SettingsCard key={key} title={title} description={hint}>
          <div><Badge tone={frameworks[key]?.trim() ? "blue" : "green"}>{frameworks[key]?.trim() ? "Custom framework" : "Default framework active"}</Badge></div>
          <Field label="Your evaluation framework (optional)" htmlFor={`fw-${key}`}><textarea id={`fw-${key}`} className="sv-textarea" style={{ minHeight: 90 }} disabled={!canManage} placeholder="Describe what a good call looks like, e.g. what to ask and how to score it." value={frameworks[key] ?? ""} maxLength={6000} onChange={(e) => setFrameworks({ ...frameworks, [key]: e.target.value })} /></Field>
        </SettingsCard>
      ))}
      <div style={{ display: "flex", gap: 8 }}>
        <Button variant="primary" disabled={!canManage || !dirty || saver.busy} onClick={() => void saver.run(async () => { await settingsApi.saveWorkspace({ callAnalyzer: { language, frameworks } }); reload(); }, "Saved.")}>Save</Button>
        <Button disabled={!canManage} onClick={() => setFrameworks(Object.fromEntries(CALL_TYPES.map(([k]) => [k, ""])))}>Reset all to default</Button>
      </div>
      <p className="sv-hint">These settings are stored now and used when the Sales Call Analyzer arrives.</p>
    </SettingsPageFrame>
  );
}

// ---- Developer docs ----
const BASE = ((import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:3001").replace(/\/$/, "");
const ENDPOINTS: Array<[string, string, string]> = [
  ["GET", "/api/v1/campaigns/overview", "Campaigns with sent, reply and booked counts"],
  ["GET", "/api/v1/ai-sdr/threads", "Conversations in the AI SDR inbox"],
  ["GET", "/api/v1/crm/tasks", "CRM tasks (also POST to create one)"],
  ["GET", "/api/v1/crm/deals", "CRM deals (also POST to create one)"],
  ["GET", "/api/v1/crm/people", "People from your lead library"],
  ["GET", "/api/v1/settings/blocklist", "The cold email blocklist (POST to add addresses)"],
  ["GET", "/api/v1/email-accounts/inboxes", "Inboxes with health and warm-up status"],
];

export function SettingsDeveloperDocs() {
  useSvTitle([{ label: "Developer Docs" }]);
  return (
    <SettingsPageFrame title="Developer Docs" subtitle="Use the SendVybe API from your own tools">
      <SettingsCard title="Authentication" description="Create a token under Access Tokens (acts as you) or Connected Apps & API Keys (shared by the workspace), then send it as a bearer token.">
        <pre className="sv-code">{`curl ${BASE}/api/v1/crm/tasks \\\n  -H "Authorization: Bearer sv_pt_your_token_here"`}</pre>
        <p className="sv-hint">A token works inside the workspace it was created in and can do what its creator can. A token can't create or revoke other tokens. Responses are JSON shaped as <code>{`{ "success": true, "data": … }`}</code>; errors use <code>success: false</code> and a <code>message</code>.</p>
      </SettingsCard>
      <SettingsCard title="Useful endpoints" description="Base URL for your install:">
        <code>{BASE}</code>
        <ul className="sv-dash-list">{ENDPOINTS.map(([method, path, what]) => <li key={path}><span><Badge tone={method === "GET" ? "green" : "blue"}>{method}</Badge> <code>{path}</code></span><span className="sv-hint">{what}</span></li>)}</ul>
        <p className="sv-hint">This is a starting list, not a full reference. Most pages in the app use the same endpoints, so your browser's network tab shows the rest.</p>
      </SettingsCard>
    </SettingsPageFrame>
  );
}
