import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Copy, Eye, Plus, Trash2 } from "lucide-react";
import {
  adminApi, resolveAdminPlan,
  type AdminMember, type AdminWorkspaceDetail as Detail, type MemberPermissions, type MemberRole, type PlanLimitsPayload, type WorkspaceType,
} from "../../../services/adminApi";
import type { PlanLimitKey, PlanLimitPeriod } from "../../../types";
import { useSvTitle } from "../../layout/chrome";
import { svPath } from "../../nav";
import { Badge, Button, Card, Field, Modal, StatCard, Skeleton, SkeletonCard } from "../../ui";
import { Banner, useRemote } from "../crm/shared";
import { Alert, Confirm, PROTECTED_SLUG, PlanBadge, Section, SwitchBox, WorkspaceStatusBadge, WorkspaceTypeBadge, dateText, fullName, plural, useViewAsAction } from "./shared";

export function AdminWorkspaceDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const viewAs = useViewAsAction();
  const detail = useRemote(() => adminApi.getWorkspace(id), [id]);
  const data = detail.data;
  const [tempPassword, setTempPassword] = useState<{ email: string; password: string } | null>(null);
  useSvTitle([{ label: "Admin" }, { label: "Workspaces" }, { label: data?.name ?? "Workspace" }]);

  const back = <Link className="sv-link" to={svPath("admin/workspaces")} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 12 }}><ArrowLeft className="sv-icon" aria-hidden /> All workspaces</Link>;
  if (!data) return <div className="sv-page">{back}<Banner error={detail.error} />{detail.error ? null : <div role="status" aria-label="Loading" style={{ display: "grid", gap: 16 }}><div className="sv-skel-stack"><Skeleton width={260} height={24} /><Skeleton width={180} /></div><SkeletonCard lines={4} /><SkeletonCard lines={6} /></div>}</div>;

  const reload = async () => { detail.reload(); };

  return (
    <div className="sv-page">
      {back}
      <div className="sv-page-head" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="sv-h1">{data.name}</h1>
          <div className="adm-chips" style={{ marginTop: 8, alignItems: "center" }}>
            <WorkspaceTypeBadge type={data.type} /><WorkspaceStatusBadge status={data.status} /><PlanBadge workspace={data} />
            <span className="sv-hint">{data.slug} · created {dateText(data.created_at)}</span>
          </div>
        </div>
        <div className="sv-actions">
          <Button variant="primary" icon={Eye} className="adm-viewas" onClick={() => viewAs(data)}>View as {data.name}</Button>
        </div>
      </div>
      <div className="adm-col">
        <p className="sv-hint" style={{ margin: 0 }}>View as opens the normal app inside this workspace (campaigns, leads, inbox, settings) so you can look after it exactly as its owner would. A bar at the top shows where you are and lets you exit.</p>
        <Banner error={detail.error} />
        <SettingsCard data={data} onSaved={reload} />
        <PlanCard data={data} onChanged={reload} />
        <UsageCard data={data} />
        <AiProvidersCard data={data} onSaved={reload} />
        <MembersCard data={data} tempPassword={tempPassword} onChanged={reload} onTempPassword={setTempPassword} />
        <DangerZone data={data} onDeleted={() => navigate(svPath("admin/workspaces"))} />
      </div>
    </div>
  );
}

