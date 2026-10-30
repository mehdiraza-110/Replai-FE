import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { errorMessage } from "../../../../services/adminApi";
import type { Placement, WarmState, WarningLevel } from "../../../../services/warmnetApi";
import { Badge, Card } from "../../../ui";
import "../ops.css";

/** Loads data once and on demand; keeps the last good result visible while reloading. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const seq = useRef(0);
  const reload = useCallback(async () => {
    const id = ++seq.current;
    setIsLoading(true); setError("");
    try { const next = await fnRef.current(); if (id === seq.current) setData(next); }
    catch (e) { if (id === seq.current) setError(errorMessage(e, "Unable to load this data.")); }
    finally { if (id === seq.current) setIsLoading(false); }
  }, []);
  useEffect(() => { void reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, deps);
  return { data, error, isLoading, reload, setData };
}

export type Notify = (message: string, tone?: "success" | "error") => void;

type Tone = "neutral" | "green" | "yellow" | "red" | "blue";
const STATE_TONE: Record<WarmState, Tone> = { queued: "neutral", warming: "blue", paused: "yellow", ready: "green", released: "green" };
const STATE_LABEL: Record<WarmState, string> = { queued: "Queued", warming: "Warming", paused: "Paused", ready: "Ready", released: "Released" };
export const STATES: WarmState[] = ["queued", "warming", "paused", "ready", "released"];
export const stateLabel = (s: WarmState) => STATE_LABEL[s];

export const StateBadge = ({ state }: { state: WarmState }) => <Badge tone={STATE_TONE[state]}>{STATE_LABEL[state]}</Badge>;

export function IpBadge({ clean, unchecked = false }: { clean: boolean | null; unchecked?: boolean }) {
  if (clean === null) return <Badge>Not checked</Badge>;
  if (clean === false) return <Badge tone="red">Listed</Badge>;
  return <Badge tone={unchecked ? "yellow" : "green"}>{unchecked ? "Clean (partial)" : "Clean"}</Badge>;
}

export function PlacementBadge({ placement, rescued }: { placement: Placement; rescued?: boolean }) {
  if (placement === "inbox") return <Badge tone="green">Inbox</Badge>;
  if (placement === "spam") return <Badge tone="yellow">{rescued ? "Spam, rescued" : "Spam"}</Badge>;
  if (placement === "other") return <Badge>Other folder</Badge>;
  return <Badge>Not seen yet</Badge>;
}

export const fmtRate = (rate: number | null | undefined) => (rate === null || rate === undefined ? "-" : `${rate}%`);

export function fmtDateTime(value: string | null | undefined) {
  if (!value) return "Never";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "Never" : d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const LEVEL_CLASS: Record<WarningLevel, string> = { info: "", warn: " is-yellow", error: " is-red", success: " is-green" };
export const LevelNote = ({ level, children }: { level: WarningLevel; children: ReactNode }) => (
  <div className={`ops-note${LEVEL_CLASS[level]}`} role={level === "error" ? "alert" : "status"}>{children}</div>
);

export function Panel({ title, description, actions, children }: { title?: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <Card>
      {title || actions ? (
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, padding: "12px 16px", borderBottom: "1px solid var(--ds-border)" }}>
          <div style={{ minWidth: 0 }}>
            {title ? <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{title}</h2> : null}
            {description ? <p className="sv-hint" style={{ marginTop: 2 }}>{description}</p> : null}
          </div>
          {actions ? <div className="sv-actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </Card>
  );
}

export const EmptyRow = ({ columns, children }: { columns: number; children: ReactNode }) => (
  <tr><td colSpan={columns} className="sv-hint" style={{ padding: 28, textAlign: "center" }}>{children}</td></tr>
);

export const DataTable = ({ minWidth, head, children }: { minWidth: number; head: ReactNode; children: ReactNode }) => (
  <div className="sv-table-wrap"><table className="sv-table ops-table" style={{ minWidth }}><thead><tr>{head}</tr></thead><tbody>{children}</tbody></table></div>
);

export const Err = ({ message, onRetry }: { message: string; onRetry?: () => void }) => message ? (
  <p className="sv-banner is-error" role="alert" style={{ margin: 0, display: "flex", gap: 10, alignItems: "center" }}>
    <span style={{ flex: 1 }}>{message}</span>
    {onRetry ? <button type="button" className="ops-link" onClick={onRetry}>Try again</button> : null}
  </p>
) : null;

/** A labelled form field with an optional hint line underneath. */
export const Fld = ({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) => (
  <div className="sv-field">
    <label className="sv-field-label" htmlFor={id}>{label}</label>
    {children}
    {hint ? <p className="sv-hint">{hint}</p> : null}
  </div>
);
