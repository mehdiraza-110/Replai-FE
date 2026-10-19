import { X } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { WorkflowMeta, WorkflowNodeData } from "../../services/workflowApi";
import { afterSlotYes, type FlowEdge, type FlowNode } from "./graphRules";
import { NODE_DEF_BY_TYPE } from "./nodeDefs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VARIABLES = ["lead_email", "lead_name", "subject", "reply", "agent", "campaign", "workspace", "review_link"];

const inputClass =
  "w-full rounded-xl border border-border bg-surface-secondary px-3 py-2 text-[13px] text-foreground outline-none transition placeholder:text-muted focus:border-accent disabled:opacity-50";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[12px] font-medium text-foreground">{label}</span>
      {children}
      {hint ? <span className="block text-[11px] leading-4 text-muted">{hint}</span> : null}
    </label>
  );
}

function MultiSelect<T extends string | number>({
  options,
  value,
  onChange,
  allLabel,
  disabled,
  emptyText,
}: {
  options: { id: T; label: string }[];
  value: T[] | "all" | undefined;
  onChange: (next: T[] | "all") => void;
  allLabel: string;
  disabled?: boolean;
  emptyText: string;
}) {
  const all = value === "all" || value === undefined;
  const selected = all ? [] : value;
  return (
    <fieldset className="min-w-0 space-y-1" disabled={disabled}>
      <label className="flex items-center gap-2 rounded-lg px-1 py-1 text-[13px] text-foreground">
        <input checked={all} className="accent-[var(--accent)]" onChange={(e) => onChange(e.target.checked ? "all" : [])} type="checkbox" />
        {allLabel}
      </label>
      <div className={`max-h-48 space-y-0.5 overflow-y-auto rounded-xl border border-border/70 p-1.5 ${all || disabled ? "opacity-50" : ""}`}>
        {options.length === 0 ? <p className="px-1 py-1 text-[12px] text-muted">{emptyText}</p> : null}
        {options.map((option) => (
          <label className="flex min-w-0 items-center gap-2 rounded-lg px-1.5 py-1 text-[13px] text-foreground hover:bg-default-100" key={option.id}>
            <input
              checked={selected.includes(option.id)}
              className="shrink-0 accent-[var(--accent)]"
              disabled={all}
              onChange={(e) => onChange(e.target.checked ? [...selected, option.id] : selected.filter((x) => x !== option.id))}
              type="checkbox"
            />
            <span className="min-w-0 truncate" title={option.label}>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Chips({
  value,
  onChange,
  placeholder = "Type a keyword and press Enter",
  validate,
  max,
  disabled,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  validate?: (word: string) => string | null;
  max?: number;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  function commit() {
    const word = draft.trim();
    if (!word) return;
    if (value.some((v) => v.toLowerCase() === word.toLowerCase())) {
      setDraft("");
      return;
    }
    const problem = validate?.(word) ?? (max && value.length >= max ? `You can add up to ${max}.` : null);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    onChange([...value, word]);
    setDraft("");
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((word) => (
          <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-default-100 py-0.5 pl-2.5 pr-1 text-[12px] text-foreground" key={word}>
            <span className="truncate">{word}</span>
            <button aria-label={`Remove ${word}`} className="grid size-4 shrink-0 place-items-center rounded-full text-muted hover:bg-default-200 hover:text-foreground" disabled={disabled} onClick={() => onChange(value.filter((v) => v !== word))} type="button">
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <input
        aria-invalid={error ? true : undefined}
        className={`${inputClass} ${error ? "!border-danger" : ""}`}
        disabled={disabled}
        onBlur={commit}
        onChange={(e) => { setDraft(e.target.value); setError(null); }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
        placeholder={placeholder}
        value={draft}
      />
      {error ? <p className="text-[11px] leading-4 text-danger">{error}</p> : null}
    </div>
  );
}

function Toggle({ label, hint, checked, onChange, disabled }: { label: string; hint?: string; checked: boolean; onChange: (next: boolean) => void; disabled?: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border/70 p-2.5 transition hover:bg-default-100">
      <input checked={checked} className="mt-0.5 accent-[var(--accent)]" disabled={disabled} onChange={(e) => onChange(e.target.checked)} type="checkbox" />
      <span>
        <span className="block text-[13px] font-medium text-foreground">{label}</span>
        {hint ? <span className="block text-[11px] leading-4 text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

function Note({ tone = "muted", children }: { tone?: "muted" | "warning" | "danger"; children: ReactNode }) {
  const cls = tone === "warning" ? "border-warning/30 bg-warning/10 text-foreground" : tone === "danger" ? "border-danger/25 bg-danger/10 text-danger" : "border-border/70 bg-surface-secondary text-muted";
  return <p className={`rounded-xl border px-3 py-2 text-[12px] leading-4 ${cls}`}>{children}</p>;
}

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
    <div className="space-y-2">
      <Field label="Agent (its Google Calendar is used)" hint={meta && meta.agents.length === 0 ? "Create an AI agent first, then select it here." : undefined}>
        <select className={inputClass} disabled={readOnly} onChange={(e) => set({ agentId: e.target.value === "campaign" ? "campaign" : e.target.value ? Number(e.target.value) : undefined })} value={d.agentId ?? ""}>
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
        <div className="space-y-4">
          {agentSelect}
          <Field label="How many times to offer" hint="Free times in the agent's working hours over the next business days. Times already offered on this conversation are never repeated.">
            <div className="flex items-center gap-2">
              <button aria-label="Fewer times" className="grid size-8 place-items-center rounded-lg border border-border bg-surface-secondary text-[16px] text-foreground disabled:opacity-40" disabled={readOnly || count <= 1} onClick={() => set({ count: count - 1 })} type="button">-</button>
              <span aria-live="polite" className="w-8 text-center text-[14px] font-semibold text-foreground">{count}</span>
              <button aria-label="More times" className="grid size-8 place-items-center rounded-lg border border-border bg-surface-secondary text-[16px] text-foreground disabled:opacity-40" disabled={readOnly || count >= 5} onClick={() => set({ count: count + 1 })} type="button">+</button>
            </div>
          </Field>
          <Note>Connect this step to an AI agent step: it writes the reply listing these times. If the calendar is not connected or nothing is free, the AI step sends the prospect to the agent's meeting link instead and never mentions the problem.</Note>
        </div>
      );
      break;
    }
    case "condition.slot_selected":
      form = (
        <div className="space-y-3">
          {!hasOffer ? <Note tone="warning">There is no "Offer times" step in this workflow. This check only finds a choice when times were offered earlier in the same conversation.</Note> : null}
          <Note>Looks at the prospect's latest reply (quoted text ignored). It goes down <strong>yes</strong> only when the reply clearly picks one of the times offered earlier, for example "option 2", "the second one", "Thursday at 2pm" or "2:30". Declines, "none of these" and counter-proposals go down <strong>no</strong>.</Note>
          <Note>When a reply is genuinely unclear (like "sounds good" with several times offered), an AI check decides, and only if it is at least 70% sure. That uses one AI request. Without an AI key it goes down no.</Note>
        </div>
      );
      break;
    case "action.book_meeting":
      form = (
        <div className="space-y-4">
          {agentSelect}
          {!bookIsAfterYes ? <Note tone="danger">Connect this step to the yes output of a "Slot selected" step. It books the time the prospect picked.</Note> : null}
          <Note>Re-checks the time is still free, creates the calendar event with a Google Meet link and invites the prospect. One meeting per conversation. Use <strong>booked</strong> to confirm with the AI step, and <strong>unavailable</strong> (time taken or booking failed) to offer new times with an apology.</Note>
        </div>
      );
      break;
    case "action.notify_email":
      form = (
        <div className="space-y-4">
          <Field label="Recipients" hint="Up to 10 addresses. Press Enter to add.">
            <Chips disabled={readOnly} max={10} onChange={(v) => set({ to: v })} placeholder="name@company.com" validate={(w) => (EMAIL_RE.test(w) ? null : "Enter a valid email address.")} value={d.to ?? []} />
          </Field>
          <Toggle checked={Boolean(d.notifyOwners)} disabled={readOnly} hint="Also email every owner and admin of this workspace." label="Notify workspace owners and admins" onChange={(v) => set({ notifyOwners: v })} />
          <Field label="Subject">
            <input className={inputClass} disabled={readOnly} maxLength={200} onChange={(e) => set({ subject: e.target.value })} value={d.subject ?? ""} />
          </Field>
          <Field label="Message">
            <textarea className={`${inputClass} min-h-28 resize-y`} disabled={readOnly} maxLength={4000} onChange={(e) => set({ message: e.target.value })} value={d.message ?? ""} />
          </Field>
          <p className="text-[11px] leading-4 text-muted">
            Variables: {VARIABLES.map((v) => <code className="mr-1 rounded bg-default-100 px-1" key={v}>{`{{${v}}}`}</code>)}
          </p>
          <Toggle checked={Boolean(d.includeReply)} disabled={readOnly} hint="Adds the prospect's reply (and the AI draft, when one exists) below your message." label="Include the reply" onChange={(v) => set({ includeReply: v })} />
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
        <div className="space-y-2">
          {!pvConnected ? (
            <p className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-[12px] leading-4 text-foreground">
              PlusVibe is not connected for this workspace. Connect it under Integrations to pick campaigns.
            </p>
          ) : null}
          <Field label="Campaigns" hint="Run this workflow only for replies to these campaigns.">
            <MultiSelect allLabel="All campaigns" disabled={readOnly || !pvConnected} emptyText="No PlusVibe campaigns found." onChange={(v) => set({ campaignIds: v })} options={(meta?.plusvibeCampaigns ?? []).map((c) => ({ id: c.id, label: c.name }))} value={d.campaignIds} />
          </Field>
        </div>
      );
      break;
    case "action.save_to_db":
      form = <p className="text-[13px] leading-5 text-muted">Saves the message and builds the lead profile. This step is optional: everything is saved automatically right after the trigger even if you remove it. Nothing to configure.</p>;
      break;
    case "action.ai_agent":
      form = (
        <div className="space-y-4">
          <Field label="Agent" hint={meta && meta.agents.length === 0 ? "Create an AI agent first, then select it here." : undefined}>
            <select className={inputClass} disabled={readOnly} onChange={(e) => set({ agentId: e.target.value === "campaign" ? "campaign" : e.target.value ? Number(e.target.value) : undefined })} value={d.agentId ?? ""}>
              <option value="">Select an agent</option>
              {allowCampaignAgent || d.agentId === "campaign" ? <option value="campaign">Use the campaign's assigned agent</option> : null}
              {(meta?.agents ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
          {d.agentId === "campaign" ? (
            <p className="-mt-2 text-[11px] leading-4 text-muted">
              Each reply is drafted by the agent assigned to the campaign it belongs to.
              {singleCampaign?.agentName ? ` This campaign's agent today: ${singleCampaign.agentName}.` : ""}
            </p>
          ) : null}
          {d.agentId === "campaign" && !allowCampaignAgent ? (
            <p className="-mt-2 text-[11px] leading-4 text-danger">The campaign's agent is only available with the PlusVibe reply and inbox mail triggers.</p>
          ) : null}
          <Field label="Tone" hint="For example: warm, concise, professional.">
            <input className={inputClass} disabled={readOnly} onChange={(e) => set({ tone: e.target.value })} value={d.tone ?? ""} />
          </Field>
          <Field label="Instructions" hint="Extra guidance for this workflow only.">
            <textarea className={`${inputClass} min-h-28 resize-y`} disabled={readOnly} onChange={(e) => set({ instructions: e.target.value })} value={d.instructions ?? ""} />
          </Field>
          <fieldset className="space-y-1.5" disabled={readOnly}>
            <legend className="text-[12px] font-medium text-foreground">After drafting</legend>
            {([
              ["review", "Send for review", "A person approves each reply first."],
              ["auto_send", "Send automatically", "The reply goes out without review."],
              ["agent_default", "Follow the agent's own settings", "Sends automatically only when the agent is set to auto-reply and confident enough; otherwise waits for your review. Same as today's built-in handling."],
            ] as const).map(([value, title, text]) => (
              <label className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 transition ${(d.mode ?? "review") === value ? "border-accent bg-accent/5" : "border-border/70 hover:bg-default-100"}`} key={value}>
                <input checked={(d.mode ?? "review") === value} className="mt-0.5 accent-[var(--accent)]" name={`mode-${node.id}`} onChange={() => set({ mode: value })} type="radio" />
                <span>
                  <span className="block text-[13px] font-medium text-foreground">{title}</span>
                  <span className="block text-[11px] text-muted">{text}</span>
                </span>
              </label>
            ))}
          </fieldset>
        </div>
      );
      break;
    case "action.send_reply":
      form = (
        <div className="space-y-4">
          <Field label="Send via">
            <select
              className={inputClass}
              disabled={readOnly}
              onChange={(e) => set(e.target.value === "plusvibe" ? { via: "plusvibe", mailboxId: undefined } : { via: "mailbox" })}
              value={d.via ?? "mailbox"}
            >
              <option disabled={!pvConnected} value="plusvibe">PlusVibe{pvConnected ? "" : " (not connected)"}</option>
              <option value="mailbox">A workspace mailbox</option>
            </select>
          </Field>
          {!pvConnected ? <p className="text-[11px] leading-4 text-muted">PlusVibe is available once it is connected under Integrations.</p> : null}
          {(d.via ?? "mailbox") === "mailbox" ? (
            <Field label="Mailbox">
              <select className={inputClass} disabled={readOnly} onChange={(e) => set({ mailboxId: e.target.value ? Number(e.target.value) : undefined })} value={d.mailboxId ?? ""}>
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
        <div className="space-y-4">
          <Field label="Check the">
            <select className={inputClass} disabled={readOnly} onChange={(e) => set({ matchOn: e.target.value as "reply" | "subject" })} value={d.matchOn ?? "reply"}>
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
    <aside aria-label="Node settings" className="flex w-[320px] shrink-0 flex-col border-l border-border/70 bg-surface">
      <header className="flex items-center justify-between gap-2 border-b border-border/70 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${def.tone}`}><def.icon className="size-4" /></span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-foreground">{def.label}</p>
            <p className="text-[11px] text-muted">Node settings</p>
          </div>
        </div>
        <button aria-label="Close settings" className="grid size-8 place-items-center rounded-full text-muted hover:bg-default-100 hover:text-foreground" onClick={onClose} type="button">
          <X className="size-4" />
        </button>
      </header>
      <div className="min-w-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden p-4">
        {problems.length > 0 ? (
          <ul className="space-y-1 rounded-xl border border-danger/25 bg-danger/10 p-3 text-[12px] leading-4 text-danger">
            {problems.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        ) : null}
        {readOnly ? <p className="text-[12px] text-muted">You have read-only access to this workflow.</p> : null}
        {form}
      </div>
    </aside>
  );
}
