import { Badge, type BadgeTone } from "../ui";
import type { TicketStatus } from "../api/feedback";

export const FEEDBACK_STATUSES: { id: TicketStatus; label: string; tone: BadgeTone; hint: string }[] = [
  { id: "pending", label: "Pending", tone: "yellow", hint: "Waiting for the team" },
  { id: "in_review", label: "In review", tone: "blue", hint: "The team picked it up" },
  { id: "approved", label: "Approved", tone: "green", hint: "Accepted, will act" },
  { id: "rejected", label: "Rejected", tone: "red", hint: "Won't act, see the reply" },
  { id: "resolved", label: "Resolved", tone: "purple", hint: "Done" },
];

export function FeedbackStatusBadge({ status }: { status: TicketStatus }) {
  const s = FEEDBACK_STATUSES.find((x) => x.id === status) ?? FEEDBACK_STATUSES[0];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function formatWhen(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
}

export function formatLength(seconds: number | null | undefined) {
  if (!seconds && seconds !== 0) return "";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
