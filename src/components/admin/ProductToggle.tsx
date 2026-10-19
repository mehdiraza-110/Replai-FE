interface ProductToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}

export function ProductToggle({ label, description, checked, onChange, disabled }: ProductToggleProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border/70 bg-surface-secondary/50 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description ? <p className="mt-0.5 text-[12px] leading-5 text-muted">{description}</p> : null}
      </div>
      <button
        aria-checked={checked}
        aria-label={label}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${checked ? "bg-accent" : "bg-default-300"}`}
        disabled={disabled}
        role="switch"
        type="button"
        onClick={() => onChange(!checked)}
      >
        <span className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}
