import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/react";
import { Eye, Undo2, UserRoundPlus } from "lucide-react";
import {
  adminApi,
  errorMessage,
  PLATFORM_WORKSPACE_SLUG,
  type AdminDomain,
  type AdminWorkspace,
} from "../../services/adminApi";
import { ErrorBanner } from "../../components/admin/AdminModal";
import { PageHeader, Pagination, SearchBox, StatTile, inputClass, useDebounced } from "../../components/admin/AdminBits";
import { AssignDomainsModal } from "../../components/admin/AssignDomainsModal";
import { DomainDetailModal } from "../../components/admin/DomainDetailModal";
import { AssignedTo, DomainStatusPill, WarmupCell, isPoolDomain } from "../../components/admin/DomainBits";
import { SyncMaildosoButton } from "../../components/mailer/SyncMaildosoButton";
import { StatusPill } from "../../components/ui/StatusPill";
import { SkeletonRow } from "../../components/ui/Skeleton";

const LIMIT = 20;
const PROVIDERS = [
  { value: "maildoso", label: "Maildoso" },
  { value: "postal", label: "Hetzner (Postal)" },
  { value: "ses", label: "Amazon SES" },
];
const STATUSES = ["verified", "pending", "failed"];

interface Summary {
  total: number;
  pool: number;
  byProvider: Array<{ label: string; count: number }>;
}

interface AssignRequest {
  domains: AdminDomain[];
  toPool: boolean;
}

