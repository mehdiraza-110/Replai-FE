import { motion } from "motion/react";

const STATS = [
  { value: "<10 min", label: "From signup to a live agent" },
  { value: "24/7", label: "Replies handled around the clock" },
  { value: "100%", label: "Of decisions logged with reasoning" },
  { value: "0", label: "Sends outside your review rules" },
];

export function StatsStrip() {
  return (
    <section className="pb-8">
      <div className="mkt-shell">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-[var(--mkt-line)] bg-[var(--mkt-line)] sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((stat, index) => (
            <motion.div
              className="bg-[var(--mkt-bg-raised)] px-6 py-7 text-center"
              initial={{ y: 12 }}
              key={stat.label}
              transition={{ duration: 0.5, delay: index * 0.07 }}
              viewport={{ once: true }}
              whileInView={{ y: 0 }}
            >
              <p className="mkt-h3 text-[var(--mkt-ink)]">{stat.value}</p>
              <p className="mkt-body mx-auto mt-1.5 text-[12.5px]">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
