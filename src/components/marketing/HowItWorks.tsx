import { CalendarClock, MessagesSquare, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";

const STEPS = [
  {
    number: "01",
    icon: MessagesSquare,
    title: "A reply lands",
    body: "A prospect responds through your outbound — PlusVibe, cold mailer, or your inbox. SendVybe matches it to the lead and the full conversation history instantly.",
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
    <section className="bg-[var(--mkt-bg-raised)] py-28" id="how-it-works">
      <div className="mkt-shell grid gap-14 lg:grid-cols-[0.8fr_1.2fr]">
        <motion.div
          className="lg:sticky lg:top-28 lg:self-start"
          initial={{ y: 16 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: "-80px" }}
          whileInView={{ y: 0 }}
        >
          <p className="mkt-mono text-[12px] text-[var(--mkt-accent)]">HOW IT WORKS</p>
          <h2 className="mkt-h2 mt-3 text-[var(--mkt-ink)]">One loop, from inbox to booked meeting.</h2>
          <p className="mkt-body mt-4 text-[15px]">
            No black box. Every reply your agent sends follows the same three-step path, and you can see it
            happen in the event log in real time.
          </p>
        </motion.div>

        <ol className="relative space-y-6 pl-14 sm:pl-16">
          <div aria-hidden="true" className="absolute bottom-6 left-[21px] top-6 w-px bg-[var(--mkt-line)] sm:left-[25px]">
            <motion.div
              className="w-full bg-[var(--mkt-accent)]"
              initial={{ height: "0%" }}
              transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true, margin: "-120px" }}
              whileInView={{ height: "100%" }}
            />
          </div>

          {STEPS.map((step, index) => (
            <motion.li
              className="group relative"
              initial={{ y: 24 }}
              key={step.number}
              transition={{ duration: 0.55, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true, margin: "-80px" }}
              whileInView={{ y: 0 }}
            >
              <span className="absolute -left-14 top-5 grid size-11 place-items-center rounded-full border-2 border-[var(--mkt-accent)] bg-[var(--mkt-bg-raised)] sm:-left-16 sm:size-[52px]">
                <step.icon className="size-5 text-[var(--mkt-accent)]" />
              </span>
              <div className="rounded-2xl border border-[var(--mkt-line)] bg-[var(--mkt-bg)] p-6 transition-all duration-300 group-hover:translate-x-1 group-hover:border-[color-mix(in_oklch,var(--mkt-accent)_50%,transparent)] group-hover:shadow-xl">
                <p className="mkt-mono text-[12px] text-[var(--mkt-accent)]">STEP {step.number}</p>
                <h3 className="mkt-h3 mt-1.5 text-[var(--mkt-ink)]">{step.title}</h3>
                <p className="mkt-body mt-2.5 text-[14px]">{step.body}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
