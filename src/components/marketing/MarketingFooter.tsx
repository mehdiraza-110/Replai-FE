const YEAR = new Date().getFullYear();

export function MarketingFooter() {
  return (
    <footer className="border-t border-[var(--mkt-line)] py-12">
      <div className="mkt-shell flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <a className="mkt-focusable flex items-center gap-2 text-[15px] font-semibold tracking-[-0.02em] text-[var(--mkt-ink)]" href="#top">
            <span aria-hidden="true" className="grid size-6 place-items-center rounded-md bg-[var(--mkt-accent)] text-[11px] font-bold text-white">
              R
            </span>
            ReplyOS
          </a>
          <p className="mkt-body mt-2.5 max-w-[280px] text-[13px]">AI that reads, drafts, and books the meeting — with a human always in the loop.</p>
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-12 gap-y-2 text-[13px] text-[var(--mkt-ink-dim)] sm:flex sm:flex-wrap sm:justify-end sm:gap-8">
          <a className="mkt-focusable whitespace-nowrap transition-colors hover:text-[var(--mkt-ink)]" href="#product">
            Product
          </a>
          <a className="mkt-focusable whitespace-nowrap transition-colors hover:text-[var(--mkt-ink)]" href="#how-it-works">
            How it works
          </a>
          <a className="mkt-focusable whitespace-nowrap transition-colors hover:text-[var(--mkt-ink)]" href="#security">
            Security
          </a>
          <a className="mkt-focusable whitespace-nowrap transition-colors hover:text-[var(--mkt-ink)]" href="/privacy">
            Privacy
          </a>
          <a className="mkt-focusable whitespace-nowrap transition-colors hover:text-[var(--mkt-ink)]" href="/terms">
            Terms
          </a>
          <a className="mkt-focusable whitespace-nowrap transition-colors hover:text-[var(--mkt-ink)]" href="/app/login">
            Sign in
          </a>
        </nav>
      </div>

      <div className="mkt-shell mt-10 border-t border-[var(--mkt-line-soft)] pt-6">
        <p className="mkt-mono text-[11px] text-[var(--mkt-ink-faint)]">© {YEAR} Koval AI. All rights reserved.</p>
      </div>
    </footer>
  );
}
