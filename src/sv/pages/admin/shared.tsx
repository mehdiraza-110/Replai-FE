import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Card, Modal, Toggle } from "../../ui";
import { resolveAdminPlan, type AdminWorkspace, type WorkspaceStatus, type WorkspaceType } from "../../../services/adminApi";
import { setViewAs } from "../../../utils/viewAs";
import { svPath } from "../../nav";
import "./admin.css";

export { errorText } from "../crm/shared";
export { dateText } from "../settings/shared";

export const PROTECTED_SLUG = "koval-group";
export const fullName = (first?: string | null, last?: string | null) => [first, last].filter(Boolean).join(" ");

/**
 * "View as": act inside another workspace. The id is kept for this tab only and sent with every request, so the normal app
 * (campaigns, CRM, inbox, settings) shows that workspace. A bar at the top of the app lets the admin exit.
 */
export function useViewAsAction() {
  const navigate = useNavigate();
  return (workspace: { id: number; name: string }) => {
    setViewAs({ id: workspace.id, name: workspace.name });
    navigate(svPath("dashboard"));
  };
}

export const WorkspaceStatusBadge = ({ status }: { status: WorkspaceStatus }) => <Badge tone={status === "active" ? "green" : "yellow"}>{status === "active" ? "Active" : "Suspended"}</Badge>;
export const WorkspaceTypeBadge = ({ type }: { type: WorkspaceType }) => <Badge tone={type === "organization" ? "blue" : "neutral"}>{type === "organization" ? "Organization" : "Individual"}</Badge>;

export function ProductBadges({ autoResponder, coldMailer }: { autoResponder: boolean; coldMailer: boolean }) {
  return (
    <div className="adm-chips">
      <Badge tone={autoResponder ? "green" : "neutral"}>{autoResponder ? "Auto Responder" : "Auto Responder off"}</Badge>
      <Badge tone={coldMailer ? "green" : "neutral"}>{coldMailer ? "Cold Mailer" : "Cold Mailer off"}</Badge>
    </div>
  );
}

export function PlanBadge({ workspace }: { workspace: AdminWorkspace }) {
  const plan = resolveAdminPlan(workspace);
  if (plan.type !== "trial") return <Badge>Standard</Badge>;
  if (plan.ended) return <Badge tone="red">Trial ended</Badge>;
  return <Badge tone={plan.daysLeft <= 2 ? "red" : plan.daysLeft <= 7 ? "yellow" : "blue"}>Trial · {plan.daysLeft}d</Badge>;
}

export function Section({ title, description, actions, children, className }: { title: string; description?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={`adm-section${className ? ` ${className}` : ""}`}>
      <div className="adm-section-head">
        <div>
          <h2>{title}</h2>
          {description ? <p className="sv-hint">{description}</p> : null}
        </div>
        {actions ? <div className="sv-actions">{actions}</div> : null}
      </div>
      {children}
    </Card>
  );
}

export function Alert({ tone, children }: { tone: "error" | "ok" | "warn"; children: ReactNode }) {
  return <div className={`sv-banner is-${tone}`} role={tone === "error" ? "alert" : "status"} style={{ margin: 0 }}>{children}</div>;
}

/** A confirmation that stays open and shows the server's answer when the action fails. */
export function Confirm({ title, body, confirmLabel, danger, disabled, onConfirm, onClose, children }: {
  title: string; body: ReactNode; confirmLabel: string; danger?: boolean; disabled?: boolean;
  onConfirm: () => Promise<void>; onClose: () => void; children?: ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function go() {
    setBusy(true); setError("");
    try { await onConfirm(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Something went wrong. Try again."); setBusy(false); }
  }
  return (
    <Modal open title={title} onClose={busy ? () => undefined : onClose} footer={<><Button disabled={busy} onClick={onClose}>Cancel</Button><Button variant="primary" className={danger ? "is-danger" : undefined} disabled={busy || disabled} onClick={() => void go()}>{busy ? "Working…" : confirmLabel}</Button></>}>
      <div className="sv-set-desc">{body}</div>
      {children}
      {error ? <Alert tone="error">{error}</Alert> : null}
    </Modal>
  );
}

export function SwitchBox({ label, hint, checked, onChange, disabled }: { label: string; hint?: string; checked: boolean; onChange: (next: boolean) => void; disabled?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", border: "1px solid var(--ds-border)", borderRadius: 10, padding: "12px 14px", opacity: disabled ? 0.6 : 1 }}>
      <div style={{ minWidth: 0 }}><div style={{ fontWeight: 500 }}>{label}</div>{hint ? <div className="sv-hint">{hint}</div> : null}</div>
      <span style={disabled ? { pointerEvents: "none" } : undefined} aria-disabled={disabled}><Toggle checked={checked} onChange={onChange} label={label} /></span>
    </div>
  );
}

/** Resets a form field set when the object behind it is reloaded. */
export function useSyncedState<T>(source: T) {
  const [value, setValue] = useState(source);
  useEffect(() => setValue(source), [source]);
  return [value, setValue] as const;
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
