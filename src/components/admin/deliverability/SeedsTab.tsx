import { useState } from "react";
import { Button } from "@heroui/react";
import { Plus } from "lucide-react";
import { errorMessage } from "../../../services/adminApi";
import { warmnetApi, type SeedPreset, type SeedProvider, type SeedTestResult, type WarmSeed } from "../../../services/warmnetApi";
import { AdminModal, ConfirmDialog, ErrorBanner } from "../AdminModal";
import { Field, inputClass } from "../AdminBits";
import { StatusPill } from "../../ui/StatusPill";
import { SkeletonRow } from "../../ui/Skeleton";
import { EmptyRow, LevelNote, Panel, TableCard, fmtDateTime, tdClass, thClass, theadClass, useLoad, type Notify } from "./Bits";

const PROVIDER_LABEL: Record<SeedProvider, string> = { gmail: "Gmail / Google Workspace", outlook: "Outlook / Microsoft 365", yahoo: "Yahoo", other: "Other (IMAP + SMTP)" };
const PROVIDER_HELP: Record<SeedProvider, string> = {
  gmail: "Turn on 2-step verification, then create an app password at myaccount.google.com/apppasswords. IMAP must be enabled in Gmail settings (Forwarding and POP/IMAP). Use the 16-character app password, not the account password.",
  outlook: "Turn on two-step verification and create an app password in the Microsoft account security page. IMAP must be allowed for the account. Some work or school tenants block app passwords.",
  yahoo: "Create an app password under Account security, then Generate app password. Use it here instead of the account password.",
  other: "Enter the IMAP and SMTP details from the provider. The login must work with a password or app password.",
};

const BLANK = { email: "", displayName: "", provider: "gmail" as SeedProvider, password: "", dailyReceiveCap: 60, imapHost: "", imapPort: 993, smtpHost: "", smtpPort: 465 };

function statusTone(s: WarmSeed["status"]) {
  return s === "active" ? "success" : s === "error" ? "danger" : "warning";
}

