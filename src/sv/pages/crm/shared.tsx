import { Children, isValidElement, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { Button, Card, SkeletonRows } from "../../ui";
import { type CustomField } from "../../api/settings";
import { errorText } from "../cold-email/shared";

export { errorText };

export const money = (value: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
export const dateTime = (value: string | null) => (value ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)) : "—");

/** datetime-local inputs speak local time without a zone; the API wants an absolute instant. */
export const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

/** Loads a list whenever its inputs change, ignoring answers that arrive out of order. */
export function useRemote<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    let cancelled = false;
    loadRef.current().then((next) => { if (!cancelled) { setData(next); setError(""); } }).catch((caught) => { if (!cancelled) setError(errorText(caught)); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data, error, setError, reload };
}

export function useDebounced(value: string, ms = 300) {
  const [out, setOut] = useState(value);
  useEffect(() => { const t = window.setTimeout(() => setOut(value), ms); return () => window.clearTimeout(t); }, [value, ms]);
  return out;
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (next: string) => void; placeholder: string }) {
  return (
    <label className="sv-settings-search" style={{ margin: 0, width: 260, height: 36 }}>
      <Search className="sv-icon" aria-hidden />
      <input placeholder={placeholder} aria-label={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export function Pager({ page, limit, total, totalPages, onPage }: { page: number; limit: number; total: number; totalPages: number; onPage: (next: number) => void }) {
  if (total === 0) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
      <span className="sv-hint">Viewing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total.toLocaleString()} results</span>
      <span className="sv-actions"><Button size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button><Button size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</Button></span>
    </div>
  );
}

export function TableCard({ head, children, empty, loading }: { head: ReactNode; children: ReactNode; empty?: string; loading?: boolean }) {
  return (
    <Card>
      <div className="sv-table-wrap">
        <table className="sv-table">
          <thead><tr>{head}</tr></thead>
          <tbody>{loading ? <SkeletonRows columns={(isValidElement(head) ? Children.count((head.props as { children?: ReactNode }).children) : 6)} /> : children}</tbody>
        </table>
        {empty ? <p className="sv-hint" style={{ padding: 20, margin: 0 }}>{empty}</p> : null}
      </div>
    </Card>
  );
}

export const Banner = ({ error }: { error: string }) => (error ? <p className="sv-banner is-error" role="alert" style={{ margin: "0 0 12px" }}>{error}</p> : null);

type CustomValue = string | number | boolean;

/** Inputs for the workspace's custom fields on a deal or company. Empty values are sent as null so they clear. */
export function CustomFieldInputs({ fields, values, onChange }: { fields: CustomField[]; values: Record<string, CustomValue>; onChange: (next: Record<string, CustomValue>) => void }) {
  if (!fields.length) return null;
  const set = (key: string, value: CustomValue | null) => { const next = { ...values }; if (value === null || value === "") delete next[key]; else next[key] = value; onChange(next); };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, borderTop: "1px solid var(--ds-border)", paddingTop: 12 }}>
      {fields.map((f) => (
        <div key={f.key} className="sv-field">
          <label className="sv-field-label" htmlFor={`cf-${f.key}`}>{f.label}</label>
          {f.type === "select" ? <select id={`cf-${f.key}`} className="sv-select" value={String(values[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)}><option value="">None</option>{f.options.map((o) => <option key={o} value={o}>{o}</option>)}</select>
            : f.type === "checkbox" ? <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><input id={`cf-${f.key}`} type="checkbox" checked={values[f.key] === true} onChange={(e) => set(f.key, e.target.checked ? true : null)} /> Yes</label>
            : <input id={`cf-${f.key}`} className="sv-input" type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"} value={String(values[f.key] ?? "")} onChange={(e) => set(f.key, f.type === "number" && e.target.value !== "" ? Number(e.target.value) : e.target.value)} />}
        </div>
      ))}
    </div>
  );
}

/** The custom values to send: everything that's set, plus null for fields the person cleared. */
export const customPayload = (fields: CustomField[], values: Record<string, CustomValue>) => Object.fromEntries(fields.map((f) => [f.key, values[f.key] ?? null]));
