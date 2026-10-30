import { useRef, useState } from "react";
import { Download, FolderInput, MoreHorizontal, Pencil, Plus, Trash2, Upload, UserPlus } from "lucide-react";
import { leadLibraryService, type LeadInput } from "../../../services/leadLibraryApi";
import type { LeadImportResult, LeadList, LeadSelection, LeadSort, LeadStatusFilter, LibraryLead, LibraryLeadDetail } from "../../../types";
import { useSvTitle } from "../../layout/chrome";
import { Badge, Button, Card, Checkbox, EmptyState, Field, Menu, Modal, PageHeader, SkeletonRows, Skeleton, StatCard } from "../../ui";
import { Banner, errorText, Pager, SearchBox, useDebounced, useRemote } from "../crm/shared";
import { formatDate } from "../cold-email/shared";
import "./leads.css";

const LIMIT = 25;
const nameOf = (lead: LibraryLead) => lead.fullName || [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "";

// ---- Lists ----
function ListModal({ list, onClose, onSaved }: { list: LeadList | null; onClose: () => void; onSaved: (saved: LeadList) => void }) {
  const [name, setName] = useState(list?.name ?? "");
  const [description, setDescription] = useState(list?.description ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true); setError("");
    try {
      const body = { name: name.trim(), description: description.trim() };
      onSaved(list ? await leadLibraryService.updateList(list.id, body) : await leadLibraryService.createList(body));
      onClose();
    } catch (caught) { setError(errorText(caught)); setBusy(false); }
  }
  return (
    <Modal open title={list ? "Rename list" : "New list"} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={busy || !name.trim()} onClick={() => void save()}>{busy ? "Saving…" : "Save list"}</Button></>}>
      <Banner error={error} />
      <Field label="Name" htmlFor="list-name"><input id="list-name" className="sv-input" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
      <Field label="Description (optional)" htmlFor="list-desc"><textarea id="list-desc" className="sv-textarea" style={{ minHeight: 70 }} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
    </Modal>
  );
}

function DeleteListModal({ list, onClose, onDeleted }: { list: LeadList; onClose: () => void; onDeleted: () => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function remove() {
    setBusy(true);
    try { await leadLibraryService.deleteList(list.id); onDeleted(); onClose(); } catch (caught) { setError(errorText(caught)); setBusy(false); }
  }
  return (
    <Modal open title="Delete list" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="danger" disabled={busy} onClick={() => void remove()}>{busy ? "Deleting…" : "Delete list"}</Button></>}>
      <Banner error={error} />
      <p style={{ margin: 0 }}>Delete <strong>{list.name}</strong>{list.contactCount ? ` and its ${list.contactCount.toLocaleString()} lead${list.contactCount === 1 ? "" : "s"}` : ""}? Campaigns that already used these leads keep their copies. This cannot be undone.</p>
    </Modal>
  );
}

// ---- Add / import ----
function AddLeadModal({ lists, defaultListId, onClose, onSaved }: { lists: LeadList[]; defaultListId: number | null; onClose: () => void; onSaved: () => void }) {
  const [listId, setListId] = useState(String(defaultListId ?? lists[0]?.id ?? ""));
  const [form, setForm] = useState({ email: "", firstName: "", lastName: "", company: "", role: "" });
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });
  async function save() {
    setBusy(true); setError(""); setNote("");
    try {
      const result = await leadLibraryService.addLeads({ listId: Number(listId), contacts: [{ ...form, email: form.email.trim() }] });
      if (result.added) { onSaved(); onClose(); return; }
      setNote(result.invalid ? "That email address does not look valid." : "That lead is already in this list.");
    } catch (caught) { setError(errorText(caught)); }
    setBusy(false);
  }
  return (
    <Modal open title="Add lead" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={busy || !form.email.trim() || !listId} onClick={() => void save()}>{busy ? "Adding…" : "Add lead"}</Button></>}>
      <Banner error={error || note} />
      <Field label="List" htmlFor="add-list"><select id="add-list" className="sv-select" value={listId} onChange={(e) => setListId(e.target.value)}>{lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></Field>
      <Field label="Email" htmlFor="add-email"><input id="add-email" type="email" className="sv-input" value={form.email} onChange={set("email")} autoFocus /></Field>
      <div className="lead-grid">
        <Field label="First name" htmlFor="add-first"><input id="add-first" className="sv-input" value={form.firstName} onChange={set("firstName")} /></Field>
        <Field label="Last name" htmlFor="add-last"><input id="add-last" className="sv-input" value={form.lastName} onChange={set("lastName")} /></Field>
        <Field label="Company" htmlFor="add-company"><input id="add-company" className="sv-input" value={form.company} onChange={set("company")} /></Field>
        <Field label="Role" htmlFor="add-role"><input id="add-role" className="sv-input" value={form.role} onChange={set("role")} /></Field>
      </div>
    </Modal>
  );
}

