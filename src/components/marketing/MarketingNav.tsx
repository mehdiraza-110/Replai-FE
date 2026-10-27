import { Menu, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import type { Theme } from "../../hooks/useTheme";
import { MarketingThemeToggle } from "./ThemeToggle";

const LINKS = [
  { label: "Product", href: "#product" },
  { label: "Examples", href: "#examples" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Security", href: "#security" },
];

// The nav stays out of the way over the hero, then settles in as a centered pill once the page is scrolled.
const SHOW_AFTER = 160;

export function MarketingNav({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const [shown, setShown] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setShown(window.scrollY > SHOW_AFTER);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!shown) setMenuOpen(false);
  }, [shown]);

  useEffect(() => {
    if (!menuOpen) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [menuOpen]);

  return (
    <motion.header
      animate={
        shown
          ? { opacity: 1, y: 0, visibility: "visible" }
          : { opacity: 0, y: -28, transitionEnd: { visibility: "hidden" } }
      }
      className="fixed inset-x-0 top-4 z-50 flex flex-col items-center px-4"
      initial={false}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="mkt-pill flex h-14 w-full max-w-[760px] items-center justify-between gap-2 border border-[var(--mkt-line)] bg-[var(--mkt-bg-raised)] pl-5 pr-1.5 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.6)]">
        <a className="mkt-focusable text-[16px] font-semibold tracking-[-0.02em] text-[var(--mkt-ink)]" href="#top">
          SendVybe
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
          {LINKS.map((link) => (
            <a className="mkt-focusable mkt-link text-[14px] font-medium" href={link.href} key={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <MarketingThemeToggle onToggle={onToggleTheme} theme={theme} />
          <a className="mkt-btn mkt-btn--primary mkt-pill mkt-focusable" href="/app/login">
            Start free
          </a>
          <button
            aria-controls="mkt-mobile-menu"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="mkt-focusable mkt-pill grid size-11 place-items-center text-[var(--mkt-ink)] md:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <nav
          aria-label="Primary mobile"
          className="mt-2 w-full max-w-[760px] rounded-3xl border border-[var(--mkt-line)] bg-[var(--mkt-bg-raised)] p-2 md:hidden"
          id="mkt-mobile-menu"
        >
          {LINKS.map((link) => (
            <a
              className="mkt-focusable mkt-link flex min-h-[48px] items-center rounded-2xl px-4 text-[15px] font-medium"
              href={link.href}
              key={link.href}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <a
            className="mkt-focusable mkt-link flex min-h-[48px] items-center rounded-2xl px-4 text-[15px] font-medium"
            href="/app/login"
          >
            Sign in
          </a>
        </nav>
      ) : null}
    </motion.header>
  );
}
