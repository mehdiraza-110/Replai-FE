import { CalendarClock, MessagesSquare, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";

const STEPS = [
  {
    number: "01",
    icon: MessagesSquare,
    title: "A reply lands",
    body: "A prospect responds through your outbound — PlusVibe, cold mailer, or your inbox. ReplyOS matches it to the lead and the full conversation history instantly.",
  },
  {
    number: "02",
    icon: CalendarClock,
    title: "Your agent responds",
    body: "The agent you configured — its persona, objective, response rules, knowledge base — drafts a reply and books the meeting straight onto your Google Calendar if that's the ask.",
  },
  {
    number: "03",
    icon: ShieldCheck,
    title: "You stay in the loop",
    body: "Every decision is logged with the reasoning behind it. Anything outside the agent's confidence routes to human review before a single word sends.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-t border-[var(--mkt-line)] py-28" id="how-it-works">
      <div className="mkt-shell">
        <motion.div
          initial={{ y: 16 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: "-80px" }}
          whileInView={{ y: 0 }}
        >
          <h2 className="mkt-h2 max-w-xl text-[var(--mkt-ink)]">One loop, from inbox to booked meeting.</h2>
          <p className="mkt-body mt-4 text-[15px]">
            No black box. Every reply your agent sends follows the same three-step path, and you can see it
            happen in the event log in real time.
          </p>
        </motion.div>

        <div className="relative mt-16 grid gap-10 md:grid-cols-3">
          <div aria-hidden="true" className="absolute left-0 right-0 top-[27px] hidden h-px bg-[var(--mkt-line)] md:block" />

          {STEPS.map((step, index) => (
            <motion.div
              className="relative"
              initial={{ y: 24 }}
              key={step.number}
              transition={{ duration: 0.55, delay: index * 0.12, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true, margin: "-80px" }}
              whileInView={{ y: 0 }}
            >
              <div className="relative z-10 flex size-[54px] items-center justify-center rounded-full border border-[var(--mkt-line)] bg-[var(--mkt-bg)]">
                <step.icon className="size-[22px] text-[var(--mkt-accent)]" />
              </div>
              <p className="mkt-mono mt-5 text-[12px] text-[var(--mkt-ink-faint)]">{step.number}</p>
              <h3 className="mkt-h3 mt-1.5 text-[var(--mkt-ink)]">{step.title}</h3>
              <p className="mkt-body mt-2.5 text-[14px]">{step.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
