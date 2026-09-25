import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Button, Card, Chip, Spinner } from "@heroui/react";
import { CheckCircle2, Sparkles, TrendingUp, Upload, Users } from "lucide-react";
import { RampScheduleDrawer } from "../components/mailer/RampScheduleDrawer";
import { LoadingState } from "../components/ui/LoadingState";
import { StatusPill } from "../components/ui/StatusPill";
import { domainService, mailboxService, warmupPoolService, warmupService } from "../services/api";
import type { Domain, Mailbox, StatusTone, WarmupPoolStats, WarmupStrategy, WarmupSummary } from "../types";

const stageTone: Record<Mailbox["warmupStage"], StatusTone> = {
  New: "default",
  Ramping: "accent",
  "Steady State": "success",
  Paused: "warning",
};

function getProgress(mailbox: Mailbox, strategySteadyLimit: number | undefined) {
  const ceiling = strategySteadyLimit || 40;
  return Math.min(100, Math.round((mailbox.dailyLimit / ceiling) * 100));
}

const emptySummary: WarmupSummary = { inWarmup: 0, atSteadyState: 0, avgProgress: 0, activeStrategies: 0 };

export function MailerWarmup() {
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [strategies, setStrategies] = useState<WarmupStrategy[]>([]);
  const [summary, setSummary] = useState<WarmupSummary>(emptySummary);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [totalMailboxes, setTotalMailboxes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [assigningStrategyId, setAssigningStrategyId] = useState<number | null>(null);
  const [poolStats, setPoolStats] = useState<WarmupPoolStats | null>(null);
  const [isLoadingPool, setIsLoadingPool] = useState(true);
  const [isUploadingPool, setIsUploadingPool] = useState(false);
  const [poolUploadProgress, setPoolUploadProgress] = useState(0);
  const [poolError, setPoolError] = useState<string | null>(null);
  const poolFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    load();
    loadPoolStats();
  }, []);

  async function loadPoolStats() {
    setIsLoadingPool(true);
    try {
      setPoolStats(await warmupPoolService.getStats());
    } catch (requestError) {
      setPoolError(requestError instanceof Error ? requestError.message : "Unable to load warmup pool");
    } finally {
      setIsLoadingPool(false);
    }
  }

  async function handlePoolFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsUploadingPool(true);
    setPoolUploadProgress(0);
    setPoolError(null);
    try {
      const result = await warmupPoolService.addLeadsFromFile(file, setPoolUploadProgress);
      setNotice(
        `Added ${result.added} lead${result.added === 1 ? "" : "s"} to the warmup pool` +
          (result.skippedSuppressed ? ` (${result.skippedSuppressed} skipped — already unsubscribed)` : "") +
          (result.skippedAlreadyInPool ? ` (${result.skippedAlreadyInPool} skipped — already in pool)` : "") +
          "."
      );
      window.setTimeout(() => setNotice(null), 6000);
      await loadPoolStats();
    } catch (requestError) {
      setPoolError(requestError instanceof Error ? requestError.message : "Unable to upload leads");
    } finally {
      setIsUploadingPool(false);
      setPoolUploadProgress(0);
    }
  }

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const [summaryData, strategyData, mailboxPage, domainPage] = await Promise.all([
        warmupService.getSummary(),
        warmupService.listStrategies(),
        mailboxService.list({ limit: 100 }),
        domainService.list({ limit: 200 }),
      ]);
      setSummary(summaryData);
      setStrategies(strategyData);
      setMailboxes(mailboxPage.items);
      setTotalMailboxes(mailboxPage.total);
      setDomains(domainPage.items);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load warmup data");
    } finally {
      setIsLoading(false);
    }
  }

  function strategySteadyLimit(mailbox: Mailbox) {
    return strategies.find((strategy) => strategy.id === mailbox.warmupStrategyId)?.steadyStateDailyLimit;
  }

  function handleApply(summaryText: string) {
    setIsDrawerOpen(false);
    setNotice(summaryText);
    window.setTimeout(() => setNotice(null), 5000);
    load();
  }

  async function assignExisting(strategy: WarmupStrategy) {
    setAssigningStrategyId(strategy.id);
    try {
      const result = await warmupService.assignStrategy(strategy.id, { all: true });
      setNotice(`"${strategy.name}" assigned to ${result.assignedCount} mailbox${result.assignedCount === 1 ? "" : "es"}.`);
      window.setTimeout(() => setNotice(null), 5000);
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to assign strategy");
    } finally {
      setAssigningStrategyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Warmup Engine</h2>
          <p className="text-[12px] text-muted">Industry-observed convention, not an AWS feature — this ramp is enforced per mailbox, once daily, against real domain bounce/complaint rates.</p>
        </div>
        <Button onPress={() => setIsDrawerOpen(true)}>
          <TrendingUp className="size-4" />
          Ramp Schedule
        </Button>
      </div>

      {notice ? (
        <div className="flex items-center gap-2 rounded-xl border border-success/20 bg-success/10 px-4 py-3 text-sm font-medium text-success">
          <CheckCircle2 className="size-4" />
          {notice}
        </div>
      ) : null}

      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
          <span>{error}</span>
          <Button onPress={load} size="sm" variant="secondary">Retry</Button>
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard isLoading={isLoading} label="Mailboxes in Warmup" value={summary.inWarmup} />
        <KpiCard isLoading={isLoading} label="Avg Progress to Steady State" value={`${summary.avgProgress}%`} />
        <KpiCard isLoading={isLoading} label="At Steady State" value={summary.atSteadyState} />
        <KpiCard isLoading={isLoading} label="Active Strategies" value={summary.activeStrategies} />
      </section>

      <Card className="apple-shadow border border-border/70 bg-surface">
        <Card.Header className="flex-row items-center justify-between border-b border-border/70">
          <div>
            <Card.Title>Warmup pool</Card.Title>
            <Card.Description>
              Shared, single-use lead pool every mailbox draws its permanent warmup-lane sends from. A lead is emailed once, ever, then retired.
            </Card.Description>
          </div>
          <div>
            <input accept=".csv,.xlsx,.xls,.txt" className="hidden" onChange={handlePoolFileSelected} ref={poolFileInputRef} type="file" />
            <Button isDisabled={isUploadingPool} onPress={() => poolFileInputRef.current?.click()} size="sm">
              {isUploadingPool ? (
                <>
                  <Spinner color="current" size="sm" />
                  {poolUploadProgress > 0 ? `${poolUploadProgress}%` : "Uploading…"}
                </>
              ) : (
                <>
                  <Upload className="size-4" />
                  Upload leads
                </>
              )}
            </Button>
          </div>
        </Card.Header>
        <Card.Content className="p-4">
          {poolError ? (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
              <span>{poolError}</span>
              <Button onPress={loadPoolStats} size="sm" variant="secondary">Retry</Button>
            </div>
          ) : null}
          {isLoadingPool ? (
            <LoadingState label="Loading warmup pool…" />
          ) : poolStats ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <PoolStat icon={Users} label="Available" tone="accent" value={poolStats.available} />
              <PoolStat icon={CheckCircle2} label="Used" tone="success" value={poolStats.used} />
              <PoolStat label="Suppressed" value={poolStats.suppressed} />
              <PoolStat label="Failed" value={poolStats.failed} />
            </div>
          ) : null}
        </Card.Content>
      </Card>

      <Card className="apple-shadow border border-border/70 bg-surface">
        <Card.Header className="border-b border-border/70">
          <Card.Title>Mailbox warmup progress</Card.Title>
          <Card.Description>Current stage, daily limit, and assigned strategy per mailbox.</Card.Description>
        </Card.Header>
        <Card.Content className="overflow-x-auto p-0">
          {isLoading ? (
            <LoadingState label="Loading mailboxes…" />
          ) : mailboxes.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted">No mailboxes yet. Create mailboxes first, then assign a ramp schedule.</p>
          ) : (
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-border/70 text-xs text-muted">
                <tr>
                  {["Mailbox", "Stage", "Progress to steady state", "Daily Limit", "Strategy"].map((header) => (
                    <th className="px-4 py-3 font-medium" key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mailboxes.map((mailbox) => (
                  <WarmupRow key={mailbox.id} mailbox={mailbox} steadyLimit={strategySteadyLimit(mailbox)} />
                ))}
              </tbody>
            </table>
          )}
        </Card.Content>
      </Card>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">Warmup strategies</h2>
            <p className="text-[12px] text-muted">Predefined ramp curves, plus AI-generated ones capped at the same hard ceilings.</p>
          </div>
        </div>
        {isLoading ? (
          <LoadingState label="Loading strategies…" />
        ) : strategies.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/70 p-6 text-center text-[12px] text-muted">
            No warmup strategies yet. Click "Ramp Schedule" to create one.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {strategies.map((strategy) => (
              <Card className="apple-shadow border border-border/70 bg-surface p-4" key={strategy.id}>
                <Card.Header className="flex-row items-start justify-between gap-2 p-0">
                  <Card.Title className="text-[14px]">{strategy.name}</Card.Title>
                  {strategy.isAiGenerated ? (
                    <Chip color="accent" size="sm" variant="soft">
                      <Sparkles className="size-3" />
                      AI
                    </Chip>
                  ) : null}
                </Card.Header>
                <Card.Content className="space-y-3 p-0 pt-3">
                  <p className="text-[12px] leading-5 text-muted">{strategy.description || strategy.aiRationale || "No description."}</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-surface-secondary/60 p-2">
                      <p className="text-[13px] font-semibold text-foreground">{strategy.stageDurationDays}d</p>
                      <p className="text-[10px] text-muted">Stage</p>
                    </div>
                    <div className="rounded-xl bg-surface-secondary/60 p-2">
                      <p className="text-[13px] font-semibold text-foreground">{strategy.startDailyLimit}</p>
                      <p className="text-[10px] text-muted">Start/day</p>
                    </div>
                    <div className="rounded-xl bg-surface-secondary/60 p-2">
                      <p className="text-[13px] font-semibold text-foreground">{strategy.steadyStateDailyLimit}</p>
                      <p className="text-[10px] text-muted">Steady/day</p>
                    </div>
                  </div>
                </Card.Content>
                <Card.Footer className="justify-between border-t border-border/70 pt-3">
                  <span className="text-[11px] text-muted">{strategy.assignedMailboxCount} mailboxes assigned</span>
                  <Button isDisabled={assigningStrategyId === strategy.id} onPress={() => assignExisting(strategy)} size="sm" variant="secondary">
                    {assigningStrategyId === strategy.id ? "Assigning…" : "Assign to all"}
                  </Button>
                </Card.Footer>
              </Card>
            ))}
          </div>
        )}
      </div>

      <RampScheduleDrawer domains={domains} isOpen={isDrawerOpen} onApply={handleApply} onClose={() => setIsDrawerOpen(false)} totalMailboxes={totalMailboxes} />
    </div>
  );
}

function PoolStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone?: "accent" | "success";
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-surface-secondary/60 p-3">
      <div className="flex items-center gap-1.5 text-muted">
        {Icon ? (
          <span className={`grid size-5 place-items-center rounded-full ${tone === "accent" ? "bg-accent/10 text-accent" : tone === "success" ? "bg-success/10 text-success" : ""}`}>
            <Icon className="size-3" />
          </span>
        ) : null}
        <p className="text-[11px] font-medium">{label}</p>
      </div>
      <p className="mt-1.5 text-[18px] font-semibold leading-none text-foreground">{value.toLocaleString()}</p>
    </div>
  );
}

function KpiCard({ label, value, isLoading }: { label: string; value: number | string; isLoading: boolean }) {
  return (
    <Card className="apple-shadow border border-border/70 bg-surface p-4">
      <Card.Content className="p-0">
        {isLoading ? (
          <div className="h-[26px] w-12 animate-pulse rounded bg-default-200" />
        ) : (
          <p className="text-[26px] font-semibold leading-none text-foreground">{value}</p>
        )}
        <p className="mt-2 text-[12px] font-semibold text-foreground">{label}</p>
      </Card.Content>
    </Card>
  );
}

function WarmupRow({ mailbox, steadyLimit }: { mailbox: Mailbox; steadyLimit: number | undefined }) {
  const progress = getProgress(mailbox, steadyLimit);

  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="px-4 py-4 font-medium text-foreground">{mailbox.email}</td>
      <td className="px-4 py-4">
        <StatusPill tone={stageTone[mailbox.warmupStage]}>{mailbox.warmupStage}</StatusPill>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-32 overflow-hidden rounded-full bg-default-100">
            <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-[11px] text-muted">{progress}%</span>
        </div>
      </td>
      <td className="px-4 py-4 text-muted">{mailbox.dailyLimit}/day</td>
      <td className="px-4 py-4 text-muted">{mailbox.warmupStrategyName ?? "No strategy"}</td>
    </tr>
  );
}
