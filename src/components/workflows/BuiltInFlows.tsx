import { Chip } from "@heroui/react";
import { ArrowRight, Cog } from "lucide-react";
import type { WorkflowSummary } from "../../services/workflowApi";

interface BuiltIn {
  trigger: "trigger.plusvibe_reply" | "trigger.inbox_mail";
  title: string;
  steps: string[];
  note: string;
}

const BUILT_INS: BuiltIn[] = [
  {
    trigger: "trigger.plusvibe_reply",
    title: "PlusVibe replies",
    steps: ["PlusVibe reply arrives", "Saved", "Campaign's agent drafts", "Auto-sent or held for review"],
    note: "Each campaign uses its own assigned agent and its own auto-send and review settings.",
  },
  {
    trigger: "trigger.inbox_mail",
    title: "Replies to your mailboxes",
    steps: ["Reply lands in a mailbox", "Saved", "Campaign's agent drafts", "Auto-sent or held for review"],
    note: "Replies to cold-mailer campaigns are drafted by the campaign's assigned agent.",
  },
];

const REMAINDER: Record<BuiltIn["trigger"], Pick<BuiltIn, "title" | "note">> = {
  "trigger.plusvibe_reply": {
    title: "Campaigns without their own workflow",
    note: "Replies to campaigns that no active workflow covers still get the standard handling: the campaign's assigned agent and its own auto-send and review settings.",
  },
  "trigger.inbox_mail": {
    title: "Mailboxes without their own workflow",
    note: "Replies to mailboxes that no active workflow covers still get the standard handling by the campaign's assigned agent.",
  },
};

/**
 * Triggers with no active workflow are still handled by the app's built-in flow. Showing that makes it clear what
 * is happening to replies today and what an active workflow for the same trigger would replace.
 */
export function BuiltInFlows({ items, plusvibeConnected }: { items: WorkflowSummary[]; plusvibeConnected: boolean }) {
  const active = items.filter((item) => item.is_active);
  const coversAll = new Set(active.filter((item) => item.trigger_scope === "all").map((item) => item.trigger_type));
  const hasSpecific = new Set(active.filter((item) => item.trigger_scope !== "all").map((item) => item.trigger_type));
  const visible = BUILT_INS.filter(
    (flow) => !coversAll.has(flow.trigger) && (flow.trigger !== "trigger.plusvibe_reply" || plusvibeConnected),
  ).map((flow) => (hasSpecific.has(flow.trigger) ? { ...flow, ...REMAINDER[flow.trigger] } : flow));
  if (visible.length === 0) return null;

  return (
    <section aria-labelledby="builtin-heading" className="space-y-2">
      <div>
        <h3 className="text-[13px] font-semibold text-foreground" id="builtin-heading">Handled by the built-in flow</h3>
        <p className="text-[12px] text-muted">
          Replies that no active workflow covers run the app's standard handling. A workflow for all campaigns or mailboxes replaces it; one for specific ones only takes over those.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {visible.map((flow) => (
          <article className="rounded-2xl border border-dashed border-border bg-surface/60 p-4" key={flow.trigger}>
            <div className="flex items-center justify-between gap-3">
              <h4 className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
                <Cog className="size-4 text-muted" />
                {flow.title}
              </h4>
              <Chip size="sm" variant="soft">Built-in</Chip>
            </div>
            <ol className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] text-foreground/80">
              {flow.steps.map((step, index) => (
                <li className="flex items-center gap-1.5" key={step}>
                  {index > 0 ? <ArrowRight className="size-3 text-muted" aria-hidden /> : null}
                  <span className="rounded-md bg-surface-tertiary/70 px-2 py-0.5">{step}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-[12px] text-muted">{flow.note}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
