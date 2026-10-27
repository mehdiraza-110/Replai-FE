import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { errorMessage } from "../../../services/adminApi";
import type { StatusTone } from "../../../types";
import type { Placement, WarmState, WarningLevel } from "../../../services/warmnetApi";
import { StatusPill } from "../../ui/StatusPill";

/** Loads data once and on demand; keeps the last good result visible while reloading. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await fnRef.current());
    } catch (e) {
      setError(errorMessage(e, "Unable to load this data."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, isLoading, reload, setData };
}

export type Notify = (message: string, tone?: "success" | "error") => void;

const STATE_TONE: Record<WarmState, StatusTone> = { queued: "default", warming: "accent", paused: "warning", ready: "success", released: "success" };
const STATE_LABEL: Record<WarmState, string> = { queued: "Queued", warming: "Warming", paused: "Paused", ready: "Ready", released: "Released" };

export const STATES: WarmState[] = ["queued", "warming", "paused", "ready", "released"];
export const stateLabel = (s: WarmState) => STATE_LABEL[s];

export function StateBadge({ state }: { state: WarmState }) {
  return <StatusPill tone={STATE_TONE[state]}>{STATE_LABEL[state]}</StatusPill>;
}

export function IpBadge({ clean, unchecked = false }: { clean: boolean | null; unchecked?: boolean }) {
  if (clean === null) return <StatusPill>Not checked</StatusPill>;
  if (clean === false) return <StatusPill tone="danger">Listed</StatusPill>;
  return <StatusPill tone={unchecked ? "warning" : "success"}>{unchecked ? "Clean (partial)" : "Clean"}</StatusPill>;
}

export function PlacementBadge({ placement, rescued }: { placement: Placement; rescued?: boolean }) {
  if (placement === "inbox") return <StatusPill tone="success">Inbox</StatusPill>;
  if (placement === "spam") return <StatusPill tone="warning">{rescued ? "Spam, rescued" : "Spam"}</StatusPill>;
  if (placement === "other") return <StatusPill>Other folder</StatusPill>;
  return <StatusPill>Not seen yet</StatusPill>;
}

export const fmtRate = (rate: number | null | undefined) => (rate === null || rate === undefined ? "-" : `${rate}%`);

export function fmtDateTime(value: string | null | undefined) {
  if (!value) return "Never";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Never";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const LEVEL_CLASS: Record<WarningLevel, string> = {
  info: "border-border/70 bg-default-100 text-foreground",
  warn: "border-warning/30 bg-warning/10 text-foreground",
  error: "border-danger/20 bg-danger/10 text-danger",
  success: "border-success/30 bg-success/10 text-foreground",
};

export function LevelNote({ level, children }: { level: WarningLevel; children: ReactNode }) {
  return (
    <div className={`rounded-xl border px-4 py-3 text-[13px] font-medium leading-5 ${LEVEL_CLASS[level]}`} role={level === "error" ? "alert" : "status"}>
      {children}
    </div>
  );
}

export function Panel({ title, description, actions, children }: { title?: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-surface">
      {title || actions ? (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
          <div className="min-w-0">
            {title ? <h2 className="text-[15px] font-semibold text-foreground">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-[12px] leading-5 text-muted">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function EmptyRow({ columns, children }: { columns: number; children: ReactNode }) {
  return (
    <tr>
      <td className="px-4 py-10 text-center text-sm font-medium text-muted" colSpan={columns}>
        {children}
      </td>
    </tr>
  );
}

export const thClass = "px-3 py-3 font-medium";
export const tdClass = "px-3 py-3";
export const theadClass = "border-b border-border/70 text-[11px] uppercase tracking-wide text-muted";

export interface TabDef<K extends string> {
  key: K;
  label: string;
}

export function TabBar<K extends string>({ tabs, value, onChange }: { tabs: Array<TabDef<K>>; value: K; onChange: (k: K) => void }) {
  return (
    <div aria-label="Deliverability sections" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" role="tablist">
      {tabs.map((t) => (
        <button
          aria-selected={value === t.key}
          className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-accent ${
            value === t.key ? "bg-accent text-accent-foreground" : "bg-default-100 text-muted hover:bg-default-200 hover:text-foreground"
          }`}
          key={t.key}
          role="tab"
          type="button"
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function TableCard({ minWidth, children }: { minWidth: number; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className={`relative h-6 w-11 shrink-0 rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 ${checked ? "bg-accent" : "bg-default-300"}`}
      disabled={disabled}
      role="switch"
      type="button"
      onClick={() => onChange(!checked)}
    >
      <span className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
    </button>
  );
}
