import { useState } from "react";
import { Button, Modal } from "../../../ui";
import { Field, Note, Radio } from "./Form";

export type WorkflowTemplate = "default_reply" | "book_meetings" | null;

/** Choose a name and a starting point. Remount it (change `key`) to reset the choices each time it opens. */
export function NewWorkflowModal({
  isCreating,
  error,
  initialTemplate,
  plusvibeConnected = false,
  onCreate,
  onClose,
}: {
  isCreating: boolean;
  error: string | null;
  initialTemplate: boolean;
  plusvibeConnected?: boolean;
  onCreate: (name: string, template: WorkflowTemplate, trigger: "inbox_mail" | "plusvibe_reply") => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [template, setTemplate] = useState<WorkflowTemplate>(initialTemplate ? "default_reply" : null);
  const [trigger, setTrigger] = useState<"inbox_mail" | "plusvibe_reply">("inbox_mail");
  return (
    <Modal
      open
      title="New workflow"
      onClose={onClose}
      footer={<><Button disabled={isCreating} onClick={onClose}>Cancel</Button><Button variant="primary" disabled={isCreating || !name.trim()} onClick={() => onCreate(name.trim(), template, trigger)}>{isCreating ? "Creating…" : "Create"}</Button></>}
    >
      <Field label="Name"><input autoFocus className="sv-input" onChange={(e) => setName(e.target.value)} placeholder="Reply to inbound mail" value={name} /></Field>
      <fieldset className="wf-radios">
        <legend className="wf-label">Start from</legend>
        {([
          ["default_reply", "Default reply", "Mail received, save, AI agent, send reply. Pick your agent and mailbox, then activate."],
          ["book_meetings", "Book meetings", "Offers free times from the agent's calendar, books the time the prospect picks and confirms with the Meet link."],
          [null, "Blank canvas", "Build the flow node by node."],
        ] as const).map(([value, title, text]) => (
          <Radio checked={template === value} hint={text} key={title} label={title} name="template" onChange={() => setTemplate(value)} />
        ))}
      </fieldset>
      {template === "book_meetings" ? (
        <fieldset className="wf-radios">
          <legend className="wf-label">Replies come from</legend>
          {([
            ["inbox_mail", "Your mailboxes", true],
            ["plusvibe_reply", plusvibeConnected ? "PlusVibe campaigns" : "PlusVibe campaigns (not connected)", plusvibeConnected],
          ] as const).map(([value, title, enabled]) => (
            <Radio checked={trigger === value} disabled={!enabled} key={value} label={title} name="meeting-trigger" onChange={() => setTrigger(value)} />
          ))}
          <p className="wf-hint">The agent and calendar come from each reply's campaign. Replies are held for review until you change the AI step.</p>
        </fieldset>
      ) : null}
      {error ? <Note tone="danger">{error}</Note> : null}
    </Modal>
  );
}
