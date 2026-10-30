import { useEffect, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { svPath } from "../nav";

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "danger";
  size?: "md" | "sm";
  icon?: LucideIcon;
}

export function Button({ variant = "default", size = "md", icon: Icon, className, children, type = "button", ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx("sv-btn", variant === "primary" && "is-primary", variant === "danger" && "is-danger", size === "sm" && "is-sm", className)}
      {...rest}
    >
      {Icon ? <Icon className="sv-icon" aria-hidden /> : null}
      {children}
    </button>
  );
}

/** Small outlined control used for filters ("Status", "Date Range"). */
export function FilterButton({ icon: Icon, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icon?: LucideIcon }) {
  return (
    <button type="button" className="sv-filter" {...rest}>
      {Icon ? <Icon className="sv-icon" aria-hidden /> : null}
      {children}
    </button>
  );
}

export type BadgeTone = "neutral" | "green" | "yellow" | "red" | "blue" | "purple" | "orange";

export function Badge({ tone = "neutral", icon: Icon, children }: { tone?: BadgeTone; icon?: LucideIcon; children: ReactNode }) {
  return (
    <span className={cx("sv-badge", tone !== "neutral" && `is-${tone}`)}>
      {Icon ? <Icon className="sv-icon" aria-hidden /> : null}
      {children}
    </span>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("sv-card", className)}>{children}</div>;
}

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  hint?: string;
}

