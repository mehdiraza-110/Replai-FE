const DESK = [
  { quote: "Can we grab 20 minutes Thursday to walk through pricing?", does: "Checked the calendar, sent the invite", stamp: "Booked", kind: "booked" },
  { quote: "What does the Pro plan include?", does: "Drafted from your knowledge base, sent", stamp: "Answered", kind: "answered" },
  { quote: "Our legal team has questions about your terms.", does: "Not sure, so it waits for you", stamp: "Held for you", kind: "held" },
] as const;

export function Hero() {
  return (
    <section className="mkt-shell pb-20 pt-14 sm:pt-20 lg:pb-28" id="top">
      <div className="grid items-center gap-14 lg:grid-cols-[1.25fr_0.9fr] lg:gap-16">
        <div>
          <h1 className="mkt-display">Your agent answers the replies it knows. You see the rest.</h1>
          <p className="mkt-lede mt-8">
            SendVybe drafts answers from your knowledge base, books meetings on Google Calendar, and holds anything it is
            unsure about for a person.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <a className="mkt-btn mkt-btn--solid mkt-focusable" href="/app/login">
              Create free account
            </a>
            <a className="mkt-btn mkt-btn--line mkt-focusable" href="#replies">
              See what happens to a reply
            </a>
          </div>
        </div>

        <figure aria-label="Example replies and what the agent did with each" className="m-0">
          <div className="mkt-desk">
            <div className="mkt-desk-head">
              <span>Inbox</span>
              <span>3 new replies</span>
            </div>
            {DESK.map((row, index) => (
              <div className="mkt-desk-row" key={row.quote}>
                <p className="mkt-desk-quote">&ldquo;{row.quote}&rdquo;</p>
                <div className="mkt-desk-meta">
                  <span
                    className={`mkt-stamp mkt-stamp-in ${row.kind === "held" ? "mkt-stamp--held" : row.kind === "answered" ? "mkt-stamp--answered" : ""}`}
                    style={{ ["--d" as string]: `${500 + index * 650}ms` }}
                  >
                    {row.stamp}
                  </span>
                  <span className="mkt-desk-do">{row.does}</span>
                </div>
              </div>
            ))}
            <p className="mkt-desk-foot">Example replies. What gets held is decided by the review rules you set.</p>
          </div>
        </figure>
      </div>
    </section>
  );
}
