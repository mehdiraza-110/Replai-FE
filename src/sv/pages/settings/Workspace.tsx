import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { usePrefs } from "../../prefs";
import { teamApi, canManageMember, memberDisplayName, type Member, type WorkspaceRole } from "../../../services/teamApi";
import { aiSdrApi, type MeetingType } from "../../api/aiSdr";
import { settingsApi, type CustomField, type FieldType, type Outcome, type Template } from "../../api/settings";
import { useSvTitle } from "../../layout/chrome";
import { svPath } from "../../nav";
import { Badge, Button, Card, Checkbox, Field, Menu, Modal, SettingsCard } from "../../ui";
import { MeetingTypeModal } from "../SettingsAiSdr";
import { ConfirmModal, dateText, dateTimeText, Notice, Pager, ReadOnlyNote, SearchBox, SettingsPageFrame, SwitchRow, useCanManage, useDebounced, useRemote, useSaver } from "./shared";
import { TokenManager } from "./Personal";

const ROLE_LABEL: Record<WorkspaceRole, string> = { owner: "Owner", admin: "Admin", member: "Member" };

// ---- General ----
export function SettingsGeneral() {
  useSvTitle([{ label: "General" }]);
  const { activeWorkspace, refreshUser } = useAuth();
  const canManage = useCanManage();
  const isOwner = activeWorkspace?.role === "owner";
  const { data, reload } = useRemote(() => settingsApi.workspace(), []);
  const { setWorkspaceColor } = usePrefs();
  const [name, setName] = useState(activeWorkspace?.name ?? "");
  const [color, setColor] = useState("#2d6fa1");
  const nameSaver = useSaver();
  const colorSaver = useSaver();
  useEffect(() => { if (data) setColor(data.color); }, [data]);
  useEffect(() => { setName(activeWorkspace?.name ?? ""); }, [activeWorkspace?.name]);

  return (
    <SettingsPageFrame title="General" subtitle="How your workspace appears to the team">
      <SettingsCard title="Workspace name" description="Shown in the sidebar and in emails to your team.">
        {nameSaver.notice ? <Notice tone={nameSaver.notice.tone}>{nameSaver.notice.text}</Notice> : null}
        <Field label="Name" htmlFor="ws-name"><input id="ws-name" className="sv-input" value={name} disabled={!isOwner} onChange={(e) => setName(e.target.value)} /></Field>
        {!isOwner ? <p className="sv-hint">Only the workspace owner can rename it.</p> : null}
        <div><Button variant="primary" disabled={!isOwner || nameSaver.busy || !name.trim() || name.trim() === activeWorkspace?.name} onClick={() => void nameSaver.run(async () => { await teamApi.renameWorkspace(name.trim()); await refreshUser(); }, "Name updated.")}>Save name</Button></div>
      </SettingsCard>
      <SettingsCard title="Colour" description="Used for the workspace icon in the sidebar.">
        {colorSaver.notice ? <Notice tone={colorSaver.notice.tone}>{colorSaver.notice.text}</Notice> : null}
        {!canManage ? <ReadOnlyNote /> : null}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <input type="color" aria-label="Workspace colour" value={color} disabled={!canManage} onChange={(e) => setColor(e.target.value)} style={{ width: 48, height: 36, border: "1px solid var(--ds-border)", borderRadius: 8, background: "none" }} />
          <span className="sv-avatar" style={{ background: color, color: "#fff" }} aria-hidden>{(name.trim()[0] ?? "S").toUpperCase()}</span>
          <code>{color}</code>
        </div>
        <div><Button variant="primary" disabled={!canManage || colorSaver.busy || color === data?.color} onClick={() => void colorSaver.run(async () => { await settingsApi.saveWorkspace({ color }); setWorkspaceColor(color); reload(); }, "Colour updated.")}>Save colour</Button></div>
      </SettingsCard>
      <SettingsCard title="Logo" description="Upload a logo to replace the coloured initial.">
        <div><Badge>Not available yet</Badge></div>
        <p className="sv-hint">Logo uploads need file storage, which isn't set up in this version.</p>
      </SettingsCard>
    </SettingsPageFrame>
  );
}

