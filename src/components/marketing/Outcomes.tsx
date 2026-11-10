const OUTCOMES = [
  {
    stamp: "Booked",
    kind: "",
    title: "A meeting request becomes a calendar invite.",
    body: "The agent reads the reply, checks your Google Calendar for a free slot, and sends the invite.",
    quote: "Next Tuesday works. Mornings are best for me.",
    log: ["reply received: meeting request", "calendar: tuesday 10:00 am free", "invite sent"],
  },
  {
    stamp: "Answered",
    kind: "mkt-stamp--answered",
    title: "A question gets an answer from your own material.",
    body: "Replies are drafted only from the knowledge base you attach to the agent, in the persona you wrote for it.",
    quote: "Can you send pricing for 20 seats?",
    log: ["reply received: pricing question", "draft from knowledge base: pricing", "sent"],
  },
  {
    stamp: "Held for you",
    kind: "mkt-stamp--held",
    title: "Anything uncertain stops and waits.",
    body: "Legal, billing, contract terms, or whatever your review rules flag. It goes to a queue, nothing is sent, and a person decides.",
    quote: "Is there an annual contract?",
    log: ["reply received: contract question", "matches review rule", "held in queue, not sent"],
    held: true,
  },
] as const;

export function Outcomes() {
  return (
    <section className="py-20 sm:py-28" id="replies">
      <div className="mkt-shell">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr] lg:gap-10">
          <h2 className="mkt-h2">Every reply ends one of three ways.</h2>
          <p className="mkt-body self-end">
            The wording below is illustrative. Every action is written to an event log with the reason for it, so you can
            read why a reply went the way it did.
          </p>
        </div>

        <div className="mt-14">
          {OUTCOMES.map((outcome) => (
            <article className={`mkt-outcome ${"held" in outcome ? "mkt-outcome--held" : ""}`} key={outcome.stamp}>
              <div>
                <span className={`mkt-stamp ${outcome.kind}`}>{outcome.stamp}</span>
                <h3 className="mkt-h3 mt-5 max-w-[22ch]">{outcome.title}</h3>
              </div>
              <div>
                <p className="mkt-body">{outcome.body}</p>
                <p className="mt-5 text-[17px] font-medium">&ldquo;{outcome.quote}&rdquo;</p>
                <ul className="mkt-log mt-4">
                  {outcome.log.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
