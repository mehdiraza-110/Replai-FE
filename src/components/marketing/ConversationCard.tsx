import { CalendarCheck2, CircleCheck, ShieldQuestion, Sparkles } from "lucide-react";
import { motion } from "motion/react";

export interface ConversationScenario {
  lead: string;
  timestamp: string;
  message: string;
  draftLabel: string;
  draft: string;
  footer: string;
  footerIcon: "booked" | "sent" | "review";
}

const FOOTER_ICON = {
  booked: CalendarCheck2,
  sent: CircleCheck,
  review: ShieldQuestion,
};

const FOOTER_COLOR = {
  booked: "var(--mkt-success)",
  sent: "var(--mkt-success)",
  review: "var(--mkt-accent)",
};

export function ConversationCard({
  scenario,
  emphasis = "default",
  delay = 0,
}: {
  scenario: ConversationScenario;
  emphasis?: "default" | "hero";
  delay?: number;
}) {
  const FooterIcon = FOOTER_ICON[scenario.footerIcon];

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={`w-full rounded-2xl border border-[var(--mkt-line)] bg-[var(--mkt-bg-raised)] p-4 text-left ${
        emphasis === "hero"
          ? "shadow-[0_32px_70px_-24px_rgba(0,0,0,0.65)]"
          : "shadow-[0_18px_40px_-18px_rgba(0,0,0,0.55)]"
      }`}
      initial={{ opacity: 0, y: 18 }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center justify-between">
        <p className="mkt-mono truncate text-[11px] uppercase text-[var(--mkt-ink-faint)]">Lead · {scenario.lead}</p>
        <span className="mkt-mono shrink-0 text-[10px] text-[var(--mkt-ink-faint)]">{scenario.timestamp}</span>
      </div>

      <p className="mt-2.5 text-[13px] leading-5 text-[var(--mkt-ink-dim)]">"{scenario.message}"</p>

      <div className="mt-3.5 rounded-xl border border-[var(--mkt-line-soft)] bg-[var(--mkt-bg)] p-3">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--mkt-accent)]">
          <Sparkles className="size-3.5" />
          {scenario.draftLabel}
        </div>
        <p className="mt-1.5 text-[13px] leading-5 text-[var(--mkt-ink)]">"{scenario.draft}"</p>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium" style={{ color: FOOTER_COLOR[scenario.footerIcon] }}>
        <FooterIcon className="size-3.5" />
        {scenario.footer}
      </div>
    </motion.div>
  );
}
