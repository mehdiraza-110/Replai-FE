import { CalendarDays, Mail, Send, Workflow } from "lucide-react";
import { motion } from "motion/react";

const INTEGRATIONS = [
  { icon: Workflow, label: "PlusVibe" },
  { icon: CalendarDays, label: "Google Calendar" },
  { icon: Mail, label: "Gmail" },
  { icon: Send, label: "Outlook" },
];

export function IntegrationStrip() {
  return (
    <section className="py-16">
      <div className="mkt-shell">
        <p className="mkt-mono text-center text-[12px] text-[var(--mkt-ink-faint)]">
          Connects to what you already run outbound on
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
          {INTEGRATIONS.map((integration, index) => (
            <motion.div
              className="flex items-center gap-2 text-[var(--mkt-ink-dim)]"
              initial={{ y: 8 }}
              key={integration.label}
              transition={{ duration: 0.4, delay: index * 0.06 }}
              viewport={{ once: true }}
              whileInView={{ y: 0 }}
            >
              <integration.icon className="size-[18px]" />
              <span className="text-[13px] font-medium">{integration.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
