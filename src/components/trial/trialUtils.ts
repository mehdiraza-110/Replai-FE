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
