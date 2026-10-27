import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";

export function ThemeToggle() {
  const { theme, setPreference } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative grid size-[34px] min-w-[34px] place-items-center overflow-hidden rounded-full bg-surface-secondary text-foreground transition-colors duration-300 hover:bg-surface-tertiary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      title={isDark ? "Light mode" : "Dark mode"}
      type="button"
      onClick={() => setPreference(isDark ? "light" : "dark")}
    >
      <Sun
        className={`absolute size-[17px] transition-all duration-300 ease-out ${isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"}`}
        strokeWidth={2}
      />
      <Moon
        className={`absolute size-[17px] transition-all duration-300 ease-out ${isDark ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"}`}
        strokeWidth={2}
      />
    </button>
  );
}
