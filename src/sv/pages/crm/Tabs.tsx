import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, MoreHorizontal, Pencil, Plus, Trash2, Video } from "lucide-react";
import { crmApi, DEAL_STAGES, STAGE_LABEL, type Company, type Deal, type DealStage, type Member, type Task } from "../../api/crm";
import { svPath } from "../../nav";
import { Badge, Button, Card, EmptyState, Field, Menu, Modal, PageHeader, Skeleton, SkeletonCard } from "../../ui";
import { settingsApi } from "../../api/settings";
import { Banner, CustomFieldInputs, customPayload, dateTime, fromLocalInput, money, Pager, SearchBox, TableCard, toLocalInput, useDebounced, useRemote } from "./shared";
import { formatDate } from "../cold-email/shared";

const useMembers = () => useRemote(() => crmApi.members(), []).data ?? ([] as Member[]);

function RowMenu({ label, onEdit, onDelete }: { label: string; onEdit?: () => void; onDelete: () => void }) {
  return (
    <Menu className="sv-icon-btn" align="right" label={label} trigger={<MoreHorizontal className="sv-icon" aria-hidden />}
      items={[...(onEdit ? [{ label: "Edit", icon: Pencil, onSelect: onEdit }] : []), { label: "Delete", icon: Trash2, danger: true, onSelect: onDelete }]} />
  );
}

