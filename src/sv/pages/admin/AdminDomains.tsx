import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, RefreshCw, Undo2, UserRoundPlus } from "lucide-react";
import { adminApi, errorMessage, PLATFORM_WORKSPACE_SLUG, type AdminDomain, type AdminWorkspace } from "../../../services/adminApi";
import { Badge, Button, Card, Checkbox, PageHeader, StatCard, SkeletonRows } from "../../ui";
import { useSvTitle } from "../../layout/chrome";
import { Banner, Pager, SearchBox, useDebounced } from "../crm/shared";
import { SyncMaildosoModal } from "../cold-email/AccountTools";
import { AssignDomainsModal, AssignedTo, DomainDetailModal, DomainStatus, isPoolDomain, providerLabel, WarmupCell } from "./domainParts";
import "./ops.css";

const LIMIT = 20;
const PROVIDERS = [
  { value: "maildoso", label: "Maildoso" },
  { value: "postal", label: "Own server (Hetzner)" },
];
const STATUSES = ["verified", "pending", "failed"];

interface Summary { total: number; pool: number; byProvider: Array<{ label: string; count: number }> }

export function AdminDomains() {
  useSvTitle([{ label: "Admin" }, { label: "Domains" }]);
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const [workspaceId, setWorkspaceId] = useState<number | "">("");
  const [provider, setProvider] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminDomain[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([]);
  const [workspacesError, setWorkspacesError] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [selected, setSelected] = useState<Record<number, AdminDomain>>({});
  const [viewing, setViewing] = useState<AdminDomain | null>(null);
  const [assign, setAssign] = useState<{ domains: AdminDomain[]; toPool: boolean } | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);

  const pool = useMemo(() => workspaces.find((w) => w.slug === PLATFORM_WORKSPACE_SLUG) ?? null, [workspaces]);

  useEffect(() => {
    adminApi.listAllWorkspaces().then(setWorkspaces).catch((e) => setWorkspacesError(errorMessage(e, "Unable to load workspaces.")));
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await adminApi.listDomains({ search: debounced.trim(), workspaceId, provider, status, page, limit: LIMIT });
      setItems(result.items); setTotal(result.total);
    } catch (e) { setError(errorMessage(e, "Unable to load domains.")); } finally { setLoading(false); }
  }, [debounced, workspaceId, provider, status, page]);

  const loadSummary = useCallback(async () => {
    try {
      const count = async (extra: { workspaceId?: number; provider?: string }) => (await adminApi.listDomains({ ...extra, page: 1, limit: 1 })).total;
      const [all, poolCount, ...providers] = await Promise.all([count({}), pool ? count({ workspaceId: pool.id }) : Promise.resolve(0), ...PROVIDERS.map((p) => count({ provider: p.value }))]);
      setSummary({ total: all, pool: poolCount, byProvider: PROVIDERS.map((p, i) => ({ label: p.label, count: providers[i] })) });
    } catch { setSummary(null); }
  }, [pool]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (workspacesError || workspaces.length > 0) void loadSummary(); }, [loadSummary, workspaces.length, workspacesError]);
  useEffect(() => { setPage(1); }, [debounced, workspaceId, provider, status]);

  const selectedList = Object.values(selected);
  const pageAllSelected = items.length > 0 && items.every((d) => selected[d.id]);
  const toggleOne = (d: AdminDomain) => setSelected((prev) => { const next = { ...prev }; if (next[d.id]) delete next[d.id]; else next[d.id] = d; return next; });
  const togglePage = () => setSelected((prev) => { const next = { ...prev }; for (const d of items) { if (pageAllSelected) delete next[d.id]; else next[d.id] = d; } return next; });

  const assignNames = useMemo(() => (assign ? assign.domains.map((d) => d.domain) : []), [assign]);
  const currentWorkspaceId = useMemo(() => {
    if (!assign) return null;
    const ids = new Set(assign.domains.map((d) => d.workspace.id));
    return ids.size === 1 ? assign.domains[0].workspace.id : null;
  }, [assign]);
  const filtered = Boolean(search || workspaceId || provider || status);

  return (
    <div className="sv-page">
      <PageHeader title="Domains" subtitle="Every domain on the platform and who it is assigned to. Assign, reassign, or return domains to the platform pool." actions={
        <span className="sv-actions">
          <Button icon={RefreshCw} onClick={() => setSyncOpen(true)}>Sync Maildoso</Button>
          <Button variant="primary" icon={UserRoundPlus} disabled={selectedList.length === 0} onClick={() => setAssign({ domains: selectedList, toPool: false })}>{selectedList.length > 0 ? `Assign selected (${selectedList.length})` : "Assign selected"}</Button>
        </span>
      } />

      <div className="sv-stats">
        <StatCard label="Total domains" value={summary ? summary.total.toLocaleString() : "…"} />
        <StatCard label="Assigned to clients" value={summary ? (summary.total - summary.pool).toLocaleString() : "…"} />
        <StatCard label="In the platform pool" value={summary ? summary.pool.toLocaleString() : "…"} />
        <Card className="sv-stat">
          <div className="sv-stat-label">By provider</div>
          {summary ? <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0, display: "grid", gap: 2, fontSize: 13 }}>{summary.byProvider.map((p) => <li key={p.label} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span>{p.label}</span><span className="ops-muted">{p.count.toLocaleString()}</span></li>)}</ul> : <div className="sv-stat-value">…</div>}
        </Card>
      </div>

      <Banner error={error} />
      <Banner error={workspacesError} />

      <Card>
        <div className="ops-bar">
          <SearchBox placeholder="Search domains" value={search} onChange={setSearch} />
          <select aria-label="Filter by workspace" className="sv-select" value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value ? Number(e.target.value) : "")}>
            <option value="">All workspaces</option>
            {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <select aria-label="Filter by provider" className="sv-select" value={provider} onChange={(e) => setProvider(e.target.value)}>
            <option value="">All providers</option>
            {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <select aria-label="Filter by status" className="sv-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          {selectedList.length > 0 ? <Button size="sm" onClick={() => setSelected({})}>Clear selection</Button> : null}
        </div>
        <div className="sv-table-wrap">
          <table className="sv-table ops-table" style={{ minWidth: 1000 }}>
            <thead><tr>
              <th style={{ width: 36 }}><Checkbox label="Select all domains on this page" checked={pageAllSelected} onChange={togglePage} /></th>
              <th>Domain</th><th>Provider</th><th>Status</th><th>Mailboxes</th><th>Warm-up</th><th>Assigned to</th><th className="is-right">Actions</th>
            </tr></thead>
            <tbody>
              {loading ? <SkeletonRows columns={8} />
                : items.length === 0 ? <tr><td colSpan={8} className="sv-hint" style={{ padding: 28, textAlign: "center" }}>{filtered ? "No domains match your filters." : "There are no domains on the platform yet."}</td></tr>
                : items.map((d) => {
                  const inPool = isPoolDomain(d);
                  return (
                    <tr key={d.id} className={selected[d.id] ? "ops-row-sel" : undefined}>
                      <td><Checkbox label={`Select ${d.domain}`} checked={Boolean(selected[d.id])} onChange={() => toggleOne(d)} /></td>
                      <td><button type="button" className="ops-link" onClick={() => setViewing(d)}>{d.domain}</button></td>
                      <td><Badge>{providerLabel(d.provider, d.provider_label)}</Badge></td>
                      <td><DomainStatus status={d.status} /></td>
                      <td>{d.active_mailbox_count}/{d.mailbox_count}</td>
                      <td><WarmupCell domain={d} /></td>
                      <td><AssignedTo domain={d} /></td>
                      <td className="is-right"><span className="sv-actions" style={{ justifyContent: "flex-end" }}>
                        <Button size="sm" icon={Eye} onClick={() => setViewing(d)}>View</Button>
                        <Button size="sm" icon={UserRoundPlus} onClick={() => setAssign({ domains: [d], toPool: false })}>{inPool ? "Assign" : "Reassign"}</Button>
                        {!inPool ? <Button size="sm" icon={Undo2} disabled={!pool} onClick={() => setAssign({ domains: [d], toPool: true })}>Return to pool</Button> : null}
                      </span></td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Card>
      <Pager page={page} limit={LIMIT} total={total} totalPages={Math.max(1, Math.ceil(total / LIMIT))} onPage={setPage} />

      <DomainDetailModal domain={viewing} onClose={() => setViewing(null)} onAssign={(d) => { setViewing(null); setAssign({ domains: [d], toPool: false }); }} />
      <AssignDomainsModal isOpen={assign !== null} domains={assignNames} currentWorkspaceId={currentWorkspaceId} fixedTarget={assign?.toPool ? pool : null} workspaces={workspaces} workspacesError={workspacesError} onClose={() => setAssign(null)} onDone={() => { setSelected({}); void load(); void loadSummary(); }} />
      {syncOpen ? <SyncMaildosoModal onClose={() => setSyncOpen(false)} onDone={() => { void load(); void loadSummary(); }} /> : null}
    </div>
  );
}
