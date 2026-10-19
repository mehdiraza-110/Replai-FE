import { Button, Modal, useOverlayState } from "@heroui/react";
import { X } from "lucide-react";
import type { ReactNode } from "react";

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

export function AdminModal({ isOpen, onClose, title, description, children, footer, width = 480 }: AdminModalProps) {
  const state = useOverlayState({
    isOpen,
    onOpenChange: (next) => {
      if (!next) onClose();
    },
  });

  return (
    <Modal state={state}>
      <Modal.Backdrop className="bg-foreground/30 backdrop-blur-[2px]">
        <Modal.Container className={width <= 440 ? "w-[min(440px,calc(100vw-32px))]" : width <= 520 ? "w-[min(520px,calc(100vw-32px))]" : "w-[min(760px,calc(100vw-32px))]"} placement="center" scroll="inside" size="md">
          <Modal.Dialog className="overflow-hidden rounded-[20px] border border-border/70 bg-surface shadow-[0_8px_30px_color-mix(in_oklch,var(--foreground)_18%,transparent)]">
            <Modal.Header className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4">
              <div className="min-w-0">
                <Modal.Heading className="text-base font-semibold leading-6 text-foreground">{title}</Modal.Heading>
                {description ? <p className="mt-1 text-[13px] leading-5 text-muted">{description}</p> : null}
              </div>
              <Modal.CloseTrigger
                aria-label="Close"
                className="grid size-8 shrink-0 place-items-center rounded-full bg-default-100 text-foreground transition hover:bg-default-200"
              >
                <X className="size-4" />
              </Modal.CloseTrigger>
            </Modal.Header>
            <Modal.Body className="px-5 py-5">{children}</Modal.Body>
            {footer ? (
              <Modal.Footer className="flex flex-wrap justify-end gap-2 border-t border-border/70 px-5 py-4">{footer}</Modal.Footer>
            ) : null}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  confirmLabel: string;
  tone?: "danger" | "primary";
  isBusy?: boolean;
  isConfirmDisabled?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  children,
  confirmLabel,
  tone = "primary",
  isBusy = false,
  isConfirmDisabled = false,
  error,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <AdminModal
      footer={
        <>
          <Button isDisabled={isBusy} size="sm" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button isDisabled={isBusy || isConfirmDisabled} size="sm" variant={tone} onClick={onConfirm}>
            {isBusy ? "Working..." : confirmLabel}
          </Button>
        </>
      }
      isOpen={isOpen}
      title={title}
      width={440}
      onClose={onClose}
    >
      {description ? <p className="text-sm leading-6 text-foreground">{description}</p> : null}
      {children}
      {error ? <ErrorBanner className="mt-3" message={error} /> : null}
    </AdminModal>
  );
}

export function ErrorBanner({ message, className = "", onRetry }: { message: string; className?: string; onRetry?: () => void }) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm font-medium text-danger ${className}`}
      role="alert"
    >
      <span>{message}</span>
      {onRetry ? (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
