import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Chip, Spinner } from "@heroui/react";
import { Search, Trash2 } from "lucide-react";
import { ConfirmDialog, ErrorBanner } from "../admin/AdminModal";
import { Pagination } from "../ui/Pagination";
import { campaignService } from "../../services/api";
import type { CampaignDetail, CampaignLead, CampaignLeadsPage, LeadSelection, StatusTone } from "../../types";
import { toolbarFieldClass, toolbarSelectClass, useDebouncedValue } from "./leadBits";

const STATUS_TONE: Record<string, StatusTone> = { Pending: "default", Sent: "accent", Replied: "success", Bounced: "danger", Suppressed: "warning", Failed: "danger" };

/**
 * The leads already queued in a campaign, paged and searched on the server. Leads that haven't been emailed yet can be
 * removed; leads already contacted stay, because they are the campaign's history and drive its follow-ups.
 */
export function CampaignLeadsManager({ campaignId, counts, onChanged }: { campaignId: number; counts: CampaignDetail["leadCounts"]; onChanged: () => void }) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [data, setData] = useState<CampaignLeadsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [allMatching, setAllMatching] = useState(false);
  const [excludedIds, setExcludedIds] = useState<Set<number>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await campaignService.listLeads(campaignId, { page, limit, search: debouncedSearch, status });
      if (id !== requestId.current) return;
      if (result.items.length === 0 && result.total > 0 && page > result.totalPages) {
        setPage(result.totalPages);
        return;
      }
      setData(result);
    } catch (requestError) {
      if (id === requestId.current) setError(requestError instanceof Error ? requestError.message : "Unable to load leads");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [campaignId, page, limit, debouncedSearch, status]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    setPage(1);
    clear();
  }, [debouncedSearch, status]);

  function clear() {
    setSelectedIds(new Set());
    setAllMatching(false);
    setExcludedIds(new Set());
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const removable = items.filter((lead) => lead.status === "Pending");
  const isSelected = (id: number) => (allMatching ? !excludedIds.has(id) : selectedIds.has(id));
  const pageSelected = removable.length > 0 && removable.every((lead) => isSelected(lead.id));
  const selectedCount = allMatching ? Math.max(0, total - excludedIds.size) : selectedIds.size;
  // "Select all" only makes sense when every result is removable, i.e. the table is filtered to Pending leads.
  const canSelectAll = status === "Pending" && pageSelected && !allMatching && total > removable.length;

  function toggle(ids: number[], select: boolean) {
    const target = allMatching ? excludedIds : selectedIds;
    const next = new Set(target);
    ids.forEach((id) => {
      if (allMatching ? select : !select) next.delete(id);
      else next.add(id);
    });
    if (allMatching) setExcludedIds(next);
    else setSelectedIds(next);
  }

  async function remove() {
    setRemoving(true);
    setRemoveError(null);
    const selection: LeadSelection = allMatching ? { filter: { search: debouncedSearch }, excludeIds: Array.from(excludedIds) } : { ids: Array.from(selectedIds) };
    try {
      const result = await campaignService.removeLeads(campaignId, selection);
      setConfirming(false);
      clear();
      setNotice(`${result.removed.toLocaleString()} lead${result.removed === 1 ? "" : "s"} removed from this campaign.`);
      window.setTimeout(() => setNotice(null), 6000);
      onChanged();
      await load();
    } catch (requestError) {
      setRemoveError(requestError instanceof Error ? requestError.message : "Unable to remove leads");
    } finally {
      setRemoving(false);
    }
  }

  const stats = [
    ["Total", counts.total],
    ["Not yet emailed", counts.Pending],
    ["Emailed", counts.Sent],
    ["Replied", counts.Replied],
    ["Bounced / failed", counts.Bounced + counts.Failed],
  ] as const;

  return (
    <div className="space-y-3 rounded-2xl border border-border/70 p-4">
      <div>
        <h3 className="text-[13px] font-semibold text-foreground">Leads in this campaign</h3>
        <p className="text-[12px] text-muted">Remove leads that haven’t been emailed yet. Leads already contacted stay so replies and follow-ups keep working.</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {stats.map(([label, value]) => (
          <div className="rounded-xl border border-border/70 p-2.5" key={label}>
            <p className="text-[17px] font-semibold leading-none text-foreground">{value.toLocaleString()}</p>
            <p className="mt-1 text-[10.5px] font-medium text-muted">{label}</p>
          </div>
        ))}
      </div>

      {notice ? <p className="rounded-xl border border-success/20 bg-success/10 px-3 py-2 text-[12.5px] font-medium text-success" role="status">{notice}</p> : null}
      {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}

      <div className="overflow-hidden rounded-xl border border-border/70">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-3 py-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
            <input className={`${toolbarFieldClass} pl-8`} onChange={(event) => setSearch(event.target.value)} placeholder="Search email, name, or company…" value={search} />
          </div>
          <select className={`${toolbarSelectClass} w-[150px]`} onChange={(event) => setStatus(event.target.value)} value={status}>
            <option value="">All statuses</option>
            {["Pending", "Sent", "Replied", "Bounced", "Suppressed", "Failed"].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          {loading ? <Spinner color="accent" size="sm" /> : null}
        </div>

        {selectedCount > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-border/70 bg-accent/5 px-3 py-2 text-[12.5px]">
            <span className="font-semibold text-foreground">{selectedCount.toLocaleString()} selected</span>
            {canSelectAll ? (
              <button className="font-medium text-accent hover:underline" onClick={() => { setAllMatching(true); setExcludedIds(new Set()); }} type="button">
                Select all {total.toLocaleString()} not-yet-emailed leads
              </button>
            ) : null}
            <button className="font-medium text-muted hover:text-foreground" onClick={clear} type="button">Clear</button>
            <Button className="ml-auto" onPress={() => { setRemoveError(null); setConfirming(true); }} size="sm" variant="secondary">
              <Trash2 className="size-4 text-danger" /> Remove from campaign
            </Button>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-[12.5px]">
            <thead className="border-b border-border/70 text-[10.5px] uppercase tracking-wide text-muted">
              <tr>
                <th className="w-9 px-3 py-2"><input aria-label="Select this page" checked={pageSelected} className="size-4 accent-[var(--accent)]" disabled={removable.length === 0} onChange={() => toggle(removable.map((lead) => lead.id), !pageSelected)} type="checkbox" /></th>
                <th className="px-2 py-2 font-medium">Lead</th>
                <th className="px-2 py-2 font-medium">Company</th>
                <th className="px-2 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {!data && loading ? (
                <tr><td className="px-3 py-6 text-center text-muted" colSpan={4}>Loading leads…</td></tr>
              ) : items.length === 0 ? (
                <tr><td className="px-3 py-6 text-center text-muted" colSpan={4}>{debouncedSearch || status ? "No leads match these filters." : "This campaign has no leads."}</td></tr>
              ) : (
                items.map((lead: CampaignLead) => (
                  <tr className="border-b border-border/60 last:border-0" key={lead.id}>
                    <td className="px-3 py-2">
                      <input aria-label={`Select ${lead.email}`} checked={lead.status === "Pending" && isSelected(lead.id)} className="size-4 accent-[var(--accent)] disabled:opacity-30" disabled={lead.status !== "Pending"} onChange={() => toggle([lead.id], !isSelected(lead.id))} type="checkbox" />
                    </td>
                    <td className="max-w-[260px] px-2 py-2"><p className="truncate font-medium text-foreground">{lead.fullName || lead.email}</p>{lead.fullName ? <p className="truncate text-[11.5px] text-muted">{lead.email}</p> : null}</td>
                    <td className="max-w-[160px] truncate px-2 py-2 text-foreground">{lead.company || "—"}</td>
                    <td className="px-2 py-2"><Chip color={STATUS_TONE[lead.status] ?? "default"} size="sm" variant="soft">{lead.status}</Chip></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination isLoading={loading} noun="leads" onPageChange={setPage} onPageSizeChange={(size) => { setLimit(size); setPage(1); }} page={data?.page ?? page} pageSize={limit} pageSizeOptions={[10, 25, 50]} total={total} totalPages={data?.totalPages ?? 1} />
      </div>

      <ConfirmDialog
        confirmLabel={`Remove ${selectedCount.toLocaleString()} lead${selectedCount === 1 ? "" : "s"}`}
        description="They won’t be emailed by this campaign. Their records in your Leads lists are not affected."
        error={removeError}
        isBusy={removing}
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={remove}
        title="Remove leads from this campaign?"
        tone="danger"
      />
    </div>
  );
}
