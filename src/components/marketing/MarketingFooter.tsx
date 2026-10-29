const YEAR = new Date().getFullYear();

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Overview", href: "#product" },
      { label: "Examples", href: "#examples" },
      { label: "How it works", href: "#how-it-works" },
      { label: "Security", href: "#security" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Start free", href: "/app/login" },
      { label: "Sign in", href: "/app/login" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="py-16">
      <div className="mkt-shell grid gap-12 md:grid-cols-[1.4fr_2fr]">
        <div>
          <a className="mkt-focusable text-[18px] font-semibold tracking-[-0.02em] text-[var(--mkt-ink)]" href="#top">
            SendVybe
          </a>
          <p className="mkt-body mt-3 max-w-[300px] text-[14px]">
            Reads replies, drafts answers, and books meetings. A person reviews anything uncertain.
          </p>
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {COLUMNS.map((column) => (
            <div key={column.title}>
              <p className="text-[12px] uppercase tracking-[0.06em] text-[var(--mkt-ink-faint)]">{column.title}</p>
              <ul className="mt-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a className="mkt-focusable mkt-link flex min-h-[44px] items-center text-[14px]" href={link.href}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="mkt-shell mt-12 border-t border-[var(--mkt-line)] pt-6">
        <p className="mkt-mono text-[12px] text-[var(--mkt-ink-faint)]">© {YEAR} Koval AI. All rights reserved.</p>
      </div>
    </footer>
  );
}
