import { Button, Card, Chip } from "@heroui/react";
import {
  Bot,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock3,
  MessageSquareText,
  ShieldAlert,
  Target,
  TrendingUp,
  UserCheck,
} from "lucide-react";

const summary = [
  { label: "Prospect replies", value: "1,284", change: "+18%", icon: MessageSquareText, tone: "accent" },
  { label: "AI replies sent", value: "842", change: "65.6%", icon: Bot, tone: "success" },
  { label: "Human reviewed", value: "219", change: "17.1%", icon: UserCheck, tone: "warning" },
  { label: "Meetings booked", value: "74", change: "+12", icon: Target, tone: "success" },
];

const intentMix = [
  { label: "Questions", value: 34, count: 436, color: "bg-accent" },
  { label: "Interested", value: 26, count: 334, color: "bg-success" },
  { label: "Objections", value: 19, count: 244, color: "bg-warning" },
  { label: "Meeting requests", value: 12, count: 154, color: "bg-foreground/60" },
  { label: "Not interested", value: 9, count: 116, color: "bg-danger" },
];

const agentRows = [
  {
    agent: "Outbound Sales Agent",
    inbox: "PLWH Sales",
    replies: 486,
    autoSent: "72%",
    confidence: "96%",
    meetings: 31,
    review: "Pricing claims",
  },
  {
    agent: "Enterprise Agent",
    inbox: "PLWH Enterprise",
    replies: 318,
    autoSent: "58%",
    confidence: "91%",
    meetings: 24,
    review: "Complex buying committees",
  },
  {
    agent: "Demo Agent",
    inbox: "PLWH Demos",
    replies: 182,
    autoSent: "41%",
    confidence: "88%",
    meetings: 19,
    review: "Calendar handoff",
  },
];

const reviewTriggers = [
  { label: "Confidence below 95%", value: 38 },
  { label: "Pricing or discount request", value: 24 },
  { label: "Guarantee or legal claim", value: 17 },
  { label: "Missing knowledge source", value: 13 },
  { label: "Competitor comparison", value: 8 },
];

const weeklyLoop = [
  { day: "Mon", incoming: 164, sent: 111, review: 24 },
  { day: "Tue", incoming: 188, sent: 126, review: 31 },
  { day: "Wed", incoming: 176, sent: 119, review: 26 },
  { day: "Thu", incoming: 211, sent: 141, review: 35 },
  { day: "Fri", incoming: 203, sent: 137, review: 30 },
  { day: "Sat", incoming: 96, sent: 62, review: 14 },
  { day: "Sun", incoming: 74, sent: 48, review: 9 },
];

const maxWeekly = Math.max(...weeklyLoop.map((item) => item.incoming));