export function AdminDomains() {
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const [workspaceId, setWorkspaceId] = useState<number | "">("");
  const [provider, setProvider] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminDomain[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([]);
  const [workspacesError, setWorkspacesError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [selected, setSelected] = useState<Record<number, AdminDomain>>({});
  const [viewing, setViewing] = useState<AdminDomain | null>(null);
  const [assign, setAssign] = useState<AssignRequest | null>(null);

  const pool = useMemo(() => workspaces.find((w) => w.slug === PLATFORM_WORKSPACE_SLUG) ?? null, [workspaces]);

  useEffect(() => {
    adminApi
      .listAllWorkspaces()
      .then(setWorkspaces)
      .catch((e) => setWorkspacesError(errorMessage(e, "Unable to load workspaces.")));
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await adminApi.listDomains({ search: debounced.trim(), workspaceId, provider, status, page, limit: LIMIT });
      setItems(result.items);
      setTotal(result.total);
    } catch (e) {
      setError(errorMessage(e, "Unable to load domains."));
    } finally {
      setIsLoading(false);
    }
  }, [debounced, workspaceId, provider, status, page]);

  const loadSummary = useCallback(async () => {
    try {
      const count = async (extra: { workspaceId?: number; provider?: string }) => (await adminApi.listDomains({ ...extra, page: 1, limit: 1 })).total;
      const [all, poolCount, ...providers] = await Promise.all([
        count({}),
        pool ? count({ workspaceId: pool.id }) : Promise.resolve(0),
        ...PROVIDERS.map((p) => count({ provider: p.value })),
      ]);
      setSummary({ total: all, pool: poolCount, byProvider: PROVIDERS.map((p, i) => ({ label: p.label, count: providers[i] })) });
    } catch {
      setSummary(null);
    }
  }, [pool]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (workspacesError || workspaces.length > 0) void loadSummary();
  }, [loadSummary, workspaces.length, workspacesError]);

  useEffect(() => {
    setPage(1);
  }, [debounced, workspaceId, provider, status]);

  const selectedList = Object.values(selected);
  const pageAllSelected = items.length > 0 && items.every((d) => selected[d.id]);

  function toggleOne(d: AdminDomain) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[d.id]) delete next[d.id];
      else next[d.id] = d;
      return next;
    });
  }

  function togglePage() {
    setSelected((prev) => {
      const next = { ...prev };
      for (const d of items) {
        if (pageAllSelected) delete next[d.id];
        else next[d.id] = d;
      }
      return next;
    });
  }

  const assignDomains = useMemo(() => (assign ? assign.domains.map((d) => d.domain) : []), [assign]);
  const currentWorkspaceId = useMemo(() => {
    if (!assign) return null;
    const ids = new Set(assign.domains.map((d) => d.workspace.id));
    return ids.size === 1 ? assign.domains[0].workspace.id : null;
  }, [assign]);

  const assignedToClients = summary ? summary.total - summary.pool : 0;
  const filtered = Boolean(search || workspaceId || provider || status);

  return (
    <div className="mx-auto flex max-w-[1480px] flex-col gap-5">
      <PageHeader
        actions={
          <div className="flex flex-wrap items-center gap-2">
          <SyncMaildosoButton
            onDone={() => {
              void load();
              void loadSummary();
            }}
          />
          <Button
            isDisabled={selectedList.length === 0}
            size="sm"
            variant="primary"
            onClick={() => setAssign({ domains: selectedList, toPool: false })}
          >
            <UserRoundPlus className="size-4" />
            {selectedList.length > 0 ? `Assign selected (${selectedList.length})` : "Assign selected"}
          </Button>
          </div>
        }
        description="Every domain on the platform and who it is assigned to. Assign, reassign, or return domains to the Koval Group pool."
        title="Domains"
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Total domains" loading={!summary} value={summary?.total ?? 0} />
        <StatTile label="Assigned to clients" loading={!summary} value={assignedToClients} />
        <StatTile label="In the platform pool" loading={!summary} value={summary?.pool ?? 0} />
        <div className="rounded-2xl border border-border/70 bg-surface px-4 py-4">
          <p className="text-[13px] font-medium text-muted">By provider</p>
          {summary ? (
            <ul className="mt-2 grid gap-0.5 text-[13px]">
              {summary.byProvider.map((p) => (
                <li className="flex justify-between gap-2" key={p.label}>
                  <span className="text-foreground">{p.label}</span>
                  <span className="tabular-nums text-muted">{p.count.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3 h-6 w-24 animate-pulse rounded-md bg-default-200" />
          )}
        </div>
      </div>

      {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}
      {workspacesError ? <ErrorBanner message={workspacesError} /> : null}

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-surface">
        <div className="flex flex-wrap items-center gap-3 border-b border-border/70 px-4 py-3">
          <SearchBox placeholder="Search domains" value={search} onChange={setSearch} />
          <select
            aria-label="Filter by workspace"
            className={`${inputClass} w-auto max-w-[220px]`}
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">All workspaces</option>
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          <select aria-label="Filter by provider" className={`${inputClass} w-auto`} value={provider} onChange={(e) => setProvider(e.target.value)}>
            <option value="">All providers</option>
            {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <select aria-label="Filter by status" className={`${inputClass} w-auto`} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          {selectedList.length > 0 ? (
            <Button size="sm" variant="secondary" onClick={() => setSelected({})}>Clear selection</Button>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="border-b border-border/70 text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input aria-label="Select all domains on this page" checked={pageAllSelected} className="size-4" type="checkbox" onChange={togglePage} />
                </th>
                <th className="px-2 py-3 font-medium">Domain</th>
                <th className="px-2 py-3 font-medium">Provider</th>
                <th className="px-2 py-3 font-medium">Status</th>
                <th className="px-2 py-3 font-medium">Mailboxes</th>
                <th className="px-2 py-3 font-medium">Warm-up</th>
                <th className="px-2 py-3 font-medium">Assigned to</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow columns={8} key={i} />)
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-sm font-medium text-muted" colSpan={8}>
                    {filtered ? "No domains match your filters." : "There are no domains on the platform yet."}
                  </td>
                </tr>
              ) : (
                items.map((d) => {
                  const inPool = isPoolDomain(d);
                  return (
                    <tr className={`border-b border-border/60 last:border-0 ${selected[d.id] ? "bg-accent/5" : ""}`} key={d.id}>
                      <td className="px-4 py-3">
                        <input aria-label={`Select ${d.domain}`} checked={Boolean(selected[d.id])} className="size-4" type="checkbox" onChange={() => toggleOne(d)} />
                      </td>
                      <td className="px-2 py-3">
                        <button className="font-medium text-foreground hover:text-accent focus-visible:underline focus-visible:outline-none" type="button" onClick={() => setViewing(d)}>
                          {d.domain}
                        </button>
                      </td>
                      <td className="px-2 py-3"><StatusPill>{d.provider_label}</StatusPill></td>
                      <td className="px-2 py-3"><DomainStatusPill status={d.status} /></td>
                      <td className="px-2 py-3 tabular-nums">
                        {d.active_mailbox_count}/{d.mailbox_count}
                      </td>
                      <td className="px-2 py-3"><WarmupCell domain={d} /></td>
                      <td className="px-2 py-3"><AssignedTo domain={d} /></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="secondary" onClick={() => setViewing(d)}>
                            <Eye className="size-4" />
                            View
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => setAssign({ domains: [d], toPool: false })}>
                            <UserRoundPlus className="size-4" />
                            {inPool ? "Assign" : "Reassign"}
                          </Button>
                          {!inPool ? (
                            <Button
                              isDisabled={!pool}
                              size="sm"
                              variant="secondary"
                              onClick={() => setAssign({ domains: [d], toPool: true })}
                            >
                              <Undo2 className="size-4" />
                              Return to pool
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination limit={LIMIT} page={page} total={total} onPage={setPage} />
      </div>

      <DomainDetailModal
        domain={viewing}
        onClose={() => setViewing(null)}
        onAssign={(d) => {
          setViewing(null);
          setAssign({ domains: [d], toPool: false });
        }}
      />

      <AssignDomainsModal
        currentWorkspaceId={currentWorkspaceId}
        domains={assignDomains}
        fixedTarget={assign?.toPool ? pool : null}
        isOpen={assign !== null}
        workspaces={workspaces}
        workspacesError={workspacesError}
        onClose={() => setAssign(null)}
        onDone={() => {
          setSelected({});
          void load();
          void loadSummary();
        }}
      />
    </div>
  );
}
