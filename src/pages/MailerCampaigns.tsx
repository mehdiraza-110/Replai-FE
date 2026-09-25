import { useEffect, useMemo, useState } from "react";
import { Button, Chip, Modal, Spinner, Tooltip, useOverlayState } from "@heroui/react";
import {
  ChevronLeft,
  ChevronRight,
  CornerUpLeft,
  Eye,
  Gauge,
  Handshake,
  ListChecks,
  Mail,
  MessageSquareReply,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Smile,
  Timer,
  Undo2,
  UserCheck,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SkeletonRow } from "../components/ui/Skeleton";
import { campaignService } from "../services/api";
import type { CampaignLead, MailerCampaign, StatusTone } from "../types";

const PAGE_SIZE = 10;

const PIPELINE_STEPS = [
  { label: "Campaign", detail: "Queued for send", icon: Mail },
  { label: "Message Queue", detail: "Ordered by schedule", icon: ListChecks },
  { label: "Sender Selection", detail: "Healthiest mailbox", icon: UserCheck },
  { label: "Health Check", detail: "Reputation gate", icon: ShieldCheck },
  { label: "Daily Limit Check", detail: "Warmup ceiling", icon: Gauge },
  { label: "Rate Limiter", detail: "Paced delivery", icon: Timer },
  { label: "Amazon SES", detail: "Delivered", icon: Send },
];

const statusTone: Record<MailerCampaign["status"], StatusTone> = {
  Active: "success",
  Paused: "warning",
  Draft: "default",
  Completed: "accent",
};

