import { Marquee } from "./Marquee";

const NAMES = ["PlusVibe", "Gmail", "Outlook", "GoHighLevel", "Instantly", "Google Calendar"];

export function IntegrationStrip() {
  return (
    <section aria-label="Supported tools" className="py-14">
      <p className="mkt-shell mb-8 text-[14px] text-[var(--mkt-ink-faint)]">Connects to the tools you already use</p>
      <Marquee duration={36}>
        {NAMES.concat(NAMES).map((name, index) => (
          <span
            className="whitespace-nowrap px-6 text-[clamp(1.5rem,2vw+1rem,2.25rem)] font-medium tracking-[-0.03em] text-[var(--mkt-ink-faint)]"
            key={`${name}-${index}`}
          >
            {name}
          </span>
        ))}
      </Marquee>
    </section>
  );
}
