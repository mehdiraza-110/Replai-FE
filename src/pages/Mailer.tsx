import { useEffect, useMemo, useState } from "react";
import { Button, Chip, Dropdown, Modal, Spinner, Tooltip, useOverlayState } from "@heroui/react";
import {
  AlertTriangle,
  ArrowUpDown,
  BarChart2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Globe,
  Hash,
  ListFilter,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { SyncMaildosoButton } from "../components/mailer/SyncMaildosoButton";
import { DomainAnalyticsDrawer } from "../components/mailer/DomainAnalyticsDrawer";
import { SkeletonRow } from "../components/ui/Skeleton";
import { domainService } from "../services/api";
import type { Domain, DnsCheckStatus, DomainStatusCounts, SesAccountStatus } from "../types";

const PAGE_SIZE = 10;
const FETCH_ALL_LIMIT = 100;
const FETCH_ALL_MAX_PAGES = 50;
const emptyCounts: DomainStatusCounts = { total: 0, verified: 0, pending: 0, failed: 0 };

type DnsFilter = "" | "ok" | "issues" | "not-started";
type SortKey = "default" | "name-asc" | "name-desc" | "newest" | "mailboxes" | "bounce" | "checked";

interface Filters {
  status: "" | Domain["status"];
  reputation: string;
  dns: DnsFilter;
  mailboxes: "" | "with" | "none";
  sort: SortKey;
}

const noFilters: Filters = { status: "", reputation: "", dns: "", mailboxes: "", sort: "default" };
const STATUS_OPTIONS: Domain["status"][] = ["Verified", "Pending Verification", "Provisioning", "Failed"];
const REPUTATION_OPTIONS = ["Healthy", "Watch", "At Risk"];
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "default", label: "Default order" },
  { value: "name-asc", label: "Name A–Z" },
  { value: "name-desc", label: "Name Z–A" },
  { value: "newest", label: "Newest first" },
  { value: "mailboxes", label: "Most mailboxes" },
  { value: "bounce", label: "Highest bounce rate" },
  { value: "checked", label: "Least recently checked" },
];

const STATUS_FILTER_OPTIONS = [{ value: "", label: "All statuses" }, ...STATUS_OPTIONS.map((value) => ({ value, label: value }))];
const REPUTATION_FILTER_OPTIONS = [
  { value: "", label: "All reputations" },
  ...REPUTATION_OPTIONS.map((value) => ({ value, label: value })),
  { value: "Other", label: "No data / other" },
];
const DNS_FILTER_OPTIONS = [
  { value: "", label: "All DNS states" },
  { value: "ok", label: "All records verified" },
  { value: "issues", label: "Failed or pending records" },
  { value: "not-started", label: "Records not started" },
];
const MAILBOX_FILTER_OPTIONS = [
  { value: "", label: "Any mailbox count" },
  { value: "with", label: "Has mailboxes" },
  { value: "none", label: "No mailboxes" },
];

function matchesFilters(domain: Domain, filters: Filters) {
  if (filters.status && domain.status !== filters.status) return false;
  if (filters.reputation) {
    // "Other" covers anything that is not one of the three named levels (e.g. no sending data yet).
    const known = REPUTATION_OPTIONS.includes(domain.reputation);
    if (filters.reputation === "Other" ? known : domain.reputation !== filters.reputation) return false;
  }
  if (filters.dns) {
    const states = [domain.spfStatus, domain.dkimStatus, domain.dmarcStatus, domain.mxStatus];
    if (filters.dns === "ok" && !states.every((state) => state === "Success")) return false;
    if (filters.dns === "issues" && !states.some((state) => state === "Failed" || state === "Pending")) return false;
    if (filters.dns === "not-started" && !states.some((state) => state === "Not started")) return false;
  }
  if (filters.mailboxes === "with" && (domain.mailboxCount ?? 0) === 0) return false;
  if (filters.mailboxes === "none" && (domain.mailboxCount ?? 0) > 0) return false;
  return true;
}

