import { useCallback, useEffect, useRef, useState } from "react";
import { Spinner } from "@heroui/react";
import { Search } from "lucide-react";
import { Pagination } from "../ui/Pagination";
import { leadLibraryService } from "../../services/leadLibraryApi";
import type { LeadFilter, LeadList, LeadSelection, LibraryLead, Paged } from "../../types";
import { compactFieldClass, leadDisplayName, ListSelect, useDebouncedValue } from "./leadBits";

/** What a campaign takes from the lead library: whole lists, plus individually picked leads (by id, or "all matching a filter"). */
export interface LibraryPick {
  listIds: number[];
  ids: number[];
  allMatching: boolean;
  filter: LeadFilter;
  excludedIds: number[];
}

export const EMPTY_PICK: LibraryPick = { listIds: [], ids: [], allMatching: false, filter: {}, excludedIds: [] };

export function pickHasLeads(pick: LibraryPick) {
  return pick.listIds.length > 0 || pick.ids.length > 0 || pick.allMatching;
}

export function pickToSource(pick: LibraryPick): { listIds?: number[]; contacts?: LeadSelection | null } {
  const contacts: LeadSelection | null = pick.allMatching
    ? { filter: pick.filter, excludeIds: pick.excludedIds }
    : pick.ids.length
      ? { ids: pick.ids }
      : null;
  return { listIds: pick.listIds, contacts };
}

const PAGE_SIZE = 8;

