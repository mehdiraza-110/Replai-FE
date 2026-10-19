import type { PlanLimitKey, PlanLimitPeriod, PlanLimitUsage, WorkspacePlan } from "../../types";

export const LIMIT_ORDER: PlanLimitKey[] = ["domains", "mailboxes", "emails", "workflows", "ai_requests"];

export function formatTrialDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function pluralDays(count: number) {
  return `${count} ${count === 1 ? "day" : "days"}`;
}

export function periodLabel(period: PlanLimitPeriod) {
  return period === "day" ? "per 24 hours" : "in total";
}

export function sortedLimits(plan: WorkspacePlan | null | undefined): PlanLimitUsage[] {
  const rank = (key: string) => {
    const index = LIMIT_ORDER.indexOf(key as PlanLimitKey);
    return index === -1 ? LIMIT_ORDER.length : index;
  };
  return [...(plan?.limits ?? [])].sort((a, b) => rank(a.key) - rank(b.key));
}

export type TrialTone = "default" | "warning" | "danger";

export function trialTone(plan: WorkspacePlan): TrialTone {
  if (plan.ended || plan.days_left <= 2) return "danger";
  if (plan.days_left <= 7) return "warning";
  return "default";
}

export function trialEndsText(plan: WorkspacePlan) {
  const date = formatTrialDate(plan.trial_ends_at);
  const when = plan.days_left <= 0 ? "Your trial ends today" : `Your trial ends in ${pluralDays(plan.days_left)}`;
  return date ? `${when}, on ${date}` : when;
}

/** Limits that are set and used up (limit != null && used >= limit), in display order. */
export function reachedLimits(plan: WorkspacePlan | null | undefined): PlanLimitUsage[] {
  return sortedLimits(plan).filter((item) => item.limit !== null && item.used >= item.limit);
}

/** "about 3 hours" style wait until `resetsAt`, or null when unknown or already past. */
export function resetsInText(resetsAt: string | null | undefined, now = Date.now()) {
  if (!resetsAt) return null;
  const ms = new Date(resetsAt).getTime() - now;
  if (Number.isNaN(ms)) return null;
  const minutes = Math.max(1, Math.ceil(ms / 60000));
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

/** One line per reached limit, e.g. "Emails sent: 1,000 of 1,000 per 24 hours — resets in about 3 hours". */
export function limitLine(item: PlanLimitUsage) {
  const base = `${item.label}: ${item.used.toLocaleString()} of ${(item.limit ?? 0).toLocaleString()}`;
  if (item.period === "total") return `${base} (in total)`;
  const wait = resetsInText(item.resets_at);
  return `${base} per 24 hours${wait ? ` — resets in about ${wait}` : ""}`;
}
