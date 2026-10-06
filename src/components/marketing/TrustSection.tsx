import { KeyRound, Lock, ScrollText } from "lucide-react";
import { motion } from "motion/react";

const POINTS = [
  {
    icon: Lock,
    title: "Tokens encrypted at rest",
    body: "Google Calendar OAuth tokens are encrypted with AES-256-GCM in the database. Your frontend never sees a credential, ever.",
  },
  {
    icon: KeyRound,
    title: "Scoped, revocable access",
    body: "Calendar access is limited to the scopes ReplyOS actually needs, and any connected account can be disconnected in one click.",
  },
  {
    icon: ScrollText,
    title: "Every decision is logged",
    body: "Sends, escalations, and bookings all write to an audit trail — so when something needs explaining, the answer already exists.",
  },
];

export function TrustSection() {
  return (
    <section className="border-t border-[var(--mkt-line)] py-28" id="security">
      <div className="mkt-shell grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <motion.div
          initial={{ y: 16 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: "-80px" }}
          whileInView={{ y: 0 }}
        >
          <h2 className="mkt-h2 text-[var(--mkt-ink)]">Built like infrastructure, not a demo.</h2>
          <p className="mkt-body mt-4 text-[15px]">
            ReplyOS handles real prospect conversations and calendar access. It's treated with the same
            seriousness as the rest of your stack.
          </p>
        </motion.div>

        <div className="grid gap-px overflow-hidden rounded-2xl border border-[var(--mkt-line)] bg-[var(--mkt-line)] sm:grid-cols-3">
          {POINTS.map((point, index) => (
            <motion.div
              className="bg-[var(--mkt-bg)] p-6"
              initial={{ y: 16 }}
              key={point.title}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true, margin: "-60px" }}
              whileInView={{ y: 0 }}
            >
              <point.icon className="size-5 text-[var(--mkt-accent)]" />
              <h3 className="mt-4 text-[14px] font-semibold tracking-[-0.01em] text-[var(--mkt-ink)]">{point.title}</h3>
              <p className="mkt-body mt-2 text-[13px]">{point.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