function sortDomains(domains: Domain[], sort: SortKey) {
  const time = (value: string | null) => (value ? new Date(value).getTime() : 0);
  const sorted = [...domains];
  switch (sort) {
    case "name-asc": return sorted.sort((a, b) => a.domain.localeCompare(b.domain));
    case "name-desc": return sorted.sort((a, b) => b.domain.localeCompare(a.domain));
    case "newest": return sorted.sort((a, b) => time(b.createdAt) - time(a.createdAt));
    case "mailboxes": return sorted.sort((a, b) => (b.mailboxCount ?? 0) - (a.mailboxCount ?? 0));
    case "bounce": return sorted.sort((a, b) => (b.bounceRate ?? 0) - (a.bounceRate ?? 0));
    case "checked": return sorted.sort((a, b) => time(a.lastCheckedAt) - time(b.lastCheckedAt));
    default: return sorted;
  }
}

export function Mailer() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [showAddInfo, setShowAddInfo] = useState(false);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [statusCounts, setStatusCounts] = useState<DomainStatusCounts>(emptyCounts);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  // SES is no longer used for sending, so there is no account status to show.
  const accountStatus: SesAccountStatus | null = null;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(noFilters);
  // Filters and sorting are applied here, so while one is active the full list is loaded instead of a server page.
  const [allDomains, setAllDomains] = useState<Domain[]>([]);
  const [analyticsDomainId, setAnalyticsDomainId] = useState<number | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [refreshingDomain, setRefreshingDomain] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Domain | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteModal = useOverlayState({});

  const filtersActive = Object.values(filters).some((value) => value !== "" && value !== "default");
  const filteredDomains = useMemo(
    () => (filtersActive ? sortDomains(allDomains.filter((domain) => matchesFilters(domain, filters)), filters.sort) : []),
    [allDomains, filters, filtersActive],
  );
  const shownDomains = filtersActive ? filteredDomains.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : domains;
  const shownTotal = filtersActive ? filteredDomains.length : total;
  const shownTotalPages = filtersActive ? Math.max(1, Math.ceil(filteredDomains.length / PAGE_SIZE)) : totalPages;
  const activeFilterCount = [filters.status, filters.reputation, filters.dns, filters.mailboxes].filter(Boolean).length + (filters.sort !== "default" ? 1 : 0);

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  useEffect(() => {
    load(1, search);
  }, []);

  // Debounce server-side search — refetch page 1 shortly after the user stops typing.
  useEffect(() => {
    const timeout = window.setTimeout(() => load(1, search), 350);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filtersActive]);

  async function load(nextPage: number, nextSearch: string) {
    setIsLoading(true);
    setError(null);
    try {
      if (filtersActive) {
        const first = await domainService.list({ page: 1, limit: FETCH_ALL_LIMIT, search: nextSearch });
        const rest = await Promise.all(
          Array.from({ length: Math.min(first.totalPages, FETCH_ALL_MAX_PAGES) - 1 }, (_, index) =>
            domainService.list({ page: index + 2, limit: FETCH_ALL_LIMIT, search: nextSearch }),
          ),
        );
        setAllDomains([first, ...rest].flatMap((result) => result.items));
        setStatusCounts(first.statusCounts);
        setTotal(first.total);
        setPage(nextPage);
        return;
      }
      const domainsPage = await domainService.list({ page: nextPage, limit: PAGE_SIZE, search: nextSearch });
      setDomains(domainsPage.items);
      setStatusCounts(domainsPage.statusCounts);
      setPage(domainsPage.page);
      setTotalPages(domainsPage.totalPages);
      setTotal(domainsPage.total);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load domains");
      setDomains([]);
      setAllDomains([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshAll() {
    setRefreshingAll(true);
    try {
      await domainService.refreshAll();
      await load(page, search);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to refresh domain statuses");
    } finally {
      setRefreshingAll(false);
    }
  }

  async function refreshOne(domain: string) {
    setRefreshingDomain(domain);
    try {
      const updated = await domainService.refreshOne(domain);
      setDomains((current) => mergeDomains(current, [updated]));
      setAllDomains((current) => mergeDomains(current, [updated]));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : `Unable to refresh ${domain}`);
    } finally {
      setRefreshingDomain(null);
    }
  }

  function requestDelete(domain: Domain) {
    setDeleteTarget(domain);
    deleteModal.open();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    try {
      setIsDeleting(true);
      await domainService.remove(deleteTarget.id);
      deleteModal.close();
      setDeleteTarget(null);
      await load(page, search);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete domain");
    } finally {
      setIsDeleting(false);
    }
  }

  const selectedDomain = [...domains, ...allDomains].find((domain) => domain.id === analyticsDomainId) ?? null;

  // Auto-recheck whenever the drawer opens on a domain, but only if its data is stale —
  // avoids re-hitting SES/CloudWatch every time the same domain's drawer is reopened.
  useEffect(() => {
    if (!selectedDomain) return;
    const lastChecked = selectedDomain.reputationCheckedAt ?? selectedDomain.lastCheckedAt;
    const isStale = !lastChecked || Date.now() - new Date(lastChecked).getTime() > 30_000;
    if (isStale) refreshOne(selectedDomain.domain);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDomain?.id]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Domains</h2>
        <div className="flex items-center gap-2">
          <Button isDisabled={refreshingAll || isLoading} onPress={refreshAll} size="sm" variant="secondary">
            {refreshingAll ? <Spinner color="current" size="sm" /> : <RefreshCw className="size-4" />}
            Refresh statuses
          </Button>
          {isSuperAdmin ? (
            <>
              <SyncMaildosoButton onDone={() => load(1, search)} />
              <Button onPress={() => setShowAddInfo((v) => !v)} size="sm">
                <Plus className="size-4" />
                Add domains
              </Button>
            </>
          ) : (
            <Button onPress={() => navigate("/mailer/orders?request=domains")} size="sm">
              <Plus className="size-4" />
              Request domains
            </Button>
          )}
        </div>
      </div>

      {isSuperAdmin && showAddInfo ? (
        <div className="rounded-2xl border border-border/70 bg-surface px-4 py-3 text-sm text-foreground">
          <p className="font-semibold">How domains are added</p>
          <p className="mt-1 text-[13px] text-muted">
            Buy the domains (and their mailboxes) in Maildoso, then press <span className="font-medium text-foreground">Sync from Maildoso</span>.
            New domains and mailboxes are pulled into the platform pool (Koval Group). Assign them to a client from Admin → Domains.
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
          <span>{error}</span>
          <Button onPress={() => load(page, search)} size="sm" variant="secondary">Retry</Button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard icon={Globe} label="Total Domains" value={statusCounts.total} isLoading={isLoading} />
        <SummaryCard icon={CheckCircle2} label="Verified" value={statusCounts.verified} isLoading={isLoading} tone="success" />
        <SummaryCard icon={RefreshCw} label="Pending Verification" value={statusCounts.pending} isLoading={isLoading} tone="warning" />
        <SummaryCard icon={AlertTriangle} label="Failed" value={statusCounts.failed} isLoading={isLoading} tone={statusCounts.failed > 0 ? "danger" : undefined} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
          <div className="relative w-full max-w-[380px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              className="h-9 w-full rounded-xl border border-border bg-surface-secondary pl-9 pr-3 text-[13px] outline-none transition focus:border-accent"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search domains"
              value={search}
            />
          </div>
          <p className="flex items-center gap-1.5 text-[12px] text-muted">
            {isLoading ? (
              <>
                <Spinner color="accent" size="sm" />
                Loading…
              </>
            ) : (
              `Showing ${shownDomains.length} of ${shownTotal} domains · Page ${page} of ${shownTotalPages}`
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-4 py-3">
          <FilterMenu icon={ListFilter} label="Status" options={STATUS_FILTER_OPTIONS} value={filters.status} onChange={(value) => setFilter("status", value as Filters["status"])} />
          <FilterMenu label="Reputation" options={REPUTATION_FILTER_OPTIONS} value={filters.reputation} onChange={(value) => setFilter("reputation", value)} />
          <FilterMenu label="DNS" options={DNS_FILTER_OPTIONS} value={filters.dns} onChange={(value) => setFilter("dns", value as DnsFilter)} />
          <FilterMenu label="Mailboxes" options={MAILBOX_FILTER_OPTIONS} value={filters.mailboxes} onChange={(value) => setFilter("mailboxes", value as Filters["mailboxes"])} />
          <span aria-hidden className="mx-1 hidden h-5 w-px bg-border sm:block" />
          <FilterMenu icon={ArrowUpDown} label="Sort" options={SORT_OPTIONS} value={filters.sort} onChange={(value) => setFilter("sort", value as SortKey)} />
          {activeFilterCount > 0 || search ? (
            <button
              className="inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-[12px] font-medium text-muted outline-none transition hover:bg-surface-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent"
              type="button"
              onClick={() => {
                setFilters(noFilters);
                setSearch("");
                setPage(1);
              }}
            >
              <X className="size-3.5" />
              Clear{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </button>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] text-left text-sm">
            <thead className="border-b border-border/70 text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Domain</th>
                <th className="px-2 py-3 font-medium">Status</th>
                <th className="px-2 py-3 font-medium">Verification</th>
                <th className="px-2 py-3 font-medium">Mailboxes</th>
                <th className="px-2 py-3 font-medium">Reputation</th>
                <th className="px-2 py-3 font-medium">Last checked</th>
                <th className="px-2 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => <SkeletonRow columns={7} key={index} />)
              ) : shownDomains.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-sm font-medium text-muted" colSpan={7}>
                    {total === 0 && !search && !filtersActive ? "No domains yet. Use “Request domains” and our team will add them to your workspace." : "No domains match your search or filters."}
                  </td>
                </tr>
              ) : (
                shownDomains.map((domain) => (
                  <tr className="border-b border-border/60 last:border-0" key={domain.id}>
                    <td className="px-4 py-4 align-top">
                      <p className="max-w-[240px] truncate font-semibold text-foreground">{domain.domain}</p>
                      <p className="text-[11px] text-muted">{domain.provider} · {domain.awsRegion}</p>
                    </td>
                    <td className="px-2 py-4 align-top">
                      <DomainStatusChip status={domain.status} />
                    </td>
                    <td className="px-2 py-4 align-top">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <VerifiedBadge label="SPF" status={domain.spfStatus} />
                        <VerifiedBadge label="DKIM" status={domain.dkimStatus} />
                        <VerifiedBadge label="DMARC" status={domain.dmarcStatus} />
                        <VerifiedBadge label="MX" status={domain.mxStatus} />
                      </div>
                    </td>
                    <td className="px-2 py-4 align-top">
                      <div className="flex items-center gap-3 text-[12px] text-foreground">
                        <MetricIcon icon={Users} label={`${domain.mailboxCount ?? 0} mailbox${(domain.mailboxCount ?? 0) === 1 ? "" : "es"} on this domain`} value={`${domain.mailboxCount ?? 0} mailbox${(domain.mailboxCount ?? 0) === 1 ? "" : "es"}`} />
                        <MetricIcon icon={Hash} label={`${domain.dkimTokens.length} DKIM CNAME records`} value={`${domain.dkimTokens.length} DKIM`} />
                      </div>
                    </td>
                    <td className="px-2 py-4 align-top">
                      <ReputationChip domain={domain} />
                    </td>
                    <td className="px-2 py-4 align-top text-[12px] text-muted">
                      {domain.lastCheckedAt ? new Date(domain.lastCheckedAt).toLocaleString() : "Not checked yet"}
                    </td>
                    <td className="px-2 py-4 align-top">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip delay={200}>
                          <Tooltip.Trigger>
                            <button
                              aria-label="Recheck DNS/DKIM status"
                              className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-surface-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                              disabled={refreshingDomain === domain.domain}
                              onClick={() => refreshOne(domain.domain)}
                              type="button"
                            >
                              {refreshingDomain === domain.domain ? <Spinner color="current" size="sm" /> : <RefreshCw className="size-4" />}
                            </button>
                          </Tooltip.Trigger>
                          <Tooltip.Content>Recheck status</Tooltip.Content>
                        </Tooltip>

                        <Tooltip delay={200}>
                          <Tooltip.Trigger>
                            <button
                              aria-label="View analytics"
                              className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-surface-secondary hover:text-foreground"
                              onClick={() => setAnalyticsDomainId(domain.id)}
                              type="button"
                            >
                              <BarChart2 className="size-4" />
                            </button>
                          </Tooltip.Trigger>
                          <Tooltip.Content>View analytics</Tooltip.Content>
                        </Tooltip>

                        {isSuperAdmin ? (
                          <Tooltip delay={200}>
                            <Tooltip.Trigger>
                              <button
                                aria-label="Delete domain"
                                className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-danger/10 hover:text-danger"
                                onClick={() => requestDelete(domain)}
                                type="button"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </Tooltip.Trigger>
                            <Tooltip.Content>Delete domain</Tooltip.Content>
                          </Tooltip>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 px-4 py-3 text-[12px] text-muted">
          <span>Page {page} of {shownTotalPages}</span>
          <div className="flex items-center gap-2">
            <Button isDisabled={isLoading || page <= 1} onPress={() => (filtersActive ? setPage(page - 1) : load(page - 1, search))} size="sm" variant="secondary">
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <Button isDisabled={isLoading || page >= shownTotalPages} onPress={() => (filtersActive ? setPage(page + 1) : load(page + 1, search))} size="sm" variant="secondary">
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <DomainAnalyticsDrawer
        accountStatus={accountStatus}
        domain={selectedDomain}
        isRefreshing={refreshingDomain === selectedDomain?.domain}
        onClose={() => setAnalyticsDomainId(null)}
        onRefresh={refreshOne}
      />


      <DeleteDomainModal
        domain={deleteTarget}
        isDeleting={isDeleting}
        onConfirm={confirmDelete}
        state={deleteModal}
      />
    </div>
  );
}

function mergeDomains(current: Domain[], updates: Domain[]) {
  const byDomain = new Map(current.map((domain) => [domain.domain, domain]));
  for (const update of updates) {
    if ("domain" in update && update.domain) byDomain.set(update.domain, { ...byDomain.get(update.domain), ...update } as Domain);
  }
  return Array.from(byDomain.values());
}

interface FilterOption {
  value: string;
  label: string;
}

const ANY_KEY = "__any";

/** Pill-style dropdown: shows "Label · current choice", tinted with the accent while a filter is set. */
function FilterMenu({
  icon: Icon,
  label,
  value,
  options,
  onChange,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}) {
  const current = options.find((option) => option.value === value) ?? options[0];
  const isSet = value !== "" && value !== "default";

  return (
    <Dropdown>
      <Dropdown.Trigger
        aria-label={`${label}: ${current.label}`}
        className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-accent ${
          isSet
            ? "border-accent/40 bg-accent/10 text-accent"
            : "border-border bg-surface text-foreground hover:bg-surface-secondary"
        }`}
      >
        {Icon ? <Icon className="size-3.5 shrink-0" /> : null}
        <span className={isSet ? "text-accent/80" : "text-muted"}>{label}</span>
        {isSet ? <span className="max-w-[160px] truncate font-semibold">{current.label}</span> : null}
        <ChevronDown className="size-3.5 shrink-0 opacity-70" />
      </Dropdown.Trigger>
      <Dropdown.Popover className="min-w-[200px]" placement="bottom start">
        <Dropdown.Menu aria-label={label} onAction={(key) => onChange(key === ANY_KEY ? "" : String(key))}>
          {options.map((option) => {
            const selected = option.value === current.value;
            return (
              <Dropdown.Item id={option.value === "" ? ANY_KEY : option.value} key={option.value || ANY_KEY}>
                <span className={`flex-1 text-[13px] ${selected ? "font-semibold text-foreground" : "text-foreground"}`}>{option.label}</span>
                {selected ? <Check className="size-4 shrink-0 text-accent" /> : null}
              </Dropdown.Item>
            );
          })}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
  isLoading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone?: "danger" | "warning" | "success";
  isLoading: boolean;
}) {
  const toneClass =
    tone === "danger" ? "bg-danger/10 text-danger" : tone === "warning" ? "bg-warning/10 text-warning" : tone === "success" ? "bg-success/10 text-success" : "bg-default-100 text-foreground";

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-surface p-3">
      <span className={`grid size-9 shrink-0 place-items-center rounded-full ${toneClass}`}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11px] text-muted">{label}</p>
        {isLoading ? (
          <div className="mt-1">
            <Spinner color="accent" size="sm" />
          </div>
        ) : (
          <p className="text-lg font-semibold leading-none text-foreground">{value}</p>
        )}
      </div>
    </div>
  );
}

function MetricIcon({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Tooltip delay={200}>
      <Tooltip.Trigger className="flex items-center gap-1 text-muted">
        <Icon className="size-3.5" />
        <span className="font-medium text-foreground">{value}</span>
      </Tooltip.Trigger>
      <Tooltip.Content>{label}</Tooltip.Content>
    </Tooltip>
  );
}

function ReputationChip({ domain }: { domain: Domain }) {
  const color = domain.reputation === "Healthy" ? "success" : domain.reputation === "Watch" ? "warning" : domain.reputation === "At Risk" ? "danger" : "default";
  const hasData = (domain.emailsSent14d ?? 0) > 0;
  const label = hasData
    ? `${domain.emailsSent14d} sent (14d) · ${((domain.bounceRate ?? 0) * 100).toFixed(1)}% bounce · ${((domain.complaintRate ?? 0) * 100).toFixed(2)}% complaint`
    : "No sends in the last 14 days";

  return (
    <Tooltip delay={200}>
      <Tooltip.Trigger>
        <Chip color={color} size="sm" variant="soft">{domain.reputation}</Chip>
      </Tooltip.Trigger>
      <Tooltip.Content>{label}</Tooltip.Content>
    </Tooltip>
  );
}

function DomainStatusChip({ status }: { status: Domain["status"] }) {
  const color = status === "Verified" ? "success" : status === "Failed" ? "danger" : "warning";
  return <Chip color={color} size="sm" variant="soft">{status}</Chip>;
}

function VerifiedBadge({ label, status }: { label: string; status: DnsCheckStatus }) {
  const color = status === "Success" ? "success" : status === "Failed" ? "danger" : status === "Pending" ? "warning" : "default";
  return (
    <Chip color={color} size="sm" variant="soft">
      {label}
    </Chip>
  );
}

function DeleteDomainModal({
  domain,
  isDeleting,
  onConfirm,
  state,
}: {
  domain: Domain | null;
  isDeleting: boolean;
  onConfirm: () => void;
  state: ReturnType<typeof useOverlayState>;
}) {
  const mailboxCount = domain?.mailboxCount ?? 0;

  return (
    <Modal state={state}>
      <Modal.Backdrop className="bg-foreground/30 backdrop-blur-[2px]">
        <Modal.Container className="w-[min(440px,calc(100vw-32px))]" placement="center" scroll="inside" size="md">
          <Modal.Dialog className="overflow-hidden rounded-[20px] border border-border/70 bg-surface shadow-[0_8px_30px_color-mix(in_oklch,var(--foreground)_18%,transparent)]">
            <Modal.Header className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4">
              <div>
                <Modal.Heading className="text-base font-semibold leading-6 text-foreground">Delete domain?</Modal.Heading>
                <p className="mt-1 text-[13px] leading-5 text-muted">This can't be undone from here.</p>
              </div>
              <Modal.CloseTrigger className="grid size-8 shrink-0 place-items-center rounded-full bg-default-100 text-foreground transition hover:bg-default-200" aria-label="Close">
                <X className="size-4" />
              </Modal.CloseTrigger>
            </Modal.Header>

            <Modal.Body className="px-5 py-5">
              <p className="text-sm leading-6 text-foreground">
                Delete <span className="font-semibold">{domain?.domain || "this domain"}</span>?
              </p>
              {mailboxCount > 0 ? (
                <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2.5">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                  <p className="text-[13px] leading-5 text-foreground">
                    <span className="font-semibold">{mailboxCount} mailbox{mailboxCount === 1 ? "" : "es"}</span> on this domain will also be deleted.
                  </p>
                </div>
              ) : null}
            </Modal.Body>

            <Modal.Footer className="flex flex-wrap justify-end gap-2 border-t border-border/70 px-5 py-4">
              <Button isDisabled={isDeleting} size="sm" variant="secondary" onClick={state.close}>Cancel</Button>
              <Button isDisabled={isDeleting} size="sm" variant="danger" onClick={onConfirm}>
                <Trash2 className="size-4" />
                {isDeleting ? "Deleting..." : "Delete Domain"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
