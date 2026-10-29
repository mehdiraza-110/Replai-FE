import { ArrowUpRight } from "lucide-react";
import { Reveal } from "./Reveal";

interface Product {
  tag: string;
  title: string;
  body: string;
  points: string[];
  log: string[];
}

const PRODUCTS: Product[] = [
  {
    tag: "AI Auto Responder",
    title: "Answers replies, books the meeting",
    body: "Give an agent a persona, response rules, and the knowledge base it may use. It reads each reply, drafts an answer, and checks your calendar before booking.",
    points: ["Persona and objective per agent", "Review queue for anything uncertain", "Event log with the reasoning for each decision"],
    log: ["reply received: meeting request", "draft from knowledge base: pricing", "calendar: thursday 2:00 pm free", "sent, invite sent"],
  },
  {
    tag: "AI Cold Mailer",
    title: "Sends from domains that stay healthy",
    body: "Run your own domains and mailboxes with warmup, health checks, and deliverability monitoring, and read every reply in one inbox.",
    points: ["Domain and mailbox warmup", "Reputation and health monitoring", "Gmail, Outlook, and PlusVibe threads in one inbox"],
    log: ["mailbox warmup: in progress", "domain health: checked", "reply landed in unified inbox"],
  },
];

export function Products() {
  return (
    <section className="py-20 sm:py-28" id="product">
      <div className="mkt-shell">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <h2 className="mkt-h2 max-w-xl text-[var(--mkt-ink)]">Two products, one workspace.</h2>
          <a className="mkt-btn mkt-btn--ghost mkt-pill mkt-focusable" href="/app/login">
            Start free
            <ArrowUpRight className="size-4" />
          </a>
        </Reveal>

        <div className="mt-12 grid gap-4 lg:grid-cols-2">
          {PRODUCTS.map((product, index) => (
            <Reveal className="h-full" delay={index * 0.08} key={product.tag}>
              <article className="flex h-full flex-col rounded-3xl border border-[var(--mkt-line)] bg-[var(--mkt-bg-raised)] p-6 sm:p-9">
                <p className="mkt-chip self-start">{product.tag}</p>
                <h3 className="mkt-h3 mt-6 text-[var(--mkt-ink)]">{product.title}</h3>
                <p className="mkt-body mt-3 text-[15px]">{product.body}</p>

                <div className="mt-8 rounded-2xl bg-[var(--mkt-bg)] p-5">
                  <ul className="mkt-log space-y-1 text-[var(--mkt-ink-dim)]">
                    {product.log.map((line) => (
                      <li key={line}>&gt; {line}</li>
                    ))}
                  </ul>
                  <p className="mt-4 text-[12px] text-[var(--mkt-ink-faint)]">Example output, shortened.</p>
                </div>

                <ul className="mt-8 space-y-2.5 text-[14px] text-[var(--mkt-ink-dim)]">
                  {product.points.map((point) => (
                    <li className="flex gap-3" key={point}>
                      <span aria-hidden="true" className="mt-[0.6em] h-px w-3 shrink-0 bg-[var(--mkt-accent-text)]" />
                      {point}
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
