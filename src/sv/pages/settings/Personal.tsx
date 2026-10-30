import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Check, Copy, Eye, EyeOff, Monitor, Moon, Play, Plus, Sun, Trash2 } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../hooks/useTheme";
import { userService } from "../../../services/api";
import { settingsApi, type ApiToken, type NotificationPrefs, type Theme } from "../../api/settings";
import { useSvTitle } from "../../layout/chrome";
import { mainNav } from "../../nav";
import { usePrefs } from "../../prefs";
import { playTone } from "../../sound";
import { Badge, Button, Card, Field, Modal, SettingsCard, SkeletonCard } from "../../ui";
import { ConfirmModal, dateTimeText, Notice, ReadOnlyNote, SettingsPageFrame, SwitchRow, useCanManage, useRemote, useSaver } from "./shared";

const SOUND_LABEL: Record<string, string> = { classic: "Classic", soft: "Soft", bright: "Bright", off: "Off", chime: "Chime", pop: "Pop", alert: "Alert", double: "Double beep", success: "Success", sparkle: "Sparkle" };
const SOUND_ROWS = [["ringtone", "Calls and meetings"], ["message", "Email replies"], ["escalation", "Escalations"], ["positive", "Positive replies"]] as const;
const INTERRUPTS = [["calls", "Calls and meetings", "Booked calls starting soon"], ["textReplies", "Email replies", "A prospect writes back"], ["escalations", "Escalations", "The AI SDR needs a person"], ["positiveReplies", "Positive replies", "A prospect shows strong interest"], ["paymentProblems", "Plan and billing problems", "Trial ending or a limit reached"]] as const;

