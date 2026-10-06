import { useEffect, useState } from "react";
import { motion } from "motion/react";

const LINKS = [
  { label: "Product", href: "#product" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Security", href: "#security" },
];

export function MarketingNav() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > 12);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.header
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-x-0 top-4 z-50 px-4 sm:top-5"
      initial={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        className="mx-auto flex h-[60px] w-full max-w-[1040px] items-center justify-between rounded-full border px-3 pl-5 transition-colors duration-300 sm:px-4 sm:pl-6"
        style={{
          borderColor: isScrolled ? "var(--mkt-line)" : "var(--mkt-line-soft)",
          background: isScrolled
            ? "color-mix(in oklch, var(--mkt-bg-raised) 88%, transparent)"
            : "color-mix(in oklch, var(--mkt-bg-raised) 55%, transparent)",
          backdropFilter: "blur(16px)",
          boxShadow: isScrolled ? "0 12px 32px -16px rgba(0,0,0,0.5)" : "none",
        }}
      >
        <a className="mkt-focusable flex items-center gap-2 text-[15px] font-semibold tracking-[-0.02em] text-[var(--mkt-ink)]" href="#top">
          <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-[var(--mkt-accent)] text-[11px] font-bold text-white">
            R
          </span>
          ReplyOS
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
          {LINKS.map((link) => (
            <a
              className="mkt-focusable text-[13px] font-medium text-[var(--mkt-ink-dim)] transition-colors hover:text-[var(--mkt-ink)]"
              href={link.href}
              key={link.href}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a className="mkt-focusable hidden text-[13px] font-medium text-[var(--mkt-ink-dim)] transition-colors hover:text-[var(--mkt-ink)] sm:inline" href="/app/login">
            Sign in
          </a>
          <a className="mkt-btn mkt-btn--primary mkt-focusable h-[38px] px-4 text-[13px]" href="/app/login">
            Start free
          </a>
        </div>
      </div>
    </motion.header>
  );
}
