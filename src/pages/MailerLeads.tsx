import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Chip, Spinner } from "@heroui/react";
import { Download, FileDown, FolderOpen, ListPlus, Mail, Pencil, Plus, Search, ShieldOff, Trash2, Upload, UserPlus, Users, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { SkeletonRow } from "../components/ui/Skeleton";
import { Pagination } from "../components/ui/Pagination";
import { ErrorBanner } from "../components/admin/AdminModal";
import {
  AddLeadsModal,
  DeleteLeadsDialog,
  DeleteListDialog,
  ImportLeadsModal,
  LeadDetailModal,
  ListFormModal,
  MoveLeadsModal,
} from "../components/leads/LeadModals";
import { downloadSampleCsv, formatDate, leadDisplayName, ListSelect, toolbarFieldClass, toolbarSelectClass, useDebouncedValue } from "../components/leads/leadBits";
import { leadLibraryService } from "../services/leadLibraryApi";
import type { LeadFilter, LeadList, LeadLibraryStats, LeadSelection, LeadSort, LeadStatusFilter, LibraryLead, Paged } from "../types";

type Tab = "leads" | "lists";

const SORT_LABELS: Record<LeadSort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  email: "Email A–Z",
  name: "Name A–Z",
  company: "Company A–Z",
};

export function MailerLeads() {
  const { activeWorkspace, isSuperAdmin } = useAuth();
  const role = activeWorkspace?.role as string | undefined;
  const canDeleteLists = isSuperAdmin || role === "owner" || role === "admin";

  const [tab, setTab] = useState<Tab>("leads");
  const [stats, setStats] = useState<LeadLibraryStats | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<number | undefined>(undefined);

  // Lead table state: everything here is sent to the server, so paging, search and sort never work on a local copy.
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [listFilter, setListFilter] = useState<number | null>(null);
  const [status, setStatus] = useState<LeadStatusFilter>("");
  const [sort, setSort] = useState<LeadSort>("newest");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [leadPage, setLeadPage] = useState<Paged<LibraryLead> | null>(null);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [leadsError, setLeadsError] = useState<string | null>(null);
  const leadsRequest = useRef(0);

  // Selection: explicit ids, or "all results matching the filter" minus exclusions.
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [allMatching, setAllMatching] = useState(false);
  const [excludedIds, setExcludedIds] = useState<Set<number>>(new Set());

  // List table state
  const [listSearch, setListSearch] = useState("");
  const debouncedListSearch = useDebouncedValue(listSearch);
  const [listPageNumber, setListPageNumber] = useState(1);
  const [listLimit, setListLimit] = useState(12);
  const [listPage, setListPage] = useState<Paged<LeadList> | null>(null);
  const [listsLoading, setListsLoading] = useState(true);
  const [listsError, setListsError] = useState<string | null>(null);
  const listsRequest = useRef(0);

  // Dialogs
  const [listForm, setListForm] = useState<LeadList | "new" | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importTarget, setImportTarget] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addTarget, setAddTarget] = useState<number | null>(null);
  const [moveSelection, setMoveSelection] = useState<LeadSelection | null>(null);
  const [deleteSelection, setDeleteSelection] = useState<LeadSelection | null>(null);
  const [deleteList, setDeleteList] = useState<LeadList | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  const filter: LeadFilter = { search: debouncedSearch, listId: listFilter, status };
  const filterKey = `${debouncedSearch}|${listFilter}|${status}`;

  function flash(text: string) {
    setNotice(text);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 6000);
  }

  const loadStats = useCallback(() => {
    leadLibraryService.stats().then(setStats).catch(() => undefined);
  }, []);

  const loadLeads = useCallback(async () => {
    const id = ++leadsRequest.current;
    setLeadsLoading(true);
    setLeadsError(null);
    try {
      const result = await leadLibraryService.listLeads({ page, limit, search: debouncedSearch, listId: listFilter, status, sort });
      if (id !== leadsRequest.current) return;
      // A page past the end (e.g. after deletes) steps back instead of showing an empty table.
      if (result.items.length === 0 && result.total > 0 && page > result.totalPages) {
        setPage(result.totalPages);
        return;
      }
      setLeadPage(result);
    } catch (requestError) {
      if (id !== leadsRequest.current) return;
      setLeadsError(requestError instanceof Error ? requestError.message : "Unable to load leads");
    } finally {
      if (id === leadsRequest.current) setLeadsLoading(false);
    }
  }, [page, limit, debouncedSearch, listFilter, status, sort]);

  const loadLists = useCallback(async () => {
    const id = ++listsRequest.current;
    setListsLoading(true);
    setListsError(null);
    try {
      const result = await leadLibraryService.listLists({ page: listPageNumber, limit: listLimit, search: debouncedListSearch });
      if (id !== listsRequest.current) return;
      if (result.items.length === 0 && result.total > 0 && listPageNumber > result.totalPages) {
        setListPageNumber(result.totalPages);
        return;
      }
      setListPage(result);
    } catch (requestError) {
      if (id !== listsRequest.current) return;
      setListsError(requestError instanceof Error ? requestError.message : "Unable to load lists");
    } finally {
      if (id === listsRequest.current) setListsLoading(false);
    }
  }, [listPageNumber, listLimit, debouncedListSearch]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { void loadLeads(); }, [loadLeads]);
  useEffect(() => { void loadLists(); }, [loadLists]);

  // New filters mean a new result set: go back to page 1 and drop the selection.
  useEffect(() => {
    setPage(1);
    clearSelection();
  }, [filterKey]);
  useEffect(() => setListPageNumber(1), [debouncedListSearch]);
  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  function clearSelection() {
    setSelectedIds(new Set());
    setAllMatching(false);
    setExcludedIds(new Set());
  }

  function refreshAll() {
    loadStats();
    void loadLeads();
    void loadLists();
  }

  const items = leadPage?.items ?? [];
  const total = leadPage?.total ?? 0;
  const selectedCount = allMatching ? Math.max(0, total - excludedIds.size) : selectedIds.size;
  const pageFullySelected = items.length > 0 && items.every((lead) => (allMatching ? !excludedIds.has(lead.id) : selectedIds.has(lead.id)));
  const canSelectAll = pageFullySelected && !allMatching && total > items.length;

  function isSelected(id: number) {
    return allMatching ? !excludedIds.has(id) : selectedIds.has(id);
  }

  function toggleLead(id: number) {
    if (allMatching) {
      setExcludedIds((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else {
      setSelectedIds((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }
  }

  function togglePage() {
    if (allMatching) {
      setExcludedIds((current) => {
        const next = new Set(current);
        for (const lead of items) {
          if (pageFullySelected) next.add(lead.id);
          else next.delete(lead.id);
        }
        return next;
      });
      return;
    }
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const lead of items) {
        if (pageFullySelected) next.delete(lead.id);
        else next.add(lead.id);
      }
      return next;
    });
  }

  function currentSelection(): LeadSelection {
    return allMatching ? { filter, excludeIds: Array.from(excludedIds) } : { ids: Array.from(selectedIds) };
  }

  async function runExport() {
    setExporting(true);
    try {
      await leadLibraryService.exportLeads(filter);
    } catch (requestError) {
      setLeadsError(requestError instanceof Error ? requestError.message : "Unable to export leads");
    } finally {
      setExporting(false);
    }
  }

  const filtersActive = Boolean(search || listFilter || status);

  const metrics = [
    { icon: Users, label: "Total leads", value: stats?.totalLeads, detail: stats ? `${stats.uniqueEmails.toLocaleString()} unique emails` : "" },
    { icon: FolderOpen, label: "Lead lists", value: stats?.totalLists, detail: "reusable blocks for campaigns" },
    { icon: Mail, label: "Added this week", value: stats?.addedLast7Days, detail: "last 7 days" },
    { icon: ShieldOff, label: "Suppressed", value: stats?.suppressed, detail: "skipped by every campaign" },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-semibold text-foreground">Leads</h2>
          <p className="mt-0.5 text-[12.5px] text-muted">Upload leads once, organise them into lists, and reuse them in any campaign.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onPress={downloadSampleCsv} size="sm" variant="ghost">
            <FileDown className="size-4" /> CSV Format
          </Button>
          <Button onPress={() => { setAddTarget(listFilter); setAddOpen(true); }} size="sm" variant="secondary">
            <UserPlus className="size-4" /> Add leads
          </Button>
          <Button onPress={() => { setImportTarget(listFilter); setImportOpen(true); }} size="sm">
            <Upload className="size-4" /> Import file
          </Button>
        </div>
      </div>

      {notice ? <div className="rounded-2xl border border-success/20 bg-success/10 px-4 py-3 text-sm font-medium text-success" role="status">{notice}</div> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div className="apple-shadow flex items-center gap-3 rounded-2xl border border-border/70 bg-surface p-4" key={metric.label}>
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-default-100 text-foreground"><metric.icon className="size-[18px]" strokeWidth={2.2} /></span>
            <div className="min-w-0">
              {metric.value === undefined ? <div className="mt-1"><Spinner color="accent" size="sm" /></div> : <p className="text-[22px] font-semibold leading-none text-foreground">{metric.value.toLocaleString()}</p>}
              <p className="mt-1.5 truncate text-[12px] font-semibold text-foreground">{metric.label}</p>
              <p className="truncate text-[11px] text-muted">{metric.detail}</p>
            </div>
          </div>
        ))}
      </section>

      <div className="inline-flex rounded-xl bg-default-100 p-0.5 text-[13px] font-medium">
        {([["leads", "All leads"], ["lists", "Lists"]] as const).map(([value, label]) => (
          <button
            className={["rounded-[10px] px-4 py-1.5 transition", tab === value ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"].join(" ")}
            key={value}
            onClick={() => setTab(value)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "leads" ? (
        <div className="apple-shadow overflow-hidden rounded-2xl border border-border/70 bg-surface">
          <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-4 py-3">
            <div className="relative min-w-[220px] flex-1 sm:max-w-[360px]">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                className="h-9 w-full rounded-xl border border-border bg-surface-secondary pl-9 pr-8 text-[13px] outline-none transition focus:border-accent"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search email, name, company, or role…"
                value={search}
              />
              {search ? (
                <button aria-label="Clear search" className="absolute right-2 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full text-muted hover:text-foreground" onClick={() => setSearch("")} type="button">
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>
            <div className="w-[190px]"><ListSelect allowAll className={toolbarFieldClass} onChange={setListFilter} value={listFilter} /></div>
            <select className={`${toolbarSelectClass} w-[140px]`} onChange={(event) => setStatus(event.target.value as LeadStatusFilter)} value={status}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="suppressed">Suppressed</option>
            </select>
            <select className={`${toolbarSelectClass} w-[150px]`} onChange={(event) => { setSort(event.target.value as LeadSort); setPage(1); }} value={sort}>
              {(Object.keys(SORT_LABELS) as LeadSort[]).map((key) => <option key={key} value={key}>{SORT_LABELS[key]}</option>)}
            </select>
            {filtersActive ? (
              <Button onPress={() => { setSearch(""); setListFilter(null); setStatus(""); }} size="sm" variant="ghost">Clear filters</Button>
            ) : null}
            <div className="ml-auto flex items-center gap-2">
              {leadsLoading ? <Spinner color="accent" size="sm" /> : null}
              <Button isDisabled={exporting || total === 0} onPress={runExport} size="sm" variant="secondary">
                <Download className="size-4" /> {exporting ? "Exporting…" : filtersActive ? "Export results" : "Export all"}
              </Button>
            </div>
          </div>

          {selectedCount > 0 ? (
            <div className="flex flex-wrap items-center gap-2 border-b border-border/70 bg-accent/5 px-4 py-2.5 text-[13px]">
              <span className="font-semibold text-foreground">{selectedCount.toLocaleString()} selected</span>
              {canSelectAll ? (
                <button className="font-medium text-accent hover:underline" onClick={() => { setAllMatching(true); setExcludedIds(new Set()); }} type="button">
                  Select all {total.toLocaleString()} results
                </button>
              ) : null}
              <button className="font-medium text-muted hover:text-foreground" onClick={clearSelection} type="button">Clear</button>
              <div className="ml-auto flex items-center gap-2">
                <Button onPress={() => setMoveSelection(currentSelection())} size="sm" variant="secondary"><ListPlus className="size-4" /> Add to list</Button>
                <Button onPress={() => setDeleteSelection(currentSelection())} size="sm" variant="secondary"><Trash2 className="size-4 text-danger" /> Delete</Button>
              </div>
            </div>
          ) : null}

          {leadsError ? <div className="p-4"><ErrorBanner message={leadsError} onRetry={() => void loadLeads()} /></div> : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-border/70 text-[11px] uppercase tracking-wide text-muted">
                <tr>
                  <th className="w-10 px-4 py-3"><input aria-label="Select this page" checked={pageFullySelected} className="size-4 accent-[var(--accent)]" onChange={togglePage} type="checkbox" /></th>
                  <th className="px-2 py-3 font-medium">Lead</th>
                  <th className="px-2 py-3 font-medium">Company</th>
                  <th className="px-2 py-3 font-medium">Role</th>
                  <th className="px-2 py-3 font-medium">Location</th>
                  <th className="px-2 py-3 font-medium">List</th>
                  <th className="px-2 py-3 font-medium">Status</th>
                  <th className="px-2 py-3 font-medium">Campaigns</th>
                  <th className="px-4 py-3 font-medium">Added</th>
                </tr>
              </thead>
              <tbody>
                {leadsLoading && !leadPage ? (
                  Array.from({ length: 8 }).map((_, index) => <SkeletonRow columns={9} key={index} />)
                ) : items.length === 0 ? (
                  <tr>
                    <td className="px-5 py-12 text-center text-sm font-medium text-muted" colSpan={9}>
                      {filtersActive ? "No leads match these filters." : "No leads yet. Import a file or add leads to start your first list."}
                    </td>
                  </tr>
                ) : (
                  items.map((lead) => (
                    <tr className={["cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-surface-secondary/60", leadsLoading ? "opacity-60" : ""].join(" ")} key={lead.id} onClick={() => setDetailId(lead.id)}>
                      <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                        <input aria-label={`Select ${lead.email}`} checked={isSelected(lead.id)} className="size-4 accent-[var(--accent)]" onChange={() => toggleLead(lead.id)} type="checkbox" />
                      </td>
                      <td className="max-w-[260px] px-2 py-3">
                        <p className="truncate font-semibold text-foreground">{leadDisplayName(lead)}</p>
                        {leadDisplayName(lead) !== lead.email ? <p className="truncate text-[12px] text-muted">{lead.email}</p> : null}
                      </td>
                      <td className="max-w-[180px] truncate px-2 py-3 text-foreground">{lead.company || "—"}</td>
                      <td className="max-w-[160px] truncate px-2 py-3 text-foreground">{lead.role || "—"}</td>
                      <td className="max-w-[140px] truncate px-2 py-3 text-foreground">{lead.location || "—"}</td>
                      <td className="max-w-[160px] truncate px-2 py-3 text-foreground">{lead.listName}</td>
                      <td className="px-2 py-3"><Chip color={lead.status === "Active" ? "success" : "warning"} size="sm" variant="soft">{lead.status}</Chip></td>
                      <td className="px-2 py-3 text-foreground">{lead.campaignCount}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDate(lead.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            isLoading={leadsLoading}
            noun="leads"
            onPageChange={setPage}
            onPageSizeChange={(size) => { setLimit(size); setPage(1); }}
            page={leadPage?.page ?? page}
            pageSize={limit}
            total={total}
            totalPages={leadPage?.totalPages ?? 1}
          />
        </div>
      ) : (
        <div className="apple-shadow overflow-hidden rounded-2xl border border-border/70 bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-4 py-3">
            <div className="relative w-full max-w-[360px]">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                className="h-9 w-full rounded-xl border border-border bg-surface-secondary pl-9 pr-3 text-[13px] outline-none transition focus:border-accent"
                onChange={(event) => setListSearch(event.target.value)}
                placeholder="Search lists…"
                value={listSearch}
              />
            </div>
            <div className="flex items-center gap-2">
              {listsLoading ? <Spinner color="accent" size="sm" /> : null}
              <Button onPress={() => setListForm("new")} size="sm"><Plus className="size-4" /> New list</Button>
            </div>
          </div>

          {listsError ? <div className="p-4"><ErrorBanner message={listsError} onRetry={() => void loadLists()} /></div> : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-border/70 text-[11px] uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">List</th>
                  <th className="px-2 py-3 font-medium">Leads</th>
                  <th className="px-2 py-3 font-medium">Created</th>
                  <th className="px-2 py-3 font-medium">Last added</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listsLoading && !listPage ? (
                  Array.from({ length: 5 }).map((_, index) => <SkeletonRow columns={5} key={index} />)
                ) : (listPage?.items.length ?? 0) === 0 ? (
                  <tr>
                    <td className="px-5 py-12 text-center text-sm font-medium text-muted" colSpan={5}>
                      {debouncedListSearch ? "No lists match that search." : "No lists yet. Create one, or import a file to create it automatically."}
                    </td>
                  </tr>
                ) : (
                  listPage?.items.map((list) => (
                    <tr className={["border-b border-border/60 transition-colors last:border-0 hover:bg-surface-secondary/60", listsLoading ? "opacity-60" : ""].join(" ")} key={list.id}>
                      <td className="max-w-[360px] px-5 py-3">
                        <button className="block max-w-full truncate text-left font-semibold text-foreground hover:text-accent" onClick={() => { setListFilter(list.id); setTab("leads"); }} type="button">{list.name}</button>
                        {list.description ? <p className="truncate text-[12px] text-muted">{list.description}</p> : null}
                      </td>
                      <td className="px-2 py-3 font-medium text-foreground">{list.contactCount.toLocaleString()}</td>
                      <td className="whitespace-nowrap px-2 py-3 text-muted">{formatDate(list.createdAt)}</td>
                      <td className="whitespace-nowrap px-2 py-3 text-muted">{formatDate(list.lastAddedAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button aria-label={`View leads in ${list.name}`} isIconOnly onPress={() => { setListFilter(list.id); setTab("leads"); }} size="sm" variant="ghost"><Users className="size-4" /></Button>
                          <Button aria-label={`Import leads into ${list.name}`} isIconOnly onPress={() => { setImportTarget(list.id); setImportOpen(true); }} size="sm" variant="ghost"><Upload className="size-4" /></Button>
                          <Button aria-label={`Rename ${list.name}`} isIconOnly onPress={() => setListForm(list)} size="sm" variant="ghost"><Pencil className="size-4" /></Button>
                          {canDeleteLists ? <Button aria-label={`Delete ${list.name}`} isIconOnly onPress={() => setDeleteList(list)} size="sm" variant="ghost"><Trash2 className="size-4 text-danger" /></Button> : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            isLoading={listsLoading}
            noun="lists"
            onPageChange={setListPageNumber}
            onPageSizeChange={(size) => { setListLimit(size); setListPageNumber(1); }}
            page={listPage?.page ?? listPageNumber}
            pageSize={listLimit}
            pageSizeOptions={[12, 25, 50, 100]}
            total={listPage?.total ?? 0}
            totalPages={listPage?.totalPages ?? 1}
          />
        </div>
      )}

      <ListFormModal
        list={listForm}
        onClose={() => setListForm(null)}
        onSaved={(saved) => {
          setListForm(null);
          flash(`List “${saved.name}” saved.`);
          refreshAll();
        }}
      />
      <ImportLeadsModal
        defaultListId={importTarget}
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={refreshAll}
      />
      <AddLeadsModal
        defaultListId={addTarget}
        isOpen={addOpen}
        onAdded={(summary) => {
          setAddOpen(false);
          flash(summary);
          refreshAll();
        }}
        onClose={() => setAddOpen(false)}
      />
      <MoveLeadsModal
        count={selectedCount}
        excludeListId={listFilter}
        onClose={() => setMoveSelection(null)}
        onDone={(summary) => {
          setMoveSelection(null);
          clearSelection();
          flash(summary);
          refreshAll();
        }}
        selection={moveSelection}
      />
      <DeleteLeadsDialog
        count={selectedCount}
        onClose={() => setDeleteSelection(null)}
        onDone={(summary) => {
          setDeleteSelection(null);
          clearSelection();
          flash(summary);
          refreshAll();
        }}
        selection={deleteSelection}
      />
      <DeleteListDialog
        list={deleteList}
        onClose={() => setDeleteList(null)}
        onDone={(summary) => {
          if (deleteList && listFilter === deleteList.id) setListFilter(null);
          setDeleteList(null);
          flash(summary);
          refreshAll();
        }}
      />
      <LeadDetailModal leadId={detailId} onChanged={refreshAll} onClose={() => setDetailId(null)} />
    </div>
  );
}
