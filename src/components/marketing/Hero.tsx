import { ArrowUpRight } from "lucide-react";
import { WaveLines } from "./WaveLines";

export function Hero() {
  return (
    <section className="p-3 sm:p-4" id="top">
      <div className="relative isolate flex min-h-[min(calc(100svh-96px),820px)] items-center justify-center overflow-hidden rounded-3xl border border-[var(--mkt-line)] bg-[var(--mkt-bg-raised)] px-5 py-24 sm:rounded-[32px]">
        <WaveLines className="opacity-90" />

        <div className="mkt-reveal relative mx-auto max-w-4xl text-center">
          <p className="mkt-chip mb-8">For teams running cold outbound</p>
          <h1 className="mkt-display text-[var(--mkt-ink)]">Prospects reply. Your agent answers.</h1>
          <p className="mkt-body mx-auto mt-8 max-w-[46ch] text-[17px] sm:text-[19px]">
            SendVybe drafts replies from your knowledge base and books meetings on Google Calendar. Anything it is
            unsure about waits for a person.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-5">
            <a className="mkt-btn mkt-btn--primary mkt-pill mkt-focusable h-14 px-8 text-[15px]" href="/app/login">
              Start free
              <ArrowUpRight className="size-4" />
            </a>
            <a className="mkt-focusable mkt-link flex min-h-[44px] items-center px-2 text-[15px] font-medium" href="#how-it-works">
              See how it works
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