export function StatCard({ label, value, icon: Icon, hint }: StatCardProps) {
  return (
    <Card className="sv-stat">
      <div className="sv-stat-top">
        <span className="sv-stat-label" title={hint}>
          {label}
        </span>
        {Icon ? <Icon className="sv-icon" aria-hidden /> : null}
      </div>
      <div className="sv-stat-value">{value}</div>
    </Card>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className="sv-toggle" onClick={() => onChange(!checked)} />;
}

export interface TabLink {
  to: string;
  label: string;
  icon?: LucideIcon;
}

/** Route-backed tabs (CRM, campaign detail). */
export function TabNav({ tabs }: { tabs: TabLink[] }) {
  return (
    <nav className="sv-tabs" aria-label="Sections">
      {tabs.map((tab) => (
        <NavLink key={tab.to} to={svPath(tab.to)} className={({ isActive }) => cx("sv-tab", isActive && "is-active")}>
          {tab.icon ? <tab.icon className="sv-icon" aria-hidden /> : null}
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="sv-page-head">
      <div>
        <h1 className="sv-h1">{title}</h1>
        {subtitle ? <p className="sv-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="sv-actions">{actions}</div> : null}
    </div>
  );
}

/** A settings section: title, description, then the controls. */
export function SettingsCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="sv-set-card">
      <div>
        <h2 className="sv-set-title">{title}</h2>
        {description ? <p className="sv-set-desc">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="sv-field">
      <label className="sv-field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="sv-empty">
      <h3>{title}</h3>
      {body ? <p>{body}</p> : null}
      {action ? <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>{action}</div> : null}
    </div>
  );
}

/** Calls `onClose` when a mouse press lands outside the returned ref's element. */
export function useOutsideClose<T extends HTMLElement = HTMLDivElement>(onClose: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);
  return ref;
}

export interface MenuItem {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  selected?: boolean;
  danger?: boolean;
  disabled?: boolean;
}

/** A button that opens a small menu. Closes on selection, outside click and Escape. */
export function Menu({
  trigger,
  items,
  className = "sv-filter",
  align = "left",
  label,
  disabled,
}: {
  trigger: ReactNode;
  items: MenuItem[];
  className?: string;
  align?: "left" | "right";
  label?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(() => setOpen(false));

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex" }} onKeyDown={(event) => event.key === "Escape" && setOpen(false)}>
      <button type="button" className={className} aria-haspopup="menu" aria-expanded={open} aria-label={label} disabled={disabled} onClick={() => setOpen((current) => !current)}>
        {trigger}
      </button>
      {open ? (
        <div className="sv-popover" role="menu" style={{ top: "calc(100% + 4px)", [align === "right" ? "right" : "left"]: 0 }}>
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              className={`sv-menu-item${item.selected ? " is-selected" : ""}`}
              style={item.danger ? { color: "var(--ds-red-text)" } : undefined}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.icon ? <item.icon className="sv-icon" aria-hidden /> : null}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Modal({ open, title, onClose, children, footer, wide }: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="sv-overlay" style={{ alignItems: "center", paddingTop: 0 }} onMouseDown={onClose} role="presentation">
      <div className="sv-modal" role="dialog" aria-modal="true" aria-label={title} style={wide ? { width: "min(920px, 94vw)", maxWidth: "none", maxHeight: "90vh", overflowY: "auto" } : undefined} onMouseDown={(event) => event.stopPropagation()}>
        <h2 className="sv-set-title">{title}</h2>
        <div className="sv-modal-body">{children}</div>
        {footer ? <div className="sv-modal-foot">{footer}</div> : null}
      </div>
    </div>
  );
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return <input type="checkbox" className="sv-check" checked={checked} aria-label={label} onChange={(event) => onChange(event.target.checked)} />;
}

/** A shimmering placeholder block shown while data loads. Size it with width/height (numbers are px). */
export function Skeleton({ width = "100%", height = 12, circle, style }: { width?: number | string; height?: number | string; circle?: boolean; style?: CSSProperties }) {
  return <span className={cx("sv-skel", circle && "is-circle")} style={{ width, height, ...style }} aria-hidden="true" />;
}

/** Stacked text-line placeholders. The last line is shorter, like a paragraph. */
export function SkeletonLines({ lines = 3 }: { lines?: number }) {
  return (
    <div className="sv-skel-stack" role="status" aria-label="Loading">
      {Array.from({ length: lines }, (_, i) => <Skeleton key={i} width={i === lines - 1 && lines > 1 ? "60%" : "100%"} />)}
    </div>
  );
}

/** Placeholder table rows. Drop inside a <tbody> while data is null. */
export function SkeletonRows({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} className="sv-skel-row" aria-hidden="true">
          {Array.from({ length: columns }, (_, c) => <td key={c}><Skeleton width={c === 0 ? "70%" : `${45 + ((r + c) % 4) * 12}%`} /></td>)}
        </tr>
      ))}
    </>
  );
}

/** A card-shaped placeholder: a title line and a few body lines. Use in a grid while cards load. */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="sv-card" style={{ padding: 16, display: "grid", gap: 12 }} role="status" aria-label="Loading">
      <Skeleton width="40%" height={16} />
      <SkeletonLines lines={lines} />
    </div>
  );
}

/** A whole-page placeholder: header, a row of stat cards, and a table. */
export function SkeletonPage() {
  return (
    <div className="sv-page" role="status" aria-label="Loading">
      <div className="sv-skel-stack" style={{ marginBottom: 20 }}><Skeleton width={220} height={24} /><Skeleton width={360} /></div>
      <div className="sv-stats" style={{ marginBottom: 20 }}>{[0, 1, 2, 3].map((i) => <SkeletonCard key={i} lines={1} />)}</div>
      <div className="sv-card" style={{ padding: 8 }}><table className="sv-table"><tbody><SkeletonRows columns={5} rows={6} /></tbody></table></div>
    </div>
  );
}

/** The app frame (sidebar and a page) as placeholders, shown while the session and workspace load. */
export function SkeletonShell() {
  return (
    <div className="sv-root" style={{ display: "flex", height: "100vh", minHeight: 0 }} role="status" aria-label="Loading">
      <div className="sv-sidebar-skel" style={{ width: 232, flexShrink: 0, padding: 16, display: "grid", alignContent: "start", gap: 14 }}>
        <Skeleton width="60%" height={20} />
        {Array.from({ length: 9 }, (_, i) => <Skeleton key={i} width={`${55 + ((i * 17) % 35)}%`} height={14} />)}
      </div>
      <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}><SkeletonPage /></div>
    </div>
  );
}
