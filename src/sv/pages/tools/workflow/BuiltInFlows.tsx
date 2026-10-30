import { ArrowRight, Cog } from "lucide-react";
import type { WorkflowSummary } from "../../../../services/workflowApi";
import { Badge, Card } from "../../../ui";

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
    <section aria-labelledby="builtin-heading" className="wf-stack">
      <div>
        <h3 className="sv-set-title" id="builtin-heading" style={{ fontSize: 14 }}>Handled by the built-in flow</h3>
        <p className="wf-hint">
          Replies that no active workflow covers run the app's standard handling. A workflow for all campaigns or mailboxes replaces it; one for specific ones only takes over those.
        </p>
      </div>
      <div className="wf-grid">
        {visible.map((flow) => (
          <Card className="wf-builtin" key={flow.trigger}>
            <div className="wf-row">
              <h4 className="wf-title wf-iconline"><Cog className="sv-icon" aria-hidden />{flow.title}</h4>
              <Badge>Built-in</Badge>
            </div>
            <ol className="wf-steps">
              {flow.steps.map((step, index) => (
                <li key={step}>
                  {index > 0 ? <ArrowRight className="sv-icon" aria-hidden /> : null}
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <p className="wf-hint">{flow.note}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
