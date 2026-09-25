import { useEffect, useState } from "react";
import { Button, Chip, Modal, Spinner, Tooltip, useOverlayState } from "@heroui/react";
import {
  AlertTriangle,
  BarChart2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Globe,
  Hash,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DomainAnalyticsDrawer } from "../components/mailer/DomainAnalyticsDrawer";
import { SkeletonRow } from "../components/ui/Skeleton";
import { domainService } from "../services/api";
import type { Domain, DnsCheckStatus, DomainStatusCounts, SesAccountStatus } from "../types";

const PAGE_SIZE = 10;
const emptyCounts: DomainStatusCounts = { total: 0, verified: 0, pending: 0, failed: 0 };

export function Mailer() {
  const navigate = useNavigate();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [statusCounts, setStatusCounts] = useState<DomainStatusCounts>(emptyCounts);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [accountStatus, setAccountStatus] = useState<SesAccountStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [analyticsDomainId, setAnalyticsDomainId] = useState<number | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [refreshingDomain, setRefreshingDomain] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Domain | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const productionModal = useOverlayState({});
  const deleteModal = useOverlayState({});

  useEffect(() => {
    load(1, search);
  }, []);

  // Debounce server-side search — refetch page 1 shortly after the user stops typing.
  useEffect(() => {
    const timeout = window.setTimeout(() => load(1, search), 350);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function load(nextPage: number, nextSearch: string) {
    setIsLoading(true);
    setError(null);
    try {
      const [domainsPage, statusData] = await Promise.all([
        domainService.list({ page: nextPage, limit: PAGE_SIZE, search: nextSearch }),
        domainService.getAccountStatus().catch(() => null),
      ]);
      setDomains(domainsPage.items);
      setStatusCounts(domainsPage.statusCounts);
      setPage(domainsPage.page);
      setTotalPages(domainsPage.totalPages);
      setTotal(domainsPage.total);
      setAccountStatus(statusData);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load domains");
      setDomains([]);
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

  const selectedDomain = domains.find((domain) => domain.id === analyticsDomainId) ?? null;

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
          <Button onPress={() => navigate("/mailer/domains/new")} size="sm">
            <Plus className="size-4" />
            Add Domain
          </Button>
        </div>
      </div>

      {accountStatus && !accountStatus.productionAccessEnabled ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
            <div>
              <p className="text-[13px] font-semibold text-foreground">AWS SES is in Sandbox mode</p>
              <p className="text-[12px] text-muted">
                Max {accountStatus.max24HourSend ?? "—"} emails/24h, {accountStatus.maxSendRate ?? "—"}/sec, and only verified recipients. {" "}
                {accountStatus.latestRequest
                  ? `Production access requested ${new Date(accountStatus.latestRequest.requestedAt).toLocaleDateString()} — awaiting AWS review.`
                  : "Tell AWS this is a real business sending legitimate bulk marketing email to lift these limits."}
              </p>
            </div>
          </div>
          {!accountStatus.latestRequest ? (
            <Button onPress={productionModal.open} size="sm" variant="secondary">
              <ShieldCheck className="size-4" />
              Request production access
            </Button>
          ) : null}
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
              `Showing ${domains.length} of ${total} domains · Page ${page} of ${totalPages}`
            )}
          </p>
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
              ) : domains.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-sm font-medium text-muted" colSpan={7}>
                    {total === 0 && !search ? "No domains onboarded yet. Click “Add Domain” to onboard one from Route53." : "No domains match your search."}
                  </td>
                </tr>
              ) : (
                domains.map((domain) => (
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
                        <MetricIcon icon={Hash} label={`${domain.dkimTokens.length} DKIM CNAME records managed by SES`} value={`${domain.dkimTokens.length} DKIM`} />
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

      <DomainAnalyticsDrawer
        accountStatus={accountStatus}
        domain={selectedDomain}
        isRefreshing={refreshingDomain === selectedDomain?.domain}
        onClose={() => setAnalyticsDomainId(null)}
        onRefresh={refreshOne}
      />

      <ProductionAccessModal
        onSubmitted={(request) => setAccountStatus((current) => (current ? { ...current, latestRequest: request } : current))}
        state={productionModal}
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

function ProductionAccessModal({
  state,
  onSubmitted,
}: {
  state: ReturnType<typeof useOverlayState>;
  onSubmitted: (request: import("../types").SesAccountRequest) => void;
}) {
  const [mailType, setMailType] = useState<"MARKETING" | "TRANSACTIONAL">("MARKETING");
  const [websiteUrl, setWebsiteUrl] = useState("https://www.kovalai.ai/");
  const [useCaseDescription, setUseCaseDescription] = useState(
    "Koval AI (kovalai.ai) operates ReplyOS (replyos.kovalai.ai), a B2B SaaS platform providing AI-powered cold email outreach and reply automation for staffing and recruiting agencies. We manage a portfolio of dedicated outreach domains used exclusively to send opt-in-appropriate, permission-based B2B marketing emails introducing our staffing brokerage services to business prospects sourced from compiled B2B contact lists. Expected volume is up to ~2,000 sending mailboxes across our onboarded domains, sending an estimated 2,000,000+ marketing emails per month, with low per-mailbox volume and gradual warmup ramps to protect sender reputation. Every domain is authenticated with SPF, DKIM (SES Easy DKIM), a custom MAIL FROM domain, and DMARC. We maintain bounce/complaint suppression lists, honor unsubscribe requests, and throttle sending per mailbox with gradual daily-limit ramps."
  );
  const [contactEmail, setContactEmail] = useState("mahdi.r@kovalai.ai");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function submit() {
    setIsSubmitting(true);
    setLocalError(null);
    try {
      const request = await domainService.requestProductionAccess({
        mailType,
        websiteUrl,
        useCaseDescription,
        additionalContactEmailAddresses: contactEmail ? [contactEmail] : undefined,
      });
      onSubmitted(request);
      state.close();
    } catch (requestError) {
      setLocalError(requestError instanceof Error ? requestError.message : "Unable to submit production access request");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal state={state}>
      <Modal.Backdrop className="bg-foreground/30 backdrop-blur-[2px]">
        <Modal.Container className="w-[min(680px,calc(100vw-32px))]" placement="center" scroll="inside" size="lg">
          <Modal.Dialog className="overflow-hidden rounded-[20px] border border-border/70 bg-surface shadow-[0_8px_30px_color-mix(in_oklch,var(--foreground)_18%,transparent)]">
            <Modal.Header className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4">
              <div>
                <Modal.Heading className="text-base font-semibold leading-6 text-foreground">Request AWS SES production access</Modal.Heading>
                <p className="mt-1 text-[13px] leading-5 text-muted">Tells AWS you're a legitimate business sending bulk marketing email, to lift the sandbox's 200/day limit.</p>
              </div>
              <Modal.CloseTrigger className="grid size-8 shrink-0 place-items-center rounded-full bg-default-100 text-foreground transition hover:bg-default-200" aria-label="Close">
                <X className="size-4" />
              </Modal.CloseTrigger>
            </Modal.Header>

            <Modal.Body className="thin-scrollbar max-h-[72vh] overflow-y-auto px-5 py-5">
              <div className="grid gap-4">
                <label className="grid gap-1.5 text-sm font-medium text-foreground">
                  Mail type
                  <select
                    className="agent-field h-10 w-full px-3 text-sm text-foreground outline-none"
                    onChange={(event) => setMailType(event.target.value as "MARKETING" | "TRANSACTIONAL")}
                    value={mailType}
                  >
                    <option value="MARKETING">Marketing</option>
                    <option value="TRANSACTIONAL">Transactional</option>
                  </select>
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-foreground">
                  Website URL
                  <input
                    className="h-10 w-full rounded-xl border border-border bg-surface-secondary px-3 text-sm outline-none transition focus:border-accent"
                    onChange={(event) => setWebsiteUrl(event.target.value)}
                    value={websiteUrl}
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-foreground">
                  Use case description
                  <textarea
                    className="min-h-[160px] w-full rounded-xl border border-border bg-surface-secondary px-3 py-2 text-sm outline-none transition focus:border-accent"
                    onChange={(event) => setUseCaseDescription(event.target.value)}
                    value={useCaseDescription}
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-foreground">
                  Additional contact email
                  <input
                    className="h-10 w-full rounded-xl border border-border bg-surface-secondary px-3 text-sm outline-none transition focus:border-accent"
                    onChange={(event) => setContactEmail(event.target.value)}
                    value={contactEmail}
                  />
                </label>
                {localError ? <p className="text-sm font-medium text-danger">{localError}</p> : null}
              </div>
            </Modal.Body>

            <Modal.Footer className="flex flex-wrap justify-end gap-2 border-t border-border/70 px-5 py-4">
              <Button isDisabled={isSubmitting} onClick={state.close} size="sm" variant="secondary">Cancel</Button>
              <Button isDisabled={isSubmitting || !websiteUrl} onClick={submit} size="sm">
                {isSubmitting ? <Spinner color="current" size="sm" /> : <ShieldCheck className="size-4" />}
                {isSubmitting ? "Submitting…" : "Submit request"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
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