// ---- Notifications ----
export function SettingsNotifications() {
  useSvTitle([{ label: "Notifications" }]);
  const { prefs, save } = usePrefs();
  const [draft, setDraft] = useState<NotificationPrefs | null>(null);
  const saver = useSaver();
  useEffect(() => { if (prefs && !draft) setDraft(prefs.notifications); }, [prefs, draft]);
  const permission = typeof Notification === "undefined" ? "unsupported" : Notification.permission;
  const [perm, setPerm] = useState(permission);
  if (!prefs || !draft) return <SettingsPageFrame title="Notifications" subtitle="Choose how SendVybe gets your attention"><div className="sv-stack">{[0, 1, 2].map((i) => <SkeletonCard key={i} lines={3} />)}</div></SettingsPageFrame>;
  const dirty = JSON.stringify(draft) !== JSON.stringify(prefs.notifications);
  const timezones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : ["UTC"];

  async function enableDesktop() {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPerm(result);
    if (result === "granted") await saver.run(async () => { const next = await save({ notifications: { desktop: true } }); setDraft((d) => (d ? { ...d, desktop: next.notifications.desktop } : d)); }, "Desktop notifications are on.");
    else saver.setNotice({ tone: "error", text: "Your browser blocked notifications. Allow them for this site in the browser's site settings, then try again." });
  }
  function sendTest() {
    if (draft?.sounds.enabled) playTone(draft.sounds.message);
    if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification("SendVybe", { body: "This is a test notification." });
    else saver.setNotice({ tone: "error", text: "Turn on desktop notifications first." });
  }
  const set = (next: NotificationPrefs) => setDraft(next);

  return (
    <SettingsPageFrame title="Notifications" subtitle="Choose how SendVybe gets your attention">
      {saver.notice ? <Notice tone={saver.notice.tone}>{saver.notice.text}</Notice> : null}
      <SettingsCard title="Desktop notifications" description="Pop-ups while SendVybe is open in a browser tab.">
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Badge tone={perm === "granted" && prefs.notifications.desktop ? "green" : "neutral"}>{perm === "unsupported" ? "Not supported by this browser" : perm === "granted" && prefs.notifications.desktop ? "Enabled" : perm === "denied" ? "Blocked in browser" : "Off"}</Badge>
          {perm !== "unsupported" && !(perm === "granted" && prefs.notifications.desktop) ? <Button variant="primary" onClick={() => void enableDesktop()}>Enable</Button> : null}
          {perm === "granted" && prefs.notifications.desktop ? <Button onClick={() => void saver.run(async () => { const next = await save({ notifications: { desktop: false } }); setDraft((d) => (d ? { ...d, desktop: next.notifications.desktop } : d)); }, "Desktop notifications are off.")}>Turn off</Button> : null}
          <Button onClick={sendTest}>Send test</Button>
        </div>
        <p className="sv-hint">Alerts appear only while the app is open. Closing the tab stops them.</p>
      </SettingsCard>

      <SettingsCard title="Sounds" description="Pick a tone for each kind of event. Use the play button to hear it.">
        <SwitchRow label="Play sounds" checked={draft.sounds.enabled} onChange={(v) => set({ ...draft, sounds: { ...draft.sounds, enabled: v } })} />
        {SOUND_ROWS.map(([key, label]) => (
          <Field key={key} label={label} htmlFor={`snd-${key}`}>
            <div style={{ display: "flex", gap: 8 }}>
              <select id={`snd-${key}`} className="sv-select" disabled={!draft.sounds.enabled} value={draft.sounds[key]} onChange={(e) => set({ ...draft, sounds: { ...draft.sounds, [key]: e.target.value } })}>{prefs.soundOptions[key].map((o) => <option key={o} value={o}>{SOUND_LABEL[o] ?? o}</option>)}</select>
              <Button icon={Play} aria-label={`Play ${label} sound`} onClick={() => playTone(draft.sounds[key])} />
            </div>
          </Field>
        ))}
      </SettingsCard>

      <SettingsCard title="What interrupts you" description="Turn off events you don't want a sound or pop-up for.">
        {INTERRUPTS.map(([key, label, hint]) => <SwitchRow key={key} label={label} hint={hint} checked={draft.interrupts[key]} onChange={(v) => set({ ...draft, interrupts: { ...draft.interrupts, [key]: v } })} />)}
      </SettingsCard>

      <SettingsCard title="Quiet hours" description="No sounds or pop-ups during these hours.">
        <SwitchRow label="Enable quiet hours" checked={draft.quiet.enabled} onChange={(v) => set({ ...draft, quiet: { ...draft.quiet, enabled: v } })} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="From" htmlFor="q-from"><input id="q-from" type="time" className="sv-input" disabled={!draft.quiet.enabled} value={draft.quiet.from} onChange={(e) => set({ ...draft, quiet: { ...draft.quiet, from: e.target.value } })} /></Field>
          <Field label="To" htmlFor="q-to"><input id="q-to" type="time" className="sv-input" disabled={!draft.quiet.enabled} value={draft.quiet.to} onChange={(e) => set({ ...draft, quiet: { ...draft.quiet, to: e.target.value } })} /></Field>
        </div>
        <Field label="Time zone" htmlFor="q-tz"><select id="q-tz" className="sv-select" disabled={!draft.quiet.enabled} value={draft.quiet.timezone} onChange={(e) => set({ ...draft, quiet: { ...draft.quiet, timezone: e.target.value } })}>{timezones.includes(draft.quiet.timezone) ? null : <option value={draft.quiet.timezone}>{draft.quiet.timezone}</option>}{timezones.map((z) => <option key={z} value={z}>{z}</option>)}</select></Field>
      </SettingsCard>
      <div><Button variant="primary" disabled={!dirty || saver.busy} onClick={() => void saver.run(async () => { const next = await save({ notifications: draft }); setDraft(next.notifications); }, "Notification settings saved.")}>{saver.busy ? "Saving…" : "Save changes"}</Button></div>
    </SettingsPageFrame>
  );
}

// ---- Appearance ----
const THEME_CARDS: Array<{ value: Theme; label: string; icon: typeof Sun }> = [{ value: "light", label: "Light", icon: Sun }, { value: "dark", label: "Dark", icon: Moon }, { value: "system", label: "System", icon: Monitor }];
const ALWAYS_VISIBLE = ["settings/profile", "dashboard"];

