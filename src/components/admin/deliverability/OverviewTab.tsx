import { useState } from "react";
import { Button } from "@heroui/react";
import { Play, RefreshCw } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { errorMessage } from "../../../services/adminApi";
import { warmnetApi, type TickSummary } from "../../../services/warmnetApi";
import { ErrorBanner } from "../AdminModal";
import { StatTile } from "../AdminBits";
import { Skeleton } from "../../ui/Skeleton";
import { LevelNote, Panel, STATES, Switch, fmtDateTime, fmtRate, stateLabel, useLoad, type Notify } from "./Bits";

function tickText(s: TickSummary | null | undefined) {
  if (!s) return "No run recorded yet.";
  if (s.skipped) return `Skipped (${s.skipped}).`;
  const parts = [
    `${s.sent ?? 0} sent`,
    `${s.seedReplies ?? 0} seed replies`,
    `${s.counterReplies ?? 0} counter-replies`,
    s.failed ? `${s.failed} failed` : null,
    s.skippedNoSeed ? `${s.skippedNoSeed} waiting for seed capacity` : null,
    s.skippedBlocklisted ? `${s.skippedBlocklisted} held by a blocklisted IP` : null,
    s.inWindow === false ? "outside the sending window" : null,
  ].filter(Boolean);
  return parts.join(", ") + ".";
}

