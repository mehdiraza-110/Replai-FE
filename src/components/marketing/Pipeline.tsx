const SENDING = [
  ["Domains and mailboxes", "your own"],
  ["Warmup", "before any campaign"],
  ["Health checks", "reputation, deliverability"],
  ["One inbox", "Gmail, Outlook, PlusVibe threads"],
];

const REPLYING = [
  ["Agent", "persona, objective, rules"],
  ["Knowledge base", "what it may say"],
  ["Review queue", "what it may not decide"],
  ["Event log", "reasoning for each action"],
];

function Side({ name, title, body, rows }: { name: string; title: string; body: string; rows: string[][] }) {
  return (
    <div className="mkt-flow-side">
      <p className="text-[15px] font-semibold">{name}</p>
      <h3 className="mkt-h3 mt-3 max-w-[20ch]">{title}</h3>
      <p className="mkt-body mt-3 text-[15px]">{body}</p>
      <ul className="mkt-steps">
        {rows.map(([label, note]) => (
          <li key={label}>
            {label}
            <span>{note}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Pipeline() {
  return (
    <section className="py-20 sm:py-28" id="product">
      <div className="mkt-shell">
        <h2 className="mkt-h2 max-w-[18ch]">Sending and replying, in one workspace.</h2>
        <div className="mkt-flow mt-14">
          <Side
            body="Run your own domains and mailboxes with warmup and deliverability monitoring, and read every reply in one place."
            name="AI Cold Mailer"
            rows={SENDING}
            title="Send from domains that stay healthy."
          />
          <Side
            body="Give an agent a persona, response rules, and the knowledge base it may use. It reads each reply and works the queue."
            name="AI Auto Responder"
            rows={REPLYING}
            title="Answer what comes back."
          />
        </div>
      </div>
    </section>
  );
}
