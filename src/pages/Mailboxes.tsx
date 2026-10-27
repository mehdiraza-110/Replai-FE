import { useEffect, useMemo, useState } from "react";
import { Button, Chip, Modal, Spinner, Tooltip, useOverlayState } from "@heroui/react";
import {
  AlertTriangle,
  ArrowUpDown,
  BarChart2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CornerUpLeft,
  Gem,
  Inbox,
  ListFilter,
  Megaphone,
  PauseCircle,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Thermometer,
  Trash2,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { MailboxAnalyticsDrawer } from "../components/mailer/MailboxAnalyticsDrawer";
import { MailboxInboxDrawer } from "../components/mailer/MailboxInboxDrawer";
import { FilterMenu } from "../components/mailer/FilterMenu";
import { SkeletonRow } from "../components/ui/Skeleton";
import { mailboxService } from "../services/api";
import type { Mailbox, MailboxReputationStatus, MailboxStatus, MailboxStatusCounts, MailboxWarmupStage } from "../types";

const PAGE_SIZE = 10;
const FETCH_ALL_LIMIT = 100;
const FETCH_ALL_MAX_PAGES = 50;
const emptyCounts: MailboxStatusCounts = { total: 0, active: 0, paused: 0, error: 0 };

type SortKey = "default" | "email-asc" | "email-desc" | "newest" | "last-sent" | "sent-today" | "bounce" | "deliverability";

interface Filters {
  status: "" | MailboxStatus;
  warmup: "" | MailboxWarmupStage;
  reputation: "" | MailboxReputationStatus;
  campaign: "" | "in" | "none";
  sort: SortKey;
}

const noFilters: Filters = { status: "", warmup: "", reputation: "", campaign: "", sort: "default" };

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "Active", label: "Active" },
  { value: "Paused", label: "Paused" },
  { value: "Error", label: "Error" },
];
const WARMUP_FILTER_OPTIONS = [
  { value: "", label: "All stages" },
  { value: "New", label: "New" },
  { value: "Ramping", label: "Ramping" },
  { value: "Steady State", label: "Steady State" },
  { value: "Paused", label: "Paused" },
];
const REPUTATION_FILTER_OPTIONS = [
  { value: "", label: "All reputations" },
  { value: "Healthy", label: "Healthy" },
  { value: "Watch", label: "Watch" },
  { value: "At Risk", label: "At Risk" },
];
const CAMPAIGN_FILTER_OPTIONS = [
  { value: "", label: "Any campaign state" },
  { value: "in", label: "In a campaign" },
  { value: "none", label: "Not in a campaign" },
];
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "default", label: "Default order" },
  { value: "email-asc", label: "Email A–Z" },
  { value: "email-desc", label: "Email Z–A" },
  { value: "newest", label: "Newest first" },
  { value: "last-sent", label: "Most recently sent" },
  { value: "sent-today", label: "Most sent today" },
  { value: "bounce", label: "Highest bounce rate" },
  { value: "deliverability", label: "Lowest deliverability" },
];

function matchesFilters(mailbox: Mailbox, filters: Filters) {
  if (filters.status && mailbox.status !== filters.status) return false;
  if (filters.warmup && mailbox.warmupStage !== filters.warmup) return false;
  if (filters.reputation && mailbox.reputationStatus !== filters.reputation) return false;
  if (filters.campaign === "in" && mailbox.activeCampaigns.length === 0) return false;
  if (filters.campaign === "none" && mailbox.activeCampaigns.length > 0) return false;
  return true;
}

function sortMailboxes(mailboxes: Mailbox[], sort: SortKey) {
  const time = (value: string | null) => (value ? new Date(value).getTime() : 0);
  const sorted = [...mailboxes];
  switch (sort) {
    case "email-asc": return sorted.sort((a, b) => a.email.localeCompare(b.email));
    case "email-desc": return sorted.sort((a, b) => b.email.localeCompare(a.email));
    case "newest": return sorted.sort((a, b) => time(b.createdAt) - time(a.createdAt));
    case "last-sent": return sorted.sort((a, b) => time(b.lastSentAt) - time(a.lastSentAt));
    case "sent-today": return sorted.sort((a, b) => b.sentToday + b.campaignSentToday - (a.sentToday + a.campaignSentToday));
    case "bounce": return sorted.sort((a, b) => (b.bounceRate3d ?? -1) - (a.bounceRate3d ?? -1));
    // Mailboxes with no deliverability data yet sink to the bottom rather than reading as 0%.
    case "deliverability": return sorted.sort((a, b) => (a.warmupDeliverability7d ?? 101) - (b.warmupDeliverability7d ?? 101));
    default: return sorted;
  }
}

