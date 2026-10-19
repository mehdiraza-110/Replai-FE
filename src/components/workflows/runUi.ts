import type { Run } from "../../services/workflowApi";

export function statusTone(status: string): "success" | "danger" | "warning" | "default" {
  if (status === "success" || status === "completed") return "success";
  if (status === "failed" || status === "error") return "danger";
  if (status === "running" || status === "partial") return "warning";
  return "default";
}

export function runStatusMap(run: Run): Record<string, string> {
  const map: Record<string, string> = {};
  run.steps.forEach((s) => { map[s.nodeId] = s.status; });
  return map;
}

export function formatWhen(iso: string | null | undefined) {
  if (!iso) return "Never";
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  if (min < 60 * 24) return `${Math.round(min / 60)} h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** One readable line for the meeting and notification steps (the raw output stays available below it). */
export function describeStep(step: { type: string; status: string; output?: unknown }): string | null {
  const o = (step.output && typeof step.output === "object" ? step.output : {}) as Record<string, unknown>;
  const text = (v: unknown) => (typeof v === "string" && v ? v : null);
  const reason = text(o.detail) ?? text(o.reason);
  if (o.reason === "reply_already_handled" && step.status === "skipped") return `Skipped: ${reason}`;
  switch (step.type) {
    case "action.offer_times": {
      const slots = Array.isArray(o.slots) ? (o.slots as { label?: string }[]).map((s) => s.label).filter(Boolean) : [];
      if (slots.length) return `Offering ${slots.length} time${slots.length === 1 ? "" : "s"}: ${slots.join("; ")}`;
      if (typeof o.wouldOfferTimes === "number") return `Would offer ${o.wouldOfferTimes} times from the campaign agent's calendar.`;
      return step.status === "skipped" ? `No times offered${reason ? `: ${reason}` : ""}${o.fallbackUrl ? ". The reply will use the meeting link." : ""}` : null;
    }
    case "condition.slot_selected": {
      if (o.selected === true) return `Yes: option ${String(o.slot)} (${String(o.time ?? "")}) chosen, decided by ${o.method === "model" ? "the AI check" : "rules"}.`;
      return `No: ${text(o.reason) ?? "no offered time was chosen"}`;
    }
    case "action.book_meeting": {
      if (text(o.booked)) return `Booked ${String(o.booked)}${text(o.meetLink) ? ` with ${String(o.meetLink)}` : ""}.`;
      if (text(o.wouldBook)) return `Would book ${String(o.wouldBook)}.`;
      return reason ? `Not booked: ${reason}` : null;
    }
    case "action.notify_email": {
      if (Array.isArray(o.emailed)) return `Emailed ${(o.emailed as string[]).join(", ")}.`;
      if (Array.isArray(o.wouldEmail)) return `Would email ${(o.wouldEmail as string[]).join(", ")}.`;
      return reason ? `Not sent: ${reason}` : null;
    }
    default:
      return null;
  }
}
