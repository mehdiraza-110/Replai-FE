import { useEffect, useState } from "react";
import { Button, Chip, Modal, Spinner, Tooltip, useOverlayState } from "@heroui/react";
import {
  AlertTriangle,
  BarChart2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CornerUpLeft,
  Gem,
  Inbox,
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
import { MailboxAnalyticsDrawer } from "../components/mailer/MailboxAnalyticsDrawer";
import { MailboxInboxDrawer } from "../components/mailer/MailboxInboxDrawer";
import { SkeletonRow } from "../components/ui/Skeleton";
import { mailboxService } from "../services/api";
import type { Mailbox, MailboxStatusCounts } from "../types";

const PAGE_SIZE = 10;
const emptyCounts: MailboxStatusCounts = { total: 0, active: 0, paused: 0, error: 0 };

export function Mailboxes() {
  const navigate = useNavigate();
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [statusCounts, setStatusCounts] = useState<MailboxStatusCounts>(emptyCounts);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [analyticsMailboxId, setAnalyticsMailboxId] = useState<number | null>(null);
  const [drawerTab, setDrawerTab] = useState<"analytics" | "settings">("analytics");
  const [inboxMailboxId, setInboxMailboxId] = useState<number | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [refreshingId, setRefreshingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Mailbox | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteModal = useOverlayState({});

  useEffect(() => {
    load(1, search);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => load(1, search), 350);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function load(nextPage: number, nextSearch: string) {
    setIsLoading(true);
    setError(null);
    try {
      const mailboxPage = await mailboxService.list({ page: nextPage, limit: PAGE_SIZE, search: nextSearch });
      setMailboxes(mailboxPage.items);
      setStatusCounts(mailboxPage.statusCounts);
      setPage(mailboxPage.page);
      setTotalPages(mailboxPage.totalPages);
      setTotal(mailboxPage.total);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load mailboxes");
      setMailboxes([]);
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

  const selectedIndex = mailboxes.findIndex((mailbox) => mailbox.id === analyticsMailboxId);
  const selectedMailbox = selectedIndex >= 0 ? mailboxes[selectedIndex] : null;
  const inboxMailbox = mailboxes.find((mailbox) => mailbox.id === inboxMailboxId) ?? null;

  function navigateAnalytics(direction: "prev" | "next") {
    if (mailboxes.length === 0 || selectedIndex < 0) return;
    const nextIndex = direction === "prev"
      ? (selectedIndex - 1 + mailboxes.length) % mailboxes.length
      : (selectedIndex + 1) % mailboxes.length;
    setAnalyticsMailboxId(mailboxes[nextIndex].id);
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
          <Button onPress={() => navigate("/mailer/mailboxes/new")} size="sm">
            <Plus className="size-4" />
            Add Mailboxes
          </Button>
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
              `Showing ${mailboxes.length} of ${total} mailboxes · Page ${page} of ${totalPages}`
            )}
          </p>
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
              ) : mailboxes.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-sm font-medium text-muted" colSpan={12}>
                    {total === 0 && !search ? "No mailboxes yet. Click “Add Mailboxes” to create sender identities under a verified domain." : "No mailboxes match your search."}
                  </td>
                </tr>
              ) : (
                mailboxes.map((mailbox) => (
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
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 px-4 py-3 text-[12px] text-muted">
          <span>Page {page} of {totalPages}</span>
          <div className="flex items-center gap-2">
            <Button isDisabled={isLoading || page <= 1} onPress={() => load(page - 1, search)} size="sm" variant="secondary">
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <Button isDisabled={isLoading || page >= totalPages} onPress={() => load(page + 1, search)} size="sm" variant="secondary">
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

