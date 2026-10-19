import { Button } from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { adminApi, errorMessage, resolveAdminPlan, type AdminWorkspaceDetail, type PlanLimitsPayload } from "../../services/adminApi";
import type { PlanLimitKey, PlanLimitPeriod } from "../../types";
import { LimitMeter } from "../trial/LimitMeter";
import { formatTrialDate, pluralDays } from "../trial/trialUtils";
import { StatusPill } from "../ui/StatusPill";
import { Field, inputClass } from "./AdminBits";
import { ConfirmDialog, ErrorBanner } from "./AdminModal";

interface Row {
  key: PlanLimitKey;
  label: string;
  value: string;
  period: PlanLimitPeriod;
  unlimited: boolean;
}

const ROWS: Array<{ key: PlanLimitKey; label: string; period: PlanLimitPeriod; defaultUnlimited?: boolean }> = [
  { key: "domains", label: "Domains", period: "total" },
  { key: "mailboxes", label: "Mailboxes", period: "total" },
  { key: "emails", label: "Emails sent", period: "day" },
  { key: "workflows", label: "Workflows", period: "total" },
  { key: "ai_requests", label: "AI requests", period: "day", defaultUnlimited: true },
];

function toDateInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function buildRows(data: AdminWorkspaceDetail): Row[] {
  const limits = resolveAdminPlan(data).limits;
  return ROWS.map((r) => {
    const found = limits.find((l) => l.key === r.key);
    const set = found !== undefined && found.limit !== null;
    return {
      key: r.key,
      label: r.label,
      value: set ? String(found!.limit) : "",
      period: found?.period ?? r.period,
      unlimited: found ? !set : Boolean(r.defaultUnlimited) || resolveAdminPlan(data).type !== "trial",
    };
  });
}

type Confirm = "restart" | "end" | "reset" | null;

