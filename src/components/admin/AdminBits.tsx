import { Button } from "@heroui/react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

export const inputClass =
  "h-9 w-full rounded-xl border border-border bg-surface-secondary px-3 text-[13px] text-foreground outline-none transition focus:border-accent disabled:opacity-60";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[20px] font-semibold leading-7 text-foreground">{title}</h1>
        {description ? <p className="mt-1 text-[13px] leading-5 text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative w-full sm:max-w-[360px]">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <input
        aria-label={placeholder}
        className={`${inputClass} pl-9`}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function Field({ label, error, hint, children }: { label: string; error?: string | null; hint?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-foreground">
      {label}
      {children}
      {hint && !error ? <span className="text-[12px] font-normal text-muted">{hint}</span> : null}
      {error ? <span className="text-[12px] font-normal text-danger">{error}</span> : null}
    </label>
  );
}

export function Pagination({ page, limit, total, onPage }: { page: number; limit: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border/70 px-4 py-3 text-[12px] text-muted">
      <span>
        {total === 0 ? "0 results" : `${(page - 1) * limit + 1}-${Math.min(page * limit, total)} of ${total}`}
      </span>
      <div className="flex items-center gap-2">
        <span>
          Page {page} of {pages}
        </span>
        <Button isIconOnly aria-label="Previous page" isDisabled={page <= 1} size="sm" variant="secondary" onClick={() => onPage(page - 1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <Button isIconOnly aria-label="Next page" isDisabled={page >= pages} size="sm" variant="secondary" onClick={() => onPage(page + 1)}>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function StatTile({ label, value, loading }: { label: string; value: number | string; loading?: boolean }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-surface px-4 py-4">
      <p className="text-[13px] font-medium text-muted">{label}</p>
      {loading ? (
        <div className="mt-3 h-6 w-16 animate-pulse rounded-md bg-default-200" />
      ) : (
        <p className="mt-3 text-[24px] font-semibold leading-none text-foreground">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
      )}
    </div>
  );
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Never" : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function fullName(first?: string | null, last?: string | null) {
  return [first, last].filter(Boolean).join(" ");
}

export function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
