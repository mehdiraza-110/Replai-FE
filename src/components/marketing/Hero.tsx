import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Bot, CalendarCheck2, Check, MessagesSquare, ShieldAlert } from "lucide-react";

const HEADLINE_LINES = ["Every reply,", "answered before", "your coffee's cold."];

const BULLETS = ["No code, no migration", "Works with PlusVibe, Gmail & Outlook", "Human review on anything risky"];

function FlowNode({
  icon: Icon,
  label,
  title,
  body,
  delay,
  accent,
}: {
  icon: typeof Bot;
  label: string;
  title: string;
  body: string;
  delay: number;
  accent?: boolean;
}) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="relative flex-1 rounded-2xl border p-5 text-left backdrop-blur"
      initial={{ opacity: 0, y: 20 }}
      style={{
        borderColor: accent ? "color-mix(in oklch, var(--mkt-accent) 55%, transparent)" : "var(--mkt-line)",
        background: accent
          ? "color-mix(in oklch, var(--mkt-accent) 10%, var(--mkt-bg-raised))"
          : "color-mix(in oklch, var(--mkt-bg-raised) 80%, transparent)",
      }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center justify-between">
        <span
          className="grid size-9 place-items-center rounded-xl"
          style={{ background: accent ? "var(--mkt-accent)" : "var(--mkt-bg)", color: accent ? "white" : "var(--mkt-accent)" }}
        >
          <Icon className="size-[18px]" />
        </span>
        <span className="mkt-mono text-[10px] text-[var(--mkt-ink-faint)]">{label}</span>
      </div>
      <p className="mt-4 text-[14px] font-semibold text-[var(--mkt-ink)]">{title}</p>
      <p className="mt-1 text-[12.5px] leading-[1.5] text-[var(--mkt-ink-dim)]">{body}</p>
    </motion.div>
  );
}

function FlowConnector({ delay }: { delay: number }) {
  return (
    <motion.div
      animate={{ opacity: 1 }}
      aria-hidden="true"
      className="relative mx-auto my-1 h-8 w-px shrink-0 bg-[var(--mkt-line)] md:mx-0 md:my-0 md:h-px md:w-14 md:self-center"
      initial={{ opacity: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <span className="mkt-flow-dot absolute left-1/2 top-0 size-2 -translate-x-1/2 rounded-full bg-[var(--mkt-accent)] shadow-[0_0_10px_var(--mkt-accent)] md:left-0 md:top-1/2 md:-translate-y-1/2 md:translate-x-0" />
    </motion.div>
  );
}

export function Hero() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden pb-28 pt-[150px]" id="top">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_40%_at_50%_15%,color-mix(in_oklch,var(--mkt-accent)_18%,transparent),transparent_72%)]" />
      <div aria-hidden="true" className="mkt-grid-pattern pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="mkt-grid-fade pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="mkt-noise pointer-events-none absolute inset-0" />

      <div className="mkt-shell relative flex flex-col items-center text-center">
        <motion.a
          animate={{ opacity: 1, y: 0 }}
          className="mkt-focusable inline-flex items-center gap-2 rounded-full border border-[var(--mkt-line)] bg-[color-mix(in_oklch,var(--mkt-bg-raised)_70%,transparent)] px-3.5 py-1.5 text-[12px] font-medium text-[var(--mkt-ink-dim)] backdrop-blur transition-colors hover:text-[var(--mkt-ink)]"
          href="#setup"
          initial={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.5 }}
        >
          <span className="size-1.5 rounded-full bg-[var(--mkt-success)] shadow-[0_0_8px_var(--mkt-success)]" />
          AI replies with a human in the loop
          <ArrowRight className="size-3" />
        </motion.a>

        <h1 className="mkt-h1 mt-6 text-[var(--mkt-ink)]">
          {HEADLINE_LINES.map((line, lineIndex) => (
            <span className="block overflow-hidden pb-1" key={line}>
              <motion.span
                animate={{ y: 0, opacity: 1 }}
                className={`block ${lineIndex === 2 ? "mkt-gradient-text" : ""}`}
                initial={prefersReducedMotion ? undefined : { y: "110%", opacity: 0 }}
                transition={{ duration: 0.85, delay: 0.15 + lineIndex * 0.09, ease: [0.16, 1, 0.3, 1] }}
              >
                {line}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.p
          animate={{ opacity: 1, y: 0 }}
          className="mkt-body mx-auto mt-6 max-w-[48ch] text-[16px]"
          initial={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.6, delay: 0.55 }}
        >
          SendVybe reads every prospect reply, drafts the response in your agent's voice, and books the
          meeting straight onto your calendar. Anything outside its confidence routes to a human before it
          ever sends.
        </motion.p>

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
          initial={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.6, delay: 0.68 }}
        >
          <a className="mkt-btn mkt-btn--primary mkt-focusable" href="/app/login">
            Start free
            <ArrowRight className="size-4" />
          </a>
          <a className="mkt-btn mkt-btn--ghost mkt-focusable" href="#how-it-works">
            See how it works
          </a>
        </motion.div>

        <motion.ul
          animate={{ opacity: 1 }}
          className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
          initial={{ opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.85 }}
        >
          {BULLETS.map((bullet) => (
            <li className="flex items-center gap-1.5 text-[12.5px] text-[var(--mkt-ink-dim)]" key={bullet}>
              <Check className="size-3.5 text-[var(--mkt-success)]" strokeWidth={2.5} />
              {bullet}
            </li>
          ))}
        </motion.ul>

        <div className="mt-16 w-full max-w-[980px]">
          <div className="flex flex-col items-stretch md:flex-row">
            <FlowNode
              body={'"Can we grab 20 minutes Thursday to walk through pricing?"'}
              delay={0.9}
              icon={MessagesSquare}
              label="REPLY IN"
              title="Marta replies"
            />
            <FlowConnector delay={1.1} />
            <FlowNode
              accent
              body="Matches intent, checks your knowledge base, drafts in your voice."
              delay={1.05}
              icon={Bot}
              label="AGENT"
              title="Draft ready · 98% confident"
            />
            <FlowConnector delay={1.25} />
            <div className="flex flex-1 flex-col gap-3">
              <FlowNode
                body="Thursday 2:00pm held, invite sent."
                delay={1.2}
                icon={CalendarCheck2}
                label="OUTCOME"
                title="Booked to Calendar"
              />
              <FlowNode
                body="Legal question — a human takes over."
                delay={1.35}
                icon={ShieldAlert}
                label="OR"
                title="Routed to review"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
