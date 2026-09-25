import { useEffect, useMemo, useState } from "react";
import { Card, Spinner } from "@heroui/react";
import { AlertTriangle, Layers, ShieldCheck, ShieldOff } from "lucide-react";
import { ReputationTrendChart } from "../components/analytics/Charts";
import { StatusPill } from "../components/ui/StatusPill";
import { SkeletonRow } from "../components/ui/Skeleton";
import { domainService, mailboxService } from "../services/api";
import type { Mailbox, ReputationTrendPoint, StatusTone } from "../types";

const reputationTone: Record<Mailbox["reputationStatus"], StatusTone> = {
  Healthy: "success",
  Watch: "warning",
  "At Risk": "danger",
};

export function MailerHealth() {
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [domainCount, setDomainCount] = useState(0);
  const [configuredDomainCount, setConfiguredDomainCount] = useState(0);
  const [trend, setTrend] = useState<ReputationTrendPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const [mailboxPage, domainPage, reputationTrend] = await Promise.all([
        mailboxService.list({ page: 1, limit: 500 }),
        domainService.list({ page: 1, limit: 100 }),
        domainService.getReputationTrend({ days: 7 }),
      ]);
      setMailboxes(mailboxPage.items);
      setDomainCount(domainPage.total);
      setConfiguredDomainCount(domainPage.items.filter((domain) => domain.configurationSetName != null).length);
      setTrend(reputationTrend);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load health data");
      setMailboxes([]);
      setTrend([]);
    } finally {
      setIsLoading(false);
    }
  }

  const counts = useMemo(
    () =>
      mailboxes.reduce(
        (acc, mailbox) => {
          acc[mailbox.reputationStatus] += 1;
          return acc;
        },
        { Healthy: 0, Watch: 0, "At Risk": 0 } as Record<Mailbox["reputationStatus"], number>
      ),
    [mailboxes]
  );

  const flagged = mailboxes.filter((mailbox) => mailbox.reputationStatus !== "Healthy");

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
          <span>{error}</span>
          <button className="text-sm font-semibold underline" onClick={load} type="button">Retry</button>
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <HealthMetric icon={ShieldCheck} isLoading={isLoading} label="Healthy Mailboxes" tone="success" value={counts.Healthy} />
        <HealthMetric
          icon={AlertTriangle}
          isLoading={isLoading}
          label="Needs Attention"
          tone={counts.Watch + counts["At Risk"] > 0 ? "warning" : undefined}
          value={counts.Watch + counts["At Risk"]}
        />
        <HealthMetric detail={`of ${domainCount} domains`} icon={Layers} isLoading={isLoading} label="Domains w/ Config Sets" value={configuredDomainCount} />
        <HealthMetric detail="single account — Tier 1 only" icon={ShieldOff} isLoading={false} label="AWS Accounts" value={1} />
      </section>

      <Card className="apple-shadow border border-border/70 bg-surface p-4">
        <Card.Header className="p-0">
          <Card.Title className="text-[15px] font-semibold">Bounce &amp; complaint rate (7 days)</Card.Title>
          <Card.Description>Aggregated across all sending domains, from Amazon SES / CloudWatch reputation metrics.</Card.Description>
        </Card.Header>
        <Card.Content className="p-0 pt-4">
          {isLoading ? (
            <div className="flex h-[136px] items-center justify-center gap-2 text-[12px] text-muted">
              <Spinner color="accent" size="sm" />
              Loading…
            </div>
          ) : (
            <ReputationTrendChart data={trend} />
          )}
        </Card.Content>
      </Card>

      <Card className="apple-shadow border border-border/70 bg-surface">
        <Card.Header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70">
          <div>
            <Card.Title>Flagged mailboxes</Card.Title>
            <Card.Description>Mailboxes the health engine has marked Watch or At Risk.</Card.Description>
          </div>
          {isLoading ? (
            <p className="flex items-center gap-1.5 text-[12px] text-muted">
              <Spinner color="accent" size="sm" />
              Loading…
            </p>
          ) : null}
        </Card.Header>
        <Card.Content className="p-0">
          {isLoading ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-border/70 text-xs text-muted">
                  <tr>
                    {["Mailbox", "Reputation", "Domain Bounce Rate", "Domain Complaint Rate", "Last Sent"].map((header) => (
                      <th className="px-4 py-3 font-medium" key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 3 }).map((_, index) => <SkeletonRow columns={5} key={index} />)}
                </tbody>
              </table>
            </div>
          ) : flagged.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
              <span className="grid size-11 place-items-center rounded-full bg-success/10 text-success">
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <p className="text-[13px] font-semibold text-foreground">All mailboxes are healthy</p>
                <p className="mt-0.5 text-[12px] text-muted">No mailbox is currently flagged Watch or At Risk.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-border/70 text-xs text-muted">
                  <tr>
                    {["Mailbox", "Reputation", "Domain Bounce Rate", "Domain Complaint Rate", "Last Sent"].map((header) => (
                      <th className="px-4 py-3 font-medium" key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {flagged.map((mailbox) => (
                    <tr className="border-b border-border/60 last:border-0" key={mailbox.id}>
                      <td className="px-4 py-4 font-medium text-foreground">{mailbox.email}</td>
                      <td className="px-4 py-4">
                        <StatusPill tone={reputationTone[mailbox.reputationStatus]}>{mailbox.reputationStatus}</StatusPill>
                      </td>
                      <td className="px-4 py-4 text-muted">{mailbox.domainBounceRate != null ? `${(mailbox.domainBounceRate * 100).toFixed(1)}%` : "—"}</td>
                      <td className="px-4 py-4 text-muted">{mailbox.domainComplaintRate != null ? `${(mailbox.domainComplaintRate * 100).toFixed(2)}%` : "—"}</td>
                      <td className="px-4 py-4 text-muted">{mailbox.lastSentAt ? new Date(mailbox.lastSentAt).toLocaleString() : "Not yet"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card.Content>
      </Card>
    </div>
  );
}

function HealthMetric({
  icon: Icon,
  label,
  value,
  detail,
  tone,
  isLoading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  detail?: string;
  tone?: "success" | "warning";
  isLoading: boolean;
}) {
  return (
    <Card className="apple-shadow border border-border/70 bg-surface p-4">
      <Card.Content className="p-0">
        <div className="flex items-start justify-between gap-3">
          <span className={`grid size-9 place-items-center rounded-full ${tone === "warning" ? "bg-warning/10 text-warning" : tone === "success" ? "bg-success/10 text-success" : "bg-default-100 text-foreground"}`}>
            <Icon className="size-[17px]" />
          </span>
        </div>
        {isLoading ? (
          <div className="mt-5">
            <Spinner color="accent" size="sm" />
          </div>
        ) : (
          <p className="mt-5 text-[26px] font-semibold leading-none text-foreground">{value}</p>
        )}
        <p className="mt-2 text-[12px] font-semibold text-foreground">{label}</p>
        {detail ? <p className="mt-0.5 text-[11px] text-muted">{detail}</p> : null}
      </Card.Content>
    </Card>
  );
}