export function SettingsAppearance() {
  useSvTitle([{ label: "Appearance" }]);
  const { prefs, save } = usePrefs();
  const { preference, setPreference } = useTheme();
  const saver = useSaver();
  const sidebarSaver = useSaver();
  const [hidden, setHidden] = useState<string[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [order, setOrder] = useState<Record<string, string[]>>({});
  useEffect(() => { if (prefs) { setHidden(prefs.appearance.sidebar.hidden); setNames(prefs.appearance.sidebar.groupNames); setOrder(prefs.appearance.sidebar.order); } }, [prefs]);

  const groups = useMemo(() => mainNav.filter((g) => g.label).map((g) => {
    const saved = order[g.label as string] ?? [];
    const rank = (to: string) => { const i = saved.indexOf(to); return i === -1 ? 999 : i; };
    return { label: g.label as string, items: [...g.items].sort((a, b) => rank(a.to) - rank(b.to)) };
  }), [order]);
  if (!prefs) return <SettingsPageFrame title="Appearance" subtitle="Make SendVybe look the way you like"><div className="sv-stack">{[0, 1, 2].map((i) => <SkeletonCard key={i} lines={3} />)}</div></SettingsPageFrame>;

  const dirty = JSON.stringify([hidden, names, order]) !== JSON.stringify([prefs.appearance.sidebar.hidden, prefs.appearance.sidebar.groupNames, prefs.appearance.sidebar.order]);
  const move = (label: string, to: string, delta: -1 | 1) => {
    const list = (groups.find((g) => g.label === label)?.items ?? []).map((i) => i.to);
    const i = list.indexOf(to), j = i + delta;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    setOrder({ ...order, [label]: list });
  };

  return (
    <SettingsPageFrame title="Appearance" subtitle="Make SendVybe look the way you like">
      <SettingsCard title="Theme" description="Choose light, dark, or follow your device.">
        {saver.notice?.tone === "error" ? <Notice tone="error">{saver.notice.text}</Notice> : null}
        <div className="sv-theme-cards">
          {THEME_CARDS.map(({ value, label, icon: Icon }) => (
            <button key={value} type="button" className={`sv-theme-card${preference === value ? " is-active" : ""}`} aria-pressed={preference === value} onClick={() => { setPreference(value === "system" ? "system" : value); void saver.run(() => save({ appearance: { theme: value } }), "Saved."); }}>
              <Icon className="sv-icon" aria-hidden /> {label} {preference === value ? <Check className="sv-icon" aria-hidden /> : null}
            </button>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard title="Edit sidebar" description="Reorder pages, hide the ones you don't use, and rename groups. Dashboard and Settings always stay.">
        {sidebarSaver.notice ? <Notice tone={sidebarSaver.notice.tone}>{sidebarSaver.notice.text}</Notice> : null}
        {groups.map((group) => (
          <div key={group.label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <input className="sv-input" aria-label={`Name for ${group.label}`} value={names[group.label] ?? group.label} onChange={(e) => setNames({ ...names, [group.label]: e.target.value })} style={{ fontWeight: 500 }} />
            {group.items.map((item, index) => {
              const off = hidden.includes(item.to);
              return (
                <div key={item.to} className="sv-sidebar-edit-row" style={{ opacity: off ? 0.55 : 1 }}>
                  <item.icon className="sv-icon" aria-hidden /><span style={{ flex: 1 }}>{item.label}</span>
                  <button type="button" className="sv-icon-btn" aria-label={`Move ${item.label} up`} disabled={index === 0} onClick={() => move(group.label, item.to, -1)}><ArrowUp className="sv-icon" aria-hidden /></button>
                  <button type="button" className="sv-icon-btn" aria-label={`Move ${item.label} down`} disabled={index === group.items.length - 1} onClick={() => move(group.label, item.to, 1)}><ArrowDown className="sv-icon" aria-hidden /></button>
                  <button type="button" className="sv-icon-btn" aria-label={off ? `Show ${item.label}` : `Hide ${item.label}`} disabled={ALWAYS_VISIBLE.includes(item.to)} onClick={() => setHidden(off ? hidden.filter((h) => h !== item.to) : [...hidden, item.to])}>{off ? <EyeOff className="sv-icon" aria-hidden /> : <Eye className="sv-icon" aria-hidden />}</button>
                </div>
              );
            })}
          </div>
        ))}
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="primary" disabled={!dirty || sidebarSaver.busy} onClick={() => void sidebarSaver.run(() => save({ appearance: { sidebar: { hidden, groupNames: Object.fromEntries(Object.entries(names).filter(([k, v]) => v.trim() && v.trim() !== k)), order } } }), "Sidebar updated.")}>Save sidebar</Button>
          <Button onClick={() => { setHidden([]); setNames({}); setOrder({}); }} disabled={!hidden.length && !Object.keys(names).length && !Object.keys(order).length}>Reset to default</Button>
        </div>
      </SettingsCard>
    </SettingsPageFrame>
  );
}

// ---- Security ----
export function SettingsSecurity() {
  useSvTitle([{ label: "Security" }]);
  const { user, logout } = useAuth();
  const saver = useSaver();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const problem = next && next.length < 12 ? "Use at least 12 characters." : again && next !== again ? "The new passwords don't match." : "";

  async function submit(event: FormEvent) {
    event.preventDefault();
    const ok = await saver.run(() => userService.changePassword({ currentPassword: current, newPassword: next }), "Password updated.");
    if (ok) { setCurrent(""); setNext(""); setAgain(""); }
  }
  return (
    <SettingsPageFrame title="Security" subtitle="Keep your account safe">
      <SettingsCard title="Update password" description="Use at least 12 characters. You stay signed in on this device.">
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {saver.notice ? <Notice tone={saver.notice.tone}>{saver.notice.text}</Notice> : null}
          <Field label="Current password" htmlFor="pw-cur"><input id="pw-cur" type="password" autoComplete="current-password" className="sv-input" value={current} onChange={(e) => setCurrent(e.target.value)} /></Field>
          <Field label="New password" htmlFor="pw-new"><input id="pw-new" type="password" autoComplete="new-password" className="sv-input" value={next} onChange={(e) => setNext(e.target.value)} /></Field>
          <Field label="Confirm new password" htmlFor="pw-again"><input id="pw-again" type="password" autoComplete="new-password" className="sv-input" value={again} onChange={(e) => setAgain(e.target.value)} /></Field>
          {problem ? <span className="sv-hint" style={{ color: "var(--ds-red-text)" }}>{problem}</span> : null}
          <div><Button variant="primary" type="submit" disabled={saver.busy || !current || !next || Boolean(problem) || next !== again}>{saver.busy ? "Updating…" : "Update password"}</Button></div>
        </form>
      </SettingsCard>
      <SettingsCard title="Two-factor authentication" description="An extra code when you sign in.">
        <div><Badge>Not available yet</Badge></div>
        <p className="sv-hint">Two-factor sign-in isn't built into this version. Until it is, use a long, unique password.</p>
      </SettingsCard>
      <SettingsCard title="This device" description={`You're signed in as ${user?.email ?? ""}.`}>
        <p className="sv-hint">A list of every device you're signed in on isn't available yet. If you lose a device, change your password above.</p>
        <div><Button onClick={() => void logout()}>Sign out of this device</Button></div>
      </SettingsCard>
    </SettingsPageFrame>
  );
}

// ---- Conferencing ----
export function SettingsConferencing() {
  useSvTitle([{ label: "Conferencing" }]);
  const canManage = useCanManage();
  const { data, reload } = useRemote(() => settingsApi.workspace(), []);
  const saver = useSaver();
  const [type, setType] = useState<"google_meet" | "static">("google_meet");
  const [url, setUrl] = useState("");
  useEffect(() => { if (data) { setType(data.conferencing.type); setUrl(data.conferencing.staticUrl); } }, [data]);
  const dirty = data ? type !== data.conferencing.type || (type === "static" && url !== data.conferencing.staticUrl) : false;
  return (
    <SettingsPageFrame title="Conferencing" subtitle="How meetings booked by the AI SDR get a video link">
      {!canManage ? <ReadOnlyNote /> : null}
      <SettingsCard title="Meeting link" description="Applies to every call the AI SDR books for this workspace.">
        {saver.notice ? <Notice tone={saver.notice.tone}>{saver.notice.text}</Notice> : null}
        <div className="sv-choice-list" role="radiogroup" aria-label="Meeting link type">
          {([["google_meet", "A new Google Meet link for each meeting", "Needs a connected Google Calendar. Each booking gets its own room."], ["static", "One fixed link for every meeting", "Your own Zoom, Teams or other room. Everyone joins the same link."]] as const).map(([value, title, hint]) => (
            <label key={value} className={`sv-choice${type === value ? " is-active" : ""}`}>
              <input type="radio" name="conf" checked={type === value} disabled={!canManage} onChange={() => setType(value)} />
              <span><b>{title}</b><br /><span className="sv-hint">{hint}</span></span>
            </label>
          ))}
          <label className="sv-choice" style={{ opacity: 0.6 }}><input type="radio" disabled /><span><b>Dynamic Zoom links</b> <Badge>Coming soon</Badge><br /><span className="sv-hint">Needs a Zoom connection, which isn't set up yet.</span></span></label>
        </div>
        {type === "static" ? <Field label="Meeting link" htmlFor="conf-url"><input id="conf-url" className="sv-input" placeholder="https://zoom.us/j/123456789" disabled={!canManage} value={url} onChange={(e) => setUrl(e.target.value)} /></Field> : null}
        <div><Button variant="primary" disabled={!canManage || !dirty || saver.busy} onClick={() => void saver.run(async () => { await settingsApi.saveWorkspace({ conferencing: { type, ...(type === "static" ? { staticUrl: url } : {}) } }); reload(); })}>Save</Button></div>
      </SettingsCard>
    </SettingsPageFrame>
  );
}

// ---- Tokens (shared by Access Tokens and Connected Apps & API Keys) ----
export function TokenManager({ kind, canCreate, emptyText }: { kind: "personal" | "workspace"; canCreate: boolean; emptyText: string }) {
  const { data, error, reload } = useRemote(() => settingsApi.tokens(kind), [kind]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<ApiToken | null>(null);
  const saver = useSaver();

  async function create() {
    const ok = await saver.run(async () => { const r = await settingsApi.createToken(kind, name); setFresh(r.token); setCreating(false); setName(""); reload(); }, "");
    if (ok) saver.setNotice(null);
  }
  return (
    <>
      {saver.notice?.tone === "error" ? <Notice tone="error">{saver.notice.text}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Card>
        <div className="sv-table-wrap">
          <table className="sv-table">
            <thead><tr><th>Name</th><th>Token</th>{kind === "workspace" ? <th>Created by</th> : null}<th>Last used</th><th style={{ width: 50 }} /></tr></thead>
            <tbody>
              {data?.map((t) => (
                <tr key={t.id}><td style={{ fontWeight: 500 }}>{t.name}</td><td><code>{t.prefix}…</code></td>{kind === "workspace" ? <td>{t.createdBy ?? "—"}</td> : null}<td>{dateTimeText(t.lastUsedAt)}</td>
                  <td>{kind === "personal" || canCreate ? <button type="button" className="sv-icon-btn" aria-label={`Revoke ${t.name}`} onClick={() => setRevoking(t)}><Trash2 className="sv-icon" aria-hidden /></button> : null}</td></tr>
              ))}
            </tbody>
          </table>
          {data && data.length === 0 ? <p className="sv-hint" style={{ padding: 20, margin: 0 }}>{emptyText}</p> : null}
        </div>
      </Card>
      {canCreate ? <div><Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>Create token</Button></div> : null}

      <Modal open={creating} title="Create token" onClose={() => setCreating(false)} footer={<><Button onClick={() => setCreating(false)}>Cancel</Button><Button variant="primary" disabled={!name.trim() || saver.busy} onClick={() => void create()}>Create</Button></>}>
        <Field label="Name" htmlFor="tok-name"><input id="tok-name" className="sv-input" placeholder="Zapier, CI, my script…" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
        <p className="sv-hint">The token acts as you in this workspace. Anyone who has it can do what you can, so treat it like a password.</p>
      </Modal>
      <Modal open={fresh !== null} title="Copy your token now" onClose={() => { setFresh(null); setCopied(false); }} footer={<Button variant="primary" onClick={() => { setFresh(null); setCopied(false); }}>Done</Button>}>
        <p className="sv-hint">This is the only time the full token is shown. Store it somewhere safe.</p>
        <div style={{ display: "flex", gap: 8 }}><input className="sv-input" aria-label="Your new token" readOnly value={fresh ?? ""} onFocus={(e) => e.currentTarget.select()} style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }} /><Button icon={copied ? Check : Copy} onClick={() => { void navigator.clipboard?.writeText(fresh ?? "").then(() => setCopied(true)).catch(() => {}); }}>{copied ? "Copied" : "Copy"}</Button></div>
      </Modal>
      {revoking ? <ConfirmModal title="Revoke token" confirmLabel="Revoke" body={<>Anything using <b>{revoking.name}</b> will stop working right away. This can't be undone.</>} onClose={() => setRevoking(null)} onConfirm={async () => { await settingsApi.revokeToken(revoking.id).catch((caught) => saver.setNotice({ tone: "error", text: errorTextOf(caught) })); reload(); }} /> : null}
    </>
  );
}
const errorTextOf = (caught: unknown) => (caught instanceof Error ? caught.message : "Something went wrong.");

export function SettingsAccessTokens() {
  useSvTitle([{ label: "Access Tokens" }]);
  return (
    <SettingsPageFrame title="Access Tokens" subtitle="Personal tokens for scripts and tools that act as you">
      <TokenManager kind="personal" canCreate emptyText="No tokens yet. Create one to call the API from your own scripts." />
    </SettingsPageFrame>
  );
}
