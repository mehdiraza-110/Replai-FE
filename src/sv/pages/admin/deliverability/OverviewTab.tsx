import { useState } from "react";
import { Play, RefreshCw } from "lucide-react";
import { errorMessage } from "../../../../services/adminApi";
import { warmnetApi, type TickSummary } from "../../../../services/warmnetApi";
import { AreaChart } from "../../../ui/AreaChart";
import { Button, StatCard, Toggle, Skeleton } from "../../../ui";
import { Err, fmtDateTime, fmtRate, LevelNote, Panel, STATES, stateLabel, useLoad, type Notify } from "./shared";

export function tickText(s: TickSummary | null | undefined) {
  if (!s) return "No run recorded yet.";
  if (s.skipped) return `Skipped (${s.skipped}).`;
  const parts = [
    `${s.sent ?? 0} sent`, `${s.seedReplies ?? 0} seed replies`, `${s.counterReplies ?? 0} counter-replies`,
    s.failed ? `${s.failed} failed` : null,
    s.skippedNoSeed ? `${s.skippedNoSeed} waiting for seed capacity` : null,
    s.skippedBlocklisted ? `${s.skippedBlocklisted} held by a blocklisted IP` : null,
    s.inWindow === false ? "outside the sending window" : null,
  ].filter(Boolean);
  return parts.join(", ") + ".";
}

const SERIES = [
  { key: "sent", label: "Sent", color: "#3e63dd" },
  { key: "inbox", label: "Inbox", color: "#30a46c" },
  { key: "spam", label: "Spam", color: "#e5484d" },
  { key: "replies", label: "Seed replies", color: "#f5a524" },
];

