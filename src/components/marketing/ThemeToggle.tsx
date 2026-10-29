import { Moon, Sun } from "lucide-react";
import type { Theme } from "../../hooks/useTheme";

export function MarketingThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      aria-label={`Switch to ${next} mode`}
      className="mkt-focusable grid size-11 place-items-center mkt-pill border border-[var(--mkt-line)] text-[var(--mkt-ink-dim)] transition-colors hover:text-[var(--mkt-ink)]"
      onClick={onToggle}
      title={`Switch to ${next} mode`}
      type="button"
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
