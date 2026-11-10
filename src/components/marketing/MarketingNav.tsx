import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Theme } from "../../hooks/useTheme";
import { MarketingThemeToggle } from "./ThemeToggle";

const LINKS = [
  { label: "Replies", href: "#replies" },
  { label: "Product", href: "#product" },
  { label: "Compare", href: "#compare" },
  { label: "Security", href: "#security" },
];

export function MarketingNav({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [menuOpen]);

  return (
    <header className="mkt-header">
      <div className="mkt-shell mkt-header-inner relative">
        <a className="mkt-focusable" href="#top" aria-label="SendVybe, back to top">
          <img alt="SendVybe" className="mkt-logo" src="/new-logo.png" />
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <a className="mkt-focusable mkt-link text-[15px] font-medium" href={link.href} key={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <MarketingThemeToggle onToggle={onToggleTheme} theme={theme} />
          <a className="mkt-focusable mkt-link hidden px-3 text-[15px] font-medium sm:block" href="/app/login">
            Sign in
          </a>
          <a className="mkt-btn mkt-btn--solid mkt-btn--sm mkt-focusable" href="/app/login">
            Create account
          </a>
          <span className="md:hidden">
            <button
              aria-controls="mkt-mobile-menu"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="mkt-iconbtn mkt-focusable"
              onClick={() => setMenuOpen((open) => !open)}
              type="button"
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </span>
        </div>

        {menuOpen ? (
          <nav aria-label="Primary mobile" className="mkt-menu md:hidden" id="mkt-mobile-menu">
            {LINKS.map((link) => (
              <a className="mkt-focusable" href={link.href} key={link.href} onClick={() => setMenuOpen(false)}>
                {link.label}
              </a>
            ))}
            <a className="mkt-focusable" href="/app/login">
              Sign in
            </a>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
