import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { leadLibraryService } from "../../services/leadLibraryApi";
import type { LeadList, LibraryLead } from "../../types";

const fieldBase = "rounded-xl border border-border bg-surface-secondary px-3 outline-none transition focus:border-accent";
export const inputClass = `${fieldBase} h-10 w-full text-sm`;
/** Filter-bar sizes: the width comes from the wrapper, or from a `w-[…]` class added next to these. */
export const toolbarFieldClass = `${fieldBase} h-9 w-full text-[13px]`;
export const toolbarSelectClass = `${fieldBase} h-9 text-[13px]`;
export const compactFieldClass = `${fieldBase} h-8 w-full text-[12.5px]`;

/** Largest lead file the server accepts, in MB. Keep in step with the limits in Replai-BE (campaign.routes.js, lead-library.routes.js). */
export const LEAD_IMPORT_MAX_MB = 50;
export const CAMPAIGN_LEAD_FILE_MAX_MB = 25;

export function formatFileSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const SAMPLE_CSV = [
  "Email,First Name,Last Name,Company,Job Title,Phone,Location,Website,LinkedIn",
  "jane.doe@acme.com,Jane,Doe,Acme Staffing,Head of Sales,+1 555 0100,Austin TX,https://acme.com,https://linkedin.com/in/janedoe",
  "john.smith@globex.io,John,Smith,Globex,Founder,+1 555 0101,Denver CO,https://globex.io,https://linkedin.com/in/johnsmith",
].join("\n");

/** Downloads a ready-to-fill example of the lead file format. Only Email is required; extra columns are kept with each lead. */
export function downloadSampleCsv() {
  const url = URL.createObjectURL(new Blob([`${SAMPLE_CSV}\n`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "lead-format-sample.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function leadDisplayName(lead: Pick<LibraryLead, "fullName" | "firstName" | "lastName" | "email">) {
  return lead.fullName || [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/**
 * A list dropdown backed by the paginated lists endpoint: it loads the newest 100 lists and, in workspaces with more,
 * shows a search box that queries the server instead of holding every list in the browser.
 */
export function ListSelect({
  value,
  onChange,
  allowAll = false,
  allLabel = "All lists",
  excludeId,
  className = inputClass,
  placeholder = "Choose a list",
}: {
  value: number | null;
  onChange: (id: number | null) => void;
  allowAll?: boolean;
  allLabel?: string;
  excludeId?: number | null;
  className?: string;
  placeholder?: string;
}) {
  const [lists, setLists] = useState<LeadList[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    leadLibraryService
      .listLists({ page: 1, limit: 100, search: debounced })
      .then((page) => {
        if (id !== requestId.current) return;
        setLists(page.items);
        setTotal(page.total);
      })
      .catch(() => {
        if (id === requestId.current) setLists([]);
      });
  }, [debounced]);

  const options = lists.filter((list) => list.id !== excludeId);

  return (
    <div className="grid gap-1.5">
      {total > 100 || search ? (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
          <input
            className={`${toolbarFieldClass} pl-8`}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search your lists…"
            value={search}
          />
        </div>
      ) : null}
      <select
        className={className}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
        value={value ?? ""}
      >
        {allowAll ? <option value="">{allLabel}</option> : <option value="">{placeholder}</option>}
        {options.map((list) => (
          <option key={list.id} value={list.id}>
            {list.name} ({list.contactCount.toLocaleString()})
          </option>
        ))}
      </select>
    </div>
  );
}
