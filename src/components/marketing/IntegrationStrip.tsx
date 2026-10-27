import { CalendarDays, Globe, Inbox, Mail, MessagesSquare, Send, ShieldCheck, Workflow, type LucideIcon } from "lucide-react";

const ITEMS: { icon: LucideIcon; label: string }[] = [
  { icon: Workflow, label: "PlusVibe" },
  { icon: CalendarDays, label: "Google Calendar" },
  { icon: Mail, label: "Gmail" },
  { icon: Send, label: "Outlook" },
  { icon: Inbox, label: "Unified inbox" },
  { icon: MessagesSquare, label: "Reply automation" },
  { icon: ShieldCheck, label: "Human review" },
  { icon: Globe, label: "Domain warmup" },
];

export function IntegrationStrip() {
  const loop = [...ITEMS, ...ITEMS];

  return (
    <section className="border-y border-[var(--mkt-line)] bg-[var(--mkt-bg-raised)] py-14">
      <div className="mkt-shell text-center">
        <p className="text-[16px] font-semibold tracking-[-0.01em] text-[var(--mkt-ink)]">Plugs into the stack you already run outbound on.</p>
        <p className="mkt-body mx-auto mt-1.5 text-[13px]">Connect once. Replies, calendars, and mailboxes stay in sync.</p>
      </div>

      {[false, true].map((reverse) => (
        <div className="mkt-marquee mt-5 first:mt-9" key={String(reverse)}>
          <div className={`mkt-marquee-track ${reverse ? "mkt-marquee-track--reverse" : ""}`}>
            {(reverse ? [...loop].reverse() : loop).map((item, index) => (
              <div
                className="flex shrink-0 items-center gap-2.5 rounded-xl border border-[var(--mkt-line)] bg-[var(--mkt-bg)] px-5 py-3 text-[var(--mkt-ink-dim)]"
                key={`${item.label}-${index}`}
              >
                <item.icon className="size-4 text-[var(--mkt-accent)]" />
                <span className="whitespace-nowrap text-[13px] font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
