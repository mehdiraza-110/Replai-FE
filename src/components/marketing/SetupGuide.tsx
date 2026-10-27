import { Bot, Check, Plug, Rocket, ShieldCheck, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

interface SetupStep {
  icon: LucideIcon;
  title: string;
  body: string;
  time: string;
  checklist: string[];
}

const STEPS: SetupStep[] = [
  {
    icon: Plug,
    title: "Connect your sources",
    body: "Link PlusVibe, your inbox, and Google Calendar. Replies start flowing into one unified inbox the moment a source is connected.",
    time: "~2 min",
    checklist: ["Connect PlusVibe or your mailbox", "Authorize Google Calendar", "Replies appear in the inbox"],
  },
  {
    icon: Bot,
    title: "Create your agent",
    body: "Give it a persona, an objective, response rules, and the knowledge base it's allowed to draw from. Nothing is improvised.",
    time: "~5 min",
    checklist: ["Pick a persona and objective", "Add facts to the knowledge base", "Assign the agent to a campaign"],
  },
  {
    icon: ShieldCheck,
    title: "Set your review rules",
    body: "Decide what the agent can send on its own and what must wait for a human. Start strict, loosen as you build trust.",
    time: "~1 min",
    checklist: ["Choose the confidence threshold", "Route sensitive topics to review", "Invite teammates as reviewers"],
  },
  {
    icon: Rocket,
    title: "Go live",
    body: "Switch the agent on. Every draft, send, escalation, and booking is logged with its reasoning in the event log.",
    time: "Instant",
    checklist: ["Activate the agent", "Watch the first replies in real time", "Review decisions in the event log"],
  },
];

export function SetupGuide() {
  const [active, setActive] = useState(0);
  const current = STEPS[active];

  return (
    <section className="border-t border-[var(--mkt-line)] py-28" id="setup">
      <div className="mkt-shell">
        <motion.div
          initial={{ y: 16 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: "-80px" }}
          whileInView={{ y: 0 }}
        >
          <p className="mkt-mono text-[12px] text-[var(--mkt-accent)]">SETUP</p>
          <h2 className="mkt-h2 mt-3 max-w-xl text-[var(--mkt-ink)]">Up and running in under ten minutes.</h2>
          <p className="mkt-body mt-4 text-[15px]">
            Four steps from a new workspace to an agent answering real replies. No engineers, no code, no
            migration.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-8 lg:grid-cols-[1fr_1.05fr] lg:items-stretch">
          <ol className="relative space-y-3">
            {STEPS.map((step, index) => {
              const isActive = index === active;
              return (
                <motion.li
                  initial={{ y: 16 }}
                  key={step.title}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                  viewport={{ once: true, margin: "-60px" }}
                  whileInView={{ y: 0 }}
                >
                  <button
                    aria-pressed={isActive}
                    className="mkt-focusable group flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-all duration-300"
                    onClick={() => setActive(index)}
                    onMouseEnter={() => setActive(index)}
                    style={{
                      borderColor: isActive ? "color-mix(in oklch, var(--mkt-accent) 55%, transparent)" : "var(--mkt-line)",
                      background: isActive
                        ? "color-mix(in oklch, var(--mkt-accent) 9%, var(--mkt-bg-raised))"
                        : "transparent",
                    }}
                    type="button"
                  >
                    <span
                      className="grid size-11 shrink-0 place-items-center rounded-xl border transition-colors duration-300"
                      style={{
                        borderColor: isActive ? "var(--mkt-accent)" : "var(--mkt-line)",
                        background: isActive ? "var(--mkt-accent)" : "var(--mkt-bg-raised)",
                        color: isActive ? "white" : "var(--mkt-accent)",
                      }}
                    >
                      <step.icon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-3">
                        <span className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--mkt-ink)]">
                          <span className="mkt-mono mr-2 text-[12px] text-[var(--mkt-ink-faint)]">0{index + 1}</span>
                          {step.title}
                        </span>
                        <span className="mkt-mono shrink-0 text-[11px] text-[var(--mkt-ink-faint)]">{step.time}</span>
                      </span>
                      <span className="mkt-body mt-1.5 block text-[13.5px]">{step.body}</span>
                    </span>
                  </button>
                </motion.li>
              );
            })}
          </ol>

          <motion.div
            className="relative overflow-hidden rounded-3xl border border-[var(--mkt-line)] bg-[var(--mkt-bg-raised)] p-6 sm:p-8"
            initial={{ y: 20 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, margin: "-60px" }}
            whileInView={{ y: 0 }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[var(--mkt-accent)] opacity-20 blur-3xl"
            />

            <div className="relative">
              <div className="flex items-center justify-between">
                <p className="mkt-mono text-[12px] text-[var(--mkt-ink-faint)]">
                  STEP {active + 1} OF {STEPS.length}
                </p>
                <div className="flex gap-1.5">
                  {STEPS.map((step, index) => (
                    <span
                      className="h-1.5 w-8 rounded-full transition-colors duration-300"
                      key={step.title}
                      style={{ background: index <= active ? "var(--mkt-accent)" : "var(--mkt-line)" }}
                    />
                  ))}
                </div>
              </div>

              <h3 className="mkt-h3 mt-6 text-[var(--mkt-ink)]">{current.title}</h3>

              <ul className="mt-6 space-y-3" key={active}>
                {current.checklist.map((item, index) => (
                  <motion.li
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 rounded-xl border border-[var(--mkt-line)] bg-[var(--mkt-bg)] px-4 py-3 text-[14px] text-[var(--mkt-ink)]"
                    initial={{ opacity: 0, x: 12 }}
                    key={item}
                    transition={{ duration: 0.4, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[var(--mkt-success)] text-[var(--mkt-accent-ink)]">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                    {item}
                  </motion.li>
                ))}
              </ul>

              <a className="mkt-btn mkt-btn--primary mkt-focusable mt-8" href="/app/login">
                Start setup
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
