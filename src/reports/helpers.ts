import type { ReportKpi, ReportOption } from "./types";

interface PagedResult<T> {
  items: T[];
  totalPages: number;
}

/** Loads every page of a paginated list endpoint (capped, so a runaway list cannot hang the screen). */
export async function fetchAllPages<T>(
  fetchPage: (page: number) => Promise<PagedResult<T>>,
  maxPages = 50,
): Promise<T[]> {
  const first = await fetchPage(1);
  const rest = await Promise.all(
    Array.from({ length: Math.min(first.totalPages, maxPages) - 1 }, (_, index) => fetchPage(index + 2)),
  );
  return [first, ...rest].flatMap((result) => result.items);
}

export const formatCount = (value: number) => value.toLocaleString();

export function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function average(values: number[], digits = 1) {
  return values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length, digits) : 0;
}

export function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

/** A date-time for a table cell; empty when there is no value. */
export function formatDateTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** Milliseconds for sorting a timestamp column; formatted text would sort alphabetically. */
export function timeValue(value: string | null | undefined) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

export function formatDay(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

/** Distinct, sorted values of a field as filter choices. */
export function distinctOptions<T>(rows: T[], get: (row: T) => string | null | undefined): ReportOption[] {
  const values = new Set<string>();
  for (const row of rows) {
    const value = get(row);
    if (value) values.add(value);
  }
  return [...values].sort((a, b) => a.localeCompare(b)).map((value) => ({ value, label: value }));
}

export function kpi(label: string, value: string | number, extra: Partial<ReportKpi> = {}): ReportKpi {
  return { label, value: typeof value === "number" ? formatCount(value) : value, ...extra };
}
