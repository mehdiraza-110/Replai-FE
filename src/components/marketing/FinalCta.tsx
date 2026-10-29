import { ArrowUpRight } from "lucide-react";
import type { Theme } from "../../hooks/useTheme";
import Lightfall from "./Lightfall";
import { Reveal } from "./Reveal";

export function FinalCta({ theme }: { theme: Theme }) {
  const isLight = theme === "light";

  return (
    <section className="p-3 sm:p-4">
      <div className="relative isolate overflow-hidden rounded-3xl border border-[var(--mkt-line)] bg-[var(--mkt-bg-raised)] px-5 py-24 text-center sm:rounded-[32px] sm:py-32">
        <div aria-hidden="true" className="absolute inset-0">
          <Lightfall
            backgroundColor="#0a6cf0"
            colors={isLight ? ["#0a6cf0", "#0a5fd6"] : ["#6cb0ff", "#0a6cf0"]}
            fade={0.35}
            key={theme}
            lightMode={isLight}
          />
        </div>
        <Reveal className="relative mx-auto max-w-3xl">
          <h2 className="mkt-display text-[var(--mkt-ink)]">Point it at your inbox.</h2>
          <p className="mkt-body mx-auto mt-6 max-w-[40ch] text-[17px]">
            Read the first drafts before anything sends. You decide what the agent is allowed to do.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a className="mkt-btn mkt-btn--primary mkt-pill mkt-focusable h-14 px-8 text-[15px]" href="/app/login">
              Start free
              <ArrowUpRight className="size-4" />
            </a>
            <a className="mkt-btn mkt-btn--ghost mkt-pill mkt-focusable h-14 px-8 text-[15px]" href="/app/login">
              Sign in
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