function SettingsCard({ data, onSaved }: { data: Detail; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(data.name);
  const [type, setType] = useState<WorkspaceType>(data.type);
  const [status, setStatus] = useState(data.status);
  const [ar, setAr] = useState(data.auto_responder_enabled);
  const [cm, setCm] = useState(data.cold_mailer_enabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => { setName(data.name); setType(data.type); setStatus(data.status); setAr(data.auto_responder_enabled); setCm(data.cold_mailer_enabled); }, [data]);
  const dirty = name.trim() !== data.name || type !== data.type || status !== data.status || ar !== data.auto_responder_enabled || cm !== data.cold_mailer_enabled;

  async function save() {
    if (!name.trim()) { setError("Workspace name cannot be empty."); return; }
    setSaving(true); setError(""); setSaved(false);
    try {
      await adminApi.updateWorkspace(data.id, {
        ...(name.trim() !== data.name ? { name: name.trim() } : {}), ...(type !== data.type ? { type } : {}), ...(status !== data.status ? { status } : {}),
        ...(ar !== data.auto_responder_enabled ? { auto_responder_enabled: ar } : {}), ...(cm !== data.cold_mailer_enabled ? { cold_mailer_enabled: cm } : {}),
      });
      await onSaved(); setSaved(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save."); } finally { setSaving(false); }
  }

  return (
    <Section title="Settings" description="Changes apply to every member immediately." actions={<Button variant="primary" disabled={!dirty || saving} onClick={() => void save()}>{saving ? "Saving…" : saved && !dirty ? "Saved" : "Save changes"}</Button>}>
      <div className="adm-body">
        <div className="adm-grid-3">
          <Field label="Name" htmlFor="ws-name"><input id="ws-name" className="sv-input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Workspace type" htmlFor="ws-type"><select id="ws-type" className="sv-select" value={type} onChange={(e) => setType(e.target.value as WorkspaceType)}><option value="organization">Organization</option><option value="individual">Individual</option></select></Field>
          <Field label="Status" htmlFor="ws-status"><select id="ws-status" className="sv-select" value={status} onChange={(e) => setStatus(e.target.value as Detail["status"])}><option value="active">Active</option><option value="suspended">Suspended</option></select></Field>
        </div>
        <div className="adm-grid-2">
          <SwitchBox label="Auto Responder" hint="Lets members use AI-drafted replies to inbound mail." checked={ar} onChange={setAr} />
          <SwitchBox label="Cold Mailer" hint="Lets members run cold email campaigns and warmup." checked={cm} onChange={setCm} />
        </div>
        {error ? <Alert tone="error">{error}</Alert> : null}
      </div>
    </Section>
  );
}

function UsageCard({ data }: { data: Detail }) {
  const usage = data.usage ?? { emailsSent: 0, repliesReceived: 0, draftsGenerated: 0 };
  const tiles: Array<[string, number]> = [["Emails sent", usage.emailsSent], ["Replies", usage.repliesReceived], ["Drafts", usage.draftsGenerated], ["Domains", data.counts.domains], ["Mailboxes", data.counts.mailboxes], ["Campaigns", data.counts.campaigns], ["Agents", data.counts.agents]];
  return (
    <Section title="Usage" description="Last 30 days">
      <div className="adm-body"><div className="adm-stats" style={{ marginBottom: 0 }}>{tiles.map(([label, value]) => <StatCard key={label} label={label} value={value.toLocaleString()} />)}</div></div>
    </Section>
  );
}

// ---- Plan and trial ----
interface LimitRow { key: PlanLimitKey; label: string; value: string; period: PlanLimitPeriod; unlimited: boolean }
const LIMIT_ROWS: Array<{ key: PlanLimitKey; label: string; period: PlanLimitPeriod; defaultUnlimited?: boolean }> = [
  { key: "domains", label: "Domains", period: "total" }, { key: "mailboxes", label: "Mailboxes", period: "total" }, { key: "emails", label: "Emails sent", period: "day" },
  { key: "workflows", label: "Workflows", period: "total" }, { key: "ai_requests", label: "AI requests", period: "day", defaultUnlimited: true },
];
const toDateInput = (iso: string | null) => { if (!iso) return ""; const d = new Date(iso); return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10); };
const pluralDays = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;
function buildRows(data: Detail): LimitRow[] {
  const info = resolveAdminPlan(data);
  return LIMIT_ROWS.map((r) => {
    const found = info.limits.find((l) => l.key === r.key);
    const set = found !== undefined && found.limit !== null;
    return { key: r.key, label: r.label, value: set ? String(found!.limit) : "", period: found?.period ?? r.period, unlimited: found ? !set : Boolean(r.defaultUnlimited) || info.type !== "trial" };
  });
}
type ConfirmKind = "restart" | "end" | "reset" | null;

function PlanCard({ data, onChanged }: { data: Detail; onChanged: () => Promise<void> }) {
  const info = useMemo(() => resolveAdminPlan(data), [data]);
  const [planType, setPlanType] = useState(info.type);
  const [endDate, setEndDate] = useState(toDateInput(info.endsAt));
  const [rows, setRows] = useState<LimitRow[]>(() => buildRows(data));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  useEffect(() => { setPlanType(info.type); setEndDate(toDateInput(info.endsAt)); setRows(buildRows(data)); }, [data, info]);

  const original = useMemo(() => buildRows(data), [data]);
  const limitsDirty = rows.some((r, i) => r.unlimited !== original[i].unlimited || (!r.unlimited && (r.value !== original[i].value || r.period !== original[i].period)));
  const planDirty = planType !== info.type;
  const dateDirty = planType === "trial" && endDate !== toDateInput(info.endsAt);
  const dirty = planDirty || dateDirty || limitsDirty;
  const isTrial = info.type === "trial";

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true); setError(""); setNotice("");
    try { await action(); setConfirm(null); await onChanged(); setNotice(success); } catch (caught) { setError(caught instanceof Error ? caught.message : "Something went wrong."); } finally { setBusy(false); }
  }

  function save() {
    const patch: Parameters<typeof adminApi.updateWorkspace>[1] = {};
    if (planDirty) patch.plan = planType;
    if (dateDirty && endDate) patch.trial_ends_at = new Date(`${endDate}T23:59:59.000Z`).toISOString();
    if (limitsDirty) {
      const limits: PlanLimitsPayload = {};
      for (const r of rows) {
        const n = Number(r.value);
        if (!r.unlimited && (r.value.trim() === "" || !Number.isFinite(n) || n < 0)) { setError(`${r.label}: enter a whole number of 0 or more, or switch to Unlimited.`); return; }
        limits[r.key] = { limit: r.unlimited ? null : Math.floor(n), period: r.period };
      }
      patch.limits = limits;
    }
    void run(() => adminApi.updateWorkspace(data.id, patch), "Plan saved.");
  }
  const setRow = (i: number, patch: Partial<LimitRow>) => setRows((cur) => cur.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const extend = (days: number) => run(() => adminApi.updateWorkspace(data.id, { extend_trial_days: days }), `Trial extended by ${pluralDays(days)}.`);

  const copy = {
    restart: { title: "Restart trial?", text: "This starts a new 30-day trial from today and resets the trial limits to their defaults.", label: "Restart trial", danger: false },
    end: { title: "End trial and make Standard?", text: "The workspace moves to the Standard plan and all trial limits are removed.", label: "Make Standard", danger: true },
    reset: { title: "Reset usage?", text: "This clears the rolling 24-hour usage counters, so per-day limits start fresh. Totals such as existing domains are unaffected.", label: "Reset usage", danger: false },
  };

  return (
    <Section
      title="Plan and trial"
      description="Trial workspaces are locked when the trial ends and capped by the limits below."
      actions={<>
        {isTrial ? <Badge tone={info.ended ? "red" : "blue"}>{info.ended ? "Trial ended" : `Trial · ${info.daysLeft}d left`}</Badge> : <Badge>Standard</Badge>}
        {dirty ? <Button disabled={busy} onClick={() => { setPlanType(info.type); setEndDate(toDateInput(info.endsAt)); setRows(original); setError(""); }}>Discard</Button> : null}
        <Button variant="primary" disabled={!dirty || busy} onClick={save}>{busy ? "Saving…" : "Save plan"}</Button>
      </>}
    >
      <div className="adm-body">
        <div className="adm-grid-3">
          <Field label="Plan" htmlFor="pl-type"><select id="pl-type" className="sv-select" value={planType} onChange={(e) => setPlanType(e.target.value as "trial" | "standard")}><option value="standard">Standard</option><option value="trial">Trial</option></select></Field>
          {isTrial ? (
            <>
              <Field label="Trial started" htmlFor="pl-start"><input id="pl-start" className="sv-input" disabled readOnly value={info.startedAt ? dateText(info.startedAt) : "Unknown"} /></Field>
              <Field label={`Trial ends (${info.ended ? "ended" : `${pluralDays(info.daysLeft)} left`})`} htmlFor="pl-end"><input id="pl-end" className="sv-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></Field>
            </>
          ) : null}
        </div>
        {isTrial ? (
          <div className="sv-actions" style={{ flexWrap: "wrap" }}>
            <Button disabled={busy || dirty} onClick={() => void extend(7)}>+7 days</Button>
            <Button disabled={busy || dirty} onClick={() => void extend(30)}>+30 days</Button>
            <Button disabled={busy || dirty} onClick={() => setConfirm("restart")}>Restart trial (30 days)</Button>
            <Button variant="danger" disabled={busy || dirty} onClick={() => setConfirm("end")}>End trial / make Standard</Button>
            {dirty ? <span className="sv-hint">Save or discard your changes first.</span> : null}
          </div>
        ) : <div><Button disabled={busy || dirty} onClick={() => setConfirm("restart")}>Start 30-day trial</Button></div>}

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h3 className="sv-set-title" style={{ fontSize: 14, margin: 0 }}>Limits</h3>
            <Button size="sm" disabled={busy} onClick={() => setConfirm("reset")}>Reset usage</Button>
          </div>
          <div className="sv-stack" style={{ gap: 8 }}>
            {rows.map((r, i) => (
              <div className="adm-limit-row" key={r.key}>
                <span style={{ fontWeight: 500 }}>{r.label}</span>
                <input aria-label={`${r.label} limit`} className="sv-input" disabled={r.unlimited} inputMode="numeric" min={0} placeholder={r.unlimited ? "Unlimited" : "0"} type="number" value={r.unlimited ? "" : r.value} onChange={(e) => setRow(i, { value: e.target.value })} />
                <select aria-label={`${r.label} period`} className="sv-select" disabled={r.unlimited} value={r.period} onChange={(e) => setRow(i, { period: e.target.value as PlanLimitPeriod })}><option value="day">Per 24 hours</option><option value="total">Total</option></select>
                <label style={{ display: "inline-flex", gap: 8, alignItems: "center", fontSize: 13 }}><input type="checkbox" className="sv-check" checked={r.unlimited} onChange={(e) => setRow(i, { unlimited: e.target.checked })} /> Unlimited</label>
              </div>
            ))}
          </div>
        </div>

        {info.limits.length > 0 ? (
          <div className="sv-stack" style={{ gap: 12, border: "1px solid var(--ds-border)", borderRadius: 10, padding: 14 }}>
            <h3 className="sv-set-title" style={{ fontSize: 14, margin: 0 }}>Current usage</h3>
            {info.limits.map((l) => {
              const pct = l.limit ? Math.min(100, Math.round((l.used / l.limit) * 100)) : 0;
              return (
                <div className="adm-meter-row" key={l.key}>
                  <div className="adm-meter-top"><span>{l.label} <span className="sv-hint">{l.period === "day" ? "per 24 hours" : "in total"}</span></span><span>{l.used.toLocaleString()} / {l.limit === null ? "Unlimited" : l.limit.toLocaleString()}</span></div>
                  {l.limit !== null ? <div className="sv-progress" aria-hidden><span style={{ width: `${pct}%` }} /></div> : null}
                </div>
              );
            })}
          </div>
        ) : null}
        {error ? <Alert tone="error">{error}</Alert> : null}
        {notice && !error ? <Alert tone="ok">{notice}</Alert> : null}
      </div>
      {confirm ? (
        <Confirm title={copy[confirm].title} body={copy[confirm].text} confirmLabel={copy[confirm].label} danger={copy[confirm].danger} onClose={() => setConfirm(null)}
          onConfirm={async () => {
            if (confirm === "restart") await adminApi.startTrial(data.id, { days: 30 });
            else if (confirm === "end") await adminApi.updateWorkspace(data.id, { plan: "standard" });
            else await adminApi.resetUsage(data.id);
            setConfirm(null); await onChanged(); setNotice(confirm === "restart" ? "Trial restarted for 30 days." : confirm === "end" ? "Workspace is now on the Standard plan." : "Usage reset.");
          }} />
      ) : null}
    </Section>
  );
}

// ---- AI providers ----
const PROVIDER_NAMES: Record<string, string> = { openai: "OpenAI", anthropic: "Anthropic", gemini: "Gemini" };

function AiProvidersCard({ data, onSaved }: { data: Detail; onSaved: () => Promise<void> }) {
  const providers = data.aiProviders ?? [];
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const ownKeys = providers.filter((p) => p.configured && p.source !== "platform").length;

  async function setPlatformKeys(next: boolean) {
    setSaving(true); setError(""); setNotice("");
    try {
      await adminApi.updateWorkspace(data.id, { platform_ai_enabled: next }); await onSaved();
      setNotice(next ? "This workspace can now use the platform's built-in AI keys." : "Built-in AI keys switched off for this workspace.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save."); } finally { setSaving(false); }
  }

  return (
    <Section title="AI providers" description="Which AI keys this workspace's features will use.">
      <div className="adm-body" style={{ borderBottom: providers.length ? "1px solid var(--ds-border)" : undefined }}>
        <SwitchBox label="Use the platform's built-in AI keys" disabled={saving} checked={data.platform_ai_enabled} onChange={(next) => void setPlatformKeys(next)}
          hint="On: this workspace may use the platform's own built-in AI keys whenever it has not added its own, and the platform pays for that usage. Off: it must connect its own keys under AI Keys, and AI drafting stops until it does. A workspace's own key is always used first. Changes apply immediately." />
        <p className="sv-hint" style={{ margin: 0 }}>
          {data.platform_ai_enabled
            ? ownKeys > 0 ? `Using its own ${ownKeys === 1 ? "key" : "keys"} where connected, the built-in keys for the rest.` : "No own keys connected: every AI request uses the built-in keys and is paid for by the platform."
            : ownKeys > 0 ? "Using only its own connected keys." : "No AI is available to this workspace yet: it has no own key and built-in keys are off."}
        </p>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {notice ? <Alert tone="ok">{notice}</Alert> : null}
      </div>
      {providers.length === 0 ? <p className="sv-hint" style={{ padding: 20, margin: 0 }}>No provider information available.</p> : (
        <div className="sv-table-wrap"><table className="sv-table"><tbody>
          {providers.map((p) => (
            <tr key={p.provider}>
              <td><div style={{ fontWeight: 500 }}>{PROVIDER_NAMES[p.provider] ?? p.provider}</div><div className="sv-hint">{p.configured ? (p.preview ? `Key ${p.preview}` : "Key on file") : "No key"}{p.updated_at ? ` · updated ${dateText(p.updated_at)}` : ""}</div></td>
              <td style={{ textAlign: "right" }}>{p.configured && p.source !== "platform" ? <Badge tone="green">Own key</Badge> : p.source === "platform" ? <Badge tone="blue">Built-in key</Badge> : <Badge tone="yellow">Not connected</Badge>}</td>
            </tr>
          ))}
        </tbody></table></div>
      )}
    </Section>
  );
}

// ---- Members ----
function PermissionChecks({ value, onChange, data }: { value: MemberPermissions; onChange: (v: MemberPermissions) => void; data: Detail }) {
  const items: Array<[keyof MemberPermissions, string, boolean]> = [["auto_responder", "Auto Responder", data.auto_responder_enabled], ["cold_mailer", "Cold Mailer", data.cold_mailer_enabled]];
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 8 }}>
      <legend className="sv-field-label" style={{ marginBottom: 4 }}>Product permissions</legend>
      {items.map(([key, label, enabled]) => (
        <label key={key} style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" className="sv-check" checked={value[key]} disabled={!enabled} onChange={(e) => onChange({ ...value, [key]: e.target.checked })} /> {label}
          {!enabled ? <span className="sv-hint">(not enabled for this workspace)</span> : null}
        </label>
      ))}
    </fieldset>
  );
}

