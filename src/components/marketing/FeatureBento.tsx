import { BarChart3, Bot, CalendarCheck2, Inbox, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import type { ComponentType } from "react";

function Tile({
  area,
  icon: Icon,
  title,
  body,
  large,
  delay,
}: {
  area: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
  large?: boolean;
  delay: number;
}) {
  return (
    <motion.div
      className={`${area} flex flex-col justify-between p-6 ${large ? "gap-8 sm:p-8" : "gap-5"}`}
      initial={{ y: 12 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true, margin: "-60px" }}
      whileInView={{ y: 0 }}
    >
      <span className="grid size-9 place-items-center rounded-lg border border-[var(--mkt-line)] bg-[var(--mkt-bg-raised)] text-[var(--mkt-accent)]">
        <Icon className="size-[18px]" />
      </span>
      <div>
        <h3 className={large ? "mkt-h3 text-[var(--mkt-ink)]" : "text-[15px] font-semibold tracking-[-0.01em] text-[var(--mkt-ink)]"}>
          {title}
        </h3>
        <p className="mkt-body mt-2 text-[13.5px]">{body}</p>
      </div>
    </motion.div>
  );
}

export function FeatureBento() {
  return (
    <section className="py-28" id="product">
      <div className="mkt-shell">
        <motion.div
          initial={{ y: 16 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: "-80px" }}
          whileInView={{ y: 0 }}
        >
          <h2 className="mkt-h2 max-w-xl text-[var(--mkt-ink)]">Everything the agent needs to actually close the loop.</h2>
        </motion.div>

        <div className="mkt-bento mt-14">
          <Tile
            area="mkt-bento-a"
            body="Set a persona, objective, response rules, and the exact knowledge base it's allowed to draw from. Nothing improvised — every reply traces back to a rule you wrote."
            delay={0}
            icon={Bot}
            large
            title="AI agents built from your playbook"
          />
          <Tile
            area="mkt-bento-b"
            body="Connect Google Calendar once. The agent checks availability and books the meeting itself — no back-and-forth, no double-booking."
            delay={0.08}
            icon={CalendarCheck2}
            title="Meeting booking, handled"
          />
          <Tile
            area="mkt-bento-c"
            body="Replies outside the agent's confidence route to a queue before they send. You approve, edit, or override — the agent learns the boundary either way."
            delay={0.14}
            icon={ShieldCheck}
            title="Human review, always on"
          />
          <Tile
            area="mkt-bento-d"
            body="Domain warmup, mailbox health, and deliverability monitoring for your cold outbound."
            delay={0.2}
            icon={Inbox}
            title="Cold mailer infrastructure"
          />
          <Tile
            area="mkt-bento-e"
            body="Gmail, Outlook, and PlusVibe threads land in one inbox — nothing to switch tabs for."
            delay={0.24}
            icon={Inbox}
            title="Unified inbox"
          />
          <Tile
            area="mkt-bento-f"
            body="Every AI decision — drafted, sent, escalated, booked — is logged with the reasoning behind it, searchable in the event log."
            delay={0.28}
            icon={BarChart3}
            title="Analytics and a full event log"
          />
        </div>
      </div>
    </section>
  );
}
