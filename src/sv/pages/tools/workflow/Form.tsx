import { X } from "lucide-react";
import { useState, type ReactNode } from "react";

/** Small form pieces used by the node settings and the dialogs. Styled in workflow.css. */

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="wf-field">
      <span className="wf-label">{label}</span>
      {children}
      {hint ? <span className="wf-hint">{hint}</span> : null}
    </label>
  );
}

export function Note({ tone = "muted", children }: { tone?: "muted" | "warning" | "danger"; children: ReactNode }) {
  return <p className={`wf-note is-${tone}`}>{children}</p>;
}

/** An on/off switch that, unlike the shared one, can be disabled. */
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (next: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} className="sv-toggle wf-switch" onClick={() => onChange(!checked)} />;
}

/** A checkbox row with a title and a line of help text. */
export function Check({ label, hint, checked, onChange, disabled }: { label: string; hint?: string; checked: boolean; onChange: (next: boolean) => void; disabled?: boolean }) {
  return (
    <label className="wf-check">
      <input type="checkbox" className="sv-check" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span>
        <span className="wf-check-title">{label}</span>
        {hint ? <span className="wf-hint">{hint}</span> : null}
      </span>
    </label>
  );
}

/** One choice of a radio group, with a title and a line of help text. */
export function Radio({ name, label, hint, checked, onChange, disabled }: { name: string; label: string; hint?: string; checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <label className={`wf-check wf-radio${checked ? " is-selected" : ""}${disabled ? " is-disabled" : ""}`}>
      <input type="radio" name={name} checked={checked} disabled={disabled} onChange={onChange} />
      <span>
        <span className="wf-check-title">{label}</span>
        {hint ? <span className="wf-hint">{hint}</span> : null}
      </span>
    </label>
  );
}

/** "All" or a hand-picked list, e.g. which mailboxes or campaigns a workflow applies to. */
export function MultiSelect<T extends string | number>({
  options,
  value,
  onChange,
  allLabel,
  disabled,
  emptyText,
}: {
  options: { id: T; label: string }[];
  value: T[] | "all" | undefined;
  onChange: (next: T[] | "all") => void;
  allLabel: string;
  disabled?: boolean;
  emptyText: string;
}) {
  const all = value === "all" || value === undefined;
  const selected = all ? [] : value;
  return (
    <fieldset className="wf-multi" disabled={disabled}>
      <label className="wf-multi-row">
        <input type="checkbox" className="sv-check" checked={all} onChange={(event) => onChange(event.target.checked ? "all" : [])} />
        {allLabel}
      </label>
      <div className={`wf-multi-list${all || disabled ? " is-dim" : ""}`}>
        {options.length === 0 ? <p className="wf-hint">{emptyText}</p> : null}
        {options.map((option) => (
          <label className="wf-multi-row" key={option.id}>
            <input
              type="checkbox"
              className="sv-check"
              checked={selected.includes(option.id)}
              disabled={all}
              onChange={(event) => onChange(event.target.checked ? [...selected, option.id] : selected.filter((x) => x !== option.id))}
            />
            <span className="wf-ellipsis" title={option.label}>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** A list of typed words or addresses: Enter or comma adds one, Backspace on an empty box removes the last. */
export function Chips({
  value,
  onChange,
  placeholder = "Type a keyword and press Enter",
  validate,
  max,
  disabled,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  validate?: (word: string) => string | null;
  max?: number;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  function commit() {
    const word = draft.trim();
    if (!word) return;
    if (value.some((v) => v.toLowerCase() === word.toLowerCase())) {
      setDraft("");
      return;
    }
    const problem = validate?.(word) ?? (max && value.length >= max ? `You can add up to ${max}.` : null);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    onChange([...value, word]);
    setDraft("");
  }
  return (
    <div className="wf-chips">
      <div className="wf-chip-list">
        {value.map((word) => (
          <span className="wf-chip" key={word}>
            <span className="wf-ellipsis">{word}</span>
            <button type="button" aria-label={`Remove ${word}`} disabled={disabled} onClick={() => onChange(value.filter((v) => v !== word))}>
              <X className="sv-icon" aria-hidden />
            </button>
          </span>
        ))}
      </div>
      <input
        className="sv-input"
        aria-invalid={error ? true : undefined}
        disabled={disabled}
        placeholder={placeholder}
        value={draft}
        onBlur={commit}
        onChange={(event) => { setDraft(event.target.value); setError(null); }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            commit();
          } else if (event.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
      />
      {error ? <p className="wf-hint is-error">{error}</p> : null}
    </div>
  );
}