function MembersCard({ data, tempPassword, onChanged, onTempPassword }: { data: Detail; tempPassword: { email: string; password: string } | null; onChanged: () => Promise<void>; onTempPassword: (v: { email: string; password: string } | null) => void }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<AdminMember | null>(null);
  const [removing, setRemoving] = useState<AdminMember | null>(null);
  const [copied, setCopied] = useState(false);
  async function copyPassword() {
    if (!tempPassword) return;
    try { await navigator.clipboard.writeText(tempPassword.password); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { /* the password is on screen to copy by hand */ }
  }

  return (
    <Section title="Members" description={plural(data.members.length, "member")} actions={<Button icon={Plus} onClick={() => setAdding(true)}>Add member</Button>}>
      {tempPassword ? (
        <div className="adm-body">
          <Alert tone="warn">
            <strong>Temporary password for {tempPassword.email}</strong><br />This is shown only once. Share it securely; they should change it after signing in.
            <div className="sv-actions" style={{ marginTop: 8, flexWrap: "wrap" }}>
              <code className="adm-secret">{tempPassword.password}</code>
              <Button size="sm" icon={copied ? Check : Copy} onClick={() => void copyPassword()}>{copied ? "Copied" : "Copy"}</Button>
              <Button size="sm" onClick={() => onTempPassword(null)}>Dismiss</Button>
            </div>
          </Alert>
        </div>
      ) : null}
      <div className="sv-table-wrap">
        <table className="sv-table">
          <thead><tr><th>Member</th><th>Role</th><th>Access</th><th>Added</th><th style={{ width: 170 }} /></tr></thead>
          <tbody>
            {data.members.length === 0 ? <tr><td colSpan={5} className="sv-hint" style={{ padding: 20 }}>No members yet.</td></tr> : null}
            {data.members.map((m) => (
              <tr key={m.user_id}>
                <td><div style={{ fontWeight: 500 }}>{fullName(m.first_name, m.last_name) || m.email}</div>{fullName(m.first_name, m.last_name) ? <div className="sv-hint">{m.email}</div> : null}</td>
                <td><Badge tone={m.role === "owner" ? "blue" : m.role === "admin" ? "green" : "neutral"}>{m.role}</Badge></td>
                <td>
                  <div className="adm-chips">
                    {m.role !== "member" ? <Badge>All enabled products</Badge> : (<><Badge tone={m.permissions?.auto_responder ? "green" : "neutral"}>Auto Responder</Badge><Badge tone={m.permissions?.cold_mailer ? "green" : "neutral"}>Cold Mailer</Badge></>)}
                  </div>
                </td>
                <td>{dateText(m.created_at)}</td>
                <td><div className="sv-actions" style={{ justifyContent: "flex-end" }}><Button size="sm" onClick={() => setEditing(m)}>Edit</Button><Button size="sm" onClick={() => setRemoving(m)}>Remove</Button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {adding ? <AddMemberModal data={data} onClose={() => setAdding(false)} onAdded={async (email, password) => { setAdding(false); onTempPassword(password ? { email, password } : null); await onChanged(); }} /> : null}
      {editing ? <EditMemberModal data={data} member={editing} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await onChanged(); }} /> : null}
      {removing ? (
        <Confirm title="Remove member?" body={`Remove ${removing.email} from ${data.name}? They will lose access to this workspace.`} confirmLabel="Remove member" danger onClose={() => setRemoving(null)}
          onConfirm={async () => { await adminApi.removeMember(data.id, removing.user_id); setRemoving(null); await onChanged(); }} />
      ) : null}
    </Section>
  );
}

function AddMemberModal({ data, onClose, onAdded }: { data: Detail; onClose: () => void; onAdded: (email: string, temporaryPassword?: string) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [permissions, setPermissions] = useState<MemberPermissions>({ auto_responder: data.auto_responder_enabled, cold_mailer: data.cold_mailer_enabled });
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setEmailError("Enter a valid email address."); setServerError(""); return; }
    setEmailError(""); setBusy(true); setServerError("");
    try {
      const result = await adminApi.addMember(data.id, { email: email.trim(), role, permissions, ...(firstName.trim() ? { first_name: firstName.trim() } : {}), ...(lastName.trim() ? { last_name: lastName.trim() } : {}), ...(password ? { password } : {}) });
      await onAdded(email.trim(), result.temporaryPassword);
    } catch (caught) { setServerError(caught instanceof Error ? caught.message : "Could not add the member."); setBusy(false); }
  }

  return (
    <Modal open title="Add member" onClose={onClose} footer={<><Button disabled={busy} onClick={onClose}>Cancel</Button><Button variant="primary" disabled={busy} onClick={() => void submit()}>{busy ? "Adding…" : "Add member"}</Button></>}>
      <p className="sv-hint" style={{ marginTop: 0 }}>Existing accounts are added directly. For a new email, an account is created.</p>
      <Field label="Email" htmlFor="am-email"><input id="am-email" className="sv-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />{emailError ? <span className="sv-hint" style={{ color: "var(--ds-red-text)" }}>{emailError}</span> : null}</Field>
      <Field label="Role" htmlFor="am-role"><select id="am-role" className="sv-select" value={role} onChange={(e) => setRole(e.target.value as "admin" | "member")}><option value="member">Member</option><option value="admin">Admin</option></select></Field>
      <PermissionChecks data={data} value={permissions} onChange={setPermissions} />
      <div className="adm-grid-2">
        <Field label="First name (new accounts)" htmlFor="am-first"><input id="am-first" className="sv-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></Field>
        <Field label="Last name (new accounts)" htmlFor="am-last"><input id="am-last" className="sv-input" value={lastName} onChange={(e) => setLastName(e.target.value)} /></Field>
      </div>
      <Field label="Password (new accounts)" htmlFor="am-pass"><input id="am-pass" className="sv-input" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /><span className="sv-hint">Leave blank to generate a temporary password.</span></Field>
      {serverError ? <Alert tone="error">{serverError}</Alert> : null}
    </Modal>
  );
}

function EditMemberModal({ data, member, onClose, onSaved }: { data: Detail; member: AdminMember; onClose: () => void; onSaved: () => Promise<void> }) {
  const [role, setRole] = useState<MemberRole>(member.role);
  const [permissions, setPermissions] = useState<MemberPermissions>(member.permissions ?? { auto_responder: false, cold_mailer: false });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true); setError("");
    try { await adminApi.updateMember(data.id, member.user_id, { ...(role !== member.role ? { role } : {}), permissions }); await onSaved(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save."); setBusy(false); }
  }
  return (
    <Modal open title="Edit member" onClose={onClose} footer={<><Button disabled={busy} onClick={onClose}>Cancel</Button><Button variant="primary" disabled={busy} onClick={() => void submit()}>{busy ? "Saving…" : "Save"}</Button></>}>
      <p className="sv-hint" style={{ marginTop: 0 }}>{member.email}</p>
      <Field label="Role" htmlFor="em-role"><select id="em-role" className="sv-select" value={role} onChange={(e) => setRole(e.target.value as MemberRole)}><option value="owner">Owner</option><option value="admin">Admin</option><option value="member">Member</option></select></Field>
      <PermissionChecks data={data} value={permissions} onChange={setPermissions} />
      {error ? <Alert tone="error">{error}</Alert> : null}
    </Modal>
  );
}

function DangerZone({ data, onDeleted }: { data: Detail; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const isProtected = data.slug === PROTECTED_SLUG;
  return (
    <Card className="adm-section adm-danger">
      <div className="adm-section-head"><h2>Danger zone</h2></div>
      <div className="adm-body" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ maxWidth: 560 }}>
          <div style={{ fontWeight: 500 }}>Delete this workspace</div>
          <p className="sv-hint" style={{ margin: 0 }}>The workspace is hidden from everyone and its members lose access. {isProtected ? "This workspace is protected and cannot be deleted." : ""}</p>
        </div>
        <Button variant="danger" icon={Trash2} disabled={isProtected} onClick={() => { setTyped(""); setOpen(true); }}>Delete workspace</Button>
      </div>
      {open ? (
        <Confirm title="Delete workspace?" body={`Type ${data.name} to confirm deleting this workspace.`} confirmLabel="Delete workspace" danger disabled={typed !== data.name} onClose={() => setOpen(false)}
          onConfirm={async () => { await adminApi.deleteWorkspace(data.id); onDeleted(); }}>
          <input aria-label="Workspace name" className="sv-input" style={{ marginTop: 12 }} placeholder={data.name} value={typed} onChange={(e) => setTyped(e.target.value)} />
        </Confirm>
      ) : null}
    </Card>
  );
}
