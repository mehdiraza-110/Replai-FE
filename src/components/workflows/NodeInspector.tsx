import { X } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { WorkflowMeta, WorkflowNodeData } from "../../services/workflowApi";
import type { FlowNode } from "./graphRules";
import { NODE_DEF_BY_TYPE } from "./nodeDefs";

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

function Chips({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const [draft, setDraft] = useState("");
  function commit() {
    const word = draft.trim();
    if (word && !value.some((v) => v.toLowerCase() === word.toLowerCase())) onChange([...value, word]);
    setDraft("");
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((word) => (
          <span className="inline-flex items-center gap-1 rounded-full bg-default-100 py-0.5 pl-2.5 pr-1 text-[12px] text-foreground" key={word}>
            {word}
            <button aria-label={`Remove ${word}`} className="grid size-4 place-items-center rounded-full text-muted hover:bg-default-200 hover:text-foreground" onClick={() => onChange(value.filter((v) => v !== word))} type="button">
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <input
        className={inputClass}
        onBlur={commit}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
        placeholder="Type a keyword and press Enter"
        value={draft}
      />
    </div>
  );
}

export function NodeInspector({
  node,
  nodes,
  meta,
  readOnly,
  onChange,
  onClose,
}: {
  node: FlowNode;
  nodes?: FlowNode[];
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

  let form: ReactNode = null;
  switch (node.type) {
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
            <Chips onChange={(v) => !readOnly && set({ keywords: v })} value={d.keywords ?? []} />
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