export function OverviewTab({ notify }: { notify: Notify }) {
  const overview = useLoad(() => warmnetApi.overview(), []);
  const trend = useLoad(() => warmnetApi.trend(14), []);
  const [busy, setBusy] = useState<"tick" | "poll" | "toggle" | null>(null);
  const [actionError, setActionError] = useState("");
  const o = overview.data;

  async function run(kind: "tick" | "poll") {
    setBusy(kind); setActionError("");
    try {
      if (kind === "tick") notify(`Engine run finished: ${tickText(await warmnetApi.runEngine(false))}`);
      else {
        const r = await warmnetApi.pollSeeds();
        const failed = r.filter((x) => x.error).length;
        notify(`Polled ${r.length} seed inbox(es)${failed ? `, ${failed} with errors` : ""}.`, failed ? "error" : "success");
      }
      await Promise.all([overview.reload(), trend.reload()]);
    } catch (e) { setActionError(errorMessage(e, "That did not work. Please try again.")); } finally { setBusy(null); }
  }

  async function toggle(next: boolean) {
    setBusy("toggle"); setActionError("");
    try {
      await warmnetApi.updateSettings({ enabled: next });
      notify(next ? "Warm-up engine switched on." : "Warm-up engine switched off. Nothing will be sent.");
      await overview.reload();
    } catch (e) { setActionError(errorMessage(e, "Unable to change the engine.")); } finally { setBusy(null); }
  }

  if (overview.error && !o) return <Err message={overview.error} onRetry={() => void overview.reload()} />;
  const loading = !o;
  const p = o?.placement7d;
  const series = (trend.data ?? []).map((t) => ({ ...t, date: t.day }));
  const dash = (v: number | string | undefined) => (loading ? "…" : typeof v === "number" ? v.toLocaleString() : v ?? "-");

  return (
    <div className="sv-stack">
      <Err message={actionError} />
      {o ? <Err message={overview.error} onRetry={() => void overview.reload()} /> : null}

      <Panel title="Warm-up engine" description="When on, every 3 minutes each warming mailbox sends what it is due to the seed inboxes, inside the sending window." actions={
        <>
          <Button icon={RefreshCw} disabled={busy !== null} onClick={() => void run("poll")}>{busy === "poll" ? "Polling…" : "Poll seeds now"}</Button>
          <Button icon={Play} disabled={busy !== null || !o?.enabled} onClick={() => void run("tick")}>{busy === "tick" ? "Running…" : "Run engine now"}</Button>
        </>
      }>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 16, padding: 16 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={loading || busy !== null ? { pointerEvents: "none", opacity: 0.6 } : undefined}><Toggle checked={Boolean(o?.enabled)} label="Warm-up engine" onChange={(v) => void toggle(v)} /></span>
            <div><div style={{ fontWeight: 500 }}>{loading || !o ? <Skeleton width={40} height={16} /> : o.enabled ? "On" : "Off"}</div><p className="sv-hint">Window runs in {o?.timezone ?? "…"}</p></div>
          </div>
          <div className="ops-grid-2" style={{ gap: "6px 32px", fontSize: 12 }}>
            <div><div style={{ fontWeight: 500 }}>Last engine run: {fmtDateTime(o?.engine.lastTickAt)}</div><div className="ops-muted">{tickText(o?.engine.lastTickSummary)}</div></div>
            <div><div style={{ fontWeight: 500 }}>Last seed poll: {fmtDateTime(o?.engine.lastSeedPollAt)}</div><div className="ops-muted">Seeds are read every 4 minutes while the engine is on.</div></div>
          </div>
        </div>
      </Panel>

      {o && o.warnings.length > 0 ? <div style={{ display: "grid", gap: 8 }}>{o.warnings.map((w, i) => <LevelNote key={i} level={w.level}>{w.text}</LevelNote>)}</div> : null}

      <div className="sv-stats">
        <StatCard label="Mailboxes enrolled" value={dash(o?.mailboxTotal)} />
        <StatCard label="Domains" value={dash(o?.domains)} />
        <StatCard label="Sent today" value={dash(o?.today.sent)} />
        <StatCard label="Seed replies today" value={dash(o?.today.replies)} />
        <StatCard label="Failed sends today" value={dash(o?.today.failed)} />
        <StatCard label="Inbox rate, 7 days" value={loading ? "…" : fmtRate(p?.inboxRate)} />
        <StatCard label="Seed capacity / planned today" value={o ? `${o.capacity.seedCapacity} / ${o.capacity.demand}` : "…"} />
        <StatCard label="IPs listed on a blocklist" value={o ? `${o.ips.listed} of ${o.ips.total}` : "…"} />
      </div>

      <div className="ops-grid-2">
        <Panel title="Mailboxes by state">
          <ul style={{ listStyle: "none", margin: 0, padding: "10px 16px", display: "grid", gap: 2, fontSize: 13 }}>
            {STATES.map((s) => <li key={s} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span>{stateLabel(s)}</span><span className="ops-muted">{loading ? "-" : o.mailboxes[s].toLocaleString()}</span></li>)}
          </ul>
        </Panel>
        <Panel title="Where the last 7 days landed" description="Measured by the seed inboxes after delivery.">
          <ul style={{ listStyle: "none", margin: 0, padding: "10px 16px", display: "grid", gap: 2, fontSize: 13 }}>
            {([["In the inbox", p?.inbox], ["In spam", p?.spam], ["Pulled out of spam by a seed", p?.rescued], ["Not seen by a seed yet", p?.unknown], ["Answered by a seed", p?.replied]] as Array<[string, number | undefined]>).map(([label, value]) => (
              <li key={label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span>{label}</span><span className="ops-muted">{loading ? "-" : Number(value ?? 0).toLocaleString()}</span></li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Last 14 days" description="Emails sent to seeds, where they landed, and seed replies.">
        <div style={{ padding: 16 }}>
          {trend.error ? <Err message={trend.error} onRetry={() => void trend.reload()} />
            : trend.isLoading && !trend.data ? <Skeleton height={180} style={{ borderRadius: 8 }} />
            : series.length === 0 ? <p className="sv-hint" style={{ padding: "40px 0", textAlign: "center" }}>No warm-up activity yet. Start some mailboxes and switch the engine on.</p>
            : (
              <>
                <AreaChart data={series} series={SERIES} height={240} />
                <div className="sv-actions" style={{ marginTop: 8 }}>{SERIES.map((s) => <span key={s.key} className="sv-hint" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><i style={{ width: 8, height: 8, borderRadius: 4, background: s.color, display: "inline-block" }} />{s.label}</span>)}</div>
              </>
            )}
        </div>
      </Panel>
    </div>
  );
}
