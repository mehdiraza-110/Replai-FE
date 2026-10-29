import { useState, type ReactNode } from "react";
import { useAuth } from "../../../context/AuthContext";
import { Button, Modal, PageHeader, Toggle } from "../../ui";
import { errorText } from "../crm/shared";

export { errorText };
export { useRemote, useDebounced, Pager, SearchBox } from "../crm/shared";

/** Owners, admins and platform admins may change workspace-wide settings. */
export function useCanManage() {
  const { activeWorkspace, isSuperAdmin } = useAuth();
  return isSuperAdmin || activeWorkspace?.role === "owner" || activeWorkspace?.role === "admin";
}

export const dateText = (value: string | null | undefined) => (value ? new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(new Date(value)) : "—");
export const dateTimeText = (value: string | null | undefined) => (value ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)) : "Never");

export function Notice({ tone, children }: { tone: "ok" | "error" | "warn"; children: ReactNode }) {
  return <p className={`sv-banner is-${tone}`} role={tone === "error" ? "alert" : "status"} style={{ margin: 0 }}>{children}</p>;
}

export function ReadOnlyNote() {
  return <Notice tone="warn">Only workspace owners and admins can change this. You can view the current settings.</Notice>;
}

/** Wraps an async save so cards show a consistent saved / error message. */
export function useSaver() {
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function run(action: () => Promise<unknown>, success = "Saved.") {
    setBusy(true);
    setNotice(null);
    try {
      await action();
      // An empty success text means the action set its own message (for example a summary), so leave it alone.
      if (success) setNotice({ tone: "ok", text: success });
      return true;
    } catch (caught) {
      setNotice({ tone: "error", text: errorText(caught) });
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { notice, setNotice, busy, run };
}

export function SettingsPageFrame({ title, subtitle, children, actions }: { title: string; subtitle?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="sv-page">
      <div className="sv-settings-col">
        <PageHeader title={title} subtitle={subtitle} actions={actions} />
        {children}
      </div>
    </div>
  );
}

export function ConfirmModal({ title, body, confirmLabel, onConfirm, onClose, danger = true }: { title: string; body: ReactNode; confirmLabel: string; onConfirm: () => Promise<void> | void; onClose: () => void; danger?: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal open title={title} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" className={danger ? "is-danger" : undefined} disabled={busy} onClick={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); } onClose(); }}>{confirmLabel}</Button></>}>
      <div className="sv-set-desc">{body}</div>
    </Modal>
  );
}

export function SwitchRow({ label, hint, checked, onChange, disabled }: { label: string; hint?: string; checked: boolean; onChange: (next: boolean) => void; disabled?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", opacity: disabled ? 0.6 : 1 }}>
      <div><div style={{ fontWeight: 500 }}>{label}</div>{hint ? <div className="sv-hint">{hint}</div> : null}</div>
      <span style={disabled ? { pointerEvents: "none" } : undefined} aria-disabled={disabled}><Toggle checked={checked} onChange={onChange} label={label} /></span>
    </div>
  );
}
