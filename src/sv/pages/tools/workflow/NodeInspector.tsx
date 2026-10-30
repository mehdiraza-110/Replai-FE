import { X } from "lucide-react";
import type { ReactNode } from "react";
import type { WorkflowMeta, WorkflowNodeData } from "../../../../services/workflowApi";
import { Chips, Check, Field, MultiSelect, Note, Radio } from "./Form";
import { afterSlotYes, type FlowEdge, type FlowNode } from "./graphRules";
import { NODE_DEF_BY_TYPE } from "./nodeDefs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VARIABLES = ["lead_email", "lead_name", "subject", "reply", "agent", "campaign", "workspace", "review_link"];

export function NodeInspector({
  node,
  nodes,
  edges,
  meta,
  readOnly,
  onChange,
  onClose,
}: {
  node: FlowNode;
  nodes?: FlowNode[];
  edges?: FlowEdge[];
  meta: WorkflowMeta | null;
  readOnly: boolean;
  onChange: (data: WorkflowNodeData) => void;
  onClose: () => void;
}) {
  const def = NODE_DEF_BY_TYPE[node.type!];
  const d = node.data;
  const set = (patch: WorkflowNodeData) => onChange({ ...d, ...patch });
  const mailboxOptions = (meta?.mailboxes ?? []).map((m) => ({ id: m.id, label: m.email }));
  const pvConnected = meta?.plusvibeConnected ?? false;
  const problems = d.__problems ?? [];
  const trigger = (nodes ?? []).find((n) => n.type?.startsWith("trigger."));
  const allowCampaignAgent = trigger?.type === "trigger.plusvibe_reply" || trigger?.type === "trigger.inbox_mail";
  const scopeIds = trigger?.type === "trigger.plusvibe_reply" ? trigger.data.campaignIds : undefined;
  const singleCampaign = Array.isArray(scopeIds) && scopeIds.length === 1
    ? [...(meta?.plusvibeCampaigns ?? []), ...(meta?.campaigns ?? [])].find((c) => String(c.id) === String(scopeIds[0]))
    : undefined;

  const hasOffer = (nodes ?? []).some((n) => n.type === "action.offer_times");
  const bookIsAfterYes = afterSlotYes(nodes ?? [], edges ?? []).has(node.id);
  const calendarIds = meta?.calendarAgentIds;
  const agentSelect = (
    <div className="wf-stack">
      <Field label="Agent (its Google Calendar is used)" hint={meta && meta.agents.length === 0 ? "Create an AI agent first, then select it here." : undefined}>
        <select className="sv-select" disabled={readOnly} onChange={(e) => set({ agentId: e.target.value === "campaign" ? "campaign" : e.target.value ? Number(e.target.value) : undefined })} value={d.agentId ?? ""}>
          <option value="">Select an agent</option>
          {allowCampaignAgent || d.agentId === "campaign" ? <option value="campaign">Use the campaign's assigned agent</option> : null}
          {(meta?.agents ?? []).map((a) => (
            <option key={a.id} value={a.id}>{a.name}{calendarIds && !calendarIds.includes(a.id) ? " (no calendar)" : ""}</option>
          ))}
        </select>
      </Field>
      {typeof d.agentId === "number" && calendarIds && !calendarIds.includes(d.agentId) ? (
        <Note tone="warning">This agent has no Google Calendar connected. Connect one in the agent's settings, or this step cannot be saved as active.</Note>
      ) : null}
      {d.agentId === "campaign" ? <Note>Each reply uses the calendar of the agent assigned to the campaign it belongs to. If that agent has no calendar, the reply points the prospect to its meeting link instead.</Note> : null}
      {d.agentId === "campaign" && !allowCampaignAgent ? <Note tone="danger">The campaign's agent is only available with the PlusVibe reply and inbox mail triggers.</Note> : null}
    </div>
  );

  let form: ReactNode = null;
  switch (node.type) {
    case "action.offer_times": {
      const count = Math.min(5, Math.max(1, d.count ?? 3));
      form = (
        <div className="wf-stack is-loose">
          {agentSelect}
          <Field label="How many times to offer" hint="Free times in the agent's working hours over the next business days. Times already offered on this conversation are never repeated.">
            <div className="wf-stepper">
              <button type="button" aria-label="Fewer times" className="sv-btn is-sm" disabled={readOnly || count <= 1} onClick={() => set({ count: count - 1 })}>-</button>
              <span aria-live="polite">{count}</span>
              <button type="button" aria-label="More times" className="sv-btn is-sm" disabled={readOnly || count >= 5} onClick={() => set({ count: count + 1 })}>+</button>
            </div>
          </Field>
          <Note>Connect this step to an AI agent step: it writes the reply listing these times. If the calendar is not connected or nothing is free, the AI step sends the prospect to the agent's meeting link instead and never mentions the problem.</Note>
        </div>
      );
      break;
    }
    case "condition.slot_selected":
      form = (
        <div className="wf-stack">
          {!hasOffer ? <Note tone="warning">There is no "Offer times" step in this workflow. This check only finds a choice when times were offered earlier in the same conversation.</Note> : null}
          <Note>Looks at the prospect's latest reply (quoted text ignored). It goes down <strong>yes</strong> only when the reply clearly picks one of the times offered earlier, for example "option 2", "the second one", "Thursday at 2pm" or "2:30". Declines, "none of these" and counter-proposals go down <strong>no</strong>.</Note>
          <Note>When a reply is genuinely unclear (like "sounds good" with several times offered), an AI check decides, and only if it is at least 70% sure. That uses one AI request. Without an AI key it goes down no.</Note>
        </div>
      );
      break;
    case "action.book_meeting":
      form = (
        <div className="wf-stack is-loose">
          {agentSelect}
          {!bookIsAfterYes ? <Note tone="danger">Connect this step to the yes output of a "Slot selected" step. It books the time the prospect picked.</Note> : null}
          <Note>Re-checks the time is still free, creates the calendar event with a Google Meet link and invites the prospect. One meeting per conversation. Use <strong>booked</strong> to confirm with the AI step, and <strong>unavailable</strong> (time taken or booking failed) to offer new times with an apology.</Note>
        </div>
      );
      break;
    case "action.notify_email":
      form = (
        <div className="wf-stack is-loose">
          <Field label="Recipients" hint="Up to 10 addresses. Press Enter to add.">
            <Chips disabled={readOnly} max={10} onChange={(v) => set({ to: v })} placeholder="name@company.com" validate={(w) => (EMAIL_RE.test(w) ? null : "Enter a valid email address.")} value={d.to ?? []} />
          </Field>
          <Check checked={Boolean(d.notifyOwners)} disabled={readOnly} hint="Also email every owner and admin of this workspace." label="Notify workspace owners and admins" onChange={(v) => set({ notifyOwners: v })} />
          <Field label="Subject">
            <input className="sv-input" disabled={readOnly} maxLength={200} onChange={(e) => set({ subject: e.target.value })} value={d.subject ?? ""} />
          </Field>
          <Field label="Message">
            <textarea className="sv-textarea wf-tall" disabled={readOnly} maxLength={4000} onChange={(e) => set({ message: e.target.value })} value={d.message ?? ""} />
          </Field>
          <p className="wf-hint">
            Variables: {VARIABLES.map((v) => <code className="wf-code" key={v}>{`{{${v}}}`}</code>)}
          </p>
          <Check checked={Boolean(d.includeReply)} disabled={readOnly} hint="Adds the prospect's reply (and the AI draft, when one exists) below your message." label="Include the reply" onChange={(v) => set({ includeReply: v })} />
          <Note>Best effort: a failed email never stops the workflow. Each person gets at most one email per run. Not counted toward your trial email limit.</Note>
        </div>
      );
      break;
    case "trigger.inbox_mail":
    case "trigger.mail_sent":
      form = (
        <Field label="Mailboxes" hint="Run this workflow only for these mailboxes.">
          <MultiSelect allLabel="All mailboxes" disabled={readOnly} emptyText="No mailboxes in this workspace yet." onChange={(v) => set({ mailboxIds: v })} options={mailboxOptions} value={d.mailboxIds} />
        </Field>
      );
      break;
    case "trigger.plusvibe_reply":
      form = (
        <div className="wf-stack">
          {!pvConnected ? <Note tone="warning">PlusVibe is not connected for this workspace. Connect it under Integrations to pick campaigns.</Note> : null}
          <Field label="Campaigns" hint="Run this workflow only for replies to these campaigns.">
            <MultiSelect allLabel="All campaigns" disabled={readOnly || !pvConnected} emptyText="No PlusVibe campaigns found." onChange={(v) => set({ campaignIds: v })} options={(meta?.plusvibeCampaigns ?? []).map((c) => ({ id: c.id, label: c.name }))} value={d.campaignIds} />
          </Field>
        </div>
      );
      break;
    case "action.save_to_db":
      form = <p className="wf-hint">Saves the message and builds the lead profile. This step is optional: everything is saved automatically right after the trigger even if you remove it. Nothing to configure.</p>;
      break;
    case "action.ai_agent":
      form = (
        <div className="wf-stack is-loose">
          <Field label="Agent" hint={meta && meta.agents.length === 0 ? "Create an AI agent first, then select it here." : undefined}>
            <select className="sv-select" disabled={readOnly} onChange={(e) => set({ agentId: e.target.value === "campaign" ? "campaign" : e.target.value ? Number(e.target.value) : undefined })} value={d.agentId ?? ""}>
              <option value="">Select an agent</option>
              {allowCampaignAgent || d.agentId === "campaign" ? <option value="campaign">Use the campaign's assigned agent</option> : null}
              {(meta?.agents ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
          {d.agentId === "campaign" ? (
            <p className="wf-hint">
              Each reply is drafted by the agent assigned to the campaign it belongs to.
              {singleCampaign?.agentName ? ` This campaign's agent today: ${singleCampaign.agentName}.` : ""}
            </p>
          ) : null}
          {d.agentId === "campaign" && !allowCampaignAgent ? <p className="wf-hint is-error">The campaign's agent is only available with the PlusVibe reply and inbox mail triggers.</p> : null}
          <Field label="Tone" hint="For example: warm, concise, professional.">
            <input className="sv-input" disabled={readOnly} onChange={(e) => set({ tone: e.target.value })} value={d.tone ?? ""} />
          </Field>
          <Field label="Instructions" hint="Extra guidance for this workflow only.">
            <textarea className="sv-textarea wf-tall" disabled={readOnly} onChange={(e) => set({ instructions: e.target.value })} value={d.instructions ?? ""} />
          </Field>
          <fieldset className="wf-radios" disabled={readOnly}>
            <legend className="wf-label">After drafting</legend>
            {([
              ["review", "Send for review", "A person approves each reply first."],
              ["auto_send", "Send automatically", "The reply goes out without review."],
              ["agent_default", "Follow the agent's own settings", "Sends automatically only when the agent is set to auto-reply and confident enough; otherwise waits for your review. Same as today's built-in handling."],
            ] as const).map(([value, title, text]) => (
              <Radio checked={(d.mode ?? "review") === value} hint={text} key={value} label={title} name={`mode-${node.id}`} onChange={() => set({ mode: value })} />
            ))}
          </fieldset>
        </div>
      );
      break;
    case "action.send_reply":
      form = (
        <div className="wf-stack is-loose">
          <Field label="Send via">
            <select
              className="sv-select"
              disabled={readOnly}
              onChange={(e) => set(e.target.value === "plusvibe" ? { via: "plusvibe", mailboxId: undefined } : { via: "mailbox" })}
              value={d.via ?? "mailbox"}
            >
              <option disabled={!pvConnected} value="plusvibe">PlusVibe{pvConnected ? "" : " (not connected)"}</option>
              <option value="mailbox">A workspace mailbox</option>
            </select>
          </Field>
          {!pvConnected ? <p className="wf-hint">PlusVibe is available once it is connected under Integrations.</p> : null}
          {(d.via ?? "mailbox") === "mailbox" ? (
            <Field label="Mailbox">
              <select className="sv-select" disabled={readOnly} onChange={(e) => set({ mailboxId: e.target.value ? Number(e.target.value) : undefined })} value={d.mailboxId ?? ""}>
                <option value="">Select a mailbox</option>
                {mailboxOptions.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </Field>
          ) : null}
        </div>
      );
      break;
    case "condition.keyword":
      form = (
        <div className="wf-stack is-loose">
          <Field label="Check the">
            <select className="sv-select" disabled={readOnly} onChange={(e) => set({ matchOn: e.target.value as "reply" | "subject" })} value={d.matchOn ?? "reply"}>
              <option value="reply">Reply body</option>
              <option value="subject">Subject line</option>
            </select>
          </Field>
          <Field label="Keywords" hint="Matches go down the yes branch, everything else down no.">
            <Chips disabled={readOnly} onChange={(v) => !readOnly && set({ keywords: v })} value={d.keywords ?? []} />
          </Field>
        </div>
      );
      break;
  }

  return (
    <aside aria-label="Node settings" className="wf-inspector">
      <header className="wf-inspector-head">
        <span className={`wf-badge ${def.tone}`}><def.icon className="sv-icon" /></span>
        <div className="wf-grow">
          <p className="wf-title wf-ellipsis">{def.label}</p>
          <p className="wf-hint">Node settings</p>
        </div>
        <button type="button" aria-label="Close settings" className="sv-icon-btn" onClick={onClose}>
          <X className="sv-icon" aria-hidden />
        </button>
      </header>
      <div className="wf-inspector-body">
        {problems.length > 0 ? <ul className="wf-problems">{problems.map((p, i) => <li key={i}>{p}</li>)}</ul> : null}
        {readOnly ? <p className="wf-hint">You have read-only access to this workflow.</p> : null}
        {form}
      </div>
    </aside>
  );
}
