import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { BackgroundBoxes } from "./BackgroundBoxes";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-[var(--mkt-line)] py-32">
      <BackgroundBoxes />

      <div className="mkt-shell relative pointer-events-none text-center">
        <motion.h2
          className="mkt-h2 mx-auto max-w-2xl text-[var(--mkt-ink)]"
          initial={{ y: 16 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: "-80px" }}
          whileInView={{ y: 0 }}
        >
          Your inbox doesn't need another tab. It needs an agent.
        </motion.h2>

        <motion.div
          className="pointer-events-auto mt-8 flex flex-wrap items-center justify-center gap-3"
          initial={{ y: 12 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          viewport={{ once: true, margin: "-80px" }}
          whileInView={{ y: 0 }}
        >
          <a className="mkt-btn mkt-btn--primary mkt-focusable" href="/app/login">
            Start free
            <ArrowRight className="size-4" />
          </a>
          <a className="mkt-btn mkt-btn--ghost mkt-focusable" href="/app/login">
            Sign in
          </a>
        </motion.div>
      </div>
    </section>
  );
}