function ImportModal({ lists, defaultListId, onClose, onDone }: { lists: LeadList[]; defaultListId: number | null; onClose: () => void; onDone: (listId: number) => void }) {
  const [target, setTarget] = useState(defaultListId ? String(defaultListId) : lists[0] ? String(lists[0].id) : "new");
  const [newName, setNewName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<LeadImportResult | null>(null);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const busy = progress !== null && !result;
  async function run() {
    if (!file) return;
    setError(""); setProgress(0);
    try {
      setResult(await leadLibraryService.importFile(file, target === "new" ? { newListName: newName.trim() } : { listId: Number(target) }, setProgress));
    } catch (caught) { setError(errorText(caught)); setProgress(null); }
  }
  const finish = () => { if (result) onDone(result.list.id); onClose(); };
  return (
    <Modal open title="Import leads" onClose={result ? finish : onClose} footer={result ? <Button variant="primary" onClick={finish}>Done</Button> : <><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={busy || !file || (target === "new" && !newName.trim())} onClick={() => void run()}>{busy ? `Importing… ${progress}%` : "Import"}</Button></>}>
      <Banner error={error} />
      {result ? (
        <div style={{ display: "grid", gap: 12 }}>
          <p style={{ margin: 0 }}>Imported into <strong>{result.list.name}</strong> from {result.totalRows.toLocaleString()} row{result.totalRows === 1 ? "" : "s"}.</p>
          <div className="lead-import-stats">
            <div><b>{result.added.toLocaleString()}</b><span>Valid, added</span></div>
            <div><b>{result.invalid.toLocaleString()}</b><span>Invalid</span></div>
            <div><b>{(result.duplicatesInFile + result.alreadyInList).toLocaleString()}</b><span>Duplicates</span></div>
          </div>
          <p className="sv-hint" style={{ margin: 0 }}>{result.duplicatesInFile} repeated in the file, {result.alreadyInList} already in the list. Columns used: {Object.entries(result.fieldMap).map(([h, f]) => `${h} → ${f}`).join(", ") || "none detected"}.</p>
        </div>
      ) : (
        <>
          <Field label="Add to" htmlFor="imp-target"><select id="imp-target" className="sv-select" value={target} onChange={(e) => setTarget(e.target.value)}>{lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}<option value="new">A new list…</option></select></Field>
          {target === "new" ? <Field label="New list name" htmlFor="imp-new"><input id="imp-new" className="sv-input" value={newName} onChange={(e) => setNewName(e.target.value)} /></Field> : null}
          <Field label="File" htmlFor="imp-file">
            <div className="lead-drop" onClick={() => input.current?.click()} role="presentation">
              <Upload className="sv-icon" aria-hidden />
              <span>{file ? file.name : "Choose a CSV, XLSX, XLS or TXT file (up to 50 MB)"}</span>
              <input ref={input} id="imp-file" type="file" accept=".csv,.xlsx,.xls,.txt" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
          </Field>
          <p className="sv-hint" style={{ margin: 0 }}>The first row should be headers. We look for email, name, company, role, phone, location, website and LinkedIn columns.</p>
        </>
      )}
    </Modal>
  );
}

// ---- Move ----
function MoveModal({ lists, count, currentListId, onClose, onMove }: { lists: LeadList[]; count: number; currentListId: number | null; onClose: () => void; onMove: (listId: number, mode: "move" | "copy") => Promise<void> }) {
  const options = lists.filter((l) => l.id !== currentListId);
  const [target, setTarget] = useState(String(options[0]?.id ?? ""));
  const [mode, setMode] = useState<"move" | "copy">("move");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try { await onMove(Number(target), mode); onClose(); } catch (caught) { setError(errorText(caught)); setBusy(false); }
  }
  return (
    <Modal open title={`Move ${count.toLocaleString()} lead${count === 1 ? "" : "s"}`} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={busy || !target} onClick={() => void go()}>{busy ? "Working…" : mode === "move" ? "Move" : "Copy"}</Button></>}>
      <Banner error={error} />
      {options.length === 0 ? <p className="sv-hint" style={{ margin: 0 }}>Create another list first.</p> : (
        <>
          <Field label="Destination list" htmlFor="move-target"><select id="move-target" className="sv-select" value={target} onChange={(e) => setTarget(e.target.value)}>{options.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></Field>
          <Field label="Action" htmlFor="move-mode"><select id="move-mode" className="sv-select" value={mode} onChange={(e) => setMode(e.target.value as "move" | "copy")}><option value="move">Move (remove from current list)</option><option value="copy">Copy (keep in current list)</option></select></Field>
        </>
      )}
    </Modal>
  );
}

