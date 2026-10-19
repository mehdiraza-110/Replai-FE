import { Check, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { type AdminWorkspace } from "../../services/adminApi";
import { inputClass } from "./AdminBits";
import { WorkspacePlanPill } from "./WorkspaceStatusPill";

/** Searchable single-select list of workspaces: name, owner email and plan chip per row. */
export function WorkspacePicker({
  workspaces,
  value,
  onChange,
  disabledId,
}: {
  workspaces: AdminWorkspace[];
  value: number | null;
  onChange: (id: number) => void;
  /** Workspace that cannot be chosen (e.g. where the domains already are). */
  disabledId?: number | null;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return workspaces;
    return workspaces.filter((w) => `${w.name} ${w.slug} ${w.owner?.email ?? ""} ${w.owner?.name ?? ""}`.toLowerCase().includes(q));
  }, [workspaces, query]);

  return (
    <div className="rounded-xl border border-border/70">
      <div className="relative border-b border-border/70 p-2">
        <Search className="pointer-events-none absolute left-5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          aria-label="Search workspaces"
          className={`${inputClass} pl-9`}
          placeholder="Search by workspace, slug or owner email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <ul aria-label="Workspaces" className="max-h-[220px] overflow-y-auto" role="listbox">
        {filtered.length === 0 ? (
          <li className="px-3 py-6 text-center text-[13px] text-muted">No workspaces match your search.</li>
        ) : (
          filtered.map((w) => {
            const selected = w.id === value;
            const disabled = w.id === disabledId;
            return (
              <li aria-selected={selected} key={w.id} role="option">
                <button
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left transition focus-visible:bg-default-100 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                    selected ? "bg-accent/10" : "hover:bg-default-100"
                  }`}
                  disabled={disabled}
                  type="button"
                  onClick={() => onChange(w.id)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-foreground">{w.name}</span>
                    <span className="block truncate text-[12px] text-muted">
                      {w.owner?.email ?? "No owner"}
                      {disabled ? " · current workspace" : ""}
                    </span>
                  </span>
                  <WorkspacePlanPill workspace={w} />
                  {selected ? <Check className="size-4 shrink-0 text-accent" /> : <span className="size-4 shrink-0" />}
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