// ---- Tasks ----
function TaskModal({ task, members, onClose, onSaved }: { task: Task | null; members: Member[]; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [due, setDue] = useState(toLocalInput(task?.dueAt ?? null));
  const [assignee, setAssignee] = useState(task?.assigneeUserId ? String(task.assigneeUserId) : "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true); setError("");
    const body = { title, description, dueAt: fromLocalInput(due), assigneeUserId: assignee ? Number(assignee) : null };
    try { await (task ? crmApi.updateTask(task.id, body) : crmApi.createTask(body)); onSaved(); onClose(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save the task."); setBusy(false); }
  }
  return (
    <Modal open title={task ? "Edit task" : "Add task"} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={busy || !title.trim()} onClick={() => void save()}>{busy ? "Saving…" : "Save task"}</Button></>}>
      <Banner error={error} />
      <Field label="Title" htmlFor="task-title"><input id="task-title" className="sv-input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus /></Field>
      <Field label="Details (optional)" htmlFor="task-desc"><textarea id="task-desc" className="sv-textarea" style={{ minHeight: 70 }} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      <Field label="Due" htmlFor="task-due"><input id="task-due" type="datetime-local" className="sv-input" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
      <Field label="Assignee" htmlFor="task-assignee"><select id="task-assignee" className="sv-select" value={assignee} onChange={(e) => setAssignee(e.target.value)}><option value="">Unassigned</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
    </Modal>
  );
}

export function TasksTab() {
  const members = useMembers();
  const [status, setStatus] = useState<"open" | "done">("open");
  const [assignee, setAssignee] = useState("");
  const [overdue, setOverdue] = useState(false);
  const [sort, setSort] = useState("");
  const [text, setText] = useState("");
  const [page, setPage] = useState(1);
  const search = useDebounced(text);
  const [editing, setEditing] = useState<Task | "new" | null>(null);
  const { data, error, setError, reload } = useRemote(() => crmApi.tasks({ status, assignee: assignee === "me" ? "me" : assignee, overdue, search, sort, page }), [status, assignee, overdue, search, sort, page]);
  const act = async (action: () => Promise<unknown>) => { try { await action(); reload(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Something went wrong."); } };
  return (
    <>
      <PageHeader title="Tasks" actions={<>
        <SearchBox value={text} onChange={(v) => { setText(v); setPage(1); }} placeholder="Search tasks…" />
        <Menu label="Filter by assignee" trigger={<>{assignee === "me" ? "Assigned to me" : assignee === "none" ? "Unassigned" : "All assignees"}</>} items={[{ label: "All assignees", selected: !assignee, onSelect: () => { setAssignee(""); setPage(1); } }, { label: "Assigned to me", selected: assignee === "me", onSelect: () => { setAssignee("me"); setPage(1); } }, { label: "Unassigned", selected: assignee === "none", onSelect: () => { setAssignee("none"); setPage(1); } }]} />
        <Menu label="Sort tasks" trigger={<>Sort: {sort === "created" ? "Newest" : sort === "title" ? "Title" : "Due date"}</>} items={[{ label: "Due date", selected: !sort, onSelect: () => setSort("") }, { label: "Newest", selected: sort === "created", onSelect: () => setSort("created") }, { label: "Title", selected: sort === "title", onSelect: () => setSort("title") }]} />
        <Button variant="primary" icon={Plus} onClick={() => setEditing("new")}>Add task</Button>
      </>} />
      <nav className="sv-tabs" aria-label="Task status" style={{ marginBottom: 12 }}>
        {(["open", "done"] as const).map((s) => <button key={s} type="button" className={`sv-tab${status === s ? " is-active" : ""}`} onClick={() => { setStatus(s); setPage(1); }}>{s === "open" ? "Open" : "Done"}</button>)}
        {status === "open" ? <button type="button" className={`sv-tab${overdue ? " is-active" : ""}`} onClick={() => { setOverdue(!overdue); setPage(1); }}>Overdue{data && data.overdueTotal ? ` (${data.overdueTotal})` : ""}</button> : null}
      </nav>
      <Banner error={error} />
      <TableCard head={<><th style={{ width: 44 }} /><th>Task</th><th>Due date</th><th>Record</th><th>Assignee</th><th style={{ width: 40 }} /></>} loading={!data && !error} empty={data && data.items.length === 0 ? (status === "open" ? "No open tasks. Escalated replies from the AI SDR show up here." : "No completed tasks yet.") : undefined}>
        {data?.items.map((t) => (
          <tr key={t.id}>
            <td><button type="button" className="sv-icon-btn" aria-label={t.status === "done" ? `Reopen ${t.title}` : `Mark ${t.title} done`} onClick={() => void act(() => crmApi.updateTask(t.id, { status: t.status === "done" ? "open" : "done" }))}><Check className="sv-icon" style={{ color: t.status === "done" ? "var(--ds-green-text)" : "var(--ds-text-tertiary)" }} aria-hidden /></button></td>
            <td style={{ fontWeight: 500, textDecoration: t.status === "done" ? "line-through" : undefined }}>{t.title}{t.source === "ai_sdr" ? <> <Badge tone="purple">AI SDR</Badge></> : null}</td>
            <td style={{ color: t.overdue ? "var(--ds-red-text)" : undefined }}>{dateTime(t.dueAt)}{t.overdue ? " · overdue" : ""}</td>
            <td>{t.recordType === "thread" ? <Link className="sv-link" to={svPath("ai-sdr")}>Open conversation</Link> : t.recordLabel ?? "—"}</td>
            <td>{t.assigneeName ?? <span className="sv-hint">Unassigned</span>}</td>
            <td><RowMenu label={`Actions for ${t.title}`} onEdit={() => setEditing(t)} onDelete={() => void act(() => crmApi.deleteTask(t.id))} /></td>
          </tr>
        ))}
      </TableCard>
      {data ? <Pager {...data} onPage={setPage} /> : null}
      {editing ? <TaskModal task={editing === "new" ? null : editing} members={members} onClose={() => setEditing(null)} onSaved={reload} /> : null}
    </>
  );
}

// ---- Deals ----
function DealModal({ deal, members, companies, onClose, onSaved }: { deal: Deal | null; members: Member[]; companies: Company[]; onClose: () => void; onSaved: () => void }) {
  const fields = (useRemote(() => settingsApi.fields(), []).data ?? []).filter((f) => f.entity === "deal");
  const [custom, setCustom] = useState<Record<string, string | number | boolean>>(deal?.custom ?? {});
  const [f, setF] = useState({ title: deal?.title ?? "", value: String(deal?.value ?? ""), stage: (deal?.stage ?? "lead") as DealStage, companyId: deal?.companyId ? String(deal.companyId) : "", personName: deal?.personName ?? "", personEmail: deal?.personEmail ?? "", ownerUserId: deal?.ownerUserId ? String(deal.ownerUserId) : "", expectedClose: deal?.expectedClose ?? "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof f) => (event: { target: { value: string } }) => setF({ ...f, [key]: event.target.value });
  async function save() {
    setBusy(true); setError("");
    const body = { title: f.title, value: Number(f.value) || 0, stage: f.stage, companyId: f.companyId ? Number(f.companyId) : null, personName: f.personName, personEmail: f.personEmail, ownerUserId: f.ownerUserId ? Number(f.ownerUserId) : null, expectedClose: f.expectedClose || null, custom: customPayload(fields, custom) };
    try { await (deal ? crmApi.updateDeal(deal.id, body) : crmApi.createDeal(body)); onSaved(); onClose(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save the deal."); setBusy(false); }
  }
  return (
    <Modal open title={deal ? "Edit deal" : "Add deal"} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={busy || !f.title.trim()} onClick={() => void save()}>{busy ? "Saving…" : "Save deal"}</Button></>}>
      <Banner error={error} />
      <Field label="Deal name" htmlFor="deal-title"><input id="deal-title" className="sv-input" value={f.title} onChange={set("title")} autoFocus /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Value (USD)" htmlFor="deal-value"><input id="deal-value" type="number" min={0} className="sv-input" value={f.value} onChange={set("value")} /></Field>
        <Field label="Stage" htmlFor="deal-stage"><select id="deal-stage" className="sv-select" value={f.stage} onChange={set("stage")}>{DEAL_STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}</select></Field>
        <Field label="Contact name" htmlFor="deal-pname"><input id="deal-pname" className="sv-input" value={f.personName} onChange={set("personName")} /></Field>
        <Field label="Contact email" htmlFor="deal-pemail"><input id="deal-pemail" type="email" className="sv-input" value={f.personEmail} onChange={set("personEmail")} /></Field>
        <Field label="Company" htmlFor="deal-company"><select id="deal-company" className="sv-select" value={f.companyId} onChange={set("companyId")}><option value="">None</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Owner" htmlFor="deal-owner"><select id="deal-owner" className="sv-select" value={f.ownerUserId} onChange={set("ownerUserId")}><option value="">Me</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
      </div>
      <Field label="Expected close" htmlFor="deal-close"><input id="deal-close" type="date" className="sv-input" value={f.expectedClose} onChange={set("expectedClose")} /></Field>
      <CustomFieldInputs fields={fields} values={custom} onChange={setCustom} />
    </Modal>
  );
}

export function DealsTab() {
  const members = useMembers();
  const companies = useRemote(() => crmApi.companies({}), []).data?.items ?? [];
  const [text, setText] = useState("");
  const search = useDebounced(text);
  const [editing, setEditing] = useState<Deal | "new" | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const { data, error, setError, reload } = useRemote(() => crmApi.deals({ search }), [search]);
  const act = async (action: () => Promise<unknown>) => { try { await action(); reload(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Something went wrong."); } };
  return (
    <>
      <PageHeader title="Deals" actions={<><SearchBox value={text} onChange={setText} placeholder="Search deals…" /><Button variant="primary" icon={Plus} onClick={() => setEditing("new")}>Add deal</Button></>} />
      {data ? <p className="sv-hint" style={{ margin: "0 0 12px" }}>{data.summary.openCount} open {data.summary.openCount === 1 ? "deal" : "deals"} worth {money(data.summary.openValue)} · {data.summary.wonCount} won worth {money(data.summary.wonValue)}</p> : null}
      <Banner error={error} />
      {!data ? (error ? null : (
        <div className="sv-board" role="status" aria-label="Loading">
          {DEAL_STAGES.map((stage) => (
            <section key={stage} className="sv-board-col" aria-label={STAGE_LABEL[stage]}>
              <header><span>{STAGE_LABEL[stage]}</span><Skeleton width={50} /></header>
              {[0, 1, 2].slice(0, stage === "lead" ? 3 : 2).map((i) => <SkeletonCard key={i} lines={2} />)}
            </section>
          ))}
        </div>
      )) : (
        <div className="sv-board">
          {DEAL_STAGES.map((stage) => (
            <section key={stage} className={`sv-board-col${dragId !== null ? " is-target" : ""}`} aria-label={STAGE_LABEL[stage]}
              onDragOver={(e) => e.preventDefault()} onDrop={() => { const id = dragId; setDragId(null); const d = data.items.find((x) => x.id === id); if (d && d.stage !== stage) void act(() => crmApi.updateDeal(d.id, { stage })); }}>
              <header><span>{STAGE_LABEL[stage]}</span><span className="sv-hint">{data.byStage[stage].count} · {money(data.byStage[stage].value)}</span></header>
              {data.items.filter((d) => d.stage === stage).map((d) => (
                <Card key={d.id} className="sv-deal"  >
                  <div draggable onDragStart={() => setDragId(d.id)} onDragEnd={() => setDragId(null)} style={{ cursor: "grab" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <b style={{ fontWeight: 500 }}>{d.title}</b>
                      <Menu className="sv-icon-btn" align="right" label={`Actions for ${d.title}`} trigger={<MoreHorizontal className="sv-icon" aria-hidden />} items={[{ label: "Edit", icon: Pencil, onSelect: () => setEditing(d) }, ...DEAL_STAGES.filter((s) => s !== d.stage).map((s) => ({ label: `Move to ${STAGE_LABEL[s]}`, onSelect: () => void act(() => crmApi.updateDeal(d.id, { stage: s })) })), { label: "Delete", icon: Trash2, danger: true, onSelect: () => void act(() => crmApi.deleteDeal(d.id)) }]} />
                    </div>
                    <div>{money(d.value)}</div>
                    <div className="sv-hint">{[d.companyName, d.personName || d.personEmail].filter(Boolean).join(" · ") || "No contact yet"}</div>
                    {d.expectedClose ? <div className="sv-hint">Close {d.expectedClose}</div> : null}
                  </div>
                </Card>
              ))}
            </section>
          ))}
        </div>
      )}
      {editing ? <DealModal deal={editing === "new" ? null : editing} members={members} companies={companies} onClose={() => setEditing(null)} onSaved={reload} /> : null}
    </>
  );
}

// ---- Companies ----
function CompanyModal({ company, onClose, onSaved }: { company: Company | null; onClose: () => void; onSaved: () => void }) {
  const fields = (useRemote(() => settingsApi.fields(), []).data ?? []).filter((f) => f.entity === "company");
  const [custom, setCustom] = useState<Record<string, string | number | boolean>>(company?.custom ?? {});
  const [f, setF] = useState({ name: company?.name ?? "", website: company?.website ?? "", industry: company?.industry ?? "", size: company?.size ?? "", location: company?.location ?? "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof f) => (event: { target: { value: string } }) => setF({ ...f, [key]: event.target.value });
  async function save() {
    setBusy(true); setError("");
    try { const body = { ...f, custom: customPayload(fields, custom) }; await (company ? crmApi.updateCompany(company.id, body) : crmApi.createCompany(body)); onSaved(); onClose(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save the company."); setBusy(false); }
  }
  return (
    <Modal open title={company ? "Edit company" : "Add company"} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={busy || !f.name.trim()} onClick={() => void save()}>{busy ? "Saving…" : "Save company"}</Button></>}>
      <Banner error={error} />
      <Field label="Name" htmlFor="co-name"><input id="co-name" className="sv-input" value={f.name} onChange={set("name")} autoFocus /></Field>
      <Field label="Website" htmlFor="co-web"><input id="co-web" className="sv-input" value={f.website} onChange={set("website")} /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Industry" htmlFor="co-ind"><input id="co-ind" className="sv-input" value={f.industry} onChange={set("industry")} /></Field>
        <Field label="Size" htmlFor="co-size"><input id="co-size" className="sv-input" placeholder="11-50" value={f.size} onChange={set("size")} /></Field>
      </div>
      <Field label="Location" htmlFor="co-loc"><input id="co-loc" className="sv-input" value={f.location} onChange={set("location")} /></Field>
      <CustomFieldInputs fields={fields} values={custom} onChange={setCustom} />
    </Modal>
  );
}

export function CompaniesTab() {
  const [text, setText] = useState("");
  const [page, setPage] = useState(1);
  const search = useDebounced(text);
  const [editing, setEditing] = useState<Company | "new" | null>(null);
  const { data, error, setError, reload } = useRemote(() => crmApi.companies({ search, page }), [search, page]);
  return (
    <>
      <PageHeader title="Companies" actions={<><SearchBox value={text} onChange={(v) => { setText(v); setPage(1); }} placeholder="Search companies…" /><Button variant="primary" icon={Plus} onClick={() => setEditing("new")}>Add company</Button></>} />
      <Banner error={error} />
      <TableCard head={<><th>Name</th><th>Industry</th><th>Location</th><th className="is-num">People</th><th className="is-num">Deals</th><th className="is-num">Open value</th><th style={{ width: 40 }} /></>} loading={!data && !error} empty={data && data.items.length === 0 ? "No companies yet. Add one to link it to deals." : undefined}>
        {data?.items.map((c) => (
          <tr key={c.id}>
            <td style={{ fontWeight: 500 }}>{c.name}{c.website ? <div className="sv-hint">{c.website}</div> : null}</td><td>{c.industry ?? "—"}</td><td>{c.location ?? "—"}</td>
            <td className="is-num">{c.people}</td><td className="is-num">{c.deals}</td><td className="is-num">{c.openDealValue ? money(c.openDealValue) : "—"}</td>
            <td><RowMenu label={`Actions for ${c.name}`} onEdit={() => setEditing(c)} onDelete={async () => { try { await crmApi.deleteCompany(c.id); reload(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not delete."); } }} /></td>
          </tr>
        ))}
      </TableCard>
      {data ? <Pager {...data} onPage={setPage} /> : null}
      {editing ? <CompanyModal company={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={reload} /> : null}
    </>
  );
}

// ---- People ----
export function PeopleTab() {
  const [text, setText] = useState("");
  const [page, setPage] = useState(1);
  const search = useDebounced(text);
  const { data, error } = useRemote(() => crmApi.people({ search, page }), [search, page]);
  return (
    <>
      <PageHeader title="People" actions={<><SearchBox value={text} onChange={(v) => { setText(v); setPage(1); }} placeholder="Search people…" /><Link className="sv-btn" to={svPath("cold-email-campaign-agent")}>Add leads in a campaign</Link></>} />
      <Banner error={error} />
      <TableCard head={<><th>Name</th><th>Email</th><th>Company</th><th>Role</th><th className="is-num">Campaigns</th><th>Replied</th><th>Last contacted</th></>} loading={!data && !error} empty={data && data.items.length === 0 ? "No people yet. Leads you upload for campaigns appear here." : undefined}>
        {data?.items.map((p) => (
          <tr key={p.email}><td style={{ fontWeight: 500 }}>{p.name}</td><td>{p.email}</td><td>{p.company ?? "—"}</td><td>{p.role ?? "—"}</td><td className="is-num">{p.campaigns}</td><td>{p.replied ? <Badge tone="green">Replied</Badge> : <span className="sv-hint">No</span>}</td><td>{formatDate(p.lastContactedAt)}</td></tr>
        ))}
      </TableCard>
      {data ? <Pager {...data} onPage={setPage} /> : null}
    </>
  );
}

// ---- Appointments ----
export function AppointmentsTab() {
  const outcomes = useRemote(() => settingsApi.outcomes(), []).data ?? [];
  const [when, setWhen] = useState<"upcoming" | "past" | "all">("upcoming");
  const [page, setPage] = useState(1);
  const { data, error: loadError, reload } = useRemote(() => crmApi.appointments({ when, page }), [when, page]);
  const [saveError, setSaveError] = useState("");
  const error = loadError || saveError;
  return (
    <>
      <PageHeader title="Appointments" actions={<Menu label="Show appointments" trigger={<>{when === "upcoming" ? "Upcoming" : when === "past" ? "Past" : "All"}</>} items={(["upcoming", "past", "all"] as const).map((w) => ({ label: w === "upcoming" ? "Upcoming" : w === "past" ? "Past" : "All", selected: when === w, onSelect: () => { setWhen(w); setPage(1); } }))} />} />
      <Banner error={error} />
      <TableCard head={<><th>When</th><th>With</th><th>Meeting type</th><th>Handled by</th><th>Status</th><th>Outcome</th><th>Link</th></>} loading={!data && !error} empty={data && data.items.length === 0 ? "No appointments here. Calls the AI SDR books land in this list." : undefined}>
        {data?.items.map((a) => (
          <tr key={a.id}><td style={{ fontWeight: 500 }}>{dateTime(a.start)}</td><td>{a.leadName ?? a.leadEmail}{a.leadName && a.leadEmail ? <div className="sv-hint">{a.leadEmail}</div> : null}</td><td>{a.meetingType ?? "—"}</td><td>{a.handlerName ?? "—"}</td><td><Badge tone={a.status === "booked" ? "green" : "neutral"}>{a.status}</Badge></td><td><select className="sv-select" style={{ width: 150, height: 32 }} aria-label={`Outcome for ${a.leadName ?? a.leadEmail}`} value={a.outcome ?? ""} onChange={async (e) => { setSaveError(""); try { await crmApi.setOutcome(a.id, e.target.value || null); reload(); } catch (caught) { setSaveError(caught instanceof Error ? caught.message : "Could not save."); } }}><option value="">Not set</option>{outcomes.some((o) => o.name === a.outcome) || !a.outcome ? null : <option value={a.outcome}>{a.outcome}</option>}{outcomes.map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}</select></td><td>{a.meetLink ? <a className="sv-link" href={a.meetLink} target="_blank" rel="noreferrer"><Video className="sv-icon" aria-hidden /> Join</a> : "—"}</td></tr>
        ))}
      </TableCard>
      {data ? <Pager {...data} onPage={setPage} /> : null}
    </>
  );
}

// ---- Scheduled follow-ups ----
export function ScheduledTab() {
  const [page, setPage] = useState(1);
  const { data, error } = useRemote(() => crmApi.scheduled({ page }), [page]);
  return (
    <>
      <PageHeader title="Scheduled" />
      <Banner error={error} />
      <TableCard head={<><th>Goes out</th><th>To</th><th>Conversation</th><th>Scheduled by</th><th className="is-num">Follow-ups sent</th></>} loading={!data && !error} empty={data && data.items.length === 0 ? "Nothing scheduled. Follow-ups the AI SDR or you schedule from the inbox show here." : undefined}>
        {data?.items.map((s) => (
          <tr key={`${s.mailboxId}:${s.threadId}`}><td style={{ fontWeight: 500 }}>{dateTime(s.dueAt)}</td><td>{s.prospect ?? "—"}</td><td>{s.subject ?? "—"}</td><td>{s.scheduledBy === "ai" ? <Badge tone="purple">AI SDR</Badge> : <Badge>You</Badge>}</td><td className="is-num">{s.sentSoFar}</td></tr>
        ))}
      </TableCard>
      {data ? <Pager {...data} onPage={setPage} /> : null}
    </>
  );
}

// ---- Lead submissions ----
export function SubmissionsTab() {
  const [page, setPage] = useState(1);
  const { data, error } = useRemote(() => crmApi.submissions({ page }), [page]);
  return (
    <>
      <PageHeader title="Lead submissions" subtitle="Positive replies forwarded to your team" />
      <Banner error={error} />
      <TableCard head={<><th>Forwarded</th><th>Prospect</th><th>Subject</th><th>Sent to</th></>} loading={!data && !error} empty={data && data.items.length === 0 ? "No forwarded leads yet. Forwarding a positive reply from the AI SDR inbox records it here." : undefined}>
        {data?.items.map((s) => <tr key={s.id}><td>{dateTime(s.at)}</td><td style={{ fontWeight: 500 }}>{s.prospect ?? "—"}</td><td>{s.subject ?? "—"}</td><td>{s.forwardedTo}</td></tr>)}
      </TableCard>
      {data ? <Pager {...data} onPage={setPage} /> : null}
    </>
  );
}

// ---- Notes ----
export function NotesTab() {
  const [text, setText] = useState("");
  const [draft, setDraft] = useState("");
  const [page, setPage] = useState(1);
  const search = useDebounced(text);
  const { data, error, setError, reload } = useRemote(() => crmApi.notes({ search, page }), [search, page]);
  async function add() {
    try { await crmApi.createNote({ body: draft }); setDraft(""); reload(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save the note."); }
  }
  return (
    <>
      <PageHeader title="Notes" actions={<SearchBox value={text} onChange={(v) => { setText(v); setPage(1); }} placeholder="Search notes…" />} />
      <Banner error={error} />
      <Card className="sv-pad" >
        <textarea className="sv-textarea" aria-label="New note" style={{ minHeight: 70 }} placeholder="Write a note for your team…" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <div><Button variant="primary" disabled={!draft.trim()} onClick={() => void add()}>Save note</Button></div>
      </Card>
      <div style={{ height: 16 }} />
      {data && data.items.length === 0 ? <EmptyState title="No notes yet" body="Notes you write are shared with everyone in the workspace." /> : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {data?.items.map((n) => (
          <Card key={n.id} className="sv-pad">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span className="sv-hint">{n.authorName ?? "Someone"} · {dateTime(n.createdAt)}{n.recordLabel ? ` · ${n.recordLabel}` : ""}</span><RowMenu label="Note actions" onDelete={async () => { try { await crmApi.deleteNote(n.id); reload(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not delete."); } }} /></div>
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{n.body}</p>
          </Card>
        ))}
      </div>
      {data ? <Pager {...data} onPage={setPage} /> : null}
    </>
  );
}

export function FilesTab() {
  return (
    <>
      <PageHeader title="Files" />
      <EmptyState title="Files are not available yet" body="Attaching documents to people, companies and deals needs file storage, which isn't set up in this build." />
    </>
  );
}
