import { Button, Card, Chip, Input, Table, Tabs } from "@heroui/react";
import { useState } from "react";
import {
  ArrowRight,
  Bot,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Eye,
  Inbox,
  ListFilter,
  MessageSquareText,
  RefreshCw,
  Route,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  UserCheck,
  Zap,
} from "lucide-react";

type DashboardView = "loop" | "agents" | "review";

const loopSteps = [
  { label: "PlusVibe reply", value: "217", detail: "received today", icon: Inbox },
  { label: "Context built", value: "211", detail: "lead + thread matched", icon: Route },
  { label: "AI decision", value: "196", detail: "strategy generated", icon: Bot },
  { label: "Sent or reviewed", value: "188", detail: "validated actions", icon: ShieldCheck },
];

const workload = [
  { label: "Auto-sent", value: 142, total: 188, color: "bg-success" },
  { label: "Human review", value: 31, total: 188, color: "bg-warning" },
  { label: "Paused by rule", value: 15, total: 188, color: "bg-danger" },
];

const agentHealth = [
  {
    name: "Alex - Outbound Sales",
    inbox: "PLWH / Growth inbox",
    objective: "Move qualified prospects to discovery",
    confidence: 96,
    autoSend: "Enabled",
    reviewTrigger: "Below 95% confidence",
    status: "Active",
  },
  {
    name: "Maya - Objection Handler",
    inbox: "PLWH / Follow-up inbox",
    objective: "Handle agency and budget objections",
    confidence: 91,
    autoSend: "Review gated",
    reviewTrigger: "Pricing or guarantee language",
    status: "Watching",
  },
  {
    name: "Noah - FAQ Replies",
    inbox: "PLWH / Support handoff",
    objective: "Answer product and process questions",
    confidence: 98,
    autoSend: "Enabled",
    reviewTrigger: "Unknown knowledge source",
    status: "Active",
  },
];

const reviewQueue = [
  {
    id: "CNV-1042",
    lead: "Nora Bennett",
    company: "Kinetic Labs",
    intent: "Pricing question",
    stage: "Evaluation",
    confidence: 93,
    trigger: "Below auto-send threshold",
    agent: "Alex",
    age: "7m",
  },
  {
    id: "CNV-1038",
    lead: "Omar Siddiqui",
    company: "Northstar Clinics",
    intent: "Existing vendor objection",
    stage: "Objection",
    confidence: 89,
    trigger: "Competitor mention",
    agent: "Maya",
    age: "18m",
  },
  {
    id: "CNV-1031",
    lead: "Leah Park",
    company: "Cobalt Media",
    intent: "Meeting request",
    stage: "High intent",
    confidence: 97,
    trigger: "Calendar claim blocked",
    agent: "Alex",
    age: "24m",
  },
  {
    id: "CNV-1025",
    lead: "Diego Alvarez",
    company: "BrightPath",
    intent: "Feature question",
    stage: "Discovery",
    confidence: 92,
    trigger: "Knowledge gap",
    agent: "Noah",
    age: "41m",
  },
];

const recentDecisions = [
  "Answered pricing question and transitioned to discovery call.",
  "Held response because prospect asked for a guarantee.",
  "Matched objection to high-quality training example.",
  "Used approved PlusVibe onboarding FAQ in generated reply.",
];

export function Dashboard() {
  const [view, setView] = useState<DashboardView>("loop");

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
          <Button className="size-[34px] min-w-[34px] rounded-full p-0 text-foreground" size="sm" variant="secondary" aria-label="Refresh dashboard">
            <RefreshCw className="size-[17px]" strokeWidth={2.35} />
          </Button>
          <Button className="h-[34px] rounded-full px-3 text-[14px] font-semibold leading-none text-foreground" size="sm" variant="secondary">
            <Calendar className="size-[17px]" strokeWidth={2.35} />
            Today
            <ChevronDown className="size-[16px]" strokeWidth={2.35} />
          </Button>
          <Button className="h-[34px] rounded-full px-4 text-[14px] font-semibold leading-none" size="sm">
            <Eye className="size-[16px]" strokeWidth={2.3} />
            Review queue
          </Button>
        </div>
      </div>

      {view === "loop" ? <ReplyLoopView /> : null}
      {view === "agents" ? <AgentsDashboard /> : null}
      {view === "review" ? <ReviewDashboard /> : null}
    </div>
  );
}