export function PlanCard({ data, onChanged }: { data: AdminWorkspaceDetail; onChanged: () => Promise<void> }) {
  const info = useMemo(() => resolveAdminPlan(data), [data]);
  const [planType, setPlanType] = useState(info.type);
  const [endDate, setEndDate] = useState(toDateInput(info.endsAt));
  const [rows, setRows] = useState<Row[]>(() => buildRows(data));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);

  useEffect(() => {
    setPlanType(info.type);
    setEndDate(toDateInput(info.endsAt));
    setRows(buildRows(data));
  }, [data, info]);

  const original = useMemo(() => buildRows(data), [data]);
  const limitsDirty = rows.some((r, i) => r.unlimited !== original[i].unlimited || (!r.unlimited && (r.value !== original[i].value || r.period !== original[i].period)));
  const planDirty = planType !== info.type;
  const dateDirty = planType === "trial" && endDate !== toDateInput(info.endsAt);
  const dirty = planDirty || dateDirty || limitsDirty;
  const isTrial = info.type === "trial";

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setConfirm(null);
      await onChanged();
      setNotice(success);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function save() {
    const patch: Parameters<typeof adminApi.updateWorkspace>[1] = {};
    if (planDirty) patch.plan = planType;
    if (dateDirty && endDate) patch.trial_ends_at = new Date(`${endDate}T23:59:59.000Z`).toISOString();
    if (limitsDirty) {
      const limits: PlanLimitsPayload = {};
      for (const r of rows) {
        const n = Number(r.value);
        if (!r.unlimited && (r.value.trim() === "" || !Number.isFinite(n) || n < 0)) {
          setError(`${r.label}: enter a whole number of 0 or more, or switch to Unlimited.`);
          return;
        }
        limits[r.key] = { limit: r.unlimited ? null : Math.floor(n), period: r.period };
      }
      patch.limits = limits;
    }
    void run(() => adminApi.updateWorkspace(data.id, patch), "Plan saved.");
  }

  const setRow = (i: number, patch: Partial<Row>) => setRows((cur) => cur.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const extend = (days: number) => run(() => adminApi.updateWorkspace(data.id, { extend_trial_days: days }), `Trial extended by ${pluralDays(days)}.`);

  const confirmCopy = {
    restart: { title: "Restart trial?", text: "This starts a new 30-day trial from today and resets the trial limits to their defaults.", label: "Restart trial", tone: "primary" as const },
    end: { title: "End trial and make Standard?", text: "The workspace moves to the Standard plan and all trial limits are removed.", label: "Make Standard", tone: "danger" as const },
    reset: { title: "Reset usage?", text: "This clears the rolling 24-hour usage counters, so per-day limits start fresh. Totals such as existing domains are unaffected.", label: "Reset usage", tone: "primary" as const },
  };

  return (
    <section className="rounded-2xl border border-border/70 bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div>
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
            Plan and trial
            {isTrial ? <StatusPill tone={info.ended ? "danger" : "accent"}>{info.ended ? "Trial ended" : `Trial · ${info.daysLeft}d left`}</StatusPill> : <StatusPill>Standard</StatusPill>}
          </h2>
          <p className="mt-0.5 text-[12px] text-muted">Trial workspaces are locked when the trial ends and capped by the limits below.</p>
        </div>
        <div className="flex gap-2">
          {dirty ? (
            <Button isDisabled={busy} size="sm" variant="secondary" onClick={() => { setPlanType(info.type); setEndDate(toDateInput(info.endsAt)); setRows(original); setError(null); }}>
              Discard
            </Button>
          ) : null}
          <Button isDisabled={!dirty || busy} size="sm" variant="primary" onClick={save}>
            {busy ? "Saving..." : "Save plan"}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 p-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Plan">
            <select className={inputClass} value={planType} onChange={(e) => setPlanType(e.target.value as "trial" | "standard")}>
              <option value="standard">Standard</option>
              <option value="trial">Trial</option>
            </select>
          </Field>
          {isTrial ? (
            <>
              <Field label="Trial started">
                <input className={`${inputClass} text-muted`} disabled readOnly value={formatTrialDate(info.startedAt) || "Unknown"} />
              </Field>
              <Field hint={info.ended ? "Ended" : `${pluralDays(info.daysLeft)} left`} label="Trial ends">
                <input className={inputClass} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </Field>
            </>
          ) : null}
        </div>

        {isTrial ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button isDisabled={busy || dirty} size="sm" variant="secondary" onClick={() => void extend(7)}>+7 days</Button>
            <Button isDisabled={busy || dirty} size="sm" variant="secondary" onClick={() => void extend(30)}>+30 days</Button>
            <Button isDisabled={busy || dirty} size="sm" variant="secondary" onClick={() => setConfirm("restart")}>Restart trial (30 days)</Button>
            <Button isDisabled={busy || dirty} size="sm" variant="danger" onClick={() => setConfirm("end")}>End trial / make Standard</Button>
            {dirty ? <span className="text-[12px] text-muted">Save or discard your changes first.</span> : null}
          </div>
        ) : (
          <div>
            <Button isDisabled={busy || dirty} size="sm" variant="secondary" onClick={() => setConfirm("restart")}>Start 30-day trial</Button>
          </div>
        )}

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">Limits</h3>
            <Button isDisabled={busy} size="sm" variant="secondary" onClick={() => setConfirm("reset")}>Reset usage</Button>
          </div>
          <div className="grid gap-2">
            {rows.map((r, i) => (
              <div className="grid items-center gap-2 rounded-xl border border-border/70 bg-surface-secondary/50 p-3 sm:grid-cols-[120px_minmax(0,1fr)_150px_auto]" key={r.key}>
                <span className="text-sm font-medium text-foreground">{r.label}</span>
                <input
                  aria-label={`${r.label} limit`}
                  className={inputClass}
                  disabled={r.unlimited}
                  inputMode="numeric"
                  min={0}
                  placeholder={r.unlimited ? "Unlimited" : "0"}
                  type="number"
                  value={r.unlimited ? "" : r.value}
                  onChange={(e) => setRow(i, { value: e.target.value })}
                />
                <select aria-label={`${r.label} period`} className={inputClass} disabled={r.unlimited} value={r.period} onChange={(e) => setRow(i, { period: e.target.value as PlanLimitPeriod })}>
                  <option value="day">Per 24 hours</option>
                  <option value="total">Total</option>
                </select>
                <label className="flex items-center gap-2 text-[13px] text-foreground">
                  <input checked={r.unlimited} className="size-4 accent-[var(--accent)]" type="checkbox" onChange={(e) => setRow(i, { unlimited: e.target.checked })} />
                  Unlimited
                </label>
              </div>
            ))}
          </div>
        </div>

        {info.limits.length > 0 ? (
          <div className="grid gap-3 rounded-xl border border-border/70 p-3.5">
            <h3 className="text-sm font-semibold text-foreground">Current usage</h3>
            {info.limits.map((l) => (
              <LimitMeter item={l} key={l.key} />
            ))}
          </div>
        ) : null}

        {error ? <ErrorBanner message={error} /> : null}
        {notice && !error ? <p className="text-[13px] font-medium text-success" role="status">{notice}</p> : null}
      </div>

      {confirm ? (
        <ConfirmDialog
          confirmLabel={confirmCopy[confirm].label}
          description={confirmCopy[confirm].text}
          error={error}
          isBusy={busy}
          isOpen
          title={confirmCopy[confirm].title}
          tone={confirmCopy[confirm].tone}
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            if (confirm === "restart") void run(() => adminApi.startTrial(data.id, { days: 30 }), "Trial restarted for 30 days.");
            else if (confirm === "end") void run(() => adminApi.updateWorkspace(data.id, { plan: "standard" }), "Workspace is now on the Standard plan.");
            else void run(() => adminApi.resetUsage(data.id), "Usage reset.");
          }}
        />
      ) : null}
    </section>
  );
}
