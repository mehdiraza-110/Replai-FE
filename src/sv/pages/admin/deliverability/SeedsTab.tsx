import { useState } from "react";
import { Plus } from "lucide-react";
import { errorMessage } from "../../../../services/adminApi";
import { warmnetApi, type SeedPreset, type SeedProvider, type SeedTestResult, type WarmSeed } from "../../../../services/warmnetApi";
import { Badge, Button, Modal, SkeletonRows } from "../../../ui";
import { ConfirmModal } from "../domainParts";
import { DataTable, EmptyRow, Err, Fld, fmtDateTime, LevelNote, Panel, useLoad, type Notify } from "./shared";

const PROVIDER_LABEL: Record<SeedProvider, string> = { gmail: "Gmail / Google Workspace", outlook: "Outlook / Microsoft 365", yahoo: "Yahoo", other: "Other (IMAP + SMTP)" };
const PROVIDER_HELP: Record<SeedProvider, string> = {
  gmail: "Turn on 2-step verification, then create an app password at myaccount.google.com/apppasswords. IMAP must be enabled in Gmail settings (Forwarding and POP/IMAP). Use the 16-character app password, not the account password.",
  outlook: "Turn on two-step verification and create an app password in the Microsoft account security page. IMAP must be allowed for the account. Some work or school tenants block app passwords.",
  yahoo: "Create an app password under Account security, then Generate app password. Use it here instead of the account password.",
  other: "Enter the IMAP and SMTP details from the provider. The login must work with a password or app password.",
};
const BLANK = { email: "", displayName: "", provider: "gmail" as SeedProvider, password: "", dailyReceiveCap: 60, imapHost: "", imapPort: 993, smtpHost: "", smtpPort: 465 };
const statusTone = (s: WarmSeed["status"]) => (s === "active" ? "green" : s === "error" ? "red" : "yellow");

