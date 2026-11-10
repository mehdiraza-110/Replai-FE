const POINTS = [
  {
    title: "Tokens encrypted at rest",
    body: "Google Calendar OAuth tokens are encrypted with AES-256-GCM in the database. The frontend never receives a credential.",
  },
  {
    title: "Scoped, revocable access",
    body: "Calendar access is limited to the scopes SendVybe needs, and you can disconnect any connected account in one click.",
  },
  {
    title: "Every decision is logged",
    body: "Sends, escalations, and bookings write to an audit trail, so when something needs explaining the record already exists.",
  },
];

export function Security() {
  return (
    <section className="pb-20 pt-6 sm:pb-28" id="security">
      <div className="mkt-shell">
        <div className="grid gap-10 border-t border-[var(--mkt-line-strong)] pt-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <h2 className="mkt-h2 max-w-[14ch]">Built to be reviewed.</h2>
          <dl className="m-0">
            {POINTS.map((point, index) => (
              <div className={index ? "border-t border-[var(--mkt-line)] py-6" : "pb-6"} key={point.title}>
                <dt className="text-[18px] font-semibold tracking-[-0.01em]">{point.title}</dt>
                <dd className="mkt-body m-0 mt-2">{point.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