export function SeedsTab({ notify }: { notify: Notify }) {
  const list = useLoad(() => warmnetApi.listSeeds(), []);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
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

  function closeAdd() {
    setAddOpen(false);
    setForm(BLANK);
    setFormError(null);
  }

  async function create() {
    setBusy(true);
    setFormError(null);
    try {
      await warmnetApi.createSeed({
        email: form.email.trim(),
        displayName: form.displayName.trim() || undefined,
        provider: form.provider,
        password: form.password,
        dailyReceiveCap: form.dailyReceiveCap,
        ...(isOther ? { imapHost, imapPort, smtpHost, smtpPort } : {}),
      });
      notify("Seed inbox added. Use Test to confirm the login works.");
      closeAdd();
      await list.reload();
    } catch (e) {
      setFormError(errorMessage(e, "Unable to add this seed inbox."));
    } finally {
      setBusy(false);
    }
  }

  async function test(seed: WarmSeed) {
    setTesting(seed.id);
    setActionError(null);
    try {
      setTestResult({ seed, result: await warmnetApi.testSeed(seed.id) });
      await list.reload();
    } catch (e) {
      setActionError(errorMessage(e, "Unable to test this seed inbox."));
    } finally {
      setTesting(null);
    }
  }

  async function patch(seed: WarmSeed, body: { status?: "active" | "paused"; dailyReceiveCap?: number }, done: string) {
    setBusy(true);
    setActionError(null);
    try {
      await warmnetApi.updateSeed(seed.id, body);
      notify(done);
      setEditing(null);
      await list.reload();
    } catch (e) {
      setActionError(errorMessage(e, "Unable to update this seed inbox."));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await warmnetApi.deleteSeed(deleting.id);
      notify("Seed inbox removed.");
      setDeleting(null);
      await list.reload();
    } catch (e) {
      setActionError(errorMessage(e, "Unable to remove this seed inbox."));
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  }

  const canSave = form.email.includes("@") && form.password.length > 0 && (!isOther || (imapHost && smtpHost));

  return (
    <div className="flex flex-col gap-4">
      {actionError ? <ErrorBanner message={actionError} /> : null}
      {list.error ? <ErrorBanner message={list.error} onRetry={() => void list.reload()} /> : null}
      <Panel
        actions={
          <Button size="sm" variant="primary" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            Add seed inbox
          </Button>
        }
        description="Real mailboxes we control. They receive the warm-up mail, pull it out of spam, read it, star some and reply. Passwords are stored encrypted and never shown."
        title="Seed inboxes"
      >
        <TableCard minWidth={1100}>
          <thead className={theadClass}>
            <tr>
              <th className={`${thClass} pl-4`}>Inbox</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Daily cap</th>
              <th className={thClass}>Received</th>
              <th className={thClass}>Last 7 days</th>
              <th className={thClass}>Last polled</th>
              <th className={`${thClass} pr-4 text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.isLoading && !list.data ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonRow columns={7} key={i} />)
            ) : seeds.length === 0 ? (
              <EmptyRow columns={7}>No seed inboxes yet. Warm-up cannot send until at least one is added.</EmptyRow>
            ) : (
              seeds.map((s) => (
                <tr className="border-b border-border/60 align-top last:border-0" key={s.id}>
                  <td className={`${tdClass} pl-4`}>
                    <div className="font-medium text-foreground">{s.email}</div>
                    <div className="text-[12px] text-muted">{PROVIDER_LABEL[s.provider]}{s.displayName ? ` - ${s.displayName}` : ""}</div>
                  </td>
                  <td className={tdClass}>
                    <StatusPill tone={statusTone(s.status)}>{s.status === "error" ? "Login problem" : s.status === "paused" ? "Paused" : "Active"}</StatusPill>
                    {s.lastError ? <div className="mt-1 max-w-[260px] text-[12px] text-danger">{s.lastError}</div> : null}
                  </td>
                  <td className={`${tdClass} tabular-nums`}>{s.dailyReceiveCap}/day</td>
                  <td className={`${tdClass} tabular-nums`}>{s.receivedToday} today<div className="text-[12px] text-muted">{s.received7d} in 7 days</div></td>
                  <td className={`${tdClass} text-[12px] text-muted`}>
                    {s.inbox7d} inbox, {s.spam7d} spam<br />
                    {s.replies7d} replies sent
                  </td>
                  <td className={`${tdClass} text-[12px] text-muted`}>{fmtDateTime(s.lastPolledAt)}</td>
                  <td className="px-3 py-3 pr-4">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Button isDisabled={testing === s.id} size="sm" variant="secondary" onClick={() => void test(s)}>{testing === s.id ? "Testing..." : "Test"}</Button>
                      <Button isDisabled={busy} size="sm" variant="secondary" onClick={() => void patch(s, { status: s.status === "active" ? "paused" : "active" }, s.status === "active" ? "Seed inbox paused." : "Seed inbox activated.")}>
                        {s.status === "active" ? "Pause" : "Activate"}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => { setEditing(s); setCap(s.dailyReceiveCap); }}>Edit cap</Button>
                      <Button size="sm" variant="secondary" onClick={() => setDeleting(s)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </TableCard>
      </Panel>

      <AdminModal
        footer={
          <>
            <Button isDisabled={busy} size="sm" variant="secondary" onClick={closeAdd}>Cancel</Button>
            <Button isDisabled={busy || !canSave} size="sm" variant="primary" onClick={() => void create()}>{busy ? "Adding..." : "Add seed inbox"}</Button>
          </>
        }
        isOpen={addOpen}
        title="Add seed inbox"
        width={760}
        onClose={closeAdd}
      >
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); if (canSave && !busy) void create(); }}>
          {formError ? <ErrorBanner message={formError} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Provider">
              <select className={inputClass} value={form.provider} onChange={(e) => set("provider", e.target.value as SeedProvider)}>
                {(Object.keys(PROVIDER_LABEL) as SeedProvider[]).map((p) => <option key={p} value={p}>{PROVIDER_LABEL[p]}</option>)}
              </select>
            </Field>
            <Field label="Email address">
              <input autoComplete="off" className={inputClass} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field hint="Used as the name on replies." label="Display name (optional)">
              <input className={inputClass} value={form.displayName} onChange={(e) => set("displayName", e.target.value)} />
            </Field>
            <Field hint="Not the account password. Stored encrypted." label="App password">
              <input autoComplete="new-password" className={inputClass} type="password" value={form.password} onChange={(e) => set("password", e.target.value)} />
            </Field>
            <Field hint="How many warm-up emails this inbox may receive per day." label="Daily receive cap">
              <input className={inputClass} max={300} min={1} type="number" value={form.dailyReceiveCap} onChange={(e) => set("dailyReceiveCap", Math.min(300, Math.max(1, Number(e.target.value) || 1)))} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="sm:col-span-2"><Field label="IMAP host"><input className={inputClass} readOnly={!isOther} value={imapHost} onChange={(e) => set("imapHost", e.target.value)} /></Field></div>
            <Field label="IMAP port"><input className={inputClass} readOnly={!isOther} type="number" value={imapPort} onChange={(e) => set("imapPort", Number(e.target.value))} /></Field>
            <div className="hidden sm:block" />
            <div className="sm:col-span-2"><Field label="SMTP host"><input className={inputClass} readOnly={!isOther} value={smtpHost} onChange={(e) => set("smtpHost", e.target.value)} /></Field></div>
            <Field label="SMTP port"><input className={inputClass} readOnly={!isOther} type="number" value={smtpPort} onChange={(e) => set("smtpPort", Number(e.target.value))} /></Field>
          </div>
          <LevelNote level="info">{PROVIDER_HELP[form.provider]}</LevelNote>
          <button className="hidden" type="submit" />
        </form>
      </AdminModal>

      <AdminModal
        footer={<Button size="sm" variant="primary" onClick={() => setTestResult(null)}>Close</Button>}
        isOpen={testResult !== null}
        title={testResult ? `Test: ${testResult.seed.email}` : "Test"}
        width={480}
        onClose={() => setTestResult(null)}
      >
        {testResult ? (
          <div className="grid gap-3">
            <LevelNote level={testResult.result.imap.ok ? "success" : "error"}>
              Reading mail (IMAP): {testResult.result.imap.ok ? `connected, ${testResult.result.imap.folders} folders${testResult.result.imap.junkFolder ? `, spam folder is "${testResult.result.imap.junkFolder}"` : ", no spam folder found"}` : testResult.result.imap.error}
            </LevelNote>
            <LevelNote level={testResult.result.smtp.ok ? "success" : "error"}>
              Sending replies (SMTP): {testResult.result.smtp.ok ? "login accepted" : testResult.result.smtp.error}
            </LevelNote>
          </div>
        ) : null}
      </AdminModal>

      <AdminModal
        footer={
          <>
            <Button isDisabled={busy} size="sm" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button isDisabled={busy} size="sm" variant="primary" onClick={() => editing && void patch(editing, { dailyReceiveCap: cap }, "Daily cap updated.")}>Save</Button>
          </>
        }
        isOpen={editing !== null}
        title="Daily receive cap"
        width={440}
        onClose={() => setEditing(null)}
      >
        <Field hint="A real inbox that suddenly gets hundreds of messages looks odd. Raise this slowly." label={editing ? `Emails per day for ${editing.email}` : "Emails per day"}>
          <input className={inputClass} max={300} min={1} type="number" value={cap} onChange={(e) => setCap(Math.min(300, Math.max(1, Number(e.target.value) || 1)))} />
        </Field>
      </AdminModal>

      <ConfirmDialog
        confirmLabel="Delete seed inbox"
        description={deleting ? `Remove ${deleting.email}? Its warm-up history is deleted with it and pending replies from it stop.` : undefined}
        isBusy={busy}
        isOpen={deleting !== null}
        title="Delete seed inbox"
        tone="danger"
        onClose={() => setDeleting(null)}
        onConfirm={() => void remove()}
      />
    </div>
  );
}