export function Mailboxes() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [statusCounts, setStatusCounts] = useState<MailboxStatusCounts>(emptyCounts);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(noFilters);
  // Filters and sorting are applied here, so while one is active the full list is loaded instead of a server page.
  const [allMailboxes, setAllMailboxes] = useState<Mailbox[]>([]);
  const [analyticsMailboxId, setAnalyticsMailboxId] = useState<number | null>(null);
  const [drawerTab, setDrawerTab] = useState<"analytics" | "settings">("analytics");
  const [inboxMailboxId, setInboxMailboxId] = useState<number | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [refreshingId, setRefreshingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Mailbox | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteModal = useOverlayState({});

  const filtersActive = Object.values(filters).some((value) => value !== "" && value !== "default");
  const filteredMailboxes = useMemo(
    () => (filtersActive ? sortMailboxes(allMailboxes.filter((mailbox) => matchesFilters(mailbox, filters)), filters.sort) : []),
    [allMailboxes, filters, filtersActive],
  );
  const shownMailboxes = filtersActive ? filteredMailboxes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : mailboxes;
  const shownTotal = filtersActive ? filteredMailboxes.length : total;
  const shownTotalPages = filtersActive ? Math.max(1, Math.ceil(filteredMailboxes.length / PAGE_SIZE)) : totalPages;
  const activeFilterCount = [filters.status, filters.warmup, filters.reputation, filters.campaign].filter(Boolean).length + (filters.sort !== "default" ? 1 : 0);

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  useEffect(() => {
    load(1, search);
  }, []);

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
        const first = await mailboxService.list({ page: 1, limit: FETCH_ALL_LIMIT, search: nextSearch });
        const rest = await Promise.all(
          Array.from({ length: Math.min(first.totalPages, FETCH_ALL_MAX_PAGES) - 1 }, (_, index) =>
            mailboxService.list({ page: index + 2, limit: FETCH_ALL_LIMIT, search: nextSearch }),
          ),
        );
        setAllMailboxes([first, ...rest].flatMap((result) => result.items));
        setStatusCounts(first.statusCounts);
        setTotal(first.total);
        setPage(nextPage);
        return;
      }
      const mailboxPage = await mailboxService.list({ page: nextPage, limit: PAGE_SIZE, search: nextSearch });
      setMailboxes(mailboxPage.items);
      setStatusCounts(mailboxPage.statusCounts);
      setPage(mailboxPage.page);
      setTotalPages(mailboxPage.totalPages);
      setTotal(mailboxPage.total);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load mailboxes");
      setMailboxes([]);
      setAllMailboxes([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshAll() {
    setRefreshingAll(true);
    try {
      await mailboxService.refreshAll();
      await load(page, search);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to refresh mailbox statuses");
    } finally {
      setRefreshingAll(false);
    }
  }

  async function refreshOne(id: number) {
    setRefreshingId(id);
    try {
      const updated = await mailboxService.refreshOne(id);
      setMailboxes((current) => current.map((mailbox) => (mailbox.id === id ? updated : mailbox)));
      setAllMailboxes((current) => current.map((mailbox) => (mailbox.id === id ? updated : mailbox)));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to refresh mailbox status");
    } finally {
      setRefreshingId(null);
    }
  }

  function requestDelete(mailbox: Mailbox) {
    setDeleteTarget(mailbox);
    deleteModal.open();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    try {
      setIsDeleting(true);
      await mailboxService.remove(deleteTarget.id);
      deleteModal.close();
      setDeleteTarget(null);
      await load(page, search);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete mailbox");
    } finally {
      setIsDeleting(false);
    }
  }

  // Prev/next in the drawer walks whatever the table is currently showing.
  const selectedIndex = shownMailboxes.findIndex((mailbox) => mailbox.id === analyticsMailboxId);
  const selectedMailbox = selectedIndex >= 0 ? shownMailboxes[selectedIndex] : null;
  const inboxMailbox = shownMailboxes.find((mailbox) => mailbox.id === inboxMailboxId) ?? null;

  function navigateAnalytics(direction: "prev" | "next") {
    if (shownMailboxes.length === 0 || selectedIndex < 0) return;
    const nextIndex = direction === "prev"
      ? (selectedIndex - 1 + shownMailboxes.length) % shownMailboxes.length
      : (selectedIndex + 1) % shownMailboxes.length;
    setAnalyticsMailboxId(shownMailboxes[nextIndex].id);
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Mailboxes</h2>
        <div className="flex items-center gap-2">
          <Button isDisabled={refreshingAll || isLoading} onPress={refreshAll} size="sm" variant="secondary">
            {refreshingAll ? <Spinner color="current" size="sm" /> : <RefreshCw className="size-4" />}
            Refresh statuses
          </Button>
          {isSuperAdmin ? (
            <Button onPress={() => navigate("/mailer/mailboxes/new")} size="sm">
              <Plus className="size-4" />
              Add Mailboxes
            </Button>
          ) : (
            <Button onPress={() => navigate("/mailer/orders?request=mailboxes")} size="sm">
              <Plus className="size-4" />
              Request mailboxes
            </Button>
          )}
        </div>
      </div>

      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
          <span>{error}</span>
          <Button onPress={() => load(page, search)} size="sm" variant="secondary">Retry</Button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard icon={Inbox} label="Total Mailboxes" value={statusCounts.total} isLoading={isLoading} />
        <SummaryCard icon={CheckCircle2} label="Active" value={statusCounts.active} isLoading={isLoading} tone="success" />
        <SummaryCard icon={PauseCircle} label="Paused" value={statusCounts.paused} isLoading={isLoading} tone="warning" />
        <SummaryCard icon={AlertTriangle} label="Error" value={statusCounts.error} isLoading={isLoading} tone={statusCounts.error > 0 ? "danger" : undefined} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
          <div className="relative w-full max-w-[380px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              className="h-9 w-full rounded-xl border border-border bg-surface-secondary pl-9 pr-3 text-[13px] outline-none transition focus:border-accent"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search mailboxes"
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
              `Showing ${shownMailboxes.length} of ${shownTotal} mailboxes · Page ${page} of ${shownTotalPages}`
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-4 py-3">
          <FilterMenu icon={ListFilter} label="Status" options={STATUS_FILTER_OPTIONS} value={filters.status} onChange={(value) => setFilter("status", value as Filters["status"])} />
          <FilterMenu label="Warmup" options={WARMUP_FILTER_OPTIONS} value={filters.warmup} onChange={(value) => setFilter("warmup", value as Filters["warmup"])} />
          <FilterMenu label="Reputation" options={REPUTATION_FILTER_OPTIONS} value={filters.reputation} onChange={(value) => setFilter("reputation", value as Filters["reputation"])} />
          <FilterMenu label="Campaign" options={CAMPAIGN_FILTER_OPTIONS} value={filters.campaign} onChange={(value) => setFilter("campaign", value as Filters["campaign"])} />
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
                <th className="px-4 py-3 font-medium">Mailbox</th>
                <th className="px-2 py-3 font-medium">Status</th>
                <th className="px-2 py-3 font-medium">Warmup</th>
                <th className="px-2 py-3 font-medium"><Send className="size-3.5" /></th>
                <th className="px-2 py-3 font-medium"><Thermometer className="size-3.5" /></th>
                <th className="px-2 py-3 font-medium"><Gem className="size-3.5" /></th>
                <th className="px-2 py-3 font-medium"><CornerUpLeft className="size-3.5" /></th>
                <th className="px-2 py-3 font-medium"><AlertTriangle className="size-3.5" /></th>
                <th className="px-2 py-3 font-medium"><Megaphone className="size-3.5" /></th>
                <th className="px-2 py-3 font-medium">Reputation</th>
                <th className="px-2 py-3 font-medium">Last sent</th>
                <th className="px-2 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => <SkeletonRow columns={12} key={index} />)
              ) : shownMailboxes.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-sm font-medium text-muted" colSpan={12}>
                    {total === 0 && !search && !filtersActive ? (isSuperAdmin ? "No mailboxes yet. Click “Add Mailboxes” to create sender identities under a verified domain." : "No mailboxes yet. Click “Request mailboxes” to order some.") : "No mailboxes match your search or filters."}
                  </td>
                </tr>
              ) : (
                shownMailboxes.map((mailbox) => (
                  <tr className="border-b border-border/60 last:border-0" key={mailbox.id}>
                    <td className="px-4 py-4 align-top">
                      <p className="max-w-[240px] truncate font-semibold text-foreground">{mailbox.email}</p>
                      {mailbox.displayName ? <p className="text-[11px] text-muted">{mailbox.displayName}</p> : null}
                    </td>
                    <td className="px-2 py-4 align-top">
                      <MailboxStatusChip status={mailbox.status} />
                    </td>
                    <td className="px-2 py-4 align-top">
                      <Chip color={mailbox.warmupStage === "Steady State" ? "success" : mailbox.warmupStage === "Paused" ? "danger" : "default"} size="sm" variant="soft">
                        {mailbox.warmupStage}
                      </Chip>
                    </td>
                    <td className="px-2 py-4 align-top">
                      <MetricIcon
                        icon={Send}
                        label="Campaign emails sent today — always 0 until a campaign-sending engine is running"
                        value={String(mailbox.campaignSentToday)}
                      />
                    </td>
                    <td className="px-2 py-4 align-top">
                      <MetricIcon
                        icon={Thermometer}
                        label="Warmup emails sent today, out of today's ramp limit — always 0 until a warmup-sending engine is running"
                        value={`${mailbox.sentToday}/${mailbox.dailyLimit}`}
                      />
                    </td>
                    <td className="px-2 py-4 align-top">
                      <MetricIcon
                        icon={Gem}
                        label={mailbox.warmupDeliverability7d == null ? "Warmup email deliverability, past 7 days — N/A until warmup sends exist" : `${mailbox.warmupDeliverability7d}% warmup email deliverability, past 7 days`}
                        value={mailbox.warmupDeliverability7d == null ? "N/A" : `${mailbox.warmupDeliverability7d}%`}
                      />
                    </td>
                    <td className="px-2 py-4 align-top">
                      <MetricIcon
                        icon={CornerUpLeft}
                        label={mailbox.replyRate7d == null ? "Reply rate (including out-of-office and automatic replies), past 7 days — N/A until this mailbox has sent 10+ emails" : `${mailbox.replyRate7d}% reply rate (including OOO), past 7 days`}
                        value={mailbox.replyRate7d == null ? "N/A" : `${mailbox.replyRate7d}%`}
                      />
                    </td>
                    <td className="px-2 py-4 align-top">
                      <MetricIcon
                        icon={AlertTriangle}
                        label={mailbox.bounceRate3d == null ? "Recipient bounce rate, past 3 days — N/A, needs 10+ emails sent" : `${mailbox.bounceRate3d}% recipient bounce rate, past 3 days`}
                        value={mailbox.bounceRate3d == null ? "N/A" : `${mailbox.bounceRate3d}%`}
                      />
                    </td>
                    <td className="px-2 py-4 align-top">
                      <MetricIcon
                        icon={Megaphone}
                        label={mailbox.activeCampaigns.length === 0 ? "Not assigned to any active campaign" : `Added to: ${mailbox.activeCampaigns.join(", ")}`}
                        value={String(mailbox.activeCampaigns.length)}
                      />
                    </td>
                    <td className="px-2 py-4 align-top">
                      <Chip color={mailbox.reputationStatus === "Healthy" ? "success" : mailbox.reputationStatus === "Watch" ? "warning" : "danger"} size="sm" variant="soft">
                        {mailbox.reputationStatus}
                      </Chip>
                    </td>
                    <td className="px-2 py-4 align-top text-[12px] text-muted">
                      {mailbox.lastSentAt ? new Date(mailbox.lastSentAt).toLocaleString() : "Never"}
                    </td>
                    <td className="px-2 py-4 align-top">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip delay={200}>
                          <Tooltip.Trigger>
                            <button
                              aria-label="Recheck mailbox status"
                              className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-surface-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                              disabled={refreshingId === mailbox.id}
                              onClick={() => refreshOne(mailbox.id)}
                              type="button"
                            >
                              {refreshingId === mailbox.id ? <Spinner color="current" size="sm" /> : <RefreshCw className="size-4" />}
                            </button>
                          </Tooltip.Trigger>
                          <Tooltip.Content>Recheck status</Tooltip.Content>
                        </Tooltip>

                        <Tooltip delay={200}>
                          <Tooltip.Trigger>
                            <button
                              aria-label="Open inbox"
                              className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-surface-secondary hover:text-foreground"
                              onClick={() => setInboxMailboxId(mailbox.id)}
                              type="button"
                            >
                              <Inbox className="size-4" />
                            </button>
                          </Tooltip.Trigger>
                          <Tooltip.Content>Open inbox</Tooltip.Content>
                        </Tooltip>

                        <Tooltip delay={200}>
                          <Tooltip.Trigger>
                            <button
                              aria-label="View analytics"
                              className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-surface-secondary hover:text-foreground"
                              onClick={() => {
                                setDrawerTab("analytics");
                                setAnalyticsMailboxId(mailbox.id);
                              }}
                              type="button"
                            >
                              <BarChart2 className="size-4" />
                            </button>
                          </Tooltip.Trigger>
                          <Tooltip.Content>View analytics</Tooltip.Content>
                        </Tooltip>

                        <Tooltip delay={200}>
                          <Tooltip.Trigger>
                            <button
                              aria-label="Warmup settings"
                              className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-surface-secondary hover:text-foreground"
                              onClick={() => {
                                setDrawerTab("settings");
                                setAnalyticsMailboxId(mailbox.id);
                              }}
                              type="button"
                            >
                              <Settings className="size-4" />
                            </button>
                          </Tooltip.Trigger>
                          <Tooltip.Content>Warmup settings</Tooltip.Content>
                        </Tooltip>

                        {isSuperAdmin ? (
                          <Tooltip delay={200}>
                            <Tooltip.Trigger>
                              <button
                                aria-label="Delete mailbox"
                                className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-danger/10 hover:text-danger"
                                onClick={() => requestDelete(mailbox)}
                                type="button"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </Tooltip.Trigger>
                            <Tooltip.Content>Delete mailbox</Tooltip.Content>
                          </Tooltip>
                        ) : (
                          <Tooltip delay={200}>
                            <Tooltip.Trigger>
                              <span aria-label="Delete mailbox (unavailable)" className="grid size-8 cursor-not-allowed place-items-center rounded-full text-muted/40">
                                <Trash2 className="size-4" />
                              </span>
                            </Tooltip.Trigger>
                            <Tooltip.Content>Contact support to remove a mailbox</Tooltip.Content>
                          </Tooltip>
                        )}
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

      <MailboxAnalyticsDrawer
        initialTab={drawerTab}
        isRefreshing={refreshingId === selectedMailbox?.id}
        mailbox={selectedMailbox}
        onClose={() => setAnalyticsMailboxId(null)}
        onNavigate={navigateAnalytics}
        onRefresh={refreshOne}
      />

      <MailboxInboxDrawer mailbox={inboxMailbox} onClose={() => setInboxMailboxId(null)} />

      <DeleteMailboxModal
        isDeleting={isDeleting}
        mailbox={deleteTarget}
        onConfirm={confirmDelete}
        state={deleteModal}
      />
    </div>
  );
}

function DeleteMailboxModal({
  mailbox,
  isDeleting,
  onConfirm,
  state,
}: {
  mailbox: Mailbox | null;
  isDeleting: boolean;
  onConfirm: () => void;
  state: ReturnType<typeof useOverlayState>;
}) {
  return (
    <Modal state={state}>
      <Modal.Backdrop className="bg-foreground/30 backdrop-blur-[2px]">
        <Modal.Container className="w-[min(440px,calc(100vw-32px))]" placement="center" scroll="inside" size="md">
          <Modal.Dialog className="overflow-hidden rounded-[20px] border border-border/70 bg-surface shadow-[0_8px_30px_color-mix(in_oklch,var(--foreground)_18%,transparent)]">
            <Modal.Header className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4">
              <div>
                <Modal.Heading className="text-base font-semibold leading-6 text-foreground">Delete mailbox?</Modal.Heading>
                <p className="mt-1 text-[13px] leading-5 text-muted">This can't be undone from here.</p>
              </div>
              <Modal.CloseTrigger className="grid size-8 shrink-0 place-items-center rounded-full bg-default-100 text-foreground transition hover:bg-default-200" aria-label="Close">
                <X className="size-4" />
              </Modal.CloseTrigger>
            </Modal.Header>

            <Modal.Body className="px-5 py-5">
              <p className="text-sm leading-6 text-foreground">
                Delete <span className="font-semibold">{mailbox?.email || "this mailbox"}</span>? It will stop sending immediately and no longer count toward this domain's mailboxes.
              </p>
            </Modal.Body>

            <Modal.Footer className="flex flex-wrap justify-end gap-2 border-t border-border/70 px-5 py-4">
              <Button isDisabled={isDeleting} size="sm" variant="secondary" onClick={state.close}>Cancel</Button>
              <Button isDisabled={isDeleting} size="sm" variant="danger" onClick={onConfirm}>
                <Trash2 className="size-4" />
                {isDeleting ? "Deleting..." : "Delete Mailbox"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
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

function MailboxStatusChip({ status }: { status: Mailbox["status"] }) {
  const color = status === "Active" ? "success" : status === "Error" ? "danger" : "warning";
  const Icon = status === "Active" ? CheckCircle2 : status === "Error" ? AlertTriangle : Clock;
  return (
    <Chip color={color} size="sm" variant="soft">
      <Icon className="mr-1 inline size-3" />
      {status}
    </Chip>
  );
}

