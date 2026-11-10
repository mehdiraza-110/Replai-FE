import { Moon, Sun } from "lucide-react";
import type { Theme } from "../../hooks/useTheme";

export function MarketingThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      aria-label={`Switch to ${next} mode`}
      className="mkt-iconbtn mkt-focusable"
      onClick={onToggle}
      title={`Switch to ${next} mode`}
      type="button"
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
