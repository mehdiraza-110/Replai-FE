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