export function OverviewTab({ notify }: { notify: Notify }) {
  const overview = useLoad(() => warmnetApi.overview(), []);
  const trend = useLoad(() => warmnetApi.trend(14), []);
  const [busy, setBusy] = useState<"tick" | "poll" | "toggle" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const o = overview.data;

  async function run(kind: "tick" | "poll") {
    setBusy(kind);
    setActionError(null);
    try {
      if (kind === "tick") {
        const r = await warmnetApi.runEngine(false);
        notify(`Engine run finished: ${tickText(r)}`);
      } else {
        const r = await warmnetApi.pollSeeds();
        const failed = r.filter((x) => x.error).length;
        notify(`Polled ${r.length} seed inbox(es)${failed ? `, ${failed} with errors` : ""}.`, failed ? "error" : "success");
      }
      await Promise.all([overview.reload(), trend.reload()]);
    } catch (e) {
      setActionError(errorMessage(e, "That did not work. Please try again."));
    } finally {
      setBusy(null);
    }
  }

  async function toggle(next: boolean) {
    setBusy("toggle");
    setActionError(null);
    try {
      await warmnetApi.updateSettings({ enabled: next });
      notify(next ? "Warm-up engine switched on." : "Warm-up engine switched off. Nothing will be sent.");
      await overview.reload();
    } catch (e) {
      setActionError(errorMessage(e, "Unable to change the engine."));
    } finally {
      setBusy(null);
    }
  }

  if (overview.error && !o) return <ErrorBanner message={overview.error} onRetry={() => void overview.reload()} />;

  const loading = !o;
  const p = o?.placement7d;
  const series = (trend.data ?? []).map((t) => ({ ...t, label: t.day.slice(5) }));

  return (
    <div className="flex flex-col gap-4">
      {actionError ? <ErrorBanner message={actionError} /> : null}
      {overview.error ? <ErrorBanner message={overview.error} onRetry={() => void overview.reload()} /> : null}

      <Panel
        actions={
          <>
            <Button isDisabled={busy !== null} size="sm" variant="secondary" onClick={() => void run("poll")}>
              <RefreshCw className="size-4" />
              {busy === "poll" ? "Polling..." : "Poll seeds now"}
            </Button>
            <Button isDisabled={busy !== null || !o?.enabled} size="sm" variant="secondary" onClick={() => void run("tick")}>
              <Play className="size-4" />
              {busy === "tick" ? "Running..." : "Run engine now"}
            </Button>
          </>
        }
        title="Warm-up engine"
        description="When on, every 3 minutes each warming mailbox sends what it is due to the seed inboxes, inside the sending window."
      >
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <Switch checked={Boolean(o?.enabled)} disabled={loading || busy !== null} label="Warm-up engine" onChange={(v) => void toggle(v)} />
            <div>
              <p className="text-sm font-medium text-foreground">{loading ? "Loading..." : o.enabled ? "On" : "Off"}</p>
              <p className="text-[12px] text-muted">Window runs in {o?.timezone ?? "..."}</p>
            </div>
          </div>
          <dl className="grid gap-x-8 gap-y-1 text-[12px] sm:grid-cols-2">
            <div>
              <dt className="font-medium text-foreground">Last engine run: {fmtDateTime(o?.engine.lastTickAt)}</dt>
              <dd className="text-muted">{tickText(o?.engine.lastTickSummary)}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Last seed poll: {fmtDateTime(o?.engine.lastSeedPollAt)}</dt>
              <dd className="text-muted">Seeds are read every 4 minutes while the engine is on.</dd>
            </div>
          </dl>
        </div>
      </Panel>

      {o && o.warnings.length > 0 ? (
        <div className="grid gap-2">
          {o.warnings.map((w, i) => (
            <LevelNote key={i} level={w.level}>{w.text}</LevelNote>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Mailboxes enrolled" loading={loading} value={o?.mailboxTotal ?? 0} />
        <StatTile label="Domains" loading={loading} value={o?.domains ?? 0} />
        <StatTile label="Sent today" loading={loading} value={o?.today.sent ?? 0} />
        <StatTile label="Seed replies today" loading={loading} value={o?.today.replies ?? 0} />
        <StatTile label="Failed sends today" loading={loading} value={o?.today.failed ?? 0} />
        <StatTile label="Inbox rate, 7 days" loading={loading} value={fmtRate(p?.inboxRate)} />
        <StatTile label="Seed capacity / planned today" loading={loading} value={o ? `${o.capacity.seedCapacity} / ${o.capacity.demand}` : "-"} />
        <StatTile label="IPs listed on a blocklist" loading={loading} value={o ? `${o.ips.listed} of ${o.ips.total}` : "-"} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Mailboxes by state">
          <ul className="grid gap-0.5 px-4 py-3 text-[13px]">
            {STATES.map((s) => (
              <li className="flex justify-between gap-2 py-1" key={s}>
                <span className="text-foreground">{stateLabel(s)}</span>
                <span className="tabular-nums text-muted">{loading ? "-" : o.mailboxes[s].toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Where the last 7 days landed" description="Measured by the seed inboxes after delivery.">
          <ul className="grid gap-0.5 px-4 py-3 text-[13px]">
            {[
              ["In the inbox", p?.inbox],
              ["In spam", p?.spam],
              ["Pulled out of spam by a seed", p?.rescued],
              ["Not seen by a seed yet", p?.unknown],
              ["Answered by a seed", p?.replied],
            ].map(([label, value]) => (
              <li className="flex justify-between gap-2 py-1" key={String(label)}>
                <span className="text-foreground">{label}</span>
                <span className="tabular-nums text-muted">{loading ? "-" : Number(value ?? 0).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Last 14 days" description="Emails sent to seeds, where they landed, and seed replies.">
        <div className="px-4 py-4">
          {trend.error ? (
            <ErrorBanner message={trend.error} onRetry={() => void trend.reload()} />
          ) : trend.isLoading && !trend.data ? (
            <Skeleton className="h-[240px] w-full" />
          ) : series.length === 0 ? (
            <p className="py-14 text-center text-sm text-muted">No warm-up activity yet. Start some mailboxes and switch the engine on.</p>
          ) : (
            <div aria-label="Warm-up activity over the last 14 days" className="h-[240px] w-full" role="img">
              <ResponsiveContainer height="100%" width="100%">
                <LineChart data={series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke="var(--separator)" vertical={false} />
                  <XAxis axisLine={false} dataKey="label" minTickGap={24} tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} />
                  <YAxis allowDecimals={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} width={40} />
                  <Tooltip />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Line dataKey="sent" dot={false} name="Sent" stroke="var(--accent)" strokeWidth={2} type="monotone" />
                  <Line dataKey="inbox" dot={false} name="Inbox" stroke="var(--success)" strokeWidth={2} type="monotone" />
                  <Line dataKey="spam" dot={false} name="Spam" stroke="var(--danger)" strokeWidth={2} type="monotone" />
                  <Line dataKey="replies" dot={false} name="Seed replies" stroke="var(--warning)" strokeWidth={2} type="monotone" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
