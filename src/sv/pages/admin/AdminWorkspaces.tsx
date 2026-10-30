import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, Pause, Play, Plus } from "lucide-react";
import { adminApi, type AdminWorkspace, type WorkspaceType } from "../../../services/adminApi";
import { useSvTitle } from "../../layout/chrome";
import { svPath } from "../../nav";
import { Button, Field, Modal, PageHeader, SkeletonRows } from "../../ui";
import { Banner, Pager, SearchBox, TableCard, useDebounced, useRemote } from "../crm/shared";
import { Alert, Confirm, PlanBadge, ProductBadges, WorkspaceStatusBadge, WorkspaceTypeBadge, dateText, useViewAsAction } from "./shared";

const LIMIT = 20;

export function AdminWorkspaces() {
  useSvTitle([{ label: "Admin" }, { label: "Workspaces" }]);
  const navigate = useNavigate();
  const viewAs = useViewAsAction();
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const [status, setStatus] = useState<"" | "active" | "suspended">("");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [target, setTarget] = useState<AdminWorkspace | null>(null);
  useEffect(() => setPage(1), [debounced, status]);
  const list = useRemote(() => adminApi.listWorkspaces({ search: debounced.trim(), status, page, limit: LIMIT }), [debounced, status, page]);
  const data = list.data;
  const suspending = target?.status === "active";

  return (
    <div className="sv-page">
      <PageHeader title="Workspaces" subtitle="Every tenant on the platform. Suspended workspaces cannot sign in or send." actions={<Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>Create workspace</Button>} />
      <Banner error={list.error} />
      <div className="adm-toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Search by name or slug" />
        <select className="sv-select" aria-label="Filter by status" style={{ width: 160 }} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option>
        </select>
      </div>
      <TableCard
        head={<><th>Workspace</th><th>Type</th><th>Status</th><th>Owner</th><th className="is-num">Members</th><th>Products</th><th>Created</th><th style={{ width: 270 }} /></>}
        empty={data && data.items.length === 0 ? (search || status ? "No workspaces match your filters." : "No workspaces yet. Create the first one.") : undefined}
      >
        {!data && !list.error ? <SkeletonRows columns={8} /> : null}
        {data?.items.map((w) => (
          <tr key={w.id}>
            <td><Link className="sv-table-link" to={svPath(`admin/workspaces/${w.id}`)}>{w.name}</Link><div className="sv-hint">{w.slug}</div></td>
            <td><WorkspaceTypeBadge type={w.type} /></td>
            <td><div className="adm-chips"><WorkspaceStatusBadge status={w.status} /><PlanBadge workspace={w} /></div></td>
            <td>{w.owner ? <>{w.owner.name || w.owner.email}{w.owner.name ? <div className="sv-hint">{w.owner.email}</div> : null}</> : <span className="sv-hint">No owner</span>}</td>
            <td className="is-num">{w.member_count}</td>
            <td><ProductBadges autoResponder={w.auto_responder_enabled} coldMailer={w.cold_mailer_enabled} /></td>
            <td>{dateText(w.created_at)}</td>
            <td>
              <div className="sv-actions" style={{ justifyContent: "flex-end" }}>
                <Button size="sm" onClick={() => navigate(svPath(`admin/workspaces/${w.id}`))}>Open</Button>
                <Button size="sm" variant="primary" icon={Eye} className="adm-viewas" aria-label={`View as ${w.name}`} onClick={() => viewAs(w)}>View as</Button>
                <Button size="sm" icon={w.status === "active" ? Pause : Play} onClick={() => setTarget(w)}>{w.status === "active" ? "Suspend" : "Reactivate"}</Button>
              </div>
            </td>
          </tr>
        ))}
      </TableCard>
      {data ? <Pager page={page} limit={LIMIT} total={data.total} totalPages={Math.max(1, Math.ceil(data.total / LIMIT))} onPage={setPage} /> : null}

      {target ? (
        <Confirm
          title={suspending ? "Suspend workspace?" : "Reactivate workspace?"}
          body={suspending ? `Suspend ${target.name}? Its members will be blocked until it is reactivated.` : `Reactivate ${target.name}? Its members will regain access.`}
          confirmLabel={suspending ? "Suspend workspace" : "Reactivate workspace"} danger={suspending}
          onClose={() => setTarget(null)}
          onConfirm={async () => { await adminApi.updateWorkspace(target.id, { status: suspending ? "suspended" : "active" }); setTarget(null); list.reload(); }}
        />
      ) : null}
      {creating ? <CreateWorkspaceModal onClose={() => setCreating(false)} onCreated={(w) => navigate(svPath(`admin/workspaces/${w.id}`))} /> : null}
    </div>
  );
}

function CreateWorkspaceModal({ onClose, onCreated }: { onClose: () => void; onCreated: (w: AdminWorkspace) => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<WorkspaceType>("organization");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [errors, setErrors] = useState<{ name?: string; ownerEmail?: string }>({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Enter a workspace name.";
    if (!/^\S+@\S+\.\S+$/.test(ownerEmail.trim())) next.ownerEmail = "Enter a valid owner email.";
    setErrors(next); setServerError("");
    if (Object.keys(next).length) return;
    setBusy(true);
    try { onCreated(await adminApi.createWorkspace({ name: name.trim(), type, ownerEmail: ownerEmail.trim() })); } catch (caught) { setServerError(caught instanceof Error ? caught.message : "Could not create the workspace."); setBusy(false); }
  }

  return (
    <Modal open title="Create workspace" onClose={onClose} footer={<><Button disabled={busy} onClick={onClose}>Cancel</Button><Button variant="primary" disabled={busy} onClick={() => void submit()}>{busy ? "Creating…" : "Create workspace"}</Button></>}>
      <p className="sv-hint" style={{ marginTop: 0 }}>The owner must already have an account.</p>
      <Field label="Name" htmlFor="cw-name"><input id="cw-name" className="sv-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />{errors.name ? <span className="sv-hint" style={{ color: "var(--ds-red-text)" }}>{errors.name}</span> : null}</Field>
      <Field label="Type" htmlFor="cw-type"><select id="cw-type" className="sv-select" value={type} onChange={(e) => setType(e.target.value as WorkspaceType)}><option value="organization">Organization</option><option value="individual">Individual</option></select></Field>
      <Field label="Owner email" htmlFor="cw-owner"><input id="cw-owner" className="sv-input" type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />{errors.ownerEmail ? <span className="sv-hint" style={{ color: "var(--ds-red-text)" }}>{errors.ownerEmail}</span> : null}</Field>
      {serverError ? <Alert tone="error">{serverError}</Alert> : null}
    </Modal>
  );
}
