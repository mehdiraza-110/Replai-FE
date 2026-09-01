import { Button, Card, Chip, Spinner, Tabs } from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  Calendar,
  CheckCircle2,
  Clock3,
  Inbox,
  MessageSquareText,
  RefreshCw,
  Send,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { LoadingState } from "../components/ui/LoadingState";
import { aiAgentService, analyticsService, eventLogService, reviewService } from "../services/api";
import type { Agent, AnalyticsOverview, EventLogRecord, HumanReviewItem } from "../types";

type DashboardView = "loop" | "agents" | "review";

const emptyAnalytics: AnalyticsOverview = {
  range: { preset: "last_7_days", label: "Last 7 days" },
  summary: [],
  weeklyLoop: [],
  intentMix: [],
  reviewTriggers: [],
  trainingImpact: [],
  agentPerformance: [],
};

export function Dashboard() {
  const navigate = useNavigate();
  const [view, setView] = useState<DashboardView>("loop");
  const [analytics, setAnalytics] = useState<AnalyticsOverview>(emptyAnalytics);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [reviews, setReviews] = useState<HumanReviewItem[]>([]);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [events, setEvents] = useState<EventLogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    setIsLoading(true);
    setError(null);

    try {
      const [analyticsData, agentsData, reviewData, eventData] = await Promise.all([
        analyticsService.getOverview({ preset: "last_7_days" }),
        aiAgentService.list(),
        reviewService.list({ page: 1, limit: 5 }),
        eventLogService.list({ page: 1, limit: 5 }),
      ]);

      setAnalytics(analyticsData);
      setAgents(agentsData);
      setReviews(reviewData.items);
      setReviewTotal(reviewData.total);
      setEvents(eventData.items);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "We could not load the dashboard. Please try again.");
      setAnalytics(emptyAnalytics);
      setReviews([]);
      setReviewTotal(0);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const totals = useMemo(() => getDashboardTotals(analytics, reviewTotal), [analytics, reviewTotal]);

  return (
    <div className="flex w-full max-w-none flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          aria-label="Dashboard view"
          className="dashboard-tabs"
          selectedKey={view}
          onSelectionChange={(key) => setView(String(key) as DashboardView)}
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label="Dashboard view">
              <Tabs.Tab id="loop"><span className="whitespace-nowrap">Reply loop</span><Tabs.Indicator /></Tabs.Tab>
              <Tabs.Tab id="agents"><span className="whitespace-nowrap">Agents</span><Tabs.Indicator /></Tabs.Tab>
              <Tabs.Tab id="review"><span className="whitespace-nowrap">Review</span><Tabs.Indicator /></Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>

        <div className="flex items-center gap-2">
          <Button className="size-[34px] min-w-[34px] rounded-full p-0 text-foreground" size="sm" variant="secondary" onPress={loadDashboard} isDisabled={isLoading} aria-label="Refresh dashboard">
            {isLoading ? <Spinner color="accent" size="sm" /> : <RefreshCw className="size-[17px]" strokeWidth={2.35} />}
          </Button>
          <Button className="h-[34px] rounded-full px-3 text-[14px] font-semibold leading-none text-foreground" size="sm" variant="secondary" isDisabled>
            <Calendar className="size-[17px]" strokeWidth={2.35} />
            {analytics.range.label}
          </Button>
          <Button className="h-[34px] rounded-full px-4 text-[14px] font-semibold leading-none" size="sm" onPress={() => navigate("/review")}>
            <UserCheck className="size-[16px]" strokeWidth={2.3} />
            Review queue
          </Button>
        </div>
      </div>

      {error ? <FriendlyError message={error} /> : null}

      {view === "loop" ? <ReplyLoopView analytics={analytics} events={events} isLoading={isLoading} totals={totals} /> : null}
      {view === "agents" ? <AgentsDashboard analytics={analytics} agents={agents} isLoading={isLoading} reviewTotal={reviewTotal} /> : null}
      {view === "review" ? <ReviewDashboard analytics={analytics} isLoading={isLoading} reviews={reviews} reviewTotal={reviewTotal} /> : null}
    </div>
  );
}

