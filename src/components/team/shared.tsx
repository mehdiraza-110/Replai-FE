import type { ReactNode } from "react";
import { Modal } from "@heroui/react";
import type { useOverlayState } from "@heroui/react";
import { X } from "lucide-react";
import type { WorkspaceRole } from "../../services/teamApi";

export const roleLabels: Record<WorkspaceRole, string> = { owner: "Owner", admin: "Admin", member: "Member" };
export const roleTones: Record<WorkspaceRole, "accent" | "warning" | "default"> = { owner: "accent", admin: "warning", member: "default" };

export const fieldClass =
  "h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-accent disabled:opacity-60";

export function ModalShell({
  children,
  footer,
  state,
  subtitle,
  title,
}: {
  children: ReactNode;
  footer: ReactNode;
  state: ReturnType<typeof useOverlayState>;
  subtitle?: string;
  title: string;
}) {
  return (
    <Modal state={state}>
      <Modal.Backdrop className="bg-foreground/30 backdrop-blur-[2px]">
        <Modal.Container className="w-[min(520px,calc(100vw-32px))]" placement="center" scroll="inside" size="md">
          <Modal.Dialog className="overflow-hidden rounded-[20px] border border-border/70 bg-surface shadow-[0_8px_30px_color-mix(in_oklch,var(--foreground)_18%,transparent)]">
            <Modal.Header className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4">
              <div>
                <Modal.Heading className="text-base font-semibold leading-6 text-foreground">{title}</Modal.Heading>
                {subtitle ? <p className="mt-1 text-[13px] leading-5 text-muted">{subtitle}</p> : null}
              </div>
              <Modal.CloseTrigger aria-label="Close" className="grid size-8 shrink-0 place-items-center rounded-full bg-default-100 text-foreground transition hover:bg-default-200">
                <X className="size-4" />
              </Modal.CloseTrigger>
            </Modal.Header>
            <Modal.Body className="px-5 py-5">{children}</Modal.Body>
            <Modal.Footer className="flex flex-wrap justify-end gap-2 border-t border-border/70 px-5 py-4">{footer}</Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export function PermissionToggle({
  checked,
  disabled,
  hint,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  hint?: string;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className={"flex items-start gap-3 rounded-xl border border-border/70 px-3 py-2.5 " + (disabled ? "opacity-60" : "cursor-pointer")}>
      <input
        checked={checked && !disabled}
        className="mt-0.5 size-4 accent-[var(--accent)]"
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span className="text-sm">
        <span className="font-medium text-foreground">{label}</span>
        {hint ? <span className="block text-[12px] leading-5 text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}
