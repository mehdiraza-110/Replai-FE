import { Reveal } from "./Reveal";

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

export function TrustSection() {
  return (
    <section className="py-20 sm:py-28" id="security">
      <div className="mkt-shell">
        <Reveal>
          <h2 className="mkt-h2 max-w-3xl text-[var(--mkt-ink)]">Built to be reviewed, logged by default.</h2>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {POINTS.map((point, index) => (
            <Reveal className="h-full" delay={index * 0.08} key={point.title}>
              <div className="h-full rounded-3xl border border-[var(--mkt-line)] bg-[var(--mkt-bg-raised)] p-7">
                <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-[var(--mkt-ink)]">{point.title}</h3>
                <p className="mkt-body mt-3 text-[15px]">{point.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
