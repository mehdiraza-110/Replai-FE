import { Button, Modal, Spinner, type useOverlayState } from "@heroui/react";
import { X } from "lucide-react";
import { useState } from "react";

export type WorkflowTemplate = "default_reply" | "book_meetings" | null;

export function NewWorkflowModal({
  state,
  isCreating,
  error,
  initialTemplate,
  plusvibeConnected = false,
  onCreate,
}: {
  state: ReturnType<typeof useOverlayState>;
  isCreating: boolean;
  error: string | null;
  initialTemplate: boolean;
  plusvibeConnected?: boolean;
  onCreate: (name: string, template: WorkflowTemplate, trigger: "inbox_mail" | "plusvibe_reply") => void;
}) {
  const [name, setName] = useState("");
  const [template, setTemplate] = useState<WorkflowTemplate>(initialTemplate ? "default_reply" : null);
  const [trigger, setTrigger] = useState<"inbox_mail" | "plusvibe_reply">("inbox_mail");
  return (
    <Modal state={state}>
      <Modal.Backdrop className="bg-foreground/30 backdrop-blur-[2px]">
        <Modal.Container className="w-[min(460px,calc(100vw-32px))]" placement="center" scroll="inside" size="md">
          <Modal.Dialog className="overflow-hidden rounded-[20px] border border-border/70 bg-surface shadow-[0_8px_30px_color-mix(in_oklch,var(--foreground)_18%,transparent)]">
            <Modal.Header className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4">
              <Modal.Heading className="text-base font-semibold text-foreground">New workflow</Modal.Heading>
              <Modal.CloseTrigger aria-label="Close" className="grid size-8 shrink-0 place-items-center rounded-full bg-default-100 text-foreground transition hover:bg-default-200">
                <X className="size-4" />
              </Modal.CloseTrigger>
            </Modal.Header>
            <Modal.Body className="space-y-4 px-5 py-5">
              <label className="block space-y-1.5">
                <span className="text-[12px] font-medium text-foreground">Name</span>
                <input autoFocus className="w-full rounded-xl border border-border bg-surface-secondary px-3 py-2 text-[13px] outline-none focus:border-accent" onChange={(e) => setName(e.target.value)} placeholder="Reply to inbound mail" value={name} />
              </label>
              <fieldset className="space-y-1.5">
                <legend className="text-[12px] font-medium text-foreground">Start from</legend>
                {([
                  ["default_reply", "Default reply", "Mail received, save, AI agent, send reply. Pick your agent and mailbox, then activate."],
                  ["book_meetings", "Book meetings", "Offers free times from the agent's calendar, books the time the prospect picks and confirms with the Meet link."],
                  [null, "Blank canvas", "Build the flow node by node."],
                ] as const).map(([value, title, text]) => (
                  <label className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition ${template === value ? "border-accent bg-accent/5" : "border-border/70 hover:bg-default-100"}`} key={title}>
                    <input checked={template === value} className="mt-0.5 accent-[var(--accent)]" name="template" onChange={() => setTemplate(value)} type="radio" />
                    <span>
                      <span className="block text-[13px] font-medium text-foreground">{title}</span>
                      <span className="block text-[12px] text-muted">{text}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
              {template === "book_meetings" ? (
                <fieldset className="space-y-1.5">
                  <legend className="text-[12px] font-medium text-foreground">Replies come from</legend>
                  {([
                    ["inbox_mail", "Your mailboxes", true],
                    ["plusvibe_reply", plusvibeConnected ? "PlusVibe campaigns" : "PlusVibe campaigns (not connected)", plusvibeConnected],
                  ] as const).map(([value, title, enabled]) => (
                    <label className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-[13px] text-foreground transition ${enabled ? "cursor-pointer" : "cursor-not-allowed opacity-50"} ${trigger === value ? "border-accent bg-accent/5" : "border-border/70"}`} key={value}>
                      <input checked={trigger === value} className="accent-[var(--accent)]" disabled={!enabled} name="meeting-trigger" onChange={() => setTrigger(value)} type="radio" />
                      {title}
                    </label>
                  ))}
                  <p className="text-[11px] leading-4 text-muted">The agent and calendar come from each reply's campaign. Replies are held for review until you change the AI step.</p>
                </fieldset>
              ) : null}
              {error ? <p className="rounded-xl border border-danger/25 bg-danger/10 px-3 py-2 text-[12px] text-danger">{error}</p> : null}
            </Modal.Body>
            <Modal.Footer className="flex justify-end gap-2 border-t border-border/70 px-5 py-4">
              <Button isDisabled={isCreating} onClick={state.close} size="sm" variant="secondary">Cancel</Button>
              <Button isDisabled={isCreating || !name.trim()} onClick={() => onCreate(name.trim(), template, trigger)} size="sm">
                {isCreating ? <Spinner color="current" size="sm" /> : null}
                Create
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
