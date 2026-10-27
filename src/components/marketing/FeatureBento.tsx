import { BarChart3, Bot, CalendarCheck2, Inbox, ShieldCheck, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

interface Feature {
  icon: LucideIcon;
  tab: string;
  title: string;
  body: string;
  points: string[];
}

const FEATURES: Feature[] = [
  {
    icon: Bot,
    tab: "Agents",
    title: "AI agents built from your playbook",
    body: "Set a persona, objective, response rules, and the exact knowledge base it's allowed to draw from. Nothing improvised — every reply traces back to a rule you wrote.",
    points: ["Persona and objective per agent", "Knowledge base as the only source of truth", "Different agents for different campaigns"],
  },
  {
    icon: CalendarCheck2,
    tab: "Booking",
    title: "Meeting booking, handled",
    body: "Connect Google Calendar once. The agent checks availability and books the meeting itself — no back-and-forth, no double-booking.",
    points: ["Reads real availability", "Sends the invite for you", "Never double-books a slot"],
  },
  {
    icon: ShieldCheck,
    tab: "Review",
    title: "Human review, always on",
    body: "Replies outside the agent's confidence route to a queue before they send. You approve, edit, or override — the agent learns the boundary either way.",
    points: ["Approve, edit, or take over", "Sensitive topics always escalate", "Nothing sends without passing your rules"],
  },
  {
    icon: Inbox,
    tab: "Inbox",
    title: "Unified inbox and cold mailer",
    body: "Gmail, Outlook, and PlusVibe threads land in one inbox, backed by domain warmup, mailbox health, and deliverability monitoring for your outbound.",
    points: ["Every reply in one place", "Domain and mailbox warmup", "Reputation and health monitoring"],
  },
  {
    icon: BarChart3,
    tab: "Insights",
    title: "Analytics and a full event log",
    body: "Every AI decision — drafted, sent, escalated, booked — is logged with the reasoning behind it, searchable in the event log.",
    points: ["Reasoning stored with every decision", "Reply, agent, and review reports", "Searchable audit trail"],
  },
];

export function FeatureBento() {
  const [active, setActive] = useState(0);
  const current = FEATURES[active];

  return (
    <section className="py-28" id="product">
      <div className="mkt-shell">
        <motion.div
          className="text-center"
          initial={{ y: 16 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: "-80px" }}
          whileInView={{ y: 0 }}
        >
          <p className="mkt-mono text-[12px] text-[var(--mkt-accent)]">PRODUCT</p>
          <h2 className="mkt-h2 mx-auto mt-3 max-w-2xl text-[var(--mkt-ink)]">Everything the agent needs to actually close the loop.</h2>
        </motion.div>

        <div className="mt-10 flex justify-center">
          <div className="thin-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-full border border-[var(--mkt-line)] bg-[var(--mkt-bg-raised)] p-1.5" role="tablist">
            {FEATURES.map((feature, index) => {
              const isActive = index === active;
              return (
                <button
                  aria-selected={isActive}
                  className="mkt-focusable relative flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors"
                  key={feature.tab}
                  onClick={() => setActive(index)}
                  role="tab"
                  style={{ color: isActive ? "white" : "var(--mkt-ink-dim)" }}
                  type="button"
                >
                  {isActive ? (
                    <motion.span
                      className="absolute inset-0 rounded-full bg-[var(--mkt-accent)]"
                      layoutId="mkt-feature-pill"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  ) : null}
                  <feature.icon className="relative size-4" />
                  <span className="relative">{feature.tab}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative mt-8 overflow-hidden rounded-[28px] border border-[var(--mkt-line)] bg-[var(--mkt-bg-raised)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-[var(--mkt-accent)] opacity-20 blur-3xl"
          />
          <AnimatePresence mode="wait">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="relative grid gap-10 p-8 sm:p-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center"
              exit={{ opacity: 0, y: -8 }}
              initial={{ opacity: 0, y: 12 }}
              key={active}
              transition={{ duration: 0.3 }}
            >
              <div>
                <span className="grid size-14 place-items-center rounded-2xl bg-[var(--mkt-accent)] text-white shadow-lg">
                  <current.icon className="size-7" />
                </span>
                <h3 className="mkt-h3 mt-6 text-[var(--mkt-ink)]">{current.title}</h3>
                <p className="mkt-body mt-3 text-[15px]">{current.body}</p>
              </div>
              <ul className="space-y-3">
                {current.points.map((point, index) => (
                  <li
                    className="flex items-center gap-3 rounded-xl border border-[var(--mkt-line)] bg-[var(--mkt-bg)] px-4 py-3.5 text-[14px] text-[var(--mkt-ink)]"
                    key={point}
                  >
                    <span className="mkt-mono grid size-6 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklch,var(--mkt-accent)_16%,transparent)] text-[11px] text-[var(--mkt-accent)]">
                      {index + 1}
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
