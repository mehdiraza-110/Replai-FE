/** Inclusive calendar-day range in the viewer's local time, as yyyy-mm-dd strings. */
export interface DateRange {
  start: string;
  end: string;
}

export type DatePresetId = "today" | "last_7_days" | "last_30_days" | "all_time" | "custom";

export interface DatePreset {
  id: DatePresetId;
  label: string;
  short: string;
}

export const DATE_PRESETS: DatePreset[] = [
  { id: "today", label: "Today", short: "Today" },
  { id: "last_7_days", label: "Last 7 days", short: "Last 7 days" },
  { id: "last_30_days", label: "Last 30 days", short: "Last 30 days" },
  { id: "all_time", label: "All time", short: "All time" },
  { id: "custom", label: "Custom range", short: "Custom range" },
];

export function toISODate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** The range a preset stands for; null means "no date limit". "custom" has no range of its own. */
export function rangeForPreset(preset: DatePresetId, now = new Date()): DateRange | null {
  const today = toISODate(now);
  switch (preset) {
    case "today":
      return { start: today, end: today };
    case "last_7_days":
      return { start: toISODate(addDays(now, -6)), end: today };
    case "last_30_days":
      return { start: toISODate(addDays(now, -29)), end: today };
    default:
      return null;
  }
}

/** Whether a timestamp (ISO date or datetime) falls on a day inside the range, compared in local time. */
export function isInRange(value: string | null | undefined, range: DateRange | null) {
  if (!range) return true;
  if (!value) return false;
  const time = new Date(value);
  if (Number.isNaN(time.getTime())) return false;
  const day = toISODate(time);
  return day >= range.start && day <= range.end;
}

export function daysBetween(range: DateRange) {
  const start = new Date(`${range.start}T00:00:00`);
  const end = new Date(`${range.end}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

export function formatRangeLabel(range: DateRange | null) {
  if (!range) return "All time";
  const format = (value: string) =>
    new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  return range.start === range.end ? format(range.start) : `${format(range.start)} – ${format(range.end)}`;
}