export function SeedsTab({ notify }: { notify: Notify }) {
  const list = useLoad(() => warmnetApi.listSeeds(), []);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [actionError, setActionError] = useState("");
  const [testing, setTesting] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<{ seed: WarmSeed; result: SeedTestResult } | null>(null);
  const [editing, setEditing] = useState<WarmSeed | null>(null);
  const [cap, setCap] = useState(60);
  const [deleting, setDeleting] = useState<WarmSeed | null>(null);

  const presets: Record<string, SeedPreset> = list.data?.presets ?? {};
  const seeds = list.data?.items ?? [];
  const preset = presets[form.provider];
  const isOther = form.provider === "other";
  const imapHost = isOther ? form.imapHost : preset?.imapHost ?? "";
  const imapPort = isOther ? form.imapPort : preset?.imapPort ?? 993;
  const smtpHost = isOther ? form.smtpHost : preset?.smtpHost ?? "";
  const smtpPort = isOther ? form.smtpPort : preset?.smtpPort ?? 465;
  const set = <K extends keyof typeof BLANK>(key: K, value: (typeof BLANK)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const closeAdd = () => { setAddOpen(false); setForm(BLANK); setFormError(""); };
  const canSave = form.email.includes("@") && form.password.length > 0 && (!isOther || (imapHost && smtpHost));

  async function create() {
    setBusy(true); setFormError("");
    try {
      await warmnetApi.createSeed({ email: form.email.trim(), displayName: form.displayName.trim() || undefined, provider: form.provider, password: form.password, dailyReceiveCap: form.dailyReceiveCap, ...(isOther ? { imapHost, imapPort, smtpHost, smtpPort } : {}) });
      notify("Seed inbox added. Use Test to confirm the login works.");
      closeAdd(); await list.reload();
    } catch (e) { setFormError(errorMessage(e, "Unable to add this seed inbox.")); } finally { setBusy(false); }
  }
  async function test(seed: WarmSeed) {
    setTesting(seed.id); setActionError("");
    try { setTestResult({ seed, result: await warmnetApi.testSeed(seed.id) }); await list.reload(); }
    catch (e) { setActionError(errorMessage(e, "Unable to test this seed inbox.")); } finally { setTesting(null); }
  }
  async function patch(seed: WarmSeed, body: { status?: "active" | "paused"; dailyReceiveCap?: number }, done: string) {
    setBusy(true); setActionError("");
    try { await warmnetApi.updateSeed(seed.id, body); notify(done); setEditing(null); await list.reload(); }
    catch (e) { setActionError(errorMessage(e, "Unable to update this seed inbox.")); } finally { setBusy(false); }
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try { await warmnetApi.deleteSeed(deleting.id); notify("Seed inbox removed."); setDeleting(null); await list.reload(); }
    catch (e) { setActionError(errorMessage(e, "Unable to remove this seed inbox.")); setDeleting(null); } finally { setBusy(false); }
  }

  return (
    <div className="sv-stack">
      <Err message={actionError} />
      <Err message={list.error} onRetry={() => void list.reload()} />
      <Panel title="Seed inboxes" description="Real mailboxes we control. They receive the warm-up mail, pull it out of spam, read it, star some and reply. Passwords are stored encrypted and never shown." actions={<Button variant="primary" icon={Plus} onClick={() => setAddOpen(true)}>Add seed inbox</Button>}>
        <DataTable minWidth={1080} head={<><th>Inbox</th><th>Status</th><th>Daily cap</th><th>Received</th><th>Last 7 days</th><th>Last polled</th><th className="is-right">Actions</th></>}>
          {list.isLoading && !list.data ? <SkeletonRows columns={7} />
            : seeds.length === 0 ? <EmptyRow columns={7}>No seed inboxes yet. Warm-up cannot send until at least one is added.</EmptyRow>
            : seeds.map((s) => (
              <tr key={s.id}>
                <td><div className="ops-strong">{s.email}</div><p className="ops-sub">{PROVIDER_LABEL[s.provider]}{s.displayName ? ` - ${s.displayName}` : ""}</p></td>
                <td><Badge tone={statusTone(s.status)}>{s.status === "error" ? "Login problem" : s.status === "paused" ? "Paused" : "Active"}</Badge>{s.lastError ? <p className="ops-sub" style={{ color: "#e5484d", maxWidth: 260 }}>{s.lastError}</p> : null}</td>
                <td>{s.dailyReceiveCap}/day</td>
                <td>{s.receivedToday} today<p className="ops-sub">{s.received7d} in 7 days</p></td>
                <td className="ops-muted" style={{ fontSize: 12 }}>{s.inbox7d} inbox, {s.spam7d} spam<br />{s.replies7d} replies sent</td>
                <td className="ops-muted" style={{ fontSize: 12 }}>{fmtDateTime(s.lastPolledAt)}</td>
                <td className="is-right"><span className="sv-actions" style={{ justifyContent: "flex-end" }}>
                  <Button size="sm" disabled={testing === s.id} onClick={() => void test(s)}>{testing === s.id ? "Testing…" : "Test"}</Button>
                  <Button size="sm" disabled={busy} onClick={() => void patch(s, { status: s.status === "active" ? "paused" : "active" }, s.status === "active" ? "Seed inbox paused." : "Seed inbox activated.")}>{s.status === "active" ? "Pause" : "Activate"}</Button>
                  <Button size="sm" onClick={() => { setEditing(s); setCap(s.dailyReceiveCap); }}>Edit cap</Button>
                  <Button size="sm" onClick={() => setDeleting(s)}>Delete</Button>
                </span></td>
              </tr>
            ))}
        </DataTable>
      </Panel>

      <Modal open={addOpen} wide title="Add seed inbox" onClose={closeAdd} footer={<><Button disabled={busy} onClick={closeAdd}>Cancel</Button><Button variant="primary" disabled={busy || !canSave} onClick={() => void create()}>{busy ? "Adding…" : "Add seed inbox"}</Button></>}>
        <form style={{ display: "grid", gap: 14 }} onSubmit={(e) => { e.preventDefault(); if (canSave && !busy) void create(); }}>
          <Err message={formError} />
          <div className="ops-grid-2">
            <Fld id="seed-provider" label="Provider"><select id="seed-provider" className="sv-select" value={form.provider} onChange={(e) => set("provider", e.target.value as SeedProvider)}>{(Object.keys(PROVIDER_LABEL) as SeedProvider[]).map((p) => <option key={p} value={p}>{PROVIDER_LABEL[p]}</option>)}</select></Fld>
            <Fld id="seed-email" label="Email address"><input id="seed-email" autoComplete="off" className="sv-input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Fld>
            <Fld id="seed-name" label="Display name (optional)" hint="Used as the name on replies."><input id="seed-name" className="sv-input" value={form.displayName} onChange={(e) => set("displayName", e.target.value)} /></Fld>
            <Fld id="seed-pass" label="App password" hint="Not the account password. Stored encrypted."><input id="seed-pass" autoComplete="new-password" className="sv-input" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} /></Fld>
            <Fld id="seed-cap" label="Daily receive cap" hint="How many warm-up emails this inbox may receive per day."><input id="seed-cap" className="sv-input" type="number" min={1} max={300} value={form.dailyReceiveCap} onChange={(e) => set("dailyReceiveCap", Math.min(300, Math.max(1, Number(e.target.value) || 1)))} /></Fld>
          </div>
          <div className="ops-grid-2">
            <Fld id="seed-imap" label="IMAP host"><input id="seed-imap" className="sv-input" readOnly={!isOther} value={imapHost} onChange={(e) => set("imapHost", e.target.value)} /></Fld>
            <Fld id="seed-imapp" label="IMAP port"><input id="seed-imapp" className="sv-input" readOnly={!isOther} type="number" value={imapPort} onChange={(e) => set("imapPort", Number(e.target.value))} /></Fld>
            <Fld id="seed-smtp" label="SMTP host"><input id="seed-smtp" className="sv-input" readOnly={!isOther} value={smtpHost} onChange={(e) => set("smtpHost", e.target.value)} /></Fld>
            <Fld id="seed-smtpp" label="SMTP port"><input id="seed-smtpp" className="sv-input" readOnly={!isOther} type="number" value={smtpPort} onChange={(e) => set("smtpPort", Number(e.target.value))} /></Fld>
          </div>
          <LevelNote level="info">{PROVIDER_HELP[form.provider]}</LevelNote>
          <button type="submit" hidden />
        </form>
      </Modal>

      <Modal open={testResult !== null} title={testResult ? `Test: ${testResult.seed.email}` : "Test"} onClose={() => setTestResult(null)} footer={<Button variant="primary" onClick={() => setTestResult(null)}>Close</Button>}>
        {testResult ? (
          <div style={{ display: "grid", gap: 10 }}>
            <LevelNote level={testResult.result.imap.ok ? "success" : "error"}>Reading mail (IMAP): {testResult.result.imap.ok ? `connected, ${testResult.result.imap.folders} folders${testResult.result.imap.junkFolder ? `, spam folder is "${testResult.result.imap.junkFolder}"` : ", no spam folder found"}` : testResult.result.imap.error}</LevelNote>
            <LevelNote level={testResult.result.smtp.ok ? "success" : "error"}>Sending replies (SMTP): {testResult.result.smtp.ok ? "login accepted" : testResult.result.smtp.error}</LevelNote>
          </div>
        ) : null}
      </Modal>

      <Modal open={editing !== null} title="Daily receive cap" onClose={() => setEditing(null)} footer={<><Button disabled={busy} onClick={() => setEditing(null)}>Cancel</Button><Button variant="primary" disabled={busy} onClick={() => editing && void patch(editing, { dailyReceiveCap: cap }, "Daily cap updated.")}>Save</Button></>}>
        <Fld id="seed-edit-cap" label={editing ? `Emails per day for ${editing.email}` : "Emails per day"} hint="A real inbox that suddenly gets hundreds of messages looks odd. Raise this slowly.">
          <input id="seed-edit-cap" className="sv-input" type="number" min={1} max={300} value={cap} onChange={(e) => setCap(Math.min(300, Math.max(1, Number(e.target.value) || 1)))} />
        </Fld>
      </Modal>

      {deleting ? <ConfirmModal title="Delete seed inbox" confirmLabel="Delete seed inbox" danger busy={busy} onClose={() => setDeleting(null)} onConfirm={() => void remove()}><p style={{ margin: 0 }}>Remove {deleting.email}? Its warm-up history is deleted with it and pending replies from it stop.</p></ConfirmModal> : null}
    </div>
  );
}
