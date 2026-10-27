import type { ComponentType } from "react";
import type { DateRange } from "../utils/dateRange";
import type { ReportCell } from "../utils/reportExport";

export type ReportTone = "success" | "warning" | "danger";

export interface ReportOption {
  value: string;
  label: string;
}

export interface ReportColumnDef<T> {
  key: string;
  label: string;
  align?: "left" | "right";
  /** What is shown and exported. Numbers stay numbers so sorting and spreadsheets treat them as such. */
  value: (row: T) => ReportCell;
  /** Sorts by this instead of `value`, e.g. a timestamp behind a formatted date. */
  sortValue?: (row: T) => ReportCell;
  /** Colors the cell on screen only; exports stay plain. */
  tone?: (row: T) => ReportTone | undefined;
}

export interface ReportFilterDef<T> {
  key: string;
  label: string;
  /** Label of the "no filter" choice, e.g. "All statuses". */
  allLabel: string;
  /** A function derives the choices from the loaded rows (agents, campaigns, domains...). */
  options: ReportOption[] | ((rows: T[]) => ReportOption[]);
  test: (row: T, value: string) => boolean;
}

/** A timestamp on each row that the date range can apply to. More than one lets the viewer choose. */
export interface ReportDateField<T> {
  key: string;
  label: string;
  get: (row: T) => string | null;
}

export interface ReportKpi {
  label: string;
  value: string;
  hint?: string;
  tone?: ReportTone;
}

export interface ReportDef<T> {
  id: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  columns: Array<ReportColumnDef<T>>;
  filters: Array<ReportFilterDef<T>>;
  dateFields?: Array<ReportDateField<T>>;
  /** True when the server applies the date range, so changing it reloads the data. */
  serverRange?: boolean;
  load: (range: DateRange | null) => Promise<T[]>;
  search: (row: T) => string;
  searchPlaceholder: string;
  kpis: (rows: T[]) => ReportKpi[];
  /** Groups the filtered rows for the distribution chart. */
  breakdown?: { label: string; get: (row: T) => string };
  defaultSort?: { key: string; dir: "asc" | "desc" };
}

// Reports are chosen from a list at runtime, so the row type is erased at that boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyReport = ReportDef<any>;
