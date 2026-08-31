import { Avatar, Button, Card } from "@heroui/react";
import { Bot, Clock3, Paperclip, RefreshCw, Send, UserRoundX } from "lucide-react";
import { StatusPill } from "../components/ui/StatusPill";
import { conversationService } from "../services/api";

export function Messages() {
  const conversations = conversationService.list();
  const active = conversationService.getActive();

  return (
    <div className="mx-auto grid max-w-[1500px] gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="flex h-[calc(100vh-112px)] min-h-[720px] flex-col border border-border/70 bg-surface">
        <Card.Header className="border-b border-border/70">
          <Card.Title className="text-base">Conversation inbox</Card.Title>
          <Card.Description>Replies from PlusVibe campaigns</Card.Description>
        </Card.Header>
        <Card.Content className="thin-scrollbar min-h-0 flex-1 overflow-auto p-2">
          {conversations.map((conversation, index) => (
            <button
              className={[
                "w-full rounded-2xl p-3 text-left transition",
                index === 0 ? "bg-surface-secondary" : "hover:bg-surface-secondary/70",
              ].join(" ")}
              key={conversation.id}
            >
              <div className="flex items-start gap-3">
                <Avatar className="size-9">
                  <Avatar.Fallback>{conversation.lead.split(" ").map((part) => part[0]).join("")}</Avatar.Fallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">{conversation.lead}</p>
                    <span className="text-[11px] text-muted">{conversation.updated}</span>
                  </div>
                  <p className="text-xs text-muted">{conversation.company}</p>
                  <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-foreground">{conversation.latestMessage}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <StatusPill tone={conversation.status.includes("Needs") ? "warning" : "accent"}>{conversation.intent}</StatusPill>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </Card.Content>
      </Card>

      <Card className="flex h-[calc(100vh-112px)] min-h-[720px] flex-col border border-border/70 bg-surface">
        <Card.Header className="border-b border-border/70">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Card.Title className="text-base">{active.lead}</Card.Title>
              <Card.Description>{active.company} · {active.email} · {active.agent}</Card.Description>
            </div>
            <StatusPill tone="success">{active.status}</StatusPill>
          </div>
        </Card.Header>
        <Card.Content className="thin-scrollbar flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-5">
          {active.messages.map((message) => (
            <article
              className={[
                "max-w-[78%] rounded-2xl border p-4",
                message.from === "prospect"
                  ? "border-border bg-surface-secondary"
                  : message.from === "ai"
                    ? "ml-auto border-accent/30 bg-accent/10"
                    : "border-border bg-surface",
              ].join(" ")}
              key={`${message.sender}-${message.time}`}
            >
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted">
                {message.from === "ai" ? <Bot className="size-3.5" /> : null}
                <span>{message.sender}</span>
                <span>{message.time}</span>
              </div>
              <p className="text-sm leading-6 text-foreground">{message.body}</p>
            </article>
          ))}
        </Card.Content>
        <EmailComposer
          draft={active.messages.find((message) => message.from === "ai")?.body ?? ""}
          email={active.email}
          lead={active.lead}
        />
      </Card>
    </div>
  );
}

function EmailComposer({
  draft,
  email,
  lead,
}: {
  draft: string;
  email: string;
  lead: string;
}) {
  return (
    <Card.Footer className="border-t border-border/70 bg-surface-secondary/45 p-4">
      <section className="w-full rounded-[18px] border border-border/70 bg-surface p-3 shadow-[0_1px_3px_color-mix(in_oklch,var(--foreground)_10%,transparent)]">
        <div className="grid gap-2 text-[12px] sm:grid-cols-2">
          <label className="flex min-h-9 items-center gap-2 rounded-xl bg-background/70 px-3">
            <span className="w-12 shrink-0 font-medium text-muted">To</span>
            <input
              className="min-w-0 flex-1 bg-transparent font-medium text-foreground outline-none"
              defaultValue={`${lead} <${email}>`}
            />
          </label>
          <label className="flex min-h-9 items-center gap-2 rounded-xl bg-background/70 px-3">
            <span className="w-12 shrink-0 font-medium text-muted">From</span>
            <input
              className="min-w-0 flex-1 bg-transparent font-medium text-foreground outline-none"
              defaultValue="Alex - Sales Assistant via PlusVibe"
            />
          </label>
          <label className="flex min-h-9 items-center gap-2 rounded-xl bg-background/70 px-3 sm:col-span-2">
            <span className="w-12 shrink-0 font-medium text-muted">Subject</span>
            <input
              className="min-w-0 flex-1 bg-transparent font-medium text-foreground outline-none"
              defaultValue="Re: Outbound replies"
            />
          </label>
        </div>

        <textarea
          aria-label="Reply email body"
          className="mt-3 min-h-[150px] w-full resize-none rounded-[14px] border border-border/70 bg-surface px-3 py-3 text-sm leading-6 text-foreground outline-none transition focus:border-accent"
          defaultValue={draft}
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 font-medium text-success">
              <Bot className="size-3.5" />
              AI draft ready
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-default-100 px-2.5 py-1">
              <Clock3 className="size-3.5" />
              Send through PlusVibe
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button className="h-8 rounded-full px-3 text-[13px]" size="sm" variant="secondary">
              <Paperclip className="size-4" />
              Attach
            </Button>
            <Button className="h-8 rounded-full px-3 text-[13px]" size="sm" variant="secondary">
              <RefreshCw className="size-4" />
              Regenerate
            </Button>
            <Button className="h-8 rounded-full px-3 text-[13px]" size="sm" variant="secondary">
              <UserRoundX className="size-4" />
              Reject
            </Button>
            <Button className="h-8 rounded-full px-4 text-[13px]" size="sm">
              <Send className="size-4" />
              Send reply
            </Button>
          </div>
        </div>
      </section>
    </Card.Footer>
  );
}
