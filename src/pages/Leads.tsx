import { useEffect, useState } from "react";
import { Button, Card, Spinner } from "@heroui/react";
import { RefreshCw } from "lucide-react";
import { StatusPill } from "../components/ui/StatusPill";
import { leadService } from "../services/api";
import type { Lead, LeadPage, StatusTone } from "../types";

const emptyData: LeadPage = {
  items: [],
  stats: {
    totalLeads: 0,
    highInterest: 0,
    meetingStage: 0,
    humanManaged: 0,
  },
};

export function Leads() {
  const [data, setData] = useState<LeadPage>(emptyData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLeads();
  }, []);

  async function loadLeads() {
    setIsLoading(true);
    setError(null);

    try {
      setData(await leadService.list());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load positive leads");
      setData(emptyData);
    } finally {
      setIsLoading(false);
    }
  }

  const stats = [
    ["Positive Leads", data.stats.totalLeads],
    ["High Interest", data.stats.highInterest],
    ["Meeting Stage", data.stats.meetingStage],
    ["Human Managed", data.stats.humanManaged],
  ] as const;

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value]) => (
          <Card className="border border-border/70 bg-surface" key={label}>
            <Card.Content className="p-4">
              <p className="text-xs font-medium text-muted">{label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-normal text-foreground">{formatNumber(value)}</p>
            </Card.Content>
          </Card>
        ))}
      </div>

      <Card className="apple-shadow border border-border/70 bg-surface">
        <Card.Header className="flex-row items-center justify-between gap-4">
          <div>
            <Card.Title>Leads</Card.Title>
            <Card.Description>Positive PlusVibe prospects that ReplyOS has answered by AI approval or manual reply.</Card.Description>
          </div>
          <Button size="sm" variant="secondary" onPress={loadLeads} isDisabled={isLoading}>
            {isLoading ? <Spinner color="accent" size="sm" /> : <RefreshCw className="size-4" />}
            Refresh
          </Button>
        </Card.Header>
        <Card.Content className="overflow-x-auto p-0">
          {error ? (
            <div className="mx-4 mb-4 rounded-lg border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          ) : null}

          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-y border-border/70 text-xs text-muted">
              <tr>
                {["Lead", "Company", "Campaign", "Intent", "Sentiment", "Stage", "Owner", "Updated"].map((header) => (
                  <th className="px-4 py-3 font-medium" key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? <LoadingRows /> : null}
              {!isLoading && data.items.length === 0 ? <EmptyRow /> : null}
              {!isLoading ? data.items.map((lead) => (
                <LeadRow lead={lead} key={lead.id || lead.email} />
              )) : null}
            </tbody>
          </table>
        </Card.Content>
      </Card>
    </div>
  );
}

function LeadRow({ lead }: { lead: Lead }) {
  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="px-4 py-4">
        <p className="font-semibold text-foreground">{lead.name}</p>
        <p className="text-xs text-muted">{lead.email}</p>
      </td>
      <td className="px-4 py-4">
        <p className="font-medium text-foreground">{lead.company}</p>
        <p className="text-xs text-muted">{lead.role}</p>
      </td>
      <td className="max-w-[240px] truncate px-4 py-4 text-muted">{lead.campaign}</td>
      <td className="px-4 py-4"><StatusPill tone={intentTone(lead.intent)}>{lead.intent}</StatusPill></td>
      <td className="px-4 py-4 text-muted">{lead.sentiment}</td>
      <td className="px-4 py-4 text-muted">{lead.stage}</td>
      <td className="max-w-[180px] truncate px-4 py-4 text-muted">{lead.owner}</td>
      <td className="whitespace-nowrap px-4 py-4 text-muted">{lead.updated}</td>
    </tr>
  );
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <tr className="border-b border-border/60 last:border-0" key={index}>
          {Array.from({ length: 8 }).map((__, cellIndex) => (
            <td className="px-4 py-4" key={cellIndex}>
              <div className="h-4 w-full max-w-[180px] animate-pulse rounded bg-muted/15" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function EmptyRow() {
  return (
    <tr>
      <td className="px-4 py-10 text-center text-muted" colSpan={8}>
        No positive leads have been answered yet.
      </td>
    </tr>
  );
}

function intentTone(intent: Lead["intent"]): StatusTone {
  if (intent === "Meeting Request") return "success";
  if (intent === "Interested") return "accent";
  return "warning";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}
