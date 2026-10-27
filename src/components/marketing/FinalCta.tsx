import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";

export function FinalCta() {
  return (
    <section className="py-24">
      <div className="mkt-shell">
        <motion.div
          className="relative overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#0a84ff,#0058d6_60%,#3a2fd6)] px-6 py-20 text-center text-white sm:px-12"
          initial={{ y: 20 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: "-80px" }}
          whileInView={{ y: 0 }}
        >
          <div aria-hidden="true" className="mkt-grid-pattern pointer-events-none absolute inset-0 opacity-30 [--mkt-line-soft:rgba(255,255,255,0.12)]" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-white opacity-15 blur-3xl" />
          <div className="relative">
            <h2 className="mkt-h2 mx-auto max-w-2xl">Your inbox doesn't need another tab. It needs an agent.</h2>
            <p className="mx-auto mt-4 max-w-[46ch] text-[15px] leading-6 text-white/80">
              Set up in minutes, keep a human in the loop, and wake up to booked meetings with the reasoning attached.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a className="mkt-btn mkt-focusable bg-white text-[#0058d6] hover:bg-white/90" href="/app/login">
                Start free
                <ArrowRight className="size-4" />
              </a>
              <a className="mkt-btn mkt-focusable border border-white/40 text-white hover:bg-white/10" href="/app/login">
                Sign in
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
