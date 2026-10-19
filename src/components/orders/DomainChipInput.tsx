import { X } from "lucide-react";
import { useState } from "react";
import { normalizeDomain } from "../../services/orderApi";

interface DomainChipInputProps {
  id: string;
  values: string[];
  onChange: (values: string[]) => void;
  max?: number;
  placeholder?: string;
  disabled?: boolean;
}

/** Type or paste domains separated by commas, spaces or new lines. Invalid entries are rejected with a message. */
export function DomainChipInput({ id, values, onChange, max = 50, placeholder = "example.com", disabled }: DomainChipInputProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  function commit(text: string) {
    const parts = text.split(/[\s,;]+/).filter(Boolean);
    if (parts.length === 0) return;

    const next = [...values];
    const invalid: string[] = [];
    for (const part of parts) {
      const domain = normalizeDomain(part);
      if (!domain) invalid.push(part);
      else if (!next.includes(domain) && next.length < max) next.push(domain);
    }

    onChange(next);
    if (invalid.length > 0) {
      setError(`"${invalid[0]}" is not a valid domain${invalid.length > 1 ? ` (and ${invalid.length - 1} more)` : ""}. Use a format like example.com.`);
      setDraft(invalid.join(" "));
    } else {
      setError(null);
      setDraft("");
    }
  }

  return (
    <div>
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-xl border border-border bg-surface px-2 py-1.5 focus-within:border-accent">
        {values.map((value) => (
          <span className="inline-flex items-center gap-1 rounded-full bg-default-100 py-0.5 pl-2.5 pr-1 text-[12px] text-foreground" key={value}>
            {value}
            <button
              aria-label={`Remove ${value}`}
              className="grid size-4 place-items-center rounded-full text-muted transition hover:bg-default-200 hover:text-foreground"
              disabled={disabled}
              type="button"
              onClick={() => onChange(values.filter((v) => v !== value))}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={error ? true : undefined}
          className="h-7 min-w-[140px] flex-1 bg-transparent px-1 text-sm text-foreground outline-none placeholder:text-muted"
          disabled={disabled || values.length >= max}
          id={id}
          placeholder={values.length === 0 ? placeholder : "Add another"}
          value={draft}
          onBlur={() => commit(draft)}
          onChange={(event) => {
            const text = event.target.value;
            if (/[\s,;]$/.test(text)) commit(text);
            else setDraft(text);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit(draft);
            } else if (event.key === "Backspace" && draft === "" && values.length > 0) {
              onChange(values.slice(0, -1));
            }
          }}
          onPaste={(event) => {
            const text = event.clipboardData.getData("text");
            if (/[\s,;]/.test(text.trim())) {
              event.preventDefault();
              commit(`${draft}${text}`);
            }
          }}
        />
      </div>
      {error ? (
        <p className="mt-1 text-[12px] text-danger" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