// ---- Members ----
export function SettingsMembers() {
  useSvTitle([{ label: "Members" }]);
  const { activeWorkspace } = useAuth();
  const role = activeWorkspace?.role ?? "member";
  const { data: members, error, reload } = useRemote(() => teamApi.listMembers(), []);
  const [inviting, setInviting] = useState(false);
  const [form, setForm] = useState({ email: "", first_name: "", last_name: "", role: "member" as "admin" | "member" });
  const [temp, setTemp] = useState<{ email: string; password: string } | null>(null);
  const [removing, setRemoving] = useState<Member | null>(null);
  const saver = useSaver();
  const canInvite = role === "owner" || role === "admin";

  async function invite() {
    const ok = await saver.run(async () => {
      const r = await teamApi.addMember({ email: form.email.trim(), role: form.role, first_name: form.first_name.trim() || undefined, last_name: form.last_name.trim() || undefined });
      setInviting(false);
      setForm({ email: "", first_name: "", last_name: "", role: "member" });
      if (r.temporaryPassword) setTemp({ email: r.member.email, password: r.temporaryPassword });
      reload();
    }, "");
    if (ok) saver.setNotice(null);
  }
  return (
    <SettingsPageFrame title="Members" subtitle="People who can use this workspace" actions={canInvite ? <Button variant="primary" icon={Plus} onClick={() => setInviting(true)}>Add member</Button> : undefined}>
      {error ? <Notice tone="error">{error}</Notice> : null}
      {saver.notice ? <Notice tone={saver.notice.tone}>{saver.notice.text}</Notice> : null}
      <Card>
        <div className="sv-table-wrap">
          <table className="sv-table">
            <thead><tr><th>Member</th><th>Joined</th><th>Access</th><th style={{ width: 40 }} /></tr></thead>
            <tbody>
              {members?.map((m) => {
                const can = canManageMember(role, m, members);
                return (
                  <tr key={m.user_id}>
                    <td style={{ fontWeight: 500 }}>{memberDisplayName(m)}{m.is_you ? <> <Badge>You</Badge></> : null}<div className="sv-hint">{m.email}</div></td>
                    <td>{dateText(m.created_at)}</td>
                    <td>{can.canEdit ? (
                      <select className="sv-select" style={{ width: 130 }} aria-label={`Access for ${memberDisplayName(m)}`} value={m.role} onChange={(e) => void saver.run(async () => { await teamApi.updateMember(m.user_id, { role: e.target.value as WorkspaceRole }); reload(); }, "Access updated.")}>
                        {role === "owner" ? <option value="owner">Owner</option> : null}<option value="admin">Admin</option><option value="member">Member</option>
                      </select>) : <Badge tone={m.role === "owner" ? "purple" : "neutral"}>{ROLE_LABEL[m.role]}</Badge>}</td>
                    <td>{can.canRemove ? <button type="button" className="sv-icon-btn" aria-label={`Remove ${memberDisplayName(m)}`} onClick={() => setRemoving(m)}><Trash2 className="sv-icon" aria-hidden /></button> : null}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="sv-hint">Adding someone creates their account if needed and emails them a sign-in link. There's no pending-invitation step.</p>

      <Modal open={inviting} title="Add member" onClose={() => setInviting(false)} footer={<><Button onClick={() => setInviting(false)}>Cancel</Button><Button variant="primary" disabled={saver.busy || !form.email.trim()} onClick={() => void invite()}>Add member</Button></>}>
        <Field label="Email" htmlFor="mem-email"><input id="mem-email" type="email" className="sv-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoFocus /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="First name" htmlFor="mem-first"><input id="mem-first" className="sv-input" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></Field>
          <Field label="Last name" htmlFor="mem-last"><input id="mem-last" className="sv-input" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></Field>
        </div>
        <Field label="Access" htmlFor="mem-role"><select id="mem-role" className="sv-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "member" })}>{role === "owner" ? <option value="admin">Admin: manages members and settings</option> : null}<option value="member">Member: uses the app</option></select></Field>
        {saver.notice?.tone === "error" ? <Notice tone="error">{saver.notice.text}</Notice> : null}
      </Modal>
      <Modal open={temp !== null} title="Share this password" onClose={() => setTemp(null)} footer={<Button variant="primary" onClick={() => setTemp(null)}>Done</Button>}>
        <p className="sv-hint">An account was created for {temp?.email}. This temporary password is shown once. Ask them to change it after signing in.</p>
        <input className="sv-input" readOnly aria-label="Temporary password" value={temp?.password ?? ""} onFocus={(e) => e.currentTarget.select()} style={{ fontFamily: "ui-monospace, monospace" }} />
      </Modal>
      {removing ? <ConfirmModal title="Remove member" confirmLabel="Remove" body={<>{memberDisplayName(removing)} will lose access to this workspace right away.</>} onClose={() => setRemoving(null)} onConfirm={async () => { await teamApi.removeMember(removing.user_id).catch((caught) => saver.setNotice({ tone: "error", text: caught instanceof Error ? caught.message : "Could not remove." })); reload(); }} /> : null}
    </SettingsPageFrame>
  );
}

// ---- Workspace Snapshots ----
export function SettingsSnapshots() {
  useSvTitle([{ label: "Workspace Snapshots" }]);
  const canManage = useCanManage();
  const { data, error, reload } = useRemote(() => settingsApi.snapshots(), []);
  const [tab, setTab] = useState<"builtin" | "custom">("builtin");
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [applying, setApplying] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);
  const saver = useSaver();
  const list = tab === "builtin" ? data?.builtIn : data?.custom;
  const parts = (c: { rules: number; templates: number; meetingTypes: number; outcomes: number; customFields: number; knowledgeBase: number }) =>
    [c.rules && `${c.rules} rules`, c.templates && `${c.templates} templates`, c.meetingTypes && `${c.meetingTypes} meeting types`, c.outcomes && `${c.outcomes} outcomes`, c.customFields && `${c.customFields} custom fields`, c.knowledgeBase && "knowledge base"].filter(Boolean).join(", ") || "Empty";

  return (
    <SettingsPageFrame title="Workspace Snapshots" subtitle="Reusable setups you can apply to this workspace" actions={canManage ? <Button variant="primary" icon={Plus} onClick={() => setNaming(true)}>Save current setup</Button> : undefined}>
      {!canManage ? <ReadOnlyNote /> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      {saver.notice ? <Notice tone={saver.notice.tone}>{saver.notice.text}</Notice> : null}
      <nav className="sv-tabs" aria-label="Snapshot type">{(["builtin", "custom"] as const).map((t) => <button key={t} type="button" className={`sv-tab${tab === t ? " is-active" : ""}`} onClick={() => setTab(t)}>{t === "builtin" ? "Built-in" : "Custom"}</button>)}</nav>
      <Card>
        <div className="sv-table-wrap">
          <table className="sv-table">
            <thead><tr><th>Name</th><th>Contains</th><th>Version</th><th style={{ width: 170 }} /></tr></thead>
            <tbody>
              {list?.map((s) => (
                <tr key={s.id}><td style={{ fontWeight: 500 }}>{s.name}<div className="sv-hint">{s.description}</div></td><td className="sv-hint">{parts(s.counts)}</td><td>v{s.version}</td>
                  <td><span className="sv-actions"><Button size="sm" disabled={!canManage} onClick={() => setApplying({ id: s.id, name: s.name })}>Apply</Button>{!s.builtIn && canManage ? <button type="button" className="sv-icon-btn" aria-label={`Delete ${s.name}`} onClick={() => setDeleting({ id: s.id, name: s.name })}><Trash2 className="sv-icon" aria-hidden /></button> : null}</span></td></tr>
              ))}
            </tbody>
          </table>
          {list && list.length === 0 ? <p className="sv-hint" style={{ padding: 20, margin: 0 }}>{tab === "custom" ? "No custom snapshots yet. Save your current setup to reuse it in another workspace." : "Nothing here."}</p> : null}
        </div>
      </Card>
      <p className="sv-hint">Applying a snapshot only adds what's missing. It never deletes or overwrites your rules, templates or meeting types, and it fills the knowledge base only when that's empty.</p>
      <Modal open={naming} title="Save current setup" onClose={() => setNaming(false)} footer={<><Button onClick={() => setNaming(false)}>Cancel</Button><Button variant="primary" disabled={!name.trim() || saver.busy} onClick={() => void saver.run(async () => { await settingsApi.captureSnapshot({ name: name.trim() }); setNaming(false); setName(""); setTab("custom"); reload(); }, "Snapshot saved.")}>Save</Button></>}>
        <Field label="Name" htmlFor="snap-name"><input id="snap-name" className="sv-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
        <p className="sv-hint">Captures your reply rules, knowledge base, meeting types, shared templates, custom outcomes and custom fields. Using an existing name saves a new version.</p>
      </Modal>
      {applying ? <ConfirmModal danger={false} title={`Apply "${applying.name}"`} confirmLabel="Apply" body="Missing rules, templates, meeting types and fields will be added to this workspace. Nothing you already have is changed." onClose={() => setApplying(null)} onConfirm={async () => { await saver.run(async () => { const r = await settingsApi.applySnapshot(applying.id); const added = Object.entries(r.added).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k.replace(/([A-Z])/g, " $1").toLowerCase()}`); saver.setNotice({ tone: "ok", text: added.length ? `Added ${added.join(", ")}.` : "Nothing to add. You already have everything in this snapshot." }); }, "").then(() => undefined); }} /> : null}
      {deleting ? <ConfirmModal title="Delete snapshot" confirmLabel="Delete" body={<>Delete <b>{deleting.name}</b>? Workspaces that already applied it keep what they got.</>} onClose={() => setDeleting(null)} onConfirm={async () => { await settingsApi.deleteSnapshot(deleting.id).catch(() => undefined); reload(); }} /> : null}
    </SettingsPageFrame>
  );
}

// ---- Billing ----
export function SettingsBilling() {
  useSvTitle([{ label: "Billing" }]);
  const { data, error } = useRemote(() => settingsApi.billing(), []);
  const plan = data?.plan;
  return (
    <SettingsPageFrame title="Billing" subtitle="Your plan, usage, domains and inboxes">
      {error ? <Notice tone="error">{error}</Notice> : null}
      <SettingsCard title="Current plan">
        {plan ? (
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <b style={{ fontSize: 18, fontWeight: 500 }}>{plan.type === "trial" ? "Free trial" : "Standard"}</b>
            <Badge tone={plan.ended ? "red" : "green"}>{plan.ended ? "Ended" : "Active"}</Badge>
            {plan.type === "trial" ? <span className="sv-hint">{plan.ended ? "Your trial has ended." : `${plan.days_left} ${plan.days_left === 1 ? "day" : "days"} left, ends ${dateText(plan.trial_ends_at)}`}</span> : null}
          </div>
        ) : <p className="sv-hint">Loading…</p>}
        <p className="sv-hint">Payments are handled by the SendVybe team. To change your plan or limits, contact support.</p>
      </SettingsCard>

      <SettingsCard title="Usage" description="What your plan allows and how much you've used.">
        {plan?.limits && plan.limits.length > 0 ? plan.limits.map((l) => {
          const pct = l.limit ? Math.min(100, Math.round((l.used / l.limit) * 100)) : 0;
          return (
            <div key={l.key}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontWeight: 500 }}>{l.label}</span><span className="sv-hint">{l.used.toLocaleString()} of {l.limit === null ? "unlimited" : l.limit.toLocaleString()}{l.period === "day" ? " per day" : ""}</span></div>
              <div className="sv-meter" aria-hidden><i style={{ width: `${pct}%`, background: pct >= 90 ? "var(--ds-red-text)" : "var(--ds-green-text)" }} /></div>
            </div>
          );
        }) : <p className="sv-hint">{data ? "Your plan has no usage limits." : "Loading…"}</p>}
      </SettingsCard>

      <SettingsCard title="Email accounts and domains" description={data ? `${data.totals.domains} domains, ${data.totals.inboxes} inboxes (${data.totals.activeInboxes} active)` : undefined}>
        <div className="sv-actions"><Link className="sv-btn is-primary" to={svPath("cold-email-campaign-agent/email-accounts/new")}>Request more</Link><Link className="sv-btn" to={svPath("cold-email-campaign-agent/email-accounts")}>Manage inboxes</Link></div>
        {data && data.openRequests > 0 ? <p className="sv-hint">{data.openRequests} open {data.openRequests === 1 ? "request" : "requests"} with the team.</p> : null}
        <div className="sv-table-wrap">
          <table className="sv-table">
            <thead><tr><th>Domain</th><th>Status</th><th className="is-num">Inboxes</th><th>Added</th></tr></thead>
            <tbody>{data?.domains.map((d) => <tr key={d.id}><td style={{ fontWeight: 500 }}>{d.domain}</td><td><Badge tone={d.status === "Verified" ? "green" : d.status === "Failed" ? "red" : "yellow"}>{d.status}</Badge></td><td className="is-num">{d.inboxes}{d.activeInboxes !== d.inboxes ? <span className="sv-hint"> ({d.activeInboxes} active)</span> : null}</td><td>{dateText(d.addedAt)}</td></tr>)}</tbody>
          </table>
          {data && data.domains.length === 0 ? <p className="sv-hint" style={{ padding: 20, margin: 0 }}>No domains yet.</p> : null}
        </div>
      </SettingsCard>
    </SettingsPageFrame>
  );
}

// ---- Scheduling (meeting types) ----
export function SettingsScheduling() {
  useSvTitle([{ label: "Scheduling" }]);
  const canManage = useCanManage();
  const { data, error, reload } = useRemote(() => aiSdrApi.settings().then((b) => b.meetingTypes), []);
  const [modal, setModal] = useState<MeetingType | "new" | null>(null);
  const [deleting, setDeleting] = useState<MeetingType | null>(null);
  const saver = useSaver();
  return (
    <SettingsPageFrame title="Scheduling" subtitle="Meeting types shared by the AI SDR, campaigns and your CRM calendar" actions={canManage ? <Button variant="primary" icon={Plus} onClick={() => setModal("new")}>Add meeting type</Button> : undefined}>
      {!canManage ? <ReadOnlyNote /> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      {saver.notice ? <Notice tone={saver.notice.tone}>{saver.notice.text}</Notice> : null}
      <Card>
        <div className="sv-table-wrap">
          <table className="sv-table">
            <thead><tr><th>Meeting type</th><th>Campaign type</th><th>Duration</th><th>Calendar title</th><th style={{ width: 80 }} /></tr></thead>
            <tbody>
              {data?.map((m) => (
                <tr key={m.id}><td style={{ fontWeight: 500 }}>{m.name}{m.isDefault ? <> <Badge tone="blue">Default</Badge></> : null}</td><td>{m.campaignType}</td><td>{m.durationMinutes} min</td><td className="sv-hint">{m.calendarTitle || "—"}</td>
                  <td>{canManage ? <span className="sv-actions"><button type="button" className="sv-icon-btn" aria-label={`Edit ${m.name}`} onClick={() => setModal(m)}><Pencil className="sv-icon" aria-hidden /></button><button type="button" className="sv-icon-btn" aria-label={`Delete ${m.name}`} onClick={() => setDeleting(m)}><Trash2 className="sv-icon" aria-hidden /></button></span> : null}</td></tr>
              ))}
            </tbody>
          </table>
          {data && data.length === 0 ? <p className="sv-hint" style={{ padding: 20, margin: 0 }}>No meeting types yet.</p> : null}
        </div>
      </Card>
      {modal ? <MeetingTypeModal initial={modal === "new" ? null : modal} onClose={() => setModal(null)} onSaved={reload} /> : null}
      {deleting ? <ConfirmModal title="Delete meeting type" confirmLabel="Delete" body={<>Delete <b>{deleting.name}</b>? Campaigns using it fall back to the default.</>} onClose={() => setDeleting(null)} onConfirm={async () => { await saver.run(() => aiSdrApi.deleteMeetingType(deleting.id), "Meeting type deleted."); reload(); }} /> : null}
    </SettingsPageFrame>
  );
}

// ---- Cold Email Blocklist ----
export function SettingsBlocklist() {
  useSvTitle([{ label: "Cold Email Blocklist" }]);
  const [text, setText] = useState("");
  const search = useDebounced(text);
  const [page, setPage] = useState(1);
  const [picked, setPicked] = useState<number[]>([]);
  const [adding, setAdding] = useState(false);
  const [addText, setAddText] = useState("");
  const [importing, setImporting] = useState(false);
  const saver = useSaver();
  const { data, error, reload } = useRemote(() => settingsApi.blocklist({ search, page }), [search, page]);
  const allPicked = Boolean(data?.items.length) && data!.items.every((i) => picked.includes(i.id));

  return (
    <SettingsPageFrame title="Cold Email Blocklist" subtitle="People who will never be emailed by your campaigns. Anyone who asks to be removed is added automatically."
      actions={<><SearchBox value={text} onChange={(v) => { setText(v); setPage(1); }} placeholder="Search emails…" /><Button icon={Download} onClick={() => void saver.run(() => settingsApi.blockExport(), "")}>Download CSV</Button><label className="sv-btn" style={{ cursor: "pointer" }}><Upload className="sv-icon" aria-hidden /> Import CSV<input type="file" accept=".csv,text/csv,text/plain" hidden onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (!file) return; setImporting(true); void file.text().then((t) => saver.run(async () => { const r = await settingsApi.blockImport(t); saver.setNotice({ tone: "ok", text: `Added ${r.added}${r.alreadyBlocked ? `, ${r.alreadyBlocked} were already blocked` : ""}${r.invalidCount ? `, ${r.invalidCount} weren't valid emails` : ""}.` }); setPage(1); reload(); }, "")).finally(() => setImporting(false)); }} /></label><Button variant="primary" icon={Plus} onClick={() => setAdding(true)}>Add</Button></>}>
      {error ? <Notice tone="error">{error}</Notice> : null}
      {saver.notice ? <Notice tone={saver.notice.tone}>{saver.notice.text}</Notice> : null}
      {importing ? <p className="sv-hint">Importing…</p> : null}
      {picked.length > 0 ? (
        <div className="sv-bulkbar" role="region" aria-label="Bulk actions"><span>{picked.length} selected</span><Button size="sm" onClick={() => void saver.run(async () => { const r = await settingsApi.blockRemove(picked); setPicked([]); reload(); saver.setNotice({ tone: "ok", text: `Removed ${r.removed} from the blocklist.` }); }, "")}>Remove from blocklist</Button><Button size="sm" onClick={() => setPicked([])}>Clear</Button></div>
      ) : null}
      <Card>
        <div className="sv-table-wrap">
          <table className="sv-table">
            <thead><tr><th style={{ width: 40 }}><Checkbox label="Select all on this page" checked={allPicked} onChange={(v) => setPicked(v ? data?.items.map((i) => i.id) ?? [] : [])} /></th><th>Email</th><th>Reason</th><th>Blocked on</th></tr></thead>
            <tbody>
              {data?.items.map((b) => (
                <tr key={b.id}><td><Checkbox label={`Select ${b.email}`} checked={picked.includes(b.id)} onChange={(v) => setPicked(v ? [...picked, b.id] : picked.filter((x) => x !== b.id))} /></td><td style={{ fontWeight: 500 }}>{b.email}</td>
                  <td><Badge tone={b.reason === "manual" ? "neutral" : b.reason === "hard_bounce" ? "red" : "yellow"}>{{ unsubscribed: "Unsubscribed", complained: "Complained", hard_bounce: "Bounced", manual: "Added by you" }[b.reason] ?? b.reason}</Badge>{b.campaignName ? <span className="sv-hint"> · {b.campaignName}</span> : null}</td><td>{dateText(b.createdAt)}</td></tr>
              ))}
            </tbody>
          </table>
          {data && data.items.length === 0 ? <p className="sv-hint" style={{ padding: 20, margin: 0 }}>{search ? "No blocked emails match." : "Nobody is blocked yet."}</p> : null}
        </div>
      </Card>
      {data ? <Pager {...data} onPage={(p) => { setPage(p); setPicked([]); }} /> : null}
      <p className="sv-hint">Blocking works on full email addresses. Blocking a whole domain isn't supported yet.</p>
      <Modal open={adding} title="Add to blocklist" onClose={() => setAdding(false)} footer={<><Button onClick={() => setAdding(false)}>Cancel</Button><Button variant="primary" disabled={!addText.trim() || saver.busy} onClick={() => void saver.run(async () => { const r = await settingsApi.blockAdd(addText); setAdding(false); setAddText(""); setPage(1); reload(); saver.setNotice({ tone: r.invalid.length ? "error" : "ok", text: `Added ${r.added}.${r.invalid.length ? ` Skipped (not a full email address): ${r.invalid.slice(0, 5).join(", ")}.` : ""}` }); }, "")}>Add</Button></>}>
        <Field label="Email addresses" htmlFor="blk-add"><textarea id="blk-add" className="sv-textarea" style={{ minHeight: 110 }} placeholder={"jane@example.com\njohn@example.org"} value={addText} onChange={(e) => setAddText(e.target.value)} autoFocus /></Field>
        <p className="sv-hint">Separate addresses with new lines, spaces or commas.</p>
      </Modal>
    </SettingsPageFrame>
  );
}

// ---- Email Templates ----
export function SettingsTemplates() {
  useSvTitle([{ label: "Email Templates" }]);
  const [text, setText] = useState("");
  const search = useDebounced(text);
  const { data, error, reload } = useRemote(() => settingsApi.templates(search), [search]);
  const [editing, setEditing] = useState<Template | "new" | null>(null);
  const [deleting, setDeleting] = useState<Template | null>(null);
  const [form, setForm] = useState({ name: "", subject: "", body: "", shared: true });
  const saver = useSaver();
  const open = (t: Template | "new") => { setEditing(t); setForm(t === "new" ? { name: "", subject: "", body: "", shared: true } : { name: t.name, subject: t.subject, body: t.body, shared: t.shared }); saver.setNotice(null); };
  return (
    <SettingsPageFrame title="Email Templates" subtitle="Reusable emails for you and your team" actions={<><SearchBox value={text} onChange={setText} placeholder="Search templates…" /><Button variant="primary" icon={Plus} onClick={() => open("new")}>New template</Button></>}>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Card>
        <div className="sv-table-wrap">
          <table className="sv-table">
            <thead><tr><th>Name</th><th>Subject</th><th>Visible to</th><th>Updated</th><th style={{ width: 80 }} /></tr></thead>
            <tbody>
              {data?.items.map((t) => (
                <tr key={t.id}><td style={{ fontWeight: 500 }}>{t.name}</td><td className="sv-hint">{t.subject || "—"}</td><td>{t.shared ? <Badge tone="blue">Everyone</Badge> : <Badge>Only {t.mine ? "you" : t.ownerName ?? "owner"}</Badge>}</td><td>{dateText(t.updatedAt)}</td>
                  <td><span className="sv-actions"><button type="button" className="sv-icon-btn" aria-label={`Edit ${t.name}`} onClick={() => open(t)}><Pencil className="sv-icon" aria-hidden /></button><button type="button" className="sv-icon-btn" aria-label={`Delete ${t.name}`} onClick={() => setDeleting(t)}><Trash2 className="sv-icon" aria-hidden /></button></span></td></tr>
              ))}
            </tbody>
          </table>
          {data && data.items.length === 0 ? <p className="sv-hint" style={{ padding: 20, margin: 0 }}>{search ? "No templates match." : "No templates yet. Create one to reuse a good email."}</p> : null}
        </div>
      </Card>
      <Modal open={editing !== null} title={editing === "new" ? "New template" : "Edit template"} onClose={() => setEditing(null)} footer={<><Button onClick={() => setEditing(null)}>Cancel</Button><Button variant="primary" disabled={!form.name.trim() || saver.busy} onClick={() => void saver.run(async () => { await (editing === "new" ? settingsApi.createTemplate(form) : settingsApi.updateTemplate((editing as Template).id, form)); setEditing(null); reload(); }, "")}>Save template</Button></>}>
        {saver.notice?.tone === "error" ? <Notice tone="error">{saver.notice.text}</Notice> : null}
        <Field label="Name" htmlFor="tpl-name"><input id="tpl-name" className="sv-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></Field>
        <Field label="Subject" htmlFor="tpl-subject"><input id="tpl-subject" className="sv-input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></Field>
        <Field label="Body" htmlFor="tpl-body"><textarea id="tpl-body" className="sv-textarea" style={{ minHeight: 160 }} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
        <p className="sv-hint">Placeholders: {(data?.variables ?? []).map((v) => `{{${v}}}`).join(" ")}</p>
        <SwitchRow label="Share with the workspace" hint="Off keeps it visible only to you." checked={form.shared} onChange={(v) => setForm({ ...form, shared: v })} />
      </Modal>
      {deleting ? <ConfirmModal title="Delete template" confirmLabel="Delete" body={<>Delete <b>{deleting.name}</b>?</>} onClose={() => setDeleting(null)} onConfirm={async () => { await settingsApi.deleteTemplate(deleting.id).catch((caught) => saver.setNotice({ tone: "error", text: caught instanceof Error ? caught.message : "Could not delete." })); reload(); }} /> : null}
    </SettingsPageFrame>
  );
}

// ---- Sharing ----
export function SettingsSharing() {
  useSvTitle([{ label: "Sharing" }]);
  const canManage = useCanManage();
  const settings = useRemote(() => settingsApi.workspace(), []);
  const audit = useRemote(() => settingsApi.audit("sharing"), []);
  const saver = useSaver();
  const on = settings.data?.sharing.communication ?? false;
  return (
    <SettingsPageFrame title="Sharing" subtitle="Who on your team can see conversations">
      {!canManage ? <ReadOnlyNote /> : null}
      {saver.notice ? <Notice tone={saver.notice.tone}>{saver.notice.text}</Notice> : null}
      <SettingsCard title="Communication sharing" description="Let teammates read emails on people, companies and deals they can access.">
        <SwitchRow label="Share communication with the workspace" checked={on} disabled={!canManage || saver.busy} onChange={(v) => void saver.run(async () => { await settingsApi.saveWorkspace({ sharing: { communication: v } }); settings.reload(); audit.reload(); }, v ? "Sharing is on." : "Sharing is off.")} />
        <Notice tone="warn">This switch is recorded, but it doesn't restrict who can read conversations yet. Every member of the workspace can currently see the AI SDR inbox.</Notice>
      </SettingsCard>
      <SettingsCard title="History" description="Recent changes to this setting.">
        {audit.data && audit.data.length === 0 ? <p className="sv-hint">No changes yet.</p> : null}
        <ul className="sv-dash-list">{audit.data?.map((a) => <li key={a.id}><span>{a.summary} <span className="sv-hint">by {a.who}</span></span><span className="sv-hint">{dateTimeText(a.at)}</span></li>)}</ul>
      </SettingsCard>
    </SettingsPageFrame>
  );
}

// ---- CRM Custom Fields ----
const TYPE_LABEL: Record<FieldType, string> = { text: "Text", number: "Number", date: "Date", select: "Dropdown", checkbox: "Checkbox" };

export function SettingsCustomFields() {
  useSvTitle([{ label: "CRM Custom Fields" }]);
  const canManage = useCanManage();
  const { data, error, reload } = useRemote(() => settingsApi.fields(), []);
  const [form, setForm] = useState<{ entity: "deal" | "company"; label: string; type: FieldType; options: string } | null>(null);
  const [deleting, setDeleting] = useState<CustomField | null>(null);
  const saver = useSaver();
  const groups: Array<["deal" | "company", string]> = [["deal", "Deals"], ["company", "Companies"]];
  return (
    <SettingsPageFrame title="CRM Custom Fields" subtitle="Extra details to track on deals and companies">
      {!canManage ? <ReadOnlyNote /> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      {saver.notice?.tone === "error" ? <Notice tone="error">{saver.notice.text}</Notice> : null}
      {groups.map(([entity, title]) => {
        const rows = data?.filter((f) => f.entity === entity) ?? [];
        return (
          <SettingsCard key={entity} title={title} description={`${rows.length} custom ${rows.length === 1 ? "field" : "fields"}`}>
            {rows.map((f) => <div key={f.id} className="sv-sidebar-edit-row"><span style={{ flex: 1 }}><b style={{ fontWeight: 500 }}>{f.label}</b> <Badge>{TYPE_LABEL[f.type]}</Badge>{f.type === "select" ? <span className="sv-hint"> {f.options.join(", ")}</span> : null}</span>{canManage ? <button type="button" className="sv-icon-btn" aria-label={`Delete ${f.label}`} onClick={() => setDeleting(f)}><Trash2 className="sv-icon" aria-hidden /></button> : null}</div>)}
            {canManage ? <div><Button icon={Plus} onClick={() => { setForm({ entity, label: "", type: "text", options: "" }); saver.setNotice(null); }}>Add field</Button></div> : null}
          </SettingsCard>
        );
      })}
      <p className="sv-hint">Custom fields appear when you add or edit a deal or company in the CRM.</p>
      <Modal open={form !== null} title="Add custom field" onClose={() => setForm(null)} footer={<><Button onClick={() => setForm(null)}>Cancel</Button><Button variant="primary" disabled={!form?.label.trim() || saver.busy} onClick={() => form && void saver.run(async () => { await settingsApi.createField({ entity: form.entity, label: form.label, type: form.type, options: form.type === "select" ? form.options.split("\n") : undefined }); setForm(null); reload(); }, "")}>Add field</Button></>}>
        {saver.notice?.tone === "error" ? <Notice tone="error">{saver.notice.text}</Notice> : null}
        {form ? (<>
          <Field label="Name" htmlFor="cf-name"><input id="cf-name" className="sv-input" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} autoFocus /></Field>
          <Field label="Type" htmlFor="cf-type"><select id="cf-type" className="sv-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as FieldType })}>{(Object.keys(TYPE_LABEL) as FieldType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}</select></Field>
          {form.type === "select" ? <Field label="Choices (one per line)" htmlFor="cf-options"><textarea id="cf-options" className="sv-textarea" style={{ minHeight: 90 }} value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} /></Field> : null}
        </>) : null}
      </Modal>
      {deleting ? <ConfirmModal title="Delete custom field" confirmLabel="Delete" body={<>Delete <b>{deleting.label}</b> and remove its value from every {deleting.entity}? This can't be undone.</>} onClose={() => setDeleting(null)} onConfirm={async () => { await settingsApi.deleteField(deleting.id).catch(() => undefined); reload(); }} /> : null}
    </SettingsPageFrame>
  );
}

// ---- Call & Meeting Outcomes ----
export function SettingsOutcomes() {
  useSvTitle([{ label: "Call & Meeting Outcomes" }]);
  const canManage = useCanManage();
  const { data, error, reload } = useRemote(() => settingsApi.outcomes(), []);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [group, setGroup] = useState<"call" | "meeting">("call");
  const [renaming, setRenaming] = useState<Outcome | null>(null);
  const [renameText, setRenameText] = useState("");
  const saver = useSaver();
  return (
    <SettingsPageFrame title="Call & Meeting Outcomes" subtitle="The results you can record for a call or meeting" actions={canManage ? <Button variant="primary" icon={Plus} onClick={() => { setAdding(true); saver.setNotice(null); }}>Add outcome</Button> : undefined}>
      {!canManage ? <ReadOnlyNote /> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      {saver.notice?.tone === "error" && !adding && !renaming ? <Notice tone="error">{saver.notice.text}</Notice> : null}
      <Card>
        <div className="sv-table-wrap">
          <table className="sv-table">
            <thead><tr><th>Outcome</th><th>Group</th><th style={{ width: 80 }} /></tr></thead>
            <tbody>
              {data?.map((o) => (
                <tr key={o.id}><td style={{ fontWeight: 500 }}>{o.name}{o.system ? <> <Badge>System</Badge></> : null}</td><td>{o.group === "call" ? "Call" : "Meeting"}</td>
                  <td>{canManage && !o.system ? <span className="sv-actions"><button type="button" className="sv-icon-btn" aria-label={`Rename ${o.name}`} onClick={() => { setRenaming(o); setRenameText(o.name); saver.setNotice(null); }}><Pencil className="sv-icon" aria-hidden /></button><button type="button" className="sv-icon-btn" aria-label={`Delete ${o.name}`} onClick={() => void saver.run(async () => { await settingsApi.deleteOutcome(o.id); reload(); }, "")}><Trash2 className="sv-icon" aria-hidden /></button></span> : null}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="sv-hint">Pick an outcome on an appointment in the CRM. Built-in outcomes can't be changed.</p>
      <Modal open={adding} title="Add outcome" onClose={() => setAdding(false)} footer={<><Button onClick={() => setAdding(false)}>Cancel</Button><Button variant="primary" disabled={!name.trim() || saver.busy} onClick={() => void saver.run(async () => { await settingsApi.createOutcome({ name, group }); setAdding(false); setName(""); reload(); }, "")}>Add</Button></>}>
        {saver.notice?.tone === "error" ? <Notice tone="error">{saver.notice.text}</Notice> : null}
        <Field label="Name" htmlFor="oc-name"><input id="oc-name" className="sv-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
        <Field label="Group" htmlFor="oc-group"><select id="oc-group" className="sv-select" value={group} onChange={(e) => setGroup(e.target.value as "call" | "meeting")}><option value="call">Call</option><option value="meeting">Meeting</option></select></Field>
      </Modal>
      <Modal open={renaming !== null} title="Rename outcome" onClose={() => setRenaming(null)} footer={<><Button onClick={() => setRenaming(null)}>Cancel</Button><Button variant="primary" disabled={!renameText.trim() || saver.busy} onClick={() => renaming && void saver.run(async () => { await settingsApi.updateOutcome(renaming.id, renameText); setRenaming(null); reload(); }, "")}>Save</Button></>}>
        {saver.notice?.tone === "error" ? <Notice tone="error">{saver.notice.text}</Notice> : null}
        <input className="sv-input" aria-label="Outcome name" value={renameText} onChange={(e) => setRenameText(e.target.value)} autoFocus />
      </Modal>
    </SettingsPageFrame>
  );
}

// ---- Connected Apps & API Keys ----
export function SettingsApiKeys() {
  useSvTitle([{ label: "Connected Apps & API Keys" }]);
  const canManage = useCanManage();
  return (
    <SettingsPageFrame title="Connected Apps & API Keys" subtitle="Keys that let other tools work with this workspace">
      <Notice tone="warn">Keys are scoped to this workspace. A key can do what its creator can, so only share it with tools you trust.</Notice>
      {!canManage ? <ReadOnlyNote /> : null}
      <SettingsCard title="Workspace API keys" description="Send the key as an Authorization: Bearer header. See Developer Docs for examples.">
        <TokenManager kind="workspace" canCreate={canManage} emptyText="No API keys yet." />
      </SettingsCard>
      <SettingsCard title="AI provider keys" description="Your own OpenAI, Anthropic or Gemini key, used by the AI SDR, the AI Consultant, the Sales Call Analyzer and the report tools.">
        <div><Link className="sv-link" to="/ai-keys">Manage AI keys</Link></div>
      </SettingsCard>
      <SettingsCard title="Connected apps" description="Apps that signed in with your account through OAuth.">
        <div><Badge>Not available yet</Badge></div>
        <p className="sv-hint">OAuth connections for AI assistants aren't built into this version. Use an API key above.</p>
      </SettingsCard>
    </SettingsPageFrame>
  );
}
