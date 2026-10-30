import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { replierApi, type ReplyMode, type ReplyType } from "../../api/replier";
import { Badge, Button, Card, SkeletonCard } from "../../ui";
import { Banner, errorText, useRemote } from "../crm/shared";
import "./replier.css";

const MODES: Array<{ mode: ReplyMode; label: string; help: string }> = [
  { mode: "default", label: "Default", help: "Follows the agent's general approval setting." },
  { mode: "auto", label: "Auto-send", help: "Sends without waiting for review (unless the AI itself flags it for a person)." },
  { mode: "draft", label: "Draft for review", help: "Writes the reply and waits for you to approve it in the inbox." },
  { mode: "escalate", label: "Escalate", help: "Does not reply: flags the thread and opens a task for a person." },
  { mode: "no_reply", label: "No reply", help: "Does nothing for this type of reply." },
];

const EXAMPLE: Record<string, string> = {
  interested: "Thank them, share the one-line value, and propose a short call.",
  meeting_request: "Confirm warmly and offer the available times. Keep it to three sentences.",
  question: "Answer only from the knowledge base in two sentences, then ask if a call would help.",
  objection: "Acknowledge the concern, give one relevant proof point, do not push.",
  not_interested: "One courteous line, no pitch.",
};

export function ReplyTypesEditor({ agentId, canEdit, builtIn }: { agentId: number | "sdr"; canEdit: boolean; builtIn: boolean }) {
  const { data, error } = useRemote(() => replierApi.replyTypes(agentId), [agentId]);
  const [items, setItems] = useState<ReplyType[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => { if (data) { setItems(data); setDirty(false); } }, [data]);

  if (error) return <Banner error={error} />;
  if (!items) return <div className="rp-types" role="status" aria-label="Loading">{[0, 1, 2, 3].map((i) => <SkeletonCard key={i} lines={2} />)}</div>;

  const change = (intent: string, patch: Partial<ReplyType>) => {
    setItems(items.map((item) => (item.intent === intent ? { ...item, ...patch } : item)));
    setDirty(true);
    setNotice("");
  };

  async function save() {
    if (!items) return;
    setSaving(true);
    setFailure("");
    setNotice("");
    try {
      const saved = await replierApi.saveReplyTypes(agentId, items.map(({ intent, mode, instruction }) => ({ intent, mode, instruction })));
      setItems(saved);
      setDirty(false);
      setNotice("Reply types saved.");
    } catch (caught) {
      setFailure(errorText(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rp-types">
      <div className="rp-toolbar">
        <p className="sv-hint" style={{ maxWidth: 640 }}>
          Decide what {builtIn ? "the AI SDR" : "this agent"} does for each kind of prospect reply. The instruction is added to the agent's prompt when the reply is of that type; the mode is enforced by the system.
        </p>
        <span className="sv-actions">
          {notice ? <span className="sv-hint" role="status">{notice}</span> : null}
          <Button variant="primary" disabled={!canEdit || !dirty || saving} onClick={save}>{saving ? "Saving…" : "Save reply types"}</Button>
        </span>
      </div>
      <Banner error={failure} />
      {!canEdit ? <p className="sv-banner is-warn" style={{ margin: 0 }}>Only workspace owners and admins can change reply types.</p> : null}
      {items.map((item) => (
        <Card key={item.intent} className="rp-type">
          <div className="rp-type-top">
            <div className="rp-type-name">
              {item.label} {item.locked ? <Badge tone="neutral" icon={Lock}>Never answered</Badge> : null}
              <small>{item.hint}</small>
            </div>
            {item.locked ? (
              <span className="sv-hint">Always no reply, for safety.</span>
            ) : (
              <div className="rp-modes" role="radiogroup" aria-label={`${item.label} mode`}>
                {MODES.map((entry) => (
                  <button key={entry.mode} type="button" role="radio" aria-checked={item.mode === entry.mode} title={entry.help} disabled={!canEdit}
                    className={`rp-mode${item.mode === entry.mode ? " is-active" : ""}`} onClick={() => change(item.intent, { mode: entry.mode })}>
                    {entry.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {!item.locked ? (
            <textarea className="sv-textarea" rows={2} disabled={!canEdit} aria-label={`${item.label} instruction`} maxLength={2000}
              placeholder={EXAMPLE[item.intent] ? `Instruction for the agent, for example: ${EXAMPLE[item.intent]}` : "Optional instruction for the agent when it answers this type of reply."}
              value={item.instruction} onChange={(event) => change(item.intent, { instruction: event.target.value })} />
          ) : null}
        </Card>
      ))}
    </div>
  );
}
