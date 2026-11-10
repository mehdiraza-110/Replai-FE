const ROWS = [
  { topic: "Finding replies", old: "Check each mailbox and tool for answers", now: "Every reply lands in one inbox" },
  { topic: "Writing answers", old: "Write each response from scratch", now: "The agent drafts from your knowledge base" },
  { topic: "Booking", old: "Trade times back and forth over email", now: "The agent checks your calendar and sends the invite" },
  { topic: "Oversight", old: "Find out what went out after it sent", now: "Uncertain replies wait for review, and every action is logged" },
];

export function Ledger() {
  return (
    <section className="py-20 sm:py-28" id="compare">
      <div className="mkt-shell">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr] lg:gap-10">
          <h2 className="mkt-h2">By hand, and with SendVybe.</h2>
          <p className="mkt-body self-end">
            Setup is four steps: connect your sources, write the agent, set review rules, and turn it on.
          </p>
        </div>

        <div className="mt-14">
          {ROWS.map((row) => (
            <div className="mkt-ledger-row" key={row.topic}>
              <p className="text-[18px] font-semibold tracking-[-0.01em]">{row.topic}</p>
              <p className="text-[16px]">
                <span className="mkt-label-m">By hand</span>
                <span className="mkt-old">{row.old}</span>
              </p>
              <p className="text-[16px] font-medium">
                <span className="mkt-label-m">With SendVybe</span>
                {row.now}
              </p>
            </div>
          ))}
          <div className="border-t border-[var(--mkt-line)]" />
        </div>
      </div>
    </section>
  );
}
