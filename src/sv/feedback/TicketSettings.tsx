import { useCallback, useEffect, useState } from "react";
import { feedbackApi, type AsanaOption, type AsanaStatus, type TicketSettings as Settings } from "../api/feedback";
import { Badge, Button, Card, Field } from "../ui";

const DURATIONS = [{ v: 120, l: "2 minutes" }, { v: 300, l: "5 minutes" }, { v: 600, l: "10 minutes" }, { v: 900, l: "15 minutes" }];

/** Team-only: recording limits, transcription, and where the automatic Asana tasks go. */
export function TicketSettings() {
  const [cfg, setCfg] = useState<Settings | null>(null);
  const [asana, setAsana] = useState<AsanaStatus | null>(null);
  const [token, setToken] = useState("");
  const [workspaces, setWorkspaces] = useState<AsanaOption[]>([]);
  const [projects, setProjects] = useState<AsanaOption[]>([]);
  const [people, setPeople] = useState<AsanaOption[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const fail = (e: unknown) => setMsg({ ok: false, text: e instanceof Error ? e.message : "Something went wrong." });

  const loadAsanaLists = useCallback(async (c: Settings) => {
    try {
      setWorkspaces(await feedbackApi.asanaWorkspaces());
      if (c.asana.workspaceGid) {
        setProjects(await feedbackApi.asanaProjects(c.asana.workspaceGid));
        setPeople(await feedbackApi.asanaUsers(c.asana.workspaceGid));
      } else { setProjects([]); setPeople([]); }
    } catch (e) { fail(e); }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [c, a] = await Promise.all([feedbackApi.settings(), feedbackApi.asanaStatus()]);
        setCfg(c); setAsana(a);
        if (a.connected) await loadAsanaLists(c);
      } catch (e) { fail(e); }
    })();
  }, [loadAsanaLists]);

  async function save(patch: Parameters<typeof feedbackApi.saveSettings>[0], reloadLists = false) {
    setBusy(true); setMsg(null);
    try {
      const next = await feedbackApi.saveSettings(patch);
      setCfg(next);
      setMsg({ ok: true, text: "Saved." });
      if (reloadLists) await loadAsanaLists(next);
    } catch (e) { fail(e); } finally { setBusy(false); }
  }

  async function connect() {
    setBusy(true); setMsg(null);
    try {
      const a = await feedbackApi.asanaConnect(token.trim());
      setAsana(a); setToken("");
      if (cfg) await loadAsanaLists(cfg);
    } catch (e) { fail(e); } finally { setBusy(false); }
  }

  if (!cfg) return msg ? <p className="sv-fb-error" role="alert">{msg.text}</p> : <p className="sv-hint">Loading…</p>;
  const name = (list: AsanaOption[], gid: string) => list.find((o) => o.gid === gid)?.name ?? null;

  return (
    <div className="sv-fb-settings">
      {msg ? <p className={msg.ok ? "sv-hint" : "sv-fb-error"} role={msg.ok ? "status" : "alert"}>{msg.text}</p> : null}

      <Card>
        <div className="sv-fb-pad">
          <h3 className="sv-set-title">Recordings and voice</h3>
          <div className="sv-fb-grid">
            <Field label="Longest recording" htmlFor="fb-dur">
              <select id="fb-dur" className="sv-select" value={cfg.maxDurationSeconds} disabled={busy} onChange={(e) => void save({ maxDurationSeconds: Number(e.target.value) })}>
                {DURATIONS.concat(DURATIONS.some((d) => d.v === cfg.maxDurationSeconds) ? [] : [{ v: cfg.maxDurationSeconds, l: `${cfg.maxDurationSeconds} seconds` }]).map((d) => <option key={d.v} value={d.v}>{d.l}</option>)}
              </select>
            </Field>
            <Field label="Video quality" htmlFor="fb-h">
              <select id="fb-h" className="sv-select" value={cfg.maxHeight} disabled={busy} onChange={(e) => void save({ maxHeight: Number(e.target.value) })}>
                {[360, 480, 720].map((h) => <option key={h} value={h}>{h}p</option>)}
              </select>
            </Field>
            <Field label="Voice to text" htmlFor="fb-tr">
              <select id="fb-tr" className="sv-select" value={cfg.transcription.provider} disabled={busy} onChange={(e) => void save({ transcription: { provider: e.target.value as "openai" | "internal" } })}>
                <option value="openai">Transcribe with OpenAI</option>
                <option value="internal">Internal only (keep the recording, no transcript)</option>
              </select>
            </Field>
            <Field label="Storage folder (blank for the default)" htmlFor="fb-s3">
              <input id="fb-s3" className="sv-input" defaultValue={cfg.s3Prefix} placeholder="feedback" disabled={busy} onBlur={(e) => e.target.value.trim() !== cfg.s3Prefix && void save({ s3Prefix: e.target.value.trim() })} />
            </Field>
          </div>
        </div>
      </Card>

      <Card>
        <div className="sv-fb-pad">
          <h3 className="sv-set-title">Asana</h3>
          <p className="sv-hint">Every new ticket becomes a task in the project you choose here, through your own Asana account.</p>

          {asana?.connections.map((c) => (
            <div key={c.id} className="sv-fb-conn">
              <span><strong>{c.accountName || "Asana account"}</strong>{c.accountEmail ? ` · ${c.accountEmail}` : ""}</span>
              <Badge tone={c.status === "connected" ? "green" : "red"}>{c.status === "connected" ? "Connected" : "Needs reconnect"}</Badge>
              <Button size="sm" disabled={busy} onClick={async () => { try { setAsana(await feedbackApi.asanaTest(c.id)); setMsg({ ok: true, text: "Connection works." }); } catch (e) { fail(e); setAsana(await feedbackApi.asanaStatus().catch(() => asana)); } }}>Test</Button>
              <Button size="sm" variant="danger" disabled={busy} onClick={async () => { try { setAsana(await feedbackApi.asanaDisconnect(c.id)); } catch (e) { fail(e); } }}>Disconnect</Button>
            </div>
          ))}

          <div className="sv-fb-connect">
            <input className="sv-input" type="password" autoComplete="off" value={token} placeholder="Paste an Asana personal access token" aria-label="Asana personal access token" onChange={(e) => setToken(e.target.value)} />
            <Button variant="primary" disabled={busy || token.trim().length < 20} onClick={() => void connect()}>Connect</Button>
          </div>
          <p className="sv-hint">Create one at app.asana.com/0/my-apps. It is stored encrypted and never shown again.</p>

          {asana?.connected ? (
            <div className="sv-fb-grid">
              <Field label="Workspace" htmlFor="fb-ws">
                <select id="fb-ws" className="sv-select" value={cfg.asana.workspaceGid ?? ""} disabled={busy} onChange={(e) => { const gid = e.target.value; void save({ asana: gid ? { workspaceGid: gid, workspaceName: name(workspaces, gid) } : { workspaceGid: null } }, true); }}>
                  <option value="">Not set</option>
                  {workspaces.map((w) => <option key={w.gid} value={w.gid}>{w.name}</option>)}
                </select>
              </Field>
              <Field label="Project" htmlFor="fb-pr">
                <select id="fb-pr" className="sv-select" value={cfg.asana.projectGid ?? ""} disabled={busy || !cfg.asana.workspaceGid} onChange={(e) => { const gid = e.target.value; void save({ asana: { projectGid: gid || null, projectName: gid ? name(projects, gid) : null } }); }}>
                  <option value="">Not set</option>
                  {projects.map((p) => <option key={p.gid} value={p.gid}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Assign to (optional)" htmlFor="fb-as">
                <select id="fb-as" className="sv-select" value={cfg.asana.assigneeGid ?? ""} disabled={busy || !cfg.asana.workspaceGid} onChange={(e) => { const gid = e.target.value; void save({ asana: { assigneeGid: gid || null, assigneeName: gid ? name(people, gid) : null } }); }}>
                  <option value="">Nobody</option>
                  {people.map((p) => <option key={p.gid} value={p.gid}>{p.name}</option>)}
                </select>
              </Field>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
