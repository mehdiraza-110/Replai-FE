import { StatusPill } from "../ui/StatusPill";
import { resolveAdminPlan, type AdminWorkspace, type WorkspaceStatus, type WorkspaceType } from "../../services/adminApi";

export function WorkspaceStatusPill({ status }: { status: WorkspaceStatus }) {
  return <StatusPill tone={status === "active" ? "success" : "warning"}>{status === "active" ? "Active" : "Suspended"}</StatusPill>;
}

export function WorkspaceTypePill({ type }: { type: WorkspaceType }) {
  return <StatusPill tone={type === "organization" ? "accent" : "default"}>{type === "organization" ? "Organization" : "Individual"}</StatusPill>;
}

export function ProductPills({ autoResponder, coldMailer }: { autoResponder: boolean; coldMailer: boolean }) {
  return (
    <div className="flex flex-wrap gap-1">
      <StatusPill tone={autoResponder ? "success" : "default"}>{autoResponder ? "Auto Responder" : "Auto Responder off"}</StatusPill>
      <StatusPill tone={coldMailer ? "success" : "default"}>{coldMailer ? "Cold Mailer" : "Cold Mailer off"}</StatusPill>
    </div>
  );
}

export function WorkspacePlanPill({ workspace }: { workspace: AdminWorkspace }) {
  const plan = resolveAdminPlan(workspace);
  if (plan.type !== "trial") return <StatusPill>Standard</StatusPill>;
  if (plan.ended) return <StatusPill tone="danger">Trial ended</StatusPill>;
  return <StatusPill tone={plan.daysLeft <= 2 ? "danger" : plan.daysLeft <= 7 ? "warning" : "accent"}>Trial · {plan.daysLeft}d</StatusPill>;
}