export function LibraryLeadPicker({ pick, onChange }: { pick: LibraryPick; onChange: (pick: LibraryPick) => void }) {
  const [view, setView] = useState<"lists" | "leads">("lists");

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-xl bg-default-100 p-0.5 text-[12px] font-medium">
        {([["lists", `Lead lists${pick.listIds.length ? ` (${pick.listIds.length})` : ""}`], ["leads", `Individual leads${pick.allMatching || pick.ids.length ? " ✓" : ""}`]] as const).map(([value, label]) => (
          <button
            className={["rounded-[10px] px-3 py-1.5 transition", view === value ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"].join(" ")}
            key={value}
            onClick={() => setView(value)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
      {view === "lists" ? <ListPicker pick={pick} onChange={onChange} /> : <LeadPicker pick={pick} onChange={onChange} />}
    </div>
  );
}

function ListPicker({ pick, onChange }: { pick: LibraryPick; onChange: (pick: LibraryPick) => void }) {
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<LeadList> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => setPage(1), [debounced]);
  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await leadLibraryService.listLists({ page, limit: PAGE_SIZE, search: debounced });
      if (id === requestId.current) setData(result);
    } catch (requestError) {
      if (id === requestId.current) setError(requestError instanceof Error ? requestError.message : "Unable to load lists");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [page, debounced]);
  useEffect(() => { void load(); }, [load]);

  const selected = new Set(pick.listIds);
  function toggle(id: number) {
    onChange({ ...pick, listIds: selected.has(id) ? pick.listIds.filter((value) => value !== id) : [...pick.listIds, id] });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/70">
      <SearchBar loading={loading} onChange={setSearch} placeholder="Search your lists…" value={search} />
      {error ? <p className="px-3 py-3 text-[12.5px] font-medium text-danger">{error}</p> : null}
      <ul className="divide-y divide-border/60">
        {!data && loading ? (
          <li className="px-3 py-6 text-center text-[12.5px] text-muted">Loading lists…</li>
        ) : (data?.items.length ?? 0) === 0 ? (
          <li className="px-3 py-6 text-center text-[12.5px] text-muted">{debounced ? "No lists match that search." : "You have no lead lists yet. Create one from the Leads page, or upload a file below."}</li>
        ) : (
          data?.items.map((list) => (
            <li key={list.id}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition hover:bg-surface-secondary/60">
                <input checked={selected.has(list.id)} className="size-4 accent-[var(--accent)]" onChange={() => toggle(list.id)} type="checkbox" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-foreground">{list.name}</span>
                  {list.description ? <span className="block truncate text-[11.5px] text-muted">{list.description}</span> : null}
                </span>
                <span className="shrink-0 text-[12px] font-medium text-muted">{list.contactCount.toLocaleString()} leads</span>
              </label>
            </li>
          ))
        )}
      </ul>
      <Pagination isLoading={loading} noun="lists" onPageChange={setPage} page={data?.page ?? page} pageSize={PAGE_SIZE} total={data?.total ?? 0} totalPages={data?.totalPages ?? 1} />
    </div>
  );
}

function LeadPicker({ pick, onChange }: { pick: LibraryPick; onChange: (pick: LibraryPick) => void }) {
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search);
  const [listId, setListId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<LibraryLead> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => setPage(1), [debounced, listId]);
  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await leadLibraryService.listLeads({ page, limit: PAGE_SIZE, search: debounced, listId, status: "active" });
      if (id === requestId.current) setData(result);
    } catch (requestError) {
      if (id === requestId.current) setError(requestError instanceof Error ? requestError.message : "Unable to load leads");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [page, debounced, listId]);
  useEffect(() => { void load(); }, [load]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const idSet = new Set(pick.ids);
  const excluded = new Set(pick.excludedIds);
  const isSelected = (id: number) => (pick.allMatching ? !excluded.has(id) : idSet.has(id));
  const selectedCount = pick.allMatching ? Math.max(0, total - excluded.size) : pick.ids.length;
  const pageSelected = items.length > 0 && items.every((lead) => isSelected(lead.id));

  function toggle(ids: number[], select: boolean) {
    if (pick.allMatching) {
      const next = new Set(excluded);
      ids.forEach((id) => (select ? next.delete(id) : next.add(id)));
      onChange({ ...pick, excludedIds: Array.from(next) });
    } else {
      const next = new Set(idSet);
      ids.forEach((id) => (select ? next.add(id) : next.delete(id)));
      onChange({ ...pick, ids: Array.from(next) });
    }
  }

  function selectAllMatching() {
    onChange({ ...pick, allMatching: true, ids: [], excludedIds: [], filter: { search: debounced, listId, status: "active" } });
  }

  const matchingFilterChanged = pick.allMatching && ((pick.filter.search ?? "") !== debounced || (pick.filter.listId ?? null) !== listId);

  return (
    <div className="overflow-hidden rounded-xl border border-border/70">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-3 py-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
          <input className={`${compactFieldClass} pl-8`} onChange={(event) => setSearch(event.target.value)} placeholder="Search email, name, or company…" value={search} />
        </div>
        <div className="w-[180px]"><ListSelect allowAll className={compactFieldClass} onChange={setListId} value={listId} /></div>
        {loading ? <Spinner color="accent" size="sm" /> : null}
      </div>

      {selectedCount > 0 || pick.allMatching ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-border/70 bg-accent/5 px-3 py-2 text-[12.5px]">
          <span className="font-semibold text-foreground">{selectedCount.toLocaleString()} lead{selectedCount === 1 ? "" : "s"} picked</span>
          {pick.allMatching ? <span className="text-muted">(everything matching “{pick.filter.search || "all leads"}”{pick.filter.listId ? " in the chosen list" : ""})</span> : null}
          {matchingFilterChanged ? <span className="text-warning">Filters changed since you chose “all”.</span> : null}
          <button className="ml-auto font-medium text-muted hover:text-foreground" onClick={() => onChange({ ...pick, ids: [], allMatching: false, excludedIds: [] })} type="button">Clear</button>
        </div>
      ) : null}
      {pageSelected && !pick.allMatching && total > items.length ? (
        <div className="border-b border-border/70 px-3 py-2 text-[12.5px] text-muted">
          All {items.length} on this page are picked.{" "}
          <button className="font-medium text-accent hover:underline" onClick={selectAllMatching} type="button">Pick all {total.toLocaleString()} matching leads</button>
        </div>
      ) : null}

      {error ? <p className="px-3 py-3 text-[12.5px] font-medium text-danger">{error}</p> : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-[12.5px]">
          <thead className="border-b border-border/70 text-[10.5px] uppercase tracking-wide text-muted">
            <tr>
              <th className="w-9 px-3 py-2"><input aria-label="Pick this page" checked={pageSelected} className="size-4 accent-[var(--accent)]" onChange={() => toggle(items.map((lead) => lead.id), !pageSelected)} type="checkbox" /></th>
              <th className="px-2 py-2 font-medium">Lead</th>
              <th className="px-2 py-2 font-medium">Company</th>
              <th className="px-2 py-2 font-medium">List</th>
            </tr>
          </thead>
          <tbody>
            {!data && loading ? (
              <tr><td className="px-3 py-6 text-center text-muted" colSpan={4}>Loading leads…</td></tr>
            ) : items.length === 0 ? (
              <tr><td className="px-3 py-6 text-center text-muted" colSpan={4}>{debounced || listId ? "No leads match these filters." : "No leads in your library yet."}</td></tr>
            ) : (
              items.map((lead) => (
                <tr className="border-b border-border/60 last:border-0 hover:bg-surface-secondary/60" key={lead.id}>
                  <td className="px-3 py-2"><input aria-label={`Pick ${lead.email}`} checked={isSelected(lead.id)} className="size-4 accent-[var(--accent)]" onChange={() => toggle([lead.id], !isSelected(lead.id))} type="checkbox" /></td>
                  <td className="max-w-[240px] px-2 py-2"><p className="truncate font-medium text-foreground">{leadDisplayName(lead)}</p>{leadDisplayName(lead) !== lead.email ? <p className="truncate text-[11.5px] text-muted">{lead.email}</p> : null}</td>
                  <td className="max-w-[160px] truncate px-2 py-2 text-foreground">{lead.company || "—"}</td>
                  <td className="max-w-[140px] truncate px-2 py-2 text-muted">{lead.listName}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination isLoading={loading} noun="leads" onPageChange={setPage} page={data?.page ?? page} pageSize={PAGE_SIZE} total={total} totalPages={data?.totalPages ?? 1} />
    </div>
  );
}

function SearchBar({ value, onChange, placeholder, loading }: { value: string; onChange: (value: string) => void; placeholder: string; loading: boolean }) {
  return (
    <div className="flex items-center gap-2 border-b border-border/70 px-3 py-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
        <input className={`${compactFieldClass} pl-8`} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} value={value} />
      </div>
      {loading ? <Spinner color="accent" size="sm" /> : null}
    </div>
  );
}
