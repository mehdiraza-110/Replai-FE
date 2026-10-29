import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { allDestinations, svPath } from "../nav";

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return allDestinations.slice(0, 12);
    return allDestinations.filter((item) => item.label.toLowerCase().includes(needle)).slice(0, 12);
  }, [query]);

  if (!open) return null;

  const go = (to: string) => {
    onClose();
    navigate(svPath(to));
  };

  return (
    <div className="sv-overlay" onMouseDown={onClose} role="presentation">
      <div className="sv-cmd" role="dialog" aria-label="Search" onMouseDown={(event) => event.stopPropagation()}>
        <input
          ref={inputRef}
          value={query}
          placeholder="Search pages and settings…"
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") onClose();
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setSelected((index) => Math.min(index + 1, results.length - 1));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setSelected((index) => Math.max(index - 1, 0));
            }
            if (event.key === "Enter" && results[selected]) go(results[selected].to);
          }}
        />
        <div className="sv-cmd-list">
          {results.length === 0 ? <p style={{ padding: 12, margin: 0, color: "var(--ds-text-secondary)" }}>No matches</p> : null}
          {results.map((item, index) => (
            <button
              key={`${item.to}-${item.label}`}
              type="button"
              className={`sv-menu-item${index === selected ? " is-selected" : ""}`}
              onMouseEnter={() => setSelected(index)}
              onClick={() => go(item.to)}
            >
              <item.icon className="sv-icon" aria-hidden />
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