export function Analytics() {
  return (
    <div className="mx-auto flex max-w-[1480px] flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold leading-7 text-foreground">Reply analytics</h1>
          <p className="mt-1 text-[13px] leading-5 text-muted">
            Performance across PlusVibe replies, AI decisions, review routing, and sales outcomes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button className="h-[34px] rounded-full px-3 text-[14px] font-semibold leading-none text-foreground" size="sm" variant="secondary">
            <Calendar className="size-[17px]" strokeWidth={2.35} />
            Last 30 days
            <ChevronDown className="size-[16px]" strokeWidth={2.35} />
          </Button>
          <Button className="h-[34px] rounded-full px-4 text-[14px] font-semibold leading-none" size="sm">
            Export report
          </Button>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => {
          const Icon = item.icon;

          return (
            <Card className="apple-shadow border border-transparent bg-surface p-4 dark:border-default-100" key={item.label}>
              <Card.Content className="p-0">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-9 place-items-center rounded-full bg-default-100 text-foreground">
                    <Icon className="size-[17px]" strokeWidth={2.2} />
                  </span>
                  <Chip className="h-[22px] min-h-[22px] px-2 text-[11px] font-semibold" color={item.tone as "accent" | "success" | "warning"} size="sm" variant="soft">
                    {item.change}
                  </Chip>
                </div>
                <p className="mt-5 text-[26px] font-semibold leading-none text-foreground">{item.value}</p>
                <p className="mt-2 text-[12px] font-medium text-muted">{item.label}</p>
              </Card.Content>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="apple-shadow border border-border/70 bg-surface p-4">
          <Card.Header className="items-start justify-between gap-4 p-0">
            <div>
              <Card.Title className="text-[15px] font-semibold">PlusVibe reply loop</Card.Title>
              <Card.Description>Incoming prospect replies compared with AI-sent and human-review volume.</Card.Description>
            </div>
            <Chip className="h-[24px] min-h-[24px] px-2 text-[11px] font-semibold" color="accent" size="sm" variant="soft">
              7 days
            </Chip>
          </Card.Header>
          <Card.Content className="p-0 pt-5">
            <div className="space-y-3">
              {weeklyLoop.map((day) => (
                <div className="grid grid-cols-[38px_minmax(0,1fr)_124px] items-center gap-3" key={day.day}>
                  <span className="text-[12px] font-semibold text-muted">{day.day}</span>
                  <div className="h-7 overflow-hidden rounded-full bg-default-100">
                    <div className="flex h-full" style={{ width: `${Math.max(18, Math.round((day.incoming / maxWeekly) * 100))}%` }}>
                      <span className="h-full bg-accent" style={{ width: `${(day.sent / day.incoming) * 100}%` }} />
                      <span className="h-full bg-warning" style={{ width: `${(day.review / day.incoming) * 100}%` }} />
                      <span className="h-full bg-foreground/20" style={{ width: `${((day.incoming - day.sent - day.review) / day.incoming) * 100}%` }} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 text-[11px] font-medium text-muted">
                    <span>{day.sent} sent</span>
                    <span>{day.review} review</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3 text-[11px] font-medium text-muted">
              <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-accent" />AI sent</span>
              <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-warning" />Human review</span>
              <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-foreground/20" />Held / pending</span>
            </div>
          </Card.Content>
        </Card>

        <Card className="apple-shadow border border-border/70 bg-surface p-4">
          <Card.Header className="p-0">
            <Card.Title className="text-[15px] font-semibold">Intent mix</Card.Title>
            <Card.Description>AI classification of prospect replies.</Card.Description>
          </Card.Header>
          <Card.Content className="space-y-4 p-0 pt-5">
            {intentMix.map((intent) => (
              <div key={intent.label}>
                <div className="mb-1.5 flex items-center justify-between text-[12px]">
                  <span className="font-medium text-foreground">{intent.label}</span>
                  <span className="font-semibold text-foreground">{intent.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-default-100">
                  <div className={`h-full rounded-full ${intent.color}`} style={{ width: `${intent.value}%` }} />
                </div>
              </div>
            ))}
          </Card.Content>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Card className="apple-shadow border border-border/70 bg-surface p-4">
          <Card.Header className="p-0">
            <Card.Title className="text-[15px] font-semibold">Review triggers</Card.Title>
            <Card.Description>Why deterministic backend validation routed replies to humans.</Card.Description>
          </Card.Header>
          <Card.Content className="space-y-4 p-0 pt-5">
            {reviewTriggers.map((trigger) => (
              <div className="grid grid-cols-[minmax(0,1fr)_48px] items-center gap-3" key={trigger.label}>
                <div>
                  <div className="mb-1.5 flex items-center gap-2 text-[12px] font-medium text-foreground">
                    {trigger.label.includes("legal") ? <ShieldAlert className="size-[14px] text-danger" /> : <CheckCircle2 className="size-[14px] text-muted" />}
                    {trigger.label}
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-default-100">
                    <div className="h-full rounded-full bg-warning" style={{ width: `${trigger.value}%` }} />
                  </div>
                </div>
                <span className="text-right text-[13px] font-semibold text-foreground">{trigger.value}%</span>
              </div>
            ))}
          </Card.Content>
        </Card>

        <Card className="apple-shadow border border-border/70 bg-surface p-4">
          <Card.Header className="p-0">
            <Card.Title className="text-[15px] font-semibold">Training impact</Card.Title>
            <Card.Description>How approved examples and knowledge updates changed reply quality.</Card.Description>
          </Card.Header>
          <Card.Content className="grid gap-3 p-0 pt-5 sm:grid-cols-3">
            <div className="rounded-[14px] bg-background/70 p-3">
              <TrendingUp className="mb-4 size-[18px] text-success" strokeWidth={2.2} />
              <p className="text-[22px] font-semibold leading-none text-foreground">+9.4%</p>
              <p className="mt-2 text-[12px] leading-5 text-muted">Positive reply rate after adding high-quality examples.</p>
            </div>
            <div className="rounded-[14px] bg-background/70 p-3">
              <Clock3 className="mb-4 size-[18px] text-accent" strokeWidth={2.2} />
              <p className="text-[22px] font-semibold leading-none text-foreground">2.1m</p>
              <p className="mt-2 text-[12px] leading-5 text-muted">Median time from PlusVibe reply to validated draft.</p>
            </div>
            <div className="rounded-[14px] bg-background/70 p-3">
              <Target className="mb-4 size-[18px] text-foreground" strokeWidth={2.2} />
              <p className="text-[22px] font-semibold leading-none text-foreground">81%</p>
              <p className="mt-2 text-[12px] leading-5 text-muted">Replies aligned with the agent objective on first draft.</p>
            </div>
          </Card.Content>
        </Card>
      </section>

      <Card className="apple-shadow overflow-hidden border border-border/70 bg-surface p-4">
        <Card.Header className="items-start justify-between gap-4 p-0">
          <div>
            <Card.Title className="text-[15px] font-semibold">Agent performance</Card.Title>
            <Card.Description>Operational quality by assigned inbox and configured AI agent.</Card.Description>
          </div>
          <Chip className="h-[24px] min-h-[24px] px-2 text-[11px] font-semibold" color="success" size="sm" variant="soft">
            Healthy
          </Chip>
        </Card.Header>
        <Card.Content className="thin-scrollbar overflow-x-auto p-0 pt-4">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-[11px] font-semibold text-muted">
              <tr className="border-b border-border/70">
                <th className="py-3 pr-4">Agent</th>
                <th className="py-3 pr-4">Inbox</th>
                <th className="py-3 pr-4">Replies</th>
                <th className="py-3 pr-4">Auto-sent</th>
                <th className="py-3 pr-4">Confidence</th>
                <th className="py-3 pr-4">Meetings</th>
                <th className="py-3">Top review reason</th>
              </tr>
            </thead>
            <tbody>
              {agentRows.map((row) => (
                <tr className="border-b border-border/70 last:border-b-0" key={row.agent}>
                  <td className="py-3 pr-4 font-semibold text-foreground">{row.agent}</td>
                  <td className="py-3 pr-4 text-muted">{row.inbox}</td>
                  <td className="py-3 pr-4 font-medium text-foreground">{row.replies}</td>
                  <td className="py-3 pr-4 text-foreground">{row.autoSent}</td>
                  <td className="py-3 pr-4 text-foreground">{row.confidence}</td>
                  <td className="py-3 pr-4 font-medium text-foreground">{row.meetings}</td>
                  <td className="py-3 text-muted">{row.review}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card.Content>
      </Card>
    </div>
  );
}
