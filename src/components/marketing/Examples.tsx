import { CircleCheck, CirclePause } from "lucide-react";
import { Marquee } from "./Marquee";
import { Reveal } from "./Reveal";

interface Example {
  quote: string;
  outcome: string;
  held?: boolean;
}

const ROW_ONE: Example[] = [
  { quote: "Can we grab 20 minutes Thursday to walk through pricing?", outcome: "Booked on calendar" },
  { quote: "Our legal team has some questions about your terms.", outcome: "Held for human review", held: true },
  { quote: "What does the Pro plan include?", outcome: "Answered from knowledge base" },
  { quote: "Who handles billing on your side?", outcome: "Held for human review", held: true },
];

const ROW_TWO: Example[] = [
  { quote: "Next Tuesday works. Mornings are best for me.", outcome: "Booked on calendar" },
  { quote: "Can you send pricing for 20 seats?", outcome: "Answered from knowledge base" },
  { quote: "Is there an annual contract?", outcome: "Held for human review", held: true },
  { quote: "Happy to talk. Send over a few times.", outcome: "Booked on calendar" },
];

function ExampleCard({ quote, outcome, held }: Example) {
  const Icon = held ? CirclePause : CircleCheck;

  return (
    <div className="flex w-[300px] shrink-0 flex-col justify-between rounded-3xl border border-[var(--mkt-line)] bg-[var(--mkt-bg-raised)] p-6 sm:w-[360px]">
      <p className="text-[16px] leading-[1.5] text-[var(--mkt-ink)]">&ldquo;{quote}&rdquo;</p>
      <p
        className="mkt-log mt-6 inline-flex items-center gap-2 font-medium"
        style={{ color: held ? "var(--mkt-warn)" : "var(--mkt-success)" }}
      >
        <Icon className="size-4 shrink-0" />
        {outcome}
      </p>
    </div>
  );
}

export function Examples() {
  return (
    <section className="py-20 sm:py-28" id="examples">
      <div className="mkt-shell">
        <Reveal>
          <h2 className="mkt-h2 max-w-2xl text-[var(--mkt-ink)]">What happens to each reply.</h2>
          <p className="mkt-body mt-4 text-[16px]">
            Example replies and what the agent does with them. The wording is illustrative, and what gets held is
            decided by the review rules you set.
          </p>
        </Reveal>
      </div>

      <div className="mt-12 space-y-4">
        <Marquee duration={60}>
          {ROW_ONE.map((example) => (
            <ExampleCard key={example.quote} {...example} />
          ))}
        </Marquee>
        <Marquee duration={70} reverse>
          {ROW_TWO.map((example) => (
            <ExampleCard key={example.quote} {...example} />
          ))}
        </Marquee>
      </div>
    </section>
  );
}
