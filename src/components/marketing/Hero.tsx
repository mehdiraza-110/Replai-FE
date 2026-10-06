import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import type { CSSProperties } from "react";
import { ConversationCard, type ConversationScenario } from "./ConversationCard";

const HEADLINE_LINES = ["Every reply,", "answered before", "your coffee's cold."];

const SCENARIOS: ConversationScenario[] = [
  {
    lead: "Priya Nandakumar",
    timestamp: "14m ago",
    message: "What's the difference between the starter and team plan?",
    draftLabel: "Agent draft",
    draft: "Starter covers a single inbox; Team adds shared review queues and up to 5 agents. Want a quick comparison sheet?",
    footer: "Sent — within agent confidence",
    footerIcon: "sent",
  },
  {
    lead: "Marta Oyelaran",
    timestamp: "2m ago",
    message: "This actually looks useful — can we grab 20 minutes Thursday to walk through pricing?",
    draftLabel: "Agent draft",
    draft: "Happy to — I've held Thursday 2:00pm on your calendar. Sending the invite now.",
    footer: "Booked to Google Calendar",
    footerIcon: "booked",
  },
  {
    lead: "Daniel Kessler",
    timestamp: "just now",
    message: "Can you match our SOC 2 requirements and sign a custom DPA?",
    draftLabel: "Routed to review",
    draft: "Legal and compliance questions need a human — flagged for your team with the full thread attached.",
    footer: "Waiting on human review",
    footerIcon: "review",
  },
];

const CARD_LAYOUT = [
  { rotate: -6, x: -18, y: 22, z: 0, scale: 0.94, opacity: 0.7 },
  { rotate: 0, x: 0, y: 0, z: 10, scale: 1, opacity: 1 },
  { rotate: 6, x: 18, y: 22, z: 0, scale: 0.94, opacity: 0.7 },
];

export function Hero() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden pb-32 pt-[160px]" id="top">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_46%_38%_at_50%_18%,color-mix(in_oklch,var(--mkt-accent)_15%,transparent),transparent_72%)]" />
      <div aria-hidden="true" className="mkt-grid-pattern pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="mkt-grid-fade pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="mkt-noise pointer-events-none absolute inset-0" />

      <div className="mkt-shell relative flex flex-col items-center text-center">


        <h1 className="mkt-h1 mt-5 text-[var(--mkt-ink)]">
          {HEADLINE_LINES.map((line, lineIndex) => (
            <span className="block overflow-hidden" key={line}>
              <motion.span
                animate={{ y: 0, opacity: 1 }}
                className="block"
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
          className="mkt-body mx-auto mt-6 max-w-[46ch] text-[16px]"
          initial={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.6, delay: 0.55 }}
        >
          ReplyOS reads every prospect reply, drafts the response in your agent's voice, and books the
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

        <div className="mt-20 grid w-full max-w-[820px] grid-cols-1 items-start gap-5 sm:grid-cols-3 sm:gap-4">
          {SCENARIOS.map((scenario, index) => {
            const layout = CARD_LAYOUT[index];
            return (
              <div
                className="mkt-fan-card sm:[grid-row:1]"
                key={scenario.lead}
                style={
                  prefersReducedMotion
                    ? undefined
                    : ({
                        "--fan-rotate": `${layout.rotate}deg`,
                        "--fan-x": `${layout.x}px`,
                        "--fan-y": `${layout.y}px`,
                        "--fan-scale": layout.scale,
                        "--fan-opacity": layout.opacity,
                        zIndex: layout.z,
                      } as CSSProperties)
                }
              >
                <ConversationCard delay={0.85 + index * 0.1} emphasis={index === 1 ? "hero" : "default"} scenario={scenario} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
