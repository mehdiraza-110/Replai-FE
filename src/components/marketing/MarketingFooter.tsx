const YEAR = new Date().getFullYear();

const LINKS = [
  { label: "Sign in", href: "/app/login" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

export function MarketingFooter() {
  return (
    <footer className="py-10">
      <div className="mkt-shell flex flex-wrap items-center justify-between gap-x-8 gap-y-2">
        <p className="text-[14px] text-[var(--mkt-ink-faint)]">&copy; {YEAR} Koval AI. All rights reserved.</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6">
          {LINKS.map((link) => (
            <a className="mkt-focusable mkt-link flex min-h-[44px] items-center text-[14px]" href={link.href} key={link.label}>
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
