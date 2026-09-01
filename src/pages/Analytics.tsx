import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Calendar as HeroCalendar,
  Card,
  Chip,
  DateField,
  DatePicker,
  ListBox,
  Select,
  Spinner,
} from "@heroui/react";
import { parseDate } from "@internationalized/date";
import type { DateValue } from "@internationalized/date";
import {
  Bot,
  Calendar,
  CheckCircle2,
  Clock3,
  MessageSquareText,
  RefreshCw,
  ShieldAlert,
  Target,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { LoadingState } from "../components/ui/LoadingState";
import { analyticsService } from "../services/api";
import type { AnalyticsOverview, AnalyticsSummaryMetric, AnalyticsTrainingImpact, AnalyticsWeeklyLoopItem } from "../types";

const emptyAnalytics: AnalyticsOverview = {
  range: { days: 30, label: "Last 30 days" },
  summary: [],
  weeklyLoop: [],
  intentMix: [],
  reviewTriggers: [],
  trainingImpact: [],
  agentPerformance: [],
};

const summaryIcons = {
  MessageSquareText,
  Bot,
  UserCheck,
  Target,
};

const trainingIcons = {
  TrendingUp,
  Clock3,
  Target,
};

const rangePresets = [
  { id: "last_7_days", name: "1 week" },
  { id: "month_to_date", name: "Month to date" },
  { id: "last_30_days", name: "Last 30 days" },
  { id: "last_90_days", name: "Last 90 days" },
  { id: "custom", name: "Custom range" },
];

export function Analytics() {
  const [data, setData] = useState<AnalyticsOverview>(emptyAnalytics);
  const [rangePreset, setRangePreset] = useState("last_30_days");
  const [customStart, setCustomStart] = useState(formatDateInput(addDays(new Date(), -30)));
  const [customEnd, setCustomEnd] = useState(formatDateInput(new Date()));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics({ preset: "last_30_days" });
  }, []);

  async function loadAnalytics(nextRange = buildRequestRange(rangePreset, customStart, customEnd)) {
    setIsLoading(true);
    setError(null);

    try {
      setData(await analyticsService.getOverview(nextRange));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load analytics");
      setData(emptyAnalytics);
    } finally {
      setIsLoading(false);
    }
  }

  const loopRows = useMemo(() => buildLoopRows(data.weeklyLoop), [data.weeklyLoop]);
  const maxWeekly = useMemo(
    () => Math.max(1, ...loopRows.map((item) => item.incoming)),
    [loopRows]
  );

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
          <AnalyticsRangePicker
            customEnd={customEnd}
            customStart={customStart}
            isLoading={isLoading}
            onApply={() => loadAnalytics({ startDate: customStart, endDate: customEnd })}
            onCustomEndChange={setCustomEnd}
            onCustomStartChange={setCustomStart}
            onPresetChange={(preset) => {
              setRangePreset(preset);
              if (preset !== "custom") {
                void loadAnalytics({ preset });
              }
            }}
            preset={rangePreset}
          />
          <Button className="h-[34px] rounded-full px-4 text-[14px] font-semibold leading-none" isDisabled={isLoading} size="sm" variant="secondary" onPress={() => loadAnalytics()}>
            {isLoading ? <Spinner color="accent" size="sm" /> : <RefreshCw className="size-[17px]" strokeWidth={2.35} />}
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          {error}
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          <div className="sm:col-span-2 xl:col-span-4">
            <LoadingState minHeight={100} size="md" />
          </div>
        ) : (
          getSummary(data.summary).map((item) => <SummaryCard item={item} key={item.label} />)
        )}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="apple-shadow border border-border/70 bg-surface p-4">
          <Card.Header className="items-start justify-between gap-4 p-0">
            <div>
              <Card.Title className="text-[15px] font-semibold">PlusVibe reply loop</Card.Title>
              <Card.Description>Incoming prospect replies compared with sent and human-review volume.</Card.Description>
            </div>
            <Chip className="h-[24px] min-h-[24px] px-2 text-[11px] font-semibold" color="accent" size="sm" variant="soft">
              {data.weeklyLoop.length > 14 ? "Weekly" : data.range.label}
            </Chip>
          </Card.Header>
          <Card.Content className="p-0 pt-5">
            {isLoading ? (
              <LoadingState minHeight={200} size="md" />
            ) : loopRows.length === 0 ? (
              <EmptyBlock>No reply activity has been recorded for this range.</EmptyBlock>
            ) : (
              <>
                <div className="space-y-3">
                  {loopRows.map((row) => {
                    const incoming = Math.max(1, row.incoming);

                    return (
                      <div className="grid grid-cols-[82px_minmax(0,1fr)_124px] items-center gap-3" key={row.key}>
                        <span className="truncate text-[12px] font-semibold text-muted">{row.label}</span>
                        <div className="h-7 overflow-hidden rounded-full bg-default-100">
                          <div className="flex h-full" style={{ width: `${Math.max(18, Math.round((row.incoming / maxWeekly) * 100))}%` }}>
                            <span className="h-full bg-accent" style={{ width: `${Math.min(100, (row.sent / incoming) * 100)}%` }} />
                            <span className="h-full bg-warning" style={{ width: `${Math.min(100, (row.review / incoming) * 100)}%` }} />
                            <span className="h-full bg-foreground/20" style={{ width: `${Math.max(0, ((incoming - row.sent - row.review) / incoming) * 100)}%` }} />
                          </div>
                        </div>
                        <div className="flex justify-end gap-3 text-[11px] font-medium text-muted">
                          <span>{row.sent} sent</span>
                          <span>{row.review} review</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-5 flex flex-wrap gap-3 text-[11px] font-medium text-muted">
                  <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-accent" />Sent</span>
                  <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-warning" />Human review</span>
                  <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-foreground/20" />Held / pending</span>
                </div>
              </>
            )}
          </Card.Content>
        </Card>

        <Card className="apple-shadow border border-border/70 bg-surface p-4">
          <Card.Header className="p-0">
            <Card.Title className="text-[15px] font-semibold">Intent mix</Card.Title>
            <Card.Description>PlusVibe labels and AI-classified reply intent.</Card.Description>
          </Card.Header>
          <Card.Content className="space-y-4 p-0 pt-5">
            {isLoading ? (
              <LoadingState minHeight={160} size="md" />
            ) : data.intentMix.length === 0 ? (
              <EmptyBlock>No intent labels have been recorded yet.</EmptyBlock>
            ) : data.intentMix.map((intent) => (
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
            <Card.Description>Why ReplyOS held or escalated drafts before sending.</Card.Description>
          </Card.Header>
          <Card.Content className="space-y-4 p-0 pt-5">
            {isLoading ? (
              <LoadingState minHeight={160} size="md" />
            ) : data.reviewTriggers.length === 0 ? (
              <EmptyBlock>No review triggers have been recorded yet.</EmptyBlock>
            ) : data.reviewTriggers.map((trigger) => (
              <div className="grid grid-cols-[minmax(0,1fr)_48px] items-center gap-3" key={trigger.label}>
                <div>
                  <div className="mb-1.5 flex items-center gap-2 text-[12px] font-medium text-foreground">
                    {trigger.label.toLowerCase().includes("fallback") || trigger.label.toLowerCase().includes("rejected") ? (
                      <ShieldAlert className="size-[14px] text-danger" />
                    ) : (
                      <CheckCircle2 className="size-[14px] text-muted" />
                    )}
                    {trigger.label}
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-default-100">
                    <div className="h-full rounded-full bg-warning" style={{ width: `${trigger.value}%` }} />
                  </div>
                </div>
                <span className="text-right text-[13px] font-semibold text-foreground">{trigger.count}</span>
              </div>
            ))}
          </Card.Content>
        </Card>

        <Card className="apple-shadow border border-border/70 bg-surface p-4">
          <Card.Header className="p-0">
            <Card.Title className="text-[15px] font-semibold">Draft quality</Card.Title>
            <Card.Description>Confidence, generation speed, and alignment from stored AI draft data.</Card.Description>
          </Card.Header>
          <Card.Content className="grid gap-3 p-0 pt-5 sm:grid-cols-3">
            {isLoading ? (
              <div className="sm:col-span-3">
                <LoadingState minHeight={100} size="md" />
              </div>
            ) : data.trainingImpact.length === 0 ? (
              <div className="sm:col-span-3"><EmptyBlock>No draft quality data is available yet.</EmptyBlock></div>
            ) : data.trainingImpact.map((item) => <TrainingCard item={item} key={item.label} />)}
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
            Live
          </Chip>
        </Card.Header>
        <Card.Content className="thin-scrollbar overflow-x-auto p-0 pt-4">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-[11px] font-semibold text-muted">
              <tr className="border-b border-border/70">
                <th className="py-3 pr-4">Agent</th>
                <th className="py-3 pr-4">Inbox</th>
                <th className="py-3 pr-4">Replies</th>
                <th className="py-3 pr-4">Sent</th>
                <th className="py-3 pr-4">Confidence</th>
                <th className="py-3 pr-4">Meetings</th>
                <th className="py-3">Top review reason</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableSkeleton />
              ) : data.agentPerformance.length === 0 ? (
                <tr>
                  <td className="py-10 text-center text-muted" colSpan={7}>No agent performance data yet.</td>
                </tr>
              ) : data.agentPerformance.map((row) => (
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

function AnalyticsRangePicker({
  customEnd,
  customStart,
  isLoading,
  onApply,
  onCustomEndChange,
  onCustomStartChange,
  onPresetChange,
  preset,
}: {
  customEnd: string;
  customStart: string;
  isLoading: boolean;
  onApply: () => void;
  onCustomEndChange: (value: string) => void;
  onCustomStartChange: (value: string) => void;
  onPresetChange: (preset: string) => void;
  preset: string;
}) {
  const selectedOption = rangePresets.find((option) => option.id === preset) || rangePresets[2];
  const showCustom = preset === "custom";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        aria-label="Analytics date range"
        className="agent-select w-[176px]"
        selectedKey={selectedOption.id}
        variant="primary"
        onSelectionChange={(key) => {
          if (key) onPresetChange(String(key));
        }}
      >
        <Select.Trigger className="h-[34px] rounded-full px-3 text-[14px] font-semibold leading-none text-foreground">
          <Calendar className="mr-1 size-[17px]" strokeWidth={2.35} />
          <Select.Value>{selectedOption.name}</Select.Value>
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox aria-label="Analytics date range" items={rangePresets}>
            {(option) => (
              <ListBox.Item id={option.id} textValue={option.name}>
                <ListBox.ItemIndicator />
                {option.name}
              </ListBox.Item>
            )}
          </ListBox>
        </Select.Popover>
      </Select>

      {showCustom ? (
        <>
          <CompactDatePicker label="Start date" value={customStart} onChange={onCustomStartChange} />
          <CompactDatePicker label="End date" value={customEnd} onChange={onCustomEndChange} />
          <Button
            className="h-[34px] rounded-full px-4 text-[14px] font-semibold leading-none"
            isDisabled={isLoading || !customStart || !customEnd}
            size="sm"
            onPress={onApply}
          >
            Apply
          </Button>
        </>
      ) : null}
    </div>
  );
}

function CompactDatePicker({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <DatePicker
      aria-label={label}
      className="w-[152px]"
      value={value ? parseDate(value) : null}
      onChange={(date: DateValue | null) => onChange(date?.toString() || "")}
    >
      <DateField.Group className="h-[34px] rounded-full px-3 text-[13px] font-medium text-foreground" fullWidth variant="primary">
        <DateField.Input>
          {(segment: any) => <DateField.Segment segment={segment} />}
        </DateField.Input>
        <DatePicker.Trigger className="ml-1 grid size-6 place-items-center rounded-full text-muted transition hover:bg-surface-tertiary hover:text-foreground">
          <DatePicker.TriggerIndicator />
        </DatePicker.Trigger>
      </DateField.Group>
      <DatePicker.Popover>
        <HeroCalendar>
          <HeroCalendar.Header>
            <HeroCalendar.NavButton slot="previous" />
            <HeroCalendar.Heading />
            <HeroCalendar.NavButton slot="next" />
          </HeroCalendar.Header>
          <HeroCalendar.Grid>
            <HeroCalendar.GridHeader>
              {(day) => <HeroCalendar.HeaderCell>{day}</HeroCalendar.HeaderCell>}
            </HeroCalendar.GridHeader>
            <HeroCalendar.GridBody>
              {(date) => <HeroCalendar.Cell date={date} />}
            </HeroCalendar.GridBody>
          </HeroCalendar.Grid>
        </HeroCalendar>
      </DatePicker.Popover>
    </DatePicker>
  );
}

function SummaryCard({ item }: { item: AnalyticsSummaryMetric }) {
  const Icon = summaryIcons[item.icon];

  return (
    <Card className="apple-shadow border border-transparent bg-surface p-4 dark:border-default-100">
      <Card.Content className="p-0">
        <div className="flex items-start justify-between gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-default-100 text-foreground">
            <Icon className="size-[17px]" strokeWidth={2.2} />
          </span>
          <Chip className="h-[22px] min-h-[22px] px-2 text-[11px] font-semibold" color={item.tone} size="sm" variant="soft">
            {item.change}
          </Chip>
        </div>
        <p className="mt-5 text-[26px] font-semibold leading-none text-foreground">{formatNumber(item.value)}</p>
        <p className="mt-2 text-[12px] font-medium text-muted">{item.label}</p>
      </Card.Content>
    </Card>
  );
}

function TrainingCard({ item }: { item: AnalyticsTrainingImpact }) {
  const Icon = trainingIcons[item.icon];
  const iconColor = item.tone === "success" ? "text-success" : item.tone === "accent" ? "text-accent" : "text-foreground";

  return (
    <div className="rounded-[14px] bg-background/70 p-3">
      <Icon className={`mb-4 size-[18px] ${iconColor}`} strokeWidth={2.2} />
      <p className="text-[22px] font-semibold leading-none text-foreground">{item.value}</p>
      <p className="mt-2 text-[12px] leading-5 text-muted">{item.description}</p>
    </div>
  );
}

function TableSkeleton() {
  return (
    <tr>
      <td className="py-3 pr-4" colSpan={7}>
        <LoadingState />
      </td>
    </tr>
  );
}

function EmptyBlock({ children }: { children: string }) {
  return (
    <div className="rounded-[14px] bg-background/70 px-4 py-8 text-center text-sm text-muted">
      {children}
    </div>
  );
}

function getSummary(summary: AnalyticsSummaryMetric[]) {
  if (summary.length > 0) return summary;

  return [
    { label: "Prospect replies", value: 0, change: "0%", icon: "MessageSquareText", tone: "accent" },
    { label: "AI replies sent", value: 0, change: "0%", icon: "Bot", tone: "success" },
    { label: "Human reviewed", value: 0, change: "0%", icon: "UserCheck", tone: "warning" },
    { label: "Meeting requests", value: 0, change: "0%", icon: "Target", tone: "success" },
  ] satisfies AnalyticsSummaryMetric[];
}

interface ReplyLoopRow {
  key: string;
  label: string;
  incoming: number;
  sent: number;
  review: number;
}

function buildLoopRows(items: AnalyticsWeeklyLoopItem[]): ReplyLoopRow[] {
  if (items.length <= 14) {
    return items.map((item, index) => ({
      key: item.date || `${item.day}-${index}`,
      label: item.date ? formatLoopDate(item.date, { month: "short", day: "numeric" }) : item.day,
      incoming: item.incoming,
      sent: item.sent,
      review: item.review,
    }));
  }

  const rows: ReplyLoopRow[] = [];

  for (let index = 0; index < items.length; index += 7) {
    const slice = items.slice(index, index + 7);
    const first = slice[0];
    const last = slice[slice.length - 1];

    rows.push({
      key: `${first.date || first.day}-${last.date || last.day}-${index}`,
      label: buildRangeLabel(first, last, index),
      incoming: slice.reduce((sum, item) => sum + item.incoming, 0),
      sent: slice.reduce((sum, item) => sum + item.sent, 0),
      review: slice.reduce((sum, item) => sum + item.review, 0),
    });
  }

  return rows;
}

function buildRangeLabel(first: AnalyticsWeeklyLoopItem, last: AnalyticsWeeklyLoopItem, index: number) {
  if (!first.date || !last.date) return `Week ${Math.floor(index / 7) + 1}`;

  return `${formatLoopDate(first.date, { month: "short", day: "numeric" })} - ${formatLoopDate(last.date, { day: "numeric" })}`;
}

function formatLoopDate(value: string, options: Intl.DateTimeFormatOptions) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, options).format(date);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function buildRequestRange(preset: string, customStart: string, customEnd: string) {
  return preset === "custom"
    ? { startDate: customStart, endDate: customEnd }
    : { preset };
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
