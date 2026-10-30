import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

/** A panel that slides in from the right over the editor. Closes with Escape, the close button or a click outside. */
export function Drawer({ isOpen, onClose, title, subtitle, children }: { isOpen: boolean; onClose: () => void; title: string; subtitle: string; children: ReactNode }) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  return (
    <div className="wf-drawer-backdrop" onMouseDown={onClose} role="presentation">
      <aside className="wf-drawer" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <header className="wf-drawer-head">
          <div>
            <h2 className="sv-set-title">{title}</h2>
            <p className="wf-hint">{subtitle}</p>
          </div>
          <button type="button" className="sv-icon-btn" aria-label="Close" onClick={onClose}>
            <X className="sv-icon" aria-hidden />
          </button>
        </header>
        <div className="wf-drawer-body">{children}</div>
      </aside>
    </div>
  );
}