// ---- Detail ----
function LeadDetailModal({ id, onClose, onSaved }: { id: number; onClose: () => void; onSaved: () => void }) {
  const { data, error } = useRemote(() => leadLibraryService.getLead(id), [id]);
  return (
    <Modal open wide title="Lead details" onClose={onClose}>
      {error ? <Banner error={error} /> : !data ? <div className="sv-skel-stack"><Skeleton width="50%" height={20} /><Skeleton /><Skeleton /><Skeleton width="70%" /></div> : <DetailForm lead={data} onClose={onClose} onSaved={onSaved} />}
    </Modal>
  );
}

function DetailForm({ lead, onClose, onSaved }: { lead: LibraryLeadDetail; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    email: lead.email, fullName: lead.fullName ?? "", firstName: lead.firstName ?? "", lastName: lead.lastName ?? "", company: lead.company ?? "",
    role: lead.role ?? "", phone: lead.phone ?? "", location: lead.location ?? "", website: lead.website ?? "", linkedinUrl: lead.linkedinUrl ?? "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const field = (key: keyof typeof form, label: string) => (
    <Field label={label} htmlFor={`d-${key}`}><input id={`d-${key}`} className="sv-input" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></Field>
  );
  async function save() {
    setBusy(true); setError("");
    try { await leadLibraryService.updateLead(lead.id, { ...form } as LeadInput); onSaved(); onClose(); } catch (caught) { setError(errorText(caught)); setBusy(false); }
  }
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Banner error={error} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <Badge tone={lead.status === "Active" ? "green" : "red"}>{lead.status}</Badge>
        {lead.suppressionReason ? <span className="sv-hint">{lead.suppressionReason}</span> : null}
        {lead.lists.map((l) => <Badge key={l.id}>{l.name}</Badge>)}
        <span className="sv-hint">Added {formatDate(lead.createdAt)}</span>
      </div>
      <div className="lead-grid">
        {field("email", "Email")}{field("fullName", "Full name")}{field("firstName", "First name")}{field("lastName", "Last name")}
        {field("company", "Company")}{field("role", "Role")}{field("phone", "Phone")}{field("location", "Location")}{field("website", "Website")}{field("linkedinUrl", "LinkedIn")}
      </div>
      <div>
        <h4 style={{ margin: "0 0 8px", fontSize: 13 }}>Campaigns ({lead.campaigns.length})</h4>
        {lead.campaigns.length === 0 ? <p className="sv-hint" style={{ margin: 0 }}>Not used in any campaign yet.</p> : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
            {lead.campaigns.map((c) => <li key={c.id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>{c.name}<Badge>{c.leadStatus}</Badge>{c.sentAt ? <span className="sv-hint">{formatDate(c.sentAt)}</span> : null}</li>)}
          </ul>
        )}
      </div>
      <div className="sv-actions" style={{ justifyContent: "flex-end" }}>
        <Button onClick={onClose}>Close</Button>
        <Button variant="primary" disabled={busy || !form.email.trim()} onClick={() => void save()}>{busy ? "Saving…" : "Save changes"}</Button>
      </div>
    </div>
  );
}