export function MailerCampaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<MailerCampaign[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leadsCampaign, setLeadsCampaign] = useState<MailerCampaign | null>(null);
  const leadsModal = useOverlayState({});

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(nextPage: number) {
    setIsLoading(true);
    setError(null);
    try {
      const campaignPage = await campaignService.list({ page: nextPage, limit: PAGE_SIZE });
      setCampaigns(campaignPage.items);
      setPage(campaignPage.page);
      setTotalPages(campaignPage.totalPages);
      setTotal(campaignPage.total);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load campaigns");
      setCampaigns([]);
    } finally {
      setIsLoading(false);
    }
  }

  const totals = useMemo(() => {
    const active = campaigns.filter((campaign) => campaign.status === "Active").length;
    const sentToday = campaigns.reduce((sum, campaign) => sum + campaign.sentToday, 0);
    const avgReplyRate = campaigns.length
      ? (campaigns.reduce((sum, campaign) => sum + campaign.replyRate, 0) / campaigns.length).toFixed(1)
      : "0";
    const avgBounceRate = campaigns.length
      ? (campaigns.reduce((sum, campaign) => sum + campaign.bounceRate, 0) / campaigns.length).toFixed(1)
      : "0";

    return { active, sentToday, avgReplyRate, avgBounceRate };
  }, [campaigns]);

  const metrics = [
    { icon: Zap, label: "Active Campaigns", value: String(totals.active), detail: `${total} total` },
    { icon: Send, label: "Sent Today", value: String(totals.sentToday), detail: "across all campaigns" },
    { icon: MessageSquareReply, label: "Avg Reply Rate", value: `${totals.avgReplyRate}%`, detail: "last 7 days" },
    { icon: Undo2, label: "Avg Bounce Rate", value: `${totals.avgBounceRate}%`, detail: "last 7 days" },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div className="flex justify-end">
        <Button onPress={() => navigate("/mailer/campaigns/new")} size="sm">
          <Plus className="size-4" />
          New Campaign
        </Button>
      </div>

      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
          <span>{error}</span>
          <Button onPress={() => load(page)} size="sm" variant="secondary">Retry</Button>
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div className="apple-shadow flex items-center gap-3 rounded-2xl border border-border/70 bg-surface p-4" key={metric.label}>
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-default-100 text-foreground">
              <metric.icon className="size-[18px]" strokeWidth={2.2} />
            </span>
            <div className="min-w-0">
              {isLoading ? (
                <div className="mt-1">
                  <Spinner color="accent" size="sm" />
                </div>
              ) : (
                <p className="text-[22px] font-semibold leading-none text-foreground">{metric.value}</p>
              )}
              <p className="mt-1.5 truncate text-[12px] font-semibold text-foreground">{metric.label}</p>
              <p className="truncate text-[11px] text-muted">{metric.detail}</p>
            </div>
          </div>
        ))}
      </section>

      <div className="apple-shadow rounded-2xl border border-border/70 bg-surface p-5">
        <div className="mb-5">
          <h3 className="text-[15px] font-semibold text-foreground">Sending pipeline</h3>
          <p className="mt-0.5 text-[12px] text-muted">Every campaign send and AI-agent reply passes through this queue before reaching Amazon SES.</p>
        </div>
        <div className="overflow-x-auto pt-1.5">
          <div className="flex min-w-[880px] items-start">
            {PIPELINE_STEPS.map((step, index) => (
              <div className="flex flex-1 items-start" key={step.label}>
                <div className="flex w-[108px] shrink-0 flex-col items-center text-center">
                  <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-accent/10 text-accent ring-4 ring-accent/5">
                    <step.icon className="size-[18px]" strokeWidth={2.2} />
                    <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground">
                      {index + 1}
                    </span>
                  </span>
                  <p className="mt-2.5 text-[12px] font-semibold leading-4 text-foreground">{step.label}</p>
                  <p className="mt-0.5 text-[10.5px] leading-[14px] text-muted">{step.detail}</p>
                </div>
                {index < PIPELINE_STEPS.length - 1 ? (
                  <div className="mt-[22px] h-px flex-1 bg-gradient-to-r from-accent/40 via-accent/20 to-accent/40" />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="apple-shadow overflow-hidden rounded-2xl border border-border/70 bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">Campaigns</h3>
            <p className="mt-0.5 text-[12px] text-muted">Cold outbound campaigns currently using this workspace's mailboxes.</p>
          </div>
          <p className="flex items-center gap-1.5 text-[12px] text-muted">
            {isLoading ? (
              <>
                <Spinner color="accent" size="sm" />
                Loading…
              </>
            ) : (
              `Showing ${campaigns.length} of ${total} campaigns · Page ${page} of ${totalPages}`
            )}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1220px] text-left text-sm">
            <thead className="border-b border-border/70 text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Campaign</th>
                <th className="px-2 py-3 font-medium">Status</th>
                <th className="px-2 py-3 font-medium"><Users className="size-3.5" /></th>
                <th className="px-2 py-3 font-medium"><Handshake className="size-3.5" /></th>
                <th className="px-2 py-3 font-medium"><Eye className="size-3.5" /></th>
                <th className="px-2 py-3 font-medium"><CornerUpLeft className="size-3.5" /></th>
                <th className="px-2 py-3 font-medium"><Smile className="size-3.5" /></th>
                <th className="px-2 py-3 font-medium"><Mail className="size-3.5" /></th>
                <th className="px-2 py-3 font-medium">Progress</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => <SkeletonRow columns={9} key={index} />)
              ) : campaigns.length === 0 ? (
                <tr>
                  <td className="px-5 py-10 text-center text-sm font-medium text-muted" colSpan={9}>
                    No campaigns yet. Click "New Campaign" to launch your first cold outbound sequence.
                  </td>
                </tr>
              ) : campaigns.map((campaign) => {
                const progressPercent = campaign.totalSequenceEmails > 0
                  ? Math.min(100, Math.round((campaign.sentTotal / campaign.totalSequenceEmails) * 1000) / 10)
                  : 0;

                return (
                  <tr className="border-b border-border/60 transition-colors last:border-0 hover:bg-surface-secondary/60" key={campaign.id}>
                    <td className="px-5 py-4 font-semibold text-foreground">{campaign.name}</td>
                    <td className="px-2 py-4">
                      <Chip color={statusTone[campaign.status]} size="sm" variant="soft">{campaign.status}</Chip>
                    </td>
                    <td className="px-2 py-4">
                      <button
                        className="flex items-center gap-1.5 text-muted transition hover:text-accent"
                        onClick={() => {
                          setLeadsCampaign(campaign);
                          leadsModal.open();
                        }}
                        title={`View ${campaign.leadsCount} leads in this campaign`}
                        type="button"
                      >
                        <Users className="size-3.5" />
                        <span className="font-medium underline-offset-2 hover:underline">{campaign.leadsCount}</span>
                      </button>
                    </td>
                    <td className="px-2 py-4">
                      <CampaignMetric icon={Handshake} label={`${campaign.contactedCount} of ${campaign.leadsCount} leads contacted`} value={`${campaign.contactedPercent}%`} />
                    </td>
                    <td className="px-2 py-4">
                      <CampaignMetric icon={Eye} label="Open Rate tracking disabled for best deliverability" value="—" />
                    </td>
                    <td className="px-2 py-4">
                      <CampaignMetric icon={CornerUpLeft} label={`${campaign.replyCount} leads replied (excluding OOO and Automatic Replies)`} value={String(campaign.replyCount)} />
                    </td>
                    <td className="px-2 py-4">
                      <CampaignMetric
                        icon={Smile}
                        label={campaign.positiveReplyRate == null ? "Positive-reply detection isn't set up yet for this workspace" : `${campaign.positiveReplyRate}% positive replies`}
                        value={campaign.positiveReplyRate == null ? "—" : `${campaign.positiveReplyRate}%`}
                      />
                    </td>
                    <td className="px-2 py-4">
                      <CampaignMetric icon={Mail} label={`${campaign.mailboxCount} email account${campaign.mailboxCount === 1 ? "" : "s"} sending this campaign`} value={String(campaign.mailboxCount)} />
                    </td>
                    <td className="px-5 py-4">
                      <Tooltip delay={200}>
                        <Tooltip.Trigger className="block w-[120px]">
                          <div className="flex items-center justify-between text-[11px] font-medium text-foreground">
                            <span>{progressPercent}%</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-default-100">
                            <div className="h-full rounded-full bg-success" style={{ width: `${progressPercent}%` }} />
                          </div>
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                          <div className="space-y-0.5 text-[12px]">
                            <p>Campaign progress: {progressPercent}% completed</p>
                            <p>Total emails sent: {campaign.sentTotal}</p>
                            <p>Total sequence emails: {campaign.totalSequenceEmails}</p>
                          </div>
                        </Tooltip.Content>
                      </Tooltip>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 px-5 py-3 text-[12px] text-muted">
          <span>Page {page} of {totalPages}</span>
          <div className="flex items-center gap-2">
            <Button isDisabled={isLoading || page <= 1} onPress={() => load(page - 1)} size="sm" variant="secondary">
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <Button isDisabled={isLoading || page >= totalPages} onPress={() => load(page + 1)} size="sm" variant="secondary">
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <CampaignLeadsModal campaign={leadsCampaign} state={leadsModal} />
    </div>
  );
}

function CampaignMetric({
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
      <Tooltip.Trigger className="flex items-center gap-1.5 text-muted">
        <Icon className="size-3.5" />
        <span className="font-medium text-foreground">{value}</span>
      </Tooltip.Trigger>
      <Tooltip.Content>{label}</Tooltip.Content>
    </Tooltip>
  );
}

const LEADS_PAGE_SIZE = 10;

function CampaignLeadsModal({ campaign, state }: { campaign: MailerCampaign | null; state: ReturnType<typeof useOverlayState> }) {
  const [leads, setLeads] = useState<CampaignLead[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaign) return;
    setSearch("");
    load(campaign.id, 1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign?.id]);

  useEffect(() => {
    if (!campaign) return;
    const timeout = window.setTimeout(() => load(campaign.id, 1, search), 350);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function load(campaignId: number, nextPage: number, nextSearch: string) {
    setIsLoading(true);
    setError(null);
    try {
      const leadsPage = await campaignService.listLeads(campaignId, { page: nextPage, limit: LEADS_PAGE_SIZE, search: nextSearch });
      setLeads(leadsPage.items);
      setPage(leadsPage.page);
      setTotalPages(leadsPage.totalPages);
      setTotal(leadsPage.total);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load leads");
      setLeads([]);
    } finally {
      setIsLoading(false);
    }
  }

  const columns = useMemo(() => {
    const cols: { key: keyof CampaignLead; label: string }[] = [{ key: "email", label: "Email" }];
    if (leads.some((lead) => lead.fullName)) cols.push({ key: "fullName", label: "Name" });
    if (leads.some((lead) => lead.company)) cols.push({ key: "company", label: "Company" });
    if (leads.some((lead) => lead.role)) cols.push({ key: "role", label: "Role" });
    if (leads.some((lead) => lead.phone)) cols.push({ key: "phone", label: "Phone" });
    cols.push({ key: "status", label: "Status" });
    return cols;
  }, [leads]);

  return (
    <Modal state={state}>
      <Modal.Backdrop className="bg-foreground/30 backdrop-blur-[2px]">
        <Modal.Container className="w-[min(880px,calc(100vw-32px))]" placement="center" scroll="inside" size="lg">
          <Modal.Dialog className="overflow-hidden rounded-[20px] border border-border/70 bg-surface shadow-[0_8px_30px_color-mix(in_oklch,var(--foreground)_18%,transparent)]">
            <Modal.Header className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4">
              <div>
                <Modal.Heading className="text-base font-semibold leading-6 text-foreground">{campaign?.name || "Campaign"} — leads</Modal.Heading>
                <p className="mt-1 text-[13px] leading-5 text-muted">{total} lead{total === 1 ? "" : "s"} imported for this campaign.</p>
              </div>
              <Modal.CloseTrigger className="grid size-8 shrink-0 place-items-center rounded-full bg-default-100 text-foreground transition hover:bg-default-200" aria-label="Close">
                <X className="size-4" />
              </Modal.CloseTrigger>
            </Modal.Header>

            <Modal.Body className="thin-scrollbar max-h-[72vh] overflow-y-auto px-5 py-4">
              <div className="relative mb-3 w-full max-w-[320px]">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <input
                  className="h-9 w-full rounded-xl border border-border bg-surface-secondary pl-9 pr-3 text-[13px] outline-none transition focus:border-accent"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search leads by email, name, or company"
                  value={search}
                />
              </div>

              {error ? <p className="mb-3 text-sm font-medium text-danger">{error}</p> : null}

              <div className="overflow-x-auto rounded-xl border border-border/70">
                <table className="w-full min-w-[640px] text-left text-[12.5px]">
                  <thead className="border-b border-border/70 text-[10.5px] uppercase tracking-wide text-muted">
                    <tr>
                      {columns.map((column) => (
                        <th className="px-3 py-2.5 font-medium" key={column.key}>{column.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, index) => <SkeletonRow columns={columns.length} key={index} />)
                    ) : leads.length === 0 ? (
                      <tr>
                        <td className="px-3 py-8 text-center text-muted" colSpan={columns.length}>No leads match this view.</td>
                      </tr>
                    ) : leads.map((lead) => (
                      <tr className="border-b border-border/60 last:border-0" key={lead.id}>
                        {columns.map((column) => (
                          <td className="max-w-[200px] truncate px-3 py-2.5 text-foreground" key={column.key}>{String(lead[column.key] ?? "—")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex items-center justify-between text-[12px] text-muted">
                <span>Page {page} of {totalPages}</span>
                <div className="flex items-center gap-2">
                  <Button isDisabled={isLoading || page <= 1} onPress={() => campaign && load(campaign.id, page - 1, search)} size="sm" variant="secondary">
                    <ChevronLeft className="size-4" />
                    Previous
                  </Button>
                  <Button isDisabled={isLoading || page >= totalPages} onPress={() => campaign && load(campaign.id, page + 1, search)} size="sm" variant="secondary">
                    Next
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
