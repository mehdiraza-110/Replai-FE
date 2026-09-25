import { useEffect, useMemo, useState } from "react";
import { Button, Card, Chip, Spinner } from "@heroui/react";
import { AlertTriangle, ArrowRight, Globe, Mail, Send, ShieldCheck, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SendVolumeChart } from "../components/analytics/Charts";
import { campaignService, domainService, mailboxService, warmupService } from "../services/api";
import type { Domain, Mailbox, MailerCampaign, ReputationTrendPoint, WarmupSummary } from "../types";

const emptyWarmupSummary: WarmupSummary = { inWarmup: 0, atSteadyState: 0, avgProgress: 0, activeStrategies: 0 };

export function MailerDashboard() {
  const navigate = useNavigate();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [campaigns, setCampaigns] = useState<MailerCampaign[]>([]);
  const [trend, setTrend] = useState<ReputationTrendPoint[]>([]);
  const [warmupSummary, setWarmupSummary] = useState<WarmupSummary>(emptyWarmupSummary);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const [domainPage, mailboxPage, campaignPage, reputationTrend, summary] = await Promise.all([
        domainService.list({ page: 1, limit: 100 }),
        mailboxService.list({ page: 1, limit: 500 }),
        campaignService.list({ page: 1, limit: 100 }),
        domainService.getReputationTrend({ days: 14 }),
        warmupService.getSummary(),
      ]);
      setDomains(domainPage.items);
      setMailboxes(mailboxPage.items);
      setCampaigns(campaignPage.items);
      setTrend(reputationTrend);
      setWarmupSummary(summary);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load dashboard data");
      setDomains([]);
      setMailboxes([]);
      setCampaigns([]);
      setTrend([]);
      setWarmupSummary(emptyWarmupSummary);
    } finally {
      setIsLoading(false);
    }
  }

  const totals = useMemo(() => {
    const sentToday = mailboxes.reduce((sum, mailbox) => sum + mailbox.sentToday, 0);
    const dailyLimit = mailboxes.reduce((sum, mailbox) => sum + mailbox.dailyLimit, 0);
    const reputation = mailboxes.reduce(
      (acc, mailbox) => {
        acc[mailbox.reputationStatus] += 1;
        return acc;
      },
      { Healthy: 0, Watch: 0, "At Risk": 0 } as Record<Mailbox["reputationStatus"], number>
    );

    return { sentToday, dailyLimit, reputation };
  }, [mailboxes]);

  const utilization = totals.dailyLimit > 0 ? Math.round((totals.sentToday / totals.dailyLimit) * 100) : 0;

  const metrics = [
    { icon: Globe, label: "Domains", value: String(domains.length), detail: "onboarded to SES" },
    { icon: Mail, label: "Mailboxes", value: String(mailboxes.length), detail: "across all domains" },
    { icon: Zap, label: "Sent Today", value: String(totals.sentToday), detail: `${utilization}% of daily limits` },
    { icon: ShieldCheck, label: "Healthy Mailboxes", value: String(totals.reputation.Healthy), detail: `${mailboxes.length - totals.reputation.Healthy} need attention` },
  ];

  const reputationBreakdown = [
    { label: "Healthy", value: totals.reputation.Healthy, color: "bg-success" },
    { label: "Watch", value: totals.reputation.Watch, color: "bg-warning" },
    { label: "At Risk", value: totals.reputation["At Risk"], color: "bg-danger" },
  ];
  const reputationTotal = Math.max(1, mailboxes.length);

  const flaggedMailboxes = mailboxes.filter((mailbox) => mailbox.reputationStatus !== "Healthy").length;
  const configuredDomains = domains.filter((domain) => domain.configurationSetName != null).length;

  const campaignTotals = useMemo(() => {
    const active = campaigns.filter((campaign) => campaign.status === "Active").length;
    const sentToday = campaigns.reduce((sum, campaign) => sum + campaign.sentToday, 0);
    const avgReplyRate = campaigns.length
      ? (campaigns.reduce((sum, campaign) => sum + campaign.replyRate, 0) / campaigns.length).toFixed(1)
      : "0";
    return { active, sentToday, avgReplyRate };
  }, [campaigns]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
          <span>{error}</span>
          <button className="text-sm font-semibold underline" onClick={load} type="button">Retry</button>
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card className="apple-shadow border border-border/70 bg-surface p-4" key={metric.label}>
            <Card.Content className="p-0">
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-default-100 text-foreground">
                  <metric.icon className="size-[17px]" strokeWidth={2.2} />
                </span>
                <Chip className="h-[22px] min-h-[22px] px-2 text-[11px] font-semibold" color="accent" size="sm" variant="soft">
                  Live
                </Chip>
              </div>
              {isLoading ? (
                <div className="mt-5">
                  <Spinner color="accent" size="sm" />
                </div>
              ) : (
                <p className="mt-5 text-[26px] font-semibold leading-none text-foreground">{metric.value}</p>
              )}
              <p className="mt-2 text-[12px] font-semibold text-foreground">{metric.label}</p>
              <p className="mt-0.5 text-[11px] text-muted">{metric.detail}</p>
            </Card.Content>
          </Card>
        ))}
      </section>

      <section className="grid gap-3 xl:grid-cols-[1.4fr_1fr]">
        <Card className="apple-shadow border border-border/70 bg-surface p-4">
          <Card.Header className="p-0">
            <Card.Title className="text-[15px] font-semibold">Sending volume</Card.Title>
            <Card.Description>Emails sent per day across all mailboxes, last 14 days.</Card.Description>
          </Card.Header>
          <Card.Content className="p-0 pt-4">
            {isLoading ? (
              <div className="flex h-[136px] items-center justify-center gap-2 text-[12px] text-muted">
                <Spinner color="accent" size="sm" />
                Loading…
              </div>
            ) : (
              <SendVolumeChart data={trend} />
            )}
          </Card.Content>
        </Card>

        <Card className="apple-shadow border border-border/70 bg-surface p-4">
          <Card.Header className="p-0">
            <Card.Title className="text-[15px] font-semibold">Mailbox reputation</Card.Title>
            <Card.Description>Current health status across every mailbox.</Card.Description>
          </Card.Header>
          <Card.Content className="p-0 pt-5">
            <div className="space-y-4">
              {reputationBreakdown.map((item) => (
                <div key={item.label}>
                  <div className="mb-1.5 flex items-center justify-between text-[12px]">
                    <span className="font-medium text-foreground">{item.label}</span>
                    <span className="font-semibold text-foreground">{item.value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-default-100">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${Math.round((item.value / reputationTotal) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>
      </section>

      <section className="grid gap-3 xl:grid-cols-[1fr_1.4fr]">
        <Card className="apple-shadow border border-border/70 bg-surface p-4">
          <Card.Header className="items-start justify-between gap-4 p-0">
            <div>
              <Card.Title className="text-[15px] font-semibold">Sending domains</Card.Title>
              <Card.Description>Verification status per onboarded domain.</Card.Description>
            </div>
            <Button onClick={() => navigate("/mailer/domains")} size="sm" variant="secondary">
              Manage
              <ArrowRight className="size-4" />
            </Button>
          </Card.Header>
          <Card.Content className="space-y-3 p-0 pt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Spinner color="accent" size="sm" />
              </div>
            ) : domains.length === 0 ? (
              <p className="py-6 text-center text-[12px] text-muted">No domains onboarded yet.</p>
            ) : (
              domains.slice(0, 3).map((domain) => (
                <div className="flex items-center justify-between rounded-[14px] border border-border/70 p-3" key={domain.id}>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold leading-5 text-foreground">{domain.domain}</p>
                    <p className="truncate text-[11px] leading-4 text-muted">{domain.mailboxCount ?? 0} mailboxes · {domain.registrar}</p>
                  </div>
                  <Chip color={domain.status === "Verified" ? "success" : domain.status === "Failed" ? "danger" : "warning"} size="sm" variant="soft">
                    {domain.status}
                  </Chip>
                </div>
              ))
            )}
          </Card.Content>
        </Card>

        <Card className="apple-shadow border border-border/70 bg-surface p-4">
          <Card.Header className="items-start justify-between gap-4 p-0">
            <div>
              <Card.Title className="text-[15px] font-semibold">Warmup progress</Card.Title>
              <Card.Description>Mailboxes currently ramping toward steady-state sending limits.</Card.Description>
            </div>
            <Button onClick={() => navigate("/mailer/warmup")} size="sm" variant="secondary">
              Manage
              <ArrowRight className="size-4" />
            </Button>
          </Card.Header>
          <Card.Content className="p-0 pt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Spinner color="accent" size="sm" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[14px] border border-border/70 p-3">
                  <p className="text-[20px] font-semibold leading-none text-foreground">{warmupSummary.inWarmup}</p>
                  <p className="mt-1.5 text-[11px] font-medium text-muted">In warmup</p>
                </div>
                <div className="rounded-[14px] border border-border/70 p-3">
                  <p className="text-[20px] font-semibold leading-none text-foreground">{warmupSummary.atSteadyState}</p>
                  <p className="mt-1.5 text-[11px] font-medium text-muted">At steady state</p>
                </div>
                <div className="rounded-[14px] border border-border/70 p-3">
                  <p className="text-[20px] font-semibold leading-none text-foreground">{warmupSummary.avgProgress}%</p>
                  <p className="mt-1.5 text-[11px] font-medium text-muted">Avg progress</p>
                </div>
                <div className="rounded-[14px] border border-border/70 p-3">
                  <p className="text-[20px] font-semibold leading-none text-foreground">{warmupSummary.activeStrategies}</p>
                  <p className="mt-1.5 text-[11px] font-medium text-muted">Active strategies</p>
                </div>
              </div>
            )}
          </Card.Content>
        </Card>
      </section>

      <section className="grid gap-3 xl:grid-cols-2">
        <Card className="apple-shadow border border-border/70 bg-surface p-4">
          <Card.Header className="items-start justify-between gap-4 p-0">
            <div>
              <Card.Title className="text-[15px] font-semibold">Health &amp; reputation</Card.Title>
              <Card.Description>Bounce/complaint monitoring and domain configuration coverage.</Card.Description>
            </div>
            <Button onClick={() => navigate("/mailer/health")} size="sm" variant="secondary">
              View
              <ArrowRight className="size-4" />
            </Button>
          </Card.Header>
          <Card.Content className="space-y-3 p-0 pt-4">
            <div className="flex items-center justify-between rounded-[14px] border border-border/70 p-3">
              <div className="flex items-center gap-2.5">
                <span className={`grid size-8 place-items-center rounded-full ${flaggedMailboxes > 0 ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
                  <AlertTriangle className="size-4" />
                </span>
                <div>
                  <p className="text-[13px] font-semibold leading-5 text-foreground">Flagged mailboxes</p>
                  <p className="text-[11px] leading-4 text-muted">Watch or At Risk reputation</p>
                </div>
              </div>
              <Chip color={flaggedMailboxes > 0 ? "warning" : "success"} size="sm" variant="soft">
                {flaggedMailboxes}
              </Chip>
            </div>
            <div className="flex items-center justify-between rounded-[14px] border border-border/70 p-3">
              <div>
                <p className="text-[13px] font-semibold leading-5 text-foreground">Tier 1 config sets</p>
                <p className="text-[11px] leading-4 text-muted">Per-domain reputation isolation</p>
              </div>
              <Chip color="accent" size="sm" variant="soft">
                {configuredDomains}/{domains.length} domains
              </Chip>
            </div>
          </Card.Content>
        </Card>

        <Card className="apple-shadow border border-border/70 bg-surface p-4">
          <Card.Header className="items-start justify-between gap-4 p-0">
            <div>
              <Card.Title className="text-[15px] font-semibold">Campaigns</Card.Title>
              <Card.Description>Cold outbound campaigns sending through this workspace.</Card.Description>
            </div>
            <Button onClick={() => navigate("/mailer/campaigns")} size="sm" variant="secondary">
              View
              <ArrowRight className="size-4" />
            </Button>
          </Card.Header>
          <Card.Content className="p-0 pt-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-[14px] border border-border/70 p-3">
                <p className="text-[20px] font-semibold leading-none text-foreground">{campaignTotals.active}</p>
                <p className="mt-1.5 text-[11px] font-medium text-muted">Active</p>
              </div>
              <div className="rounded-[14px] border border-border/70 p-3">
                <p className="text-[20px] font-semibold leading-none text-foreground">{campaignTotals.sentToday}</p>
                <p className="mt-1.5 text-[11px] font-medium text-muted">Sent today</p>
              </div>
              <div className="rounded-[14px] border border-border/70 p-3">
                <p className="text-[20px] font-semibold leading-none text-foreground">{campaignTotals.avgReplyRate}%</p>
                <p className="mt-1.5 text-[11px] font-medium text-muted">Avg reply rate</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-[14px] border border-border/70 p-3 text-[11px] text-muted">
              <Send className="size-4 shrink-0 text-accent" />
              Every send routes through the queue → health check → daily-limit check → rate limiter → SES.
            </div>
          </Card.Content>
        </Card>
      </section>
    </div>
  );
}