function ReplyLoopView() {
  return (
    <>
      <section className="grid gap-3 xl:grid-cols-[1.45fr_0.85fr]">
        <Card className="apple-shadow min-w-0 border border-transparent bg-surface p-4 dark:border-default-100">
          <Card.Header className="items-start justify-between gap-4 p-0">
            <div className="min-w-0">
              <Card.Title className="text-[15px] font-semibold">Reply automation loop</Card.Title>
              <p className="mt-1 max-w-[68ch] text-[12px] leading-5 text-muted">
                Live path from PlusVibe reply ingestion through AI context, deterministic rule checks, and final send or review decision.
              </p>
            </div>
            <Chip className="h-[24px] min-h-[24px] px-2 text-[11px] font-semibold" color="success" size="sm" variant="soft">
              Processing
            </Chip>
          </Card.Header>

          <Card.Content className="p-0 pt-5">
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
          </Card.Content>
        </Card>

        <Card className="apple-shadow min-w-0 border border-transparent bg-surface p-4 dark:border-default-100">
          <Card.Header className="p-0">
            <div>
              <Card.Title className="text-[15px] font-semibold">Automation split</Card.Title>
              <p className="mt-1 text-[12px] leading-5 text-muted">Decision outcomes after safety and policy validation.</p>
            </div>
          </Card.Header>
          <Card.Content className="p-0 pt-5">
            <div className="space-y-4">
              {workload.map((item) => (
                <div key={item.label}>
                  <div className="mb-1.5 flex items-center justify-between text-[12px]">
                    <span className="font-medium text-foreground">{item.label}</span>
                    <span className="font-semibold text-foreground">{item.value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-default-100">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${Math.round((item.value / item.total) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-[14px] bg-background/70 p-3">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-foreground">
                <Clock3 className="size-[15px] text-warning" strokeWidth={2.2} />
                3 replies are waiting longer than 15 minutes
              </div>
              <p className="mt-1 text-[11px] leading-4 text-muted">Review SLA is healthy, but pricing and guarantee language are the main blockers.</p>
            </div>
          </Card.Content>
        </Card>
      </section>

      <section className="grid gap-3 xl:grid-cols-[0.95fr_1.2fr]">
        <AgentHealth />
        <DecisionLog />
      </section>

      <ReviewQueue />
    </>
  );
}

function AgentsDashboard() {
  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Active agents", value: "8", detail: "6 auto-reply enabled", icon: Bot, tone: "success" },
          { label: "Assigned inboxes", value: "12", detail: "PlusVibe workspaces", icon: Inbox, tone: "accent" },
          { label: "Avg confidence", value: "94%", detail: "last 24 hours", icon: ShieldCheck, tone: "success" },
          { label: "Rules blocking send", value: "15", detail: "need policy review", icon: UserCheck, tone: "warning" },
        ].map((metric) => {
          const Icon = metric.icon;

          return (
            <Card className="apple-shadow border border-transparent bg-surface p-4 dark:border-default-100" key={metric.label}>
              <Card.Content className="p-0">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-9 place-items-center rounded-full bg-default-100 text-foreground">
                    <Icon className="size-[17px]" strokeWidth={2.2} />
                  </span>
                  <Chip className="h-[22px] min-h-[22px] px-2 text-[11px] font-semibold" color={metric.tone as "accent" | "success" | "warning"} size="sm" variant="soft">
                    Live
                  </Chip>
                </div>
                <p className="mt-5 text-[26px] font-semibold leading-none text-foreground">{metric.value}</p>
                <p className="mt-2 text-[12px] font-semibold text-foreground">{metric.label}</p>
                <p className="mt-0.5 text-[11px] text-muted">{metric.detail}</p>
              </Card.Content>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-3 xl:grid-cols-[1fr_1fr]">
        <AgentHealth />
        <Card className="apple-shadow min-w-0 border border-transparent bg-surface p-4 dark:border-default-100">
          <Card.Header className="p-0">
            <Card.Title className="text-[15px] font-semibold">Agent configuration checks</Card.Title>
            <p className="mt-1 text-[12px] leading-5 text-muted">Operational readiness across persona, knowledge, examples, automation, and escalation rules.</p>
          </Card.Header>
          <Card.Content className="space-y-3 p-0 pt-4">
            {[
              ["Persona and objective", "8 / 8 agents configured", 100, "success"],
              ["Knowledge access", "7 / 8 have approved sources", 88, "accent"],
              ["Training examples", "214 high-quality replies enabled", 76, "accent"],
              ["Safety rules", "2 agents need guarantee-language review", 72, "warning"],
            ].map(([label, detail, value, tone]) => (
              <div className="rounded-[14px] border border-border/70 p-3" key={label}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">{label}</p>
                    <p className="mt-0.5 text-[11px] text-muted">{detail}</p>
                  </div>
                  <Chip className="h-[22px] min-h-[22px] px-2 text-[11px] font-semibold" color={tone as "accent" | "success" | "warning"} size="sm" variant="soft">
                    {value}%
                  </Chip>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-default-100">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
          </Card.Content>
        </Card>
      </section>

      <Card className="apple-shadow overflow-hidden border border-border/70 bg-surface p-4">
        <Card.Header className="items-start justify-between gap-4 p-0">
          <div>
            <Card.Title className="text-[15px] font-semibold">Agent inbox assignments</Card.Title>
            <p className="mt-1 text-[12px] leading-5 text-muted">Which AI agents are handling PlusVibe replies and where automation is gated.</p>
          </div>
          <Button className="h-[30px] rounded-full px-3 text-[13px] font-medium text-foreground" size="sm" variant="secondary">
            Create agent
          </Button>
        </Card.Header>
        <Card.Content className="thin-scrollbar overflow-x-auto p-0 pt-4">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="text-[11px] font-semibold text-muted">
              <tr className="border-b border-border/70">
                <th className="py-3 pr-4">Agent</th>
                <th className="py-3 pr-4">Inbox</th>
                <th className="py-3 pr-4">Objective</th>
                <th className="py-3 pr-4">Auto-send</th>
                <th className="py-3 pr-4">Confidence</th>
                <th className="py-3">Escalation rule</th>
              </tr>
            </thead>
            <tbody>
              {agentHealth.map((agent) => (
                <tr className="border-b border-border/70 last:border-b-0" key={agent.name}>
                  <td className="py-3 pr-4 font-semibold text-foreground">{agent.name}</td>
                  <td className="py-3 pr-4 text-muted">{agent.inbox}</td>
                  <td className="py-3 pr-4 text-foreground">{agent.objective}</td>
                  <td className="py-3 pr-4 text-foreground">{agent.autoSend}</td>
                  <td className="py-3 pr-4 font-medium text-foreground">{agent.confidence}%</td>
                  <td className="py-3 text-muted">{agent.reviewTrigger}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card.Content>
      </Card>
    </>
  );
}

function ReviewDashboard() {
  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Needs review", value: "31", detail: "open drafts", tone: "warning" },
          { label: "Median age", value: "18m", detail: "review queue", tone: "accent" },
          { label: "Edited drafts", value: "11", detail: "operator adjusted", tone: "accent" },
          { label: "Approved today", value: "42", detail: "sent through PlusVibe", tone: "success" },
        ].map((metric) => (
          <Card className="apple-shadow border border-transparent bg-surface p-4 dark:border-default-100" key={metric.label}>
            <Card.Content className="p-0">
              <Chip className="h-[22px] min-h-[22px] px-2 text-[11px] font-semibold" color={metric.tone as "accent" | "success" | "warning"} size="sm" variant="soft">
                Human loop
              </Chip>
              <p className="mt-5 text-[26px] font-semibold leading-none text-foreground">{metric.value}</p>
              <p className="mt-2 text-[12px] font-semibold text-foreground">{metric.label}</p>
              <p className="mt-0.5 text-[11px] text-muted">{metric.detail}</p>
            </Card.Content>
          </Card>
        ))}
      </section>

      <section className="grid gap-3 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="apple-shadow min-w-0 border border-transparent bg-surface p-4 dark:border-default-100">
          <Card.Header className="p-0">
            <Card.Title className="text-[15px] font-semibold">Review causes</Card.Title>
            <p className="mt-1 text-[12px] leading-5 text-muted">Top reasons replies were held before sending.</p>
          </Card.Header>
          <Card.Content className="space-y-4 p-0 pt-5">
            {[
              { label: "Below 95% confidence", value: 38 },
              { label: "Pricing request", value: 24 },
              { label: "Guarantee language", value: 17 },
              { label: "Knowledge gap", value: 13 },
            ].map((cause) => (
              <div key={cause.label}>
                <div className="mb-1.5 flex items-center justify-between text-[12px]">
                  <span className="font-medium text-foreground">{cause.label}</span>
                  <span className="font-semibold text-foreground">{cause.value}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-default-100">
                  <div className="h-full rounded-full bg-warning" style={{ width: `${cause.value}%` }} />
                </div>
              </div>
            ))}
          </Card.Content>
        </Card>

        <DecisionLog />
      </section>

      <ReviewQueue />
    </>
  );
}

function AgentHealth() {
  return (
    <Card className="apple-shadow min-w-0 border border-transparent bg-surface p-4 dark:border-default-100">
      <Card.Header className="items-center justify-between p-0">
        <Card.Title className="text-[15px] font-semibold">Agent confidence</Card.Title>
        <Button className="h-[30px] rounded-full px-3 text-[13px] font-medium text-foreground" size="sm" variant="secondary">
          Manage agents
        </Button>
      </Card.Header>
      <Card.Content className="space-y-4 p-0 pt-4">
        {agentHealth.map((agent) => (
          <div className="rounded-[14px] border border-border/70 p-3" key={agent.name}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold leading-5 text-foreground">{agent.name}</p>
                <p className="truncate text-[11px] leading-4 text-muted">{agent.inbox}</p>
              </div>
              <Chip
                className="h-[22px] min-h-[22px] px-2 text-[11px] font-semibold"
                color={agent.status === "Active" ? "success" : "warning"}
                size="sm"
                variant="soft"
              >
                {agent.status}
              </Chip>
            </div>
            <p className="mt-3 text-[12px] leading-5 text-foreground">{agent.objective}</p>
            <div className="mt-3 flex items-center gap-3">
              <div
                aria-label={`${agent.name} confidence`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={agent.confidence}
                className="h-2 flex-1 overflow-hidden rounded-full bg-default-100"
                role="progressbar"
              >
                <div className="h-full rounded-full bg-accent" style={{ width: `${agent.confidence}%` }} />
              </div>
              <span className="w-9 text-right text-[12px] font-semibold text-foreground">{agent.confidence}%</span>
            </div>
            <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-2">
              <span className="rounded-full bg-default-100 px-2.5 py-1 font-medium text-foreground">{agent.autoSend}</span>
              <span className="truncate rounded-full bg-default-100 px-2.5 py-1 text-muted">{agent.reviewTrigger}</span>
            </div>
          </div>
        ))}
      </Card.Content>
    </Card>
  );
}

function DecisionLog() {
  return (
    <Card className="apple-shadow min-w-0 border border-transparent bg-surface p-4 dark:border-default-100">
      <Card.Header className="items-center justify-between p-0">
        <Card.Title className="text-[15px] font-semibold">Recent AI decisions</Card.Title>
        <Chip className="h-[22px] min-h-[22px] px-2 text-[11px] font-semibold" color="accent" size="sm" variant="soft">
          Explainable
        </Chip>
      </Card.Header>
      <Card.Content className="p-0 pt-4">
        <div className="space-y-3">
          {recentDecisions.map((decision, index) => (
            <div className="flex gap-3 rounded-[14px] bg-background/70 p-3" key={decision}>
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-surface text-foreground">
                {index === 0 ? <Send className="size-[14px]" /> : index === 1 ? <UserCheck className="size-[14px]" /> : index === 2 ? <Zap className="size-[14px]" /> : <MessageSquareText className="size-[14px]" />}
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-medium leading-5 text-foreground">{decision}</p>
                <p className="mt-0.5 text-[11px] leading-4 text-muted">
                  {index + 4} minutes ago · backend rule validation passed
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card.Content>
    </Card>
  );
}

function ToolbarButton({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <Button
      className="h-[30px] rounded-full bg-default-100 px-3 text-[13px] font-medium text-foreground"
      size="sm"
      variant="secondary"
    >
      <Icon className="size-[15px]" strokeWidth={2} />
      {children}
    </Button>
  );
}

function ReviewQueue() {
  return (
    <section className="mt-2">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-[14px] font-semibold leading-5 text-foreground">
          Human review queue
        </h2>
        <Chip className="h-[18px] min-h-[18px] px-1.5 text-[11px] font-semibold" color="warning" size="sm" variant="soft">
          31
        </Chip>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ToolbarButton icon={SlidersHorizontal}>Threshold</ToolbarButton>
          <ToolbarButton icon={ListFilter}>Trigger</ToolbarButton>
          <ToolbarButton icon={Bot}>Agent</ToolbarButton>
        </div>

        <div className="relative h-[30px] w-full shrink-0 sm:w-[254px] sm:min-w-[254px] sm:max-w-[254px]">
          <Search className="pointer-events-none absolute left-[14px] top-1/2 z-10 size-[13px] -translate-y-1/2 text-muted" strokeWidth={2} />
          <Input
            aria-label="Search review queue"
            className="employee-search h-[30px] w-full min-w-0 rounded-[9px] bg-surface pl-[35px] pr-3 text-[12px] text-foreground placeholder:text-muted"
            placeholder="Search lead, company, trigger..."
            type="search"
            variant="secondary"
          />
        </div>
      </div>

      <div className="apple-shadow overflow-hidden rounded-[20px] bg-surface-secondary p-[2px]">
        <Table className="employee-table" variant="secondary">
          <Table.ScrollContainer>
            <Table.Content aria-label="Human review queue table">
              <Table.Header>
                <Table.Column className="w-[118px]">Conversation</Table.Column>
                <Table.Column className="w-[220px]">Lead</Table.Column>
                <Table.Column>Intent</Table.Column>
                <Table.Column className="w-[144px]">Confidence</Table.Column>
                <Table.Column className="w-[230px]">Review trigger</Table.Column>
                <Table.Column className="w-[96px] text-right">Age</Table.Column>
              </Table.Header>
              <Table.Body>
                {reviewQueue.map((item) => (
                  <Table.Row key={item.id}>
                    <Table.Cell>
                      <span className="text-[13px] font-semibold text-foreground">{item.id}</span>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-semibold leading-4 text-foreground">{item.lead}</p>
                        <p className="truncate text-[11px] leading-4 text-muted">{item.company}</p>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-foreground">{item.intent}</p>
                        <p className="truncate text-[11px] text-muted">{item.stage} · {item.agent}</p>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <Chip
                        className="h-[22px] min-h-[22px] px-2 text-[11px] font-semibold"
                        color={item.confidence >= 95 ? "success" : "warning"}
                        size="sm"
                        variant="soft"
                      >
                        {item.confidence}%
                      </Chip>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-[13px] font-medium text-foreground">{item.trigger}</span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="block text-right text-[13px] font-semibold text-foreground">{item.age}</span>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </div>
    </section>
  );
}