function ReplyLoopView({
  analytics,
  events,
  isLoading,
  totals,
}: {
  analytics: AnalyticsOverview;
  events: EventLogRecord[];
  isLoading: boolean;
  totals: ReturnType<typeof getDashboardTotals>;
}) {
  const maxWeekly = Math.max(1, ...analytics.weeklyLoop.map((item) => item.incoming));
  const loopSteps = [
    { label: "Positive replies", value: totals.incoming, detail: "received from PlusVibe", icon: Inbox },
    { label: "AI drafts", value: totals.generated, detail: "prepared by assigned agents", icon: Bot },
    { label: "Human review", value: totals.pendingReview, detail: "waiting for approval", icon: UserCheck },
    { label: "Sent replies", value: totals.sent, detail: "delivered through PlusVibe", icon: ShieldCheck },
  ];

  return (
    <>
      <section className="grid gap-3 xl:grid-cols-[1.45fr_0.85fr]">
        <Card className="apple-shadow min-w-0 border border-border/70 bg-surface p-4">
          <Card.Header className="items-start justify-between gap-4 p-0">
            <div className="min-w-0">
              <Card.Title className="text-[15px] font-semibold">Reply automation loop</Card.Title>
              <p className="mt-1 max-w-[68ch] text-[12px] leading-5 text-muted">
                Live path from positive PlusVibe reply ingestion through AI draft generation, human approval, and final send.
              </p>
            </div>
            <Chip className="h-[24px] min-h-[24px] px-2 text-[11px] font-semibold" color={totals.pendingReview > 0 ? "warning" : "success"} size="sm" variant="soft">
              {totals.pendingReview > 0 ? "Needs review" : "Clear"}
            </Chip>
          </Card.Header>

          <Card.Content className="p-0 pt-5">
            {isLoading ? (
              <StepSkeleton />
            ) : (
              <div className="grid gap-2 md:grid-cols-4">
                {loopSteps.map((step, index) => {
                  const Icon = step.icon;

                  return (
                    <div className="min-w-0 rounded-[14px] border border-border/70 bg-background/60 p-3" key={step.label}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface text-foreground shadow-[0_1px_2px_color-mix(in_oklch,var(--foreground)_10%,transparent)]">
                          <Icon className="size-[16px]" strokeWidth={2.2} />
                        </span>
                        {index < loopSteps.length - 1 ? (
                          <ArrowRight className="hidden size-4 shrink-0 text-muted md:block" strokeWidth={2.1} />
                        ) : (
                          <CheckCircle2 className="size-4 shrink-0 text-success" strokeWidth={2.2} />
                        )}
                      </div>
                      <p className="mt-4 text-[24px] font-semibold leading-none text-foreground">{step.value}</p>
                      <p className="mt-2 text-[12px] font-semibold leading-4 text-foreground">{step.label}</p>
                      <p className="mt-0.5 text-[11px] leading-4 text-muted">{step.detail}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </Card.Content>
        </Card>

        <AutomationSplit isLoading={isLoading} totals={totals} />
      </section>

      <section className="grid gap-3 xl:grid-cols-[0.95fr_1.2fr]">
        <AgentPerformance analytics={analytics} isLoading={isLoading} />
        <RecentEvents events={events} isLoading={isLoading} />
      </section>

      <WeeklyLoop analytics={analytics} isLoading={isLoading} maxWeekly={maxWeekly} />
    </>
  );
}

function AgentsDashboard({
  analytics,
  agents,
  isLoading,
  reviewTotal,
}: {
  analytics: AnalyticsOverview;
  agents: Agent[];
  isLoading: boolean;
  reviewTotal: number;
}) {
  const activeAgents = agents.filter((agent) => agent.status === "Active").length;
  const autoReplyAgents = agents.filter((agent) => agent.autoReply).length;
  const avgConfidence = averageConfidence(analytics.agentPerformance.map((agent) => agent.confidence));

  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Bot} isLoading={isLoading} label="Active agents" value={activeAgents} detail={`${agents.length} configured`} tone="success" />
        <MetricCard icon={Inbox} isLoading={isLoading} label="Auto reply agents" value={autoReplyAgents} detail="enabled in agent settings" tone="accent" />
        <MetricCard icon={ShieldCheck} isLoading={isLoading} label="Avg confidence" value={`${avgConfidence}%`} detail="generated replies" tone="success" />
        <MetricCard icon={UserCheck} isLoading={isLoading} label="Needs review" value={reviewTotal} detail="pending approvals" tone="warning" />
      </section>

      <section className="grid gap-3 xl:grid-cols-[1fr_1fr]">
        <AgentPerformance analytics={analytics} isLoading={isLoading} />
        <Card className="apple-shadow min-w-0 border border-border/70 bg-surface p-4">
          <Card.Header className="p-0">
            <Card.Title className="text-[15px] font-semibold">Configured agents</Card.Title>
            <p className="mt-1 text-[12px] leading-5 text-muted">Current AI agents available for PlusVibe campaign routing.</p>
          </Card.Header>
          <Card.Content className="space-y-3 p-0 pt-4">
            {isLoading ? <ListSkeleton rows={4} /> : agents.length === 0 ? (
              <EmptyBlock>No AI agents have been configured yet.</EmptyBlock>
            ) : agents.map((agent) => (
              <div className="rounded-[14px] border border-border/70 p-3" key={agent.id || agent.name}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold leading-5 text-foreground">{agent.name}</p>
                    <p className="truncate text-[11px] leading-4 text-muted">{agent.inbox || "Campaign assigned"} · {agent.model}</p>
                  </div>
                  <Chip className="h-[22px] min-h-[22px] px-2 text-[11px] font-semibold" color={agent.status === "Active" ? "success" : "warning"} size="sm" variant="soft">
                    {agent.status}
                  </Chip>
                </div>
                <p className="mt-3 line-clamp-2 text-[12px] leading-5 text-foreground">{agent.purpose || agent.objective || "Configured reply workflow"}</p>
              </div>
            ))}
          </Card.Content>
        </Card>
      </section>
    </>
  );
}

function ReviewDashboard({
  analytics,
  isLoading,
  reviews,
  reviewTotal,
}: {
  analytics: AnalyticsOverview;
  isLoading: boolean;
  reviews: HumanReviewItem[];
  reviewTotal: number;
}) {
  const sent = getSummaryValue(analytics, "AI replies sent");
  const reviewed = getSummaryValue(analytics, "Human reviewed");
  const medianDraftTime = analytics.trainingImpact.find((item) => item.label === "Median draft time")?.value || "0s";

  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={UserCheck} isLoading={isLoading} label="Needs review" value={reviewTotal} detail="open drafts" tone="warning" />
        <MetricCard icon={Clock3} isLoading={isLoading} label="Median draft time" value={medianDraftTime} detail="AI generation" tone="accent" />
        <MetricCard icon={CheckCircle2} isLoading={isLoading} label="Reviewed" value={reviewed} detail="approved, rejected, or manual" tone="accent" />
        <MetricCard icon={Send} isLoading={isLoading} label="Sent replies" value={sent} detail="approved AI sends" tone="success" />
      </section>

      <section className="grid gap-3 xl:grid-cols-[0.85fr_1.15fr]">
        <ReviewTriggers analytics={analytics} isLoading={isLoading} />
        <PendingReviews isLoading={isLoading} reviews={reviews} reviewTotal={reviewTotal} />
      </section>
    </>
  );
}

function AutomationSplit({ isLoading, totals }: { isLoading: boolean; totals: ReturnType<typeof getDashboardTotals> }) {
  const total = Math.max(1, totals.generated + totals.sent + totals.pendingReview);
  const items = [
    { label: "Sent", value: totals.sent, color: "bg-success" },
    { label: "Waiting review", value: totals.pendingReview, color: "bg-warning" },
    { label: "Generated", value: totals.generated, color: "bg-accent" },
  ];

  return (
    <Card className="apple-shadow min-w-0 border border-border/70 bg-surface p-4">
      <Card.Header className="p-0">
        <div>
          <Card.Title className="text-[15px] font-semibold">Automation split</Card.Title>
          <p className="mt-1 text-[12px] leading-5 text-muted">Current outcomes from stored webhook, draft, and send records.</p>
        </div>
      </Card.Header>
      <Card.Content className="p-0 pt-5">
        {isLoading ? <ListSkeleton rows={3} /> : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.label}>
                <div className="mb-1.5 flex items-center justify-between text-[12px]">
                  <span className="font-medium text-foreground">{item.label}</span>
                  <span className="font-semibold text-foreground">{item.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-default-100">
                  <div className={`h-full rounded-full ${item.color}`} style={{ width: `${Math.round((item.value / total) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card.Content>
    </Card>
  );
}

function WeeklyLoop({ analytics, isLoading, maxWeekly }: { analytics: AnalyticsOverview; isLoading: boolean; maxWeekly: number }) {
  return (
    <Card className="apple-shadow border border-border/70 bg-surface p-4">
      <Card.Header className="items-start justify-between gap-4 p-0">
        <div>
          <Card.Title className="text-[15px] font-semibold">PlusVibe reply loop</Card.Title>
          <Card.Description>Positive replies compared with sent and human-review volume.</Card.Description>
        </div>
        <Chip className="h-[24px] min-h-[24px] px-2 text-[11px] font-semibold" color="accent" size="sm" variant="soft">
          {analytics.range.label}
        </Chip>
      </Card.Header>
      <Card.Content className="p-0 pt-5">
        {isLoading ? <ListSkeleton rows={7} /> : analytics.weeklyLoop.length === 0 ? <EmptyBlock>No reply activity has been recorded yet.</EmptyBlock> : (
          <div className="space-y-3">
            {analytics.weeklyLoop.map((day) => {
              const incoming = Math.max(1, day.incoming);

              return (
                <div className="grid grid-cols-[38px_minmax(0,1fr)_132px] items-center gap-3" key={day.day}>
                  <span className="text-[12px] font-semibold text-muted">{day.day}</span>
                  <div className="h-7 overflow-hidden rounded-full bg-default-100">
                    <div className="flex h-full" style={{ width: `${Math.max(16, Math.round((day.incoming / maxWeekly) * 100))}%` }}>
                      <span className="h-full bg-success" style={{ width: `${Math.min(100, (day.sent / incoming) * 100)}%` }} />
                      <span className="h-full bg-warning" style={{ width: `${Math.min(100, (day.review / incoming) * 100)}%` }} />
                      <span className="h-full bg-accent/50" style={{ width: `${Math.max(0, ((incoming - day.sent - day.review) / incoming) * 100)}%` }} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 text-[11px] font-medium text-muted">
                    <span>{day.sent} sent</span>
                    <span>{day.review} review</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card.Content>
    </Card>
  );
}

function AgentPerformance({ analytics, isLoading }: { analytics: AnalyticsOverview; isLoading: boolean }) {
  return (
    <Card className="apple-shadow min-w-0 border border-border/70 bg-surface p-4">
      <Card.Header className="p-0">
        <Card.Title className="text-[15px] font-semibold">Agent performance</Card.Title>
        <p className="mt-1 text-[12px] leading-5 text-muted">Generated replies, sends, confidence, and review reasons by agent.</p>
      </Card.Header>
      <Card.Content className="space-y-3 p-0 pt-4">
        {isLoading ? <ListSkeleton rows={4} /> : analytics.agentPerformance.length === 0 ? <EmptyBlock>No agent performance data yet.</EmptyBlock> : (
          analytics.agentPerformance.map((agent) => (
            <div className="rounded-[14px] border border-border/70 p-3" key={agent.agent}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold leading-5 text-foreground">{agent.agent}</p>
                  <p className="truncate text-[11px] leading-4 text-muted">{agent.inbox}</p>
                </div>
                <Chip className="h-[22px] min-h-[22px] px-2 text-[11px] font-semibold" color={agent.review === "None" ? "success" : "warning"} size="sm" variant="soft">
                  {agent.confidence}
                </Chip>
              </div>
              <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-3">
                <span className="rounded-full bg-default-100 px-2.5 py-1 font-medium text-foreground">{agent.replies} replies</span>
                <span className="rounded-full bg-default-100 px-2.5 py-1 font-medium text-foreground">{agent.autoSent} sent</span>
                <span className="truncate rounded-full bg-default-100 px-2.5 py-1 text-muted">{agent.review}</span>
              </div>
            </div>
          ))
        )}
      </Card.Content>
    </Card>
  );
}

function RecentEvents({ events, isLoading }: { events: EventLogRecord[]; isLoading: boolean }) {
  return (
    <Card className="apple-shadow min-w-0 border border-border/70 bg-surface p-4">
      <Card.Header className="items-center justify-between p-0">
        <Card.Title className="text-[15px] font-semibold">Recent events</Card.Title>
        <Chip className="h-[22px] min-h-[22px] px-2 text-[11px] font-semibold" color="accent" size="sm" variant="soft">
          Live
        </Chip>
      </Card.Header>
      <Card.Content className="p-0 pt-4">
        {isLoading ? <ListSkeleton rows={5} /> : events.length === 0 ? <EmptyBlock>No events have been logged yet.</EmptyBlock> : (
          <div className="space-y-3">
            {events.map((event) => (
              <div className="flex gap-3 rounded-[14px] bg-background/70 p-3" key={event.id}>
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-surface text-foreground">
                  {event.eventType.includes("sent") ? <Send className="size-[14px]" /> : event.eventType.includes("draft") ? <Bot className="size-[14px]" /> : <MessageSquareText className="size-[14px]" />}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-medium leading-5 text-foreground">{formatEventName(event.eventType)}</p>
                  <p className="mt-0.5 truncate text-[11px] leading-4 text-muted">
                    {event.leadEmail || event.campaignName || event.source} · {formatAge(event.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card.Content>
    </Card>
  );
}

function ReviewTriggers({ analytics, isLoading }: { analytics: AnalyticsOverview; isLoading: boolean }) {
  return (
    <Card className="apple-shadow min-w-0 border border-border/70 bg-surface p-4">
      <Card.Header className="p-0">
        <Card.Title className="text-[15px] font-semibold">Review triggers</Card.Title>
        <p className="mt-1 text-[12px] leading-5 text-muted">Why ReplyOS held or escalated drafts before sending.</p>
      </Card.Header>
      <Card.Content className="space-y-4 p-0 pt-5">
        {isLoading ? <ListSkeleton rows={4} /> : analytics.reviewTriggers.length === 0 ? <EmptyBlock>No review triggers have been recorded yet.</EmptyBlock> : (
          analytics.reviewTriggers.map((trigger) => (
            <div key={trigger.label}>
              <div className="mb-1.5 flex items-center justify-between text-[12px]">
                <span className="font-medium text-foreground">{trigger.label}</span>
                <span className="font-semibold text-foreground">{trigger.count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-default-100">
                <div className="h-full rounded-full bg-warning" style={{ width: `${trigger.value}%` }} />
              </div>
            </div>
          ))
        )}
      </Card.Content>
    </Card>
  );
}

function PendingReviews({ isLoading, reviews, reviewTotal }: { isLoading: boolean; reviews: HumanReviewItem[]; reviewTotal: number }) {
  return (
    <Card className="apple-shadow min-w-0 border border-border/70 bg-surface p-4">
      <Card.Header className="items-start justify-between gap-4 p-0">
        <div>
          <Card.Title className="text-[15px] font-semibold">Pending approvals</Card.Title>
          <p className="mt-1 text-[12px] leading-5 text-muted">Latest AI drafts waiting for human review.</p>
        </div>
        <Chip className="h-[24px] min-h-[24px] px-2 text-[11px] font-semibold" color="warning" size="sm" variant="soft">
          {reviewTotal}
        </Chip>
      </Card.Header>
      <Card.Content className="space-y-3 p-0 pt-4">
        {isLoading ? <ListSkeleton rows={5} /> : reviews.length === 0 ? <EmptyBlock>No drafts are waiting for approval.</EmptyBlock> : (
          reviews.map((review) => (
            <div className="rounded-[14px] border border-border/70 p-3" key={review.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold leading-5 text-foreground">{review.leadName}</p>
                  <p className="truncate text-[11px] leading-4 text-muted">{review.campaignName} · {review.agentName}</p>
                </div>
                <span className="shrink-0 text-[11px] font-medium text-muted">{formatAge(review.updatedAt)}</span>
              </div>
              <p className="mt-3 line-clamp-2 text-[12px] leading-5 text-foreground">{review.triggerPreview || review.body}</p>
            </div>
          ))
        )}
      </Card.Content>
    </Card>
  );
}

function MetricCard({
  detail,
  icon: Icon,
  isLoading,
  label,
  tone,
  value,
}: {
  detail: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  isLoading: boolean;
  label: string;
  tone: "accent" | "success" | "warning";
  value: number | string;
}) {
  return (
    <Card className="apple-shadow border border-border/70 bg-surface p-4">
      <Card.Content className="p-0">
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-9 w-9 rounded-full bg-surface-secondary" />
            <div className="h-6 w-20 rounded-full bg-surface-secondary" />
            <div className="h-3 w-28 rounded-full bg-surface-secondary" />
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <span className="grid size-9 place-items-center rounded-full bg-default-100 text-foreground">
                <Icon className="size-[17px]" strokeWidth={2.2} />
              </span>
              <Chip className="h-[22px] min-h-[22px] px-2 text-[11px] font-semibold" color={tone} size="sm" variant="soft">
                Live
              </Chip>
            </div>
            <p className="mt-5 text-[26px] font-semibold leading-none text-foreground">{value}</p>
            <p className="mt-2 text-[12px] font-semibold text-foreground">{label}</p>
            <p className="mt-0.5 text-[11px] text-muted">{detail}</p>
          </>
        )}
      </Card.Content>
    </Card>
  );
}

function FriendlyError({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
      {message}
    </div>
  );
}

function EmptyBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[14px] bg-surface-secondary px-4 py-6 text-center text-sm text-muted">
      {children}
    </div>
  );
}

function ListSkeleton({ rows }: { rows: number }) {
  return <LoadingState minHeight={Math.max(120, rows * 30)} />;
}

function StepSkeleton() {
  return <LoadingState />;
}

function getDashboardTotals(analytics: AnalyticsOverview, pendingReview: number) {
  const incoming = getSummaryValue(analytics, "Prospect replies");
  const sent = getSummaryValue(analytics, "AI replies sent");
  const reviewed = getSummaryValue(analytics, "Human reviewed");
  const generated = analytics.weeklyLoop.reduce((sum, day) => sum + day.sent + day.review, 0);

  return {
    incoming,
    sent,
    reviewed,
    pendingReview,
    generated,
  };
}

function getSummaryValue(analytics: AnalyticsOverview, label: string) {
  return Number(analytics.summary.find((item) => item.label === label)?.value || 0);
}

function averageConfidence(values: string[]) {
  const parsed = values.map((value) => Number.parseInt(value, 10)).filter(Number.isFinite);
  if (parsed.length === 0) return 0;

  return Math.round(parsed.reduce((sum, value) => sum + value, 0) / parsed.length);
}

function formatAge(value?: string | null) {
  if (!value) return "Just now";

  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Just now";

  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.round(hours / 24);
  return `${days}d`;
}

function formatEventName(value: string) {
  return value
    .split(".")
    .join(" ")
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
