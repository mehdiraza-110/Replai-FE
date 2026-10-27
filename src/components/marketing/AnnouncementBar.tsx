import type { Theme } from "../../hooks/useTheme";
import { MarketingThemeToggle } from "./ThemeToggle";

export function AnnouncementBar({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  return (
    <div className="border-b border-[var(--mkt-line)] bg-[var(--mkt-bg-raised)]">
      <div className="mkt-shell relative flex min-h-12 items-center justify-center py-1 pr-14 text-center text-[13px] sm:text-[14px]">
        <p className="text-[var(--mkt-ink)]">
          AI Auto Responder and AI Cold Mailer in one workspace.{" "}
          <a className="mkt-focusable font-medium text-[var(--mkt-accent-text)] underline underline-offset-4" href="/app/login">
            Get started
          </a>
        </p>
        <div className="absolute right-[clamp(8px,3vw,36px)] top-1/2 -translate-y-1/2">
          <MarketingThemeToggle onToggle={onToggleTheme} theme={theme} />
        </div>
      </div>
    </div>
  );
}
