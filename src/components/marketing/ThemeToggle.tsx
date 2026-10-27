import { Moon, Sun } from "lucide-react";
import type { Theme } from "../../hooks/useTheme";

export function MarketingThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      aria-label={`Switch to ${next} mode`}
      className="mkt-focusable grid size-[38px] place-items-center rounded-full border border-[var(--mkt-line)] text-[var(--mkt-ink-dim)] transition-colors hover:bg-[color-mix(in_oklch,var(--mkt-fg-mix)_8%,transparent)] hover:text-[var(--mkt-ink)]"
      onClick={onToggle}
      title={`Switch to ${next} mode`}
      type="button"
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
