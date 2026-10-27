import { Reveal } from "./Reveal";

const ROWS = [
  {
    topic: "Finding replies",
    old: "Check each mailbox and tool for answers",
    now: "Every reply lands in one inbox",
  },
  {
    topic: "Writing answers",
    old: "Write each response from scratch",
    now: "The agent drafts from your knowledge base",
  },
  {
    topic: "Booking",
    old: "Trade times back and forth over email",
    now: "The agent checks your calendar and sends the invite",
  },
  {
    topic: "Oversight",
    old: "Find out what went out after it sent",
    now: "Uncertain replies wait for review, and every action is logged",
  },
];

export function HowItWorks() {
  return (
    <section className="py-20 sm:py-28" id="how-it-works">
      <div className="mkt-shell">
        <Reveal>
          <h2 className="mkt-h2 max-w-3xl text-[var(--mkt-ink)]">By hand, and with SendVybe.</h2>
          <p className="mkt-body mt-4 text-[16px]">
            Set up takes four steps: connect your sources, write the agent, set review rules, and turn it on.
          </p>
        </Reveal>

        <Reveal className="mt-12 overflow-hidden rounded-3xl border border-[var(--mkt-line)] bg-[var(--mkt-bg-raised)]">
          <div className="hidden grid-cols-[1fr_1.4fr_1.4fr] gap-6 border-b border-[var(--mkt-line)] px-8 py-4 text-[12px] uppercase tracking-[0.06em] text-[var(--mkt-ink-faint)] sm:grid">
            <span />
            <span>By hand</span>
            <span className="text-[var(--mkt-accent-text)]">With SendVybe</span>
          </div>
          {ROWS.map((row) => (
            <div
              className="grid gap-x-6 gap-y-3 border-b border-[var(--mkt-line)] px-6 py-6 last:border-b-0 sm:grid-cols-[1fr_1.4fr_1.4fr] sm:px-8"
              key={row.topic}
            >
              <p className="text-[16px] font-semibold tracking-[-0.01em] text-[var(--mkt-ink)]">{row.topic}</p>
              <p className="text-[15px] text-[var(--mkt-ink-dim)]">
                <span className="mb-1 block text-[12px] uppercase tracking-[0.06em] text-[var(--mkt-ink-faint)] sm:hidden">By hand</span>
                {row.old}
              </p>
              <p className="text-[15px] text-[var(--mkt-ink)]">
                <span className="mb-1 block text-[12px] uppercase tracking-[0.06em] text-[var(--mkt-accent-text)] sm:hidden">With SendVybe</span>
                {row.now}
              </p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