// ---- Page ----
export function Leads() {
  useSvTitle([{ label: "Leads" }]);
  const [listId, setListId] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<LeadStatusFilter>("");
  const [sort, setSort] = useState<LeadSort>("newest");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [allMatching, setAllMatching] = useState(false);
  const [modal, setModal] = useState<null | "new-list" | "rename" | "delete-list" | "add" | "import" | "move" | "delete">(null);
  const [openLead, setOpenLead] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const search = useDebounced(text);

  const lists = useRemote(() => leadLibraryService.listLists({ limit: 100 }), []);
  const stats = useRemote(() => leadLibraryService.stats(), []);
  const leads = useRemote(() => leadLibraryService.listLeads({ page, limit: LIMIT, search, listId, status, sort }), [page, search, listId, status, sort]);

  const listItems = lists.data?.items ?? [];
  const current = listItems.find((l) => l.id === listId) ?? null;
  const rows = leads.data?.items ?? [];
  const total = leads.data?.total ?? 0;
  const refreshAll = () => { lists.reload(); stats.reload(); leads.reload(); };
  const clearSelection = () => { setSelected(new Set()); setAllMatching(false); };
  const pick = (next: number | null) => { setListId(next); setPage(1); clearSelection(); };
  const selectedCount = allMatching ? total - [...selected].length : selected.size;
  const pageAll = rows.length > 0 && rows.every((r) => (allMatching ? !selected.has(r.id) : selected.has(r.id)));

  const toggle = (id: number) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const togglePage = () => {
    if (allMatching) { setAllMatching(false); setSelected(new Set()); return; }
    setSelected((s) => { const n = new Set(s); rows.forEach((r) => (pageAll ? n.delete(r.id) : n.add(r.id))); return n; });
  };
  const selection = (): LeadSelection => allMatching ? { filter: { search, listId, status }, excludeIds: [...selected] } : { ids: [...selected] };
  const act = async (run: () => Promise<void>) => { setActionError(""); try { await run(); } catch (caught) { setActionError(errorText(caught)); } };

  const empty = lists.data && lists.data.total === 0;
  return (
    <div className="sv-page">
      <PageHeader title="Leads" subtitle="Your lead library: save people once, reuse them in any campaign."
        actions={<>
          <Button icon={Download} disabled={total === 0} onClick={() => void act(() => leadLibraryService.exportLeads({ search, listId, status }))}>Export CSV</Button>
          <Button icon={UserPlus} disabled={listItems.length === 0} onClick={() => setModal("add")}>Add lead</Button>
          <Button variant="primary" icon={Upload} onClick={() => setModal("import")}>Import CSV</Button>
        </>} />
      <div className="sv-stats" style={{ marginBottom: 20 }}>
        {stats.data ? <>
          <StatCard label="Total leads" value={stats.data.totalLeads.toLocaleString()} />
          <StatCard label="Unique emails" value={stats.data.uniqueEmails.toLocaleString()} />
          <StatCard label="Added last 7 days" value={stats.data.addedLast7Days.toLocaleString()} />
          <StatCard label="Suppressed" value={stats.data.suppressed.toLocaleString()} hint="On your blocklist or unsubscribed. These are skipped when sending." />
        </> : [0, 1, 2, 3].map((i) => <Card key={i}><div style={{ padding: 16, display: "grid", gap: 10 }}><Skeleton width="50%" /><Skeleton width="30%" height={22} /></div></Card>)}
      </div>
      <Banner error={lists.error || leads.error || stats.error || actionError} />
      {notice ? <p className="sv-banner is-ok" role="status" style={{ margin: "0 0 12px" }}>{notice}</p> : null}

      {empty ? (
        <Card><EmptyState title="Your lead library is empty" body="Create a list, then import a CSV or add leads one by one." action={<><Button variant="primary" icon={Plus} onClick={() => setModal("new-list")}>Create list</Button></>} /></Card>
      ) : (
        <div className="lead-layout">
          <Card className="lead-lists">
            <div className="lead-lists-head"><strong>Lists</strong><Button size="sm" icon={Plus} onClick={() => setModal("new-list")}>New</Button></div>
            {!lists.data ? <div className="sv-skel-stack" style={{ padding: 12 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={28} />)}</div> : (
              <ul>
                <li><button type="button" className={`lead-list-btn${listId === null ? " is-active" : ""}`} onClick={() => pick(null)}><span>All leads</span><span className="sv-hint">{stats.data ? stats.data.totalLeads.toLocaleString() : ""}</span></button></li>
                {listItems.map((l) => (
                  <li key={l.id}><button type="button" className={`lead-list-btn${listId === l.id ? " is-active" : ""}`} onClick={() => pick(l.id)}><span className="lead-list-name">{l.name}</span><span className="sv-hint">{l.contactCount.toLocaleString()}</span></button></li>
                ))}
              </ul>
            )}
          </Card>

          <div className="lead-main">
            <div className="lead-toolbar">
              <div className="lead-title">
                <h2>{current ? current.name : "All leads"}</h2>
                {current ? <Menu className="sv-icon-btn" align="left" label="List actions" trigger={<MoreHorizontal className="sv-icon" aria-hidden />} items={[{ label: "Rename", icon: Pencil, onSelect: () => setModal("rename") }, { label: "Import into this list", icon: Upload, onSelect: () => setModal("import") }, { label: "Delete list", icon: Trash2, danger: true, onSelect: () => setModal("delete-list") }]} /> : null}
              </div>
              <div className="sv-actions">
                <SearchBox value={text} onChange={(v) => { setText(v); setPage(1); clearSelection(); }} placeholder="Search leads…" />
                <Menu label="Filter by status" trigger={<>{status === "active" ? "Active" : status === "suppressed" ? "Suppressed" : "All statuses"}</>} items={[{ label: "All statuses", selected: !status, onSelect: () => { setStatus(""); setPage(1); clearSelection(); } }, { label: "Active", selected: status === "active", onSelect: () => { setStatus("active"); setPage(1); clearSelection(); } }, { label: "Suppressed", selected: status === "suppressed", onSelect: () => { setStatus("suppressed"); setPage(1); clearSelection(); } }]} />
                <Menu label="Sort" trigger={<>Sort: {sort}</>} items={(["newest", "oldest", "email", "name", "company"] as LeadSort[]).map((s) => ({ label: s[0].toUpperCase() + s.slice(1), selected: sort === s, onSelect: () => { setSort(s); setPage(1); } }))} />
              </div>
            </div>
            {current?.description ? <p className="sv-hint" style={{ margin: "0 0 12px" }}>{current.description}</p> : null}

            {selectedCount > 0 ? (
              <div className="lead-bulk" role="status">
                <span><strong>{selectedCount.toLocaleString()}</strong> selected</span>
                {!allMatching && pageAll && total > rows.length ? <button type="button" className="lead-link" onClick={() => { setAllMatching(true); setSelected(new Set()); }}>Select all {total.toLocaleString()} matching</button> : null}
                <span className="sv-actions"><Button size="sm" icon={FolderInput} onClick={() => setModal("move")}>Move / copy</Button><Button size="sm" variant="danger" icon={Trash2} onClick={() => setModal("delete")}>Delete</Button><Button size="sm" onClick={clearSelection}>Clear</Button></span>
              </div>
            ) : null}

            <Card>
              <div className="sv-table-wrap">
                <table className="sv-table">
                  <thead><tr>
                    <th style={{ width: 36 }}><Checkbox checked={pageAll} onChange={togglePage} label="Select all on this page" /></th>
                    <th>Email</th><th>Name</th><th>Company</th><th>Role</th><th>List</th><th>Status</th><th>Added</th>
                  </tr></thead>
                  <tbody>
                    {!leads.data ? <SkeletonRows columns={8} rows={8} /> : rows.map((lead) => (
                      <tr key={lead.id} className="lead-row" onClick={() => setOpenLead(lead.id)}>
                        <td onClick={(e) => e.stopPropagation()}><Checkbox checked={allMatching ? !selected.has(lead.id) : selected.has(lead.id)} onChange={() => toggle(lead.id)} label={`Select ${lead.email}`} /></td>
                        <td>{lead.email}</td><td>{nameOf(lead) || "—"}</td><td>{lead.company || "—"}</td><td>{lead.role || "—"}</td><td>{lead.listName}</td>
                        <td><Badge tone={lead.status === "Active" ? "green" : "red"}>{lead.status}</Badge></td>
                        <td>{formatDate(lead.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {leads.data && rows.length === 0 ? <p className="sv-hint" style={{ padding: 20, margin: 0 }}>{search || status ? "No leads match your filters." : current ? "This list has no leads yet. Import a CSV or add a lead." : "No leads yet."}</p> : null}
              </div>
            </Card>
            {leads.data ? <Pager page={leads.data.page} limit={leads.data.limit} total={total} totalPages={leads.data.totalPages} onPage={(p) => { setPage(p); }} /> : null}
          </div>
        </div>
      )}

      {modal === "new-list" ? <ListModal list={null} onClose={() => setModal(null)} onSaved={(saved) => { refreshAll(); pick(saved.id); }} /> : null}
      {modal === "rename" && current ? <ListModal list={current} onClose={() => setModal(null)} onSaved={() => refreshAll()} /> : null}
      {modal === "delete-list" && current ? <DeleteListModal list={current} onClose={() => setModal(null)} onDeleted={() => { pick(null); refreshAll(); }} /> : null}
      {modal === "add" ? <AddLeadModal lists={listItems} defaultListId={listId} onClose={() => setModal(null)} onSaved={refreshAll} /> : null}
      {modal === "import" ? <ImportModal lists={listItems} defaultListId={listId} onClose={() => setModal(null)} onDone={(id) => { refreshAll(); pick(id); }} /> : null}
      {modal === "move" ? <MoveModal lists={listItems} count={selectedCount} currentListId={listId} onClose={() => setModal(null)} onMove={async (target, mode) => {
        const r = await leadLibraryService.moveLeads(selection(), target, mode);
        setNotice(`${mode === "move" ? "Moved" : "Copied"} ${r.added.toLocaleString()} lead${r.added === 1 ? "" : "s"} to ${r.list.name}${r.alreadyInTarget ? ` (${r.alreadyInTarget} already there)` : ""}.`);
        clearSelection(); refreshAll();
      }} /> : null}
      {modal === "delete" ? (
        <Modal open title="Delete leads" onClose={() => setModal(null)} footer={<><Button onClick={() => setModal(null)}>Cancel</Button><Button variant="danger" onClick={() => void act(async () => { const r = await leadLibraryService.deleteLeads(selection()); setNotice(`Deleted ${r.deleted.toLocaleString()} lead${r.deleted === 1 ? "" : "s"}.`); setModal(null); clearSelection(); refreshAll(); })}>Delete {selectedCount.toLocaleString()}</Button></>}>
          <p style={{ margin: 0 }}>Delete {selectedCount.toLocaleString()} selected lead{selectedCount === 1 ? "" : "s"} from the library? This cannot be undone.</p>
        </Modal>
      ) : null}
      {openLead !== null ? <LeadDetailModal id={openLead} onClose={() => setOpenLead(null)} onSaved={refreshAll} /> : null}
    </div>
  );
}
