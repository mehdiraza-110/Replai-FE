import { Button, Card } from "@heroui/react";
import { CheckCircle2, LockKeyhole, Plus, ShieldCheck } from "lucide-react";
import { StatusPill } from "../components/ui/StatusPill";
import { inboxManagerService } from "../services/api";

const sections = [
  "Agent Information",
  "Company Information",
  "PlusVibe Connection",
  "Objective",
  "Language",
  "Response Rules",
  "Auto Response",
  "Human Review",
  "Knowledge Base",
  "Training Examples",
  "Do Not Contact",
  "Escalation Rules",
];

export function InboxManagers() {
  const inboxes = inboxManagerService.list();

  return (
    <div className="mx-auto grid max-w-[1400px] gap-5 xl:grid-cols-[0.9fr_1.45fr]">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Connected inboxes</h2>
          <Button size="sm"><Plus className="size-4" />New</Button>
        </div>
        {inboxes.map((inbox, index) => (
          <Card
            className={[
              "border border-border/70 bg-surface p-4 transition hover:bg-surface-secondary/70",
              index === 0 ? "apple-shadow" : "",
            ].join(" ")}
            key={inbox.name}
          >
            <Card.Header className="flex-row items-start justify-between p-0">
              <div>
                <Card.Title className="text-base">{inbox.name}</Card.Title>
                <Card.Description>{inbox.workspace}</Card.Description>
              </div>
              <StatusPill tone={inbox.status === "Active" ? "success" : "warning"}>{inbox.status}</StatusPill>
            </Card.Header>
            <Card.Content className="grid grid-cols-3 gap-3 p-0 pt-4">
              <div>
                <p className="text-[11px] text-muted">AI Agent</p>
                <p className="truncate text-sm font-medium text-foreground">{inbox.agent}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted">Replies Today</p>
                <p className="text-sm font-semibold text-foreground">{inbox.repliesToday}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted">Human Review</p>
                <p className="text-sm font-semibold text-foreground">{inbox.humanReview}</p>
              </div>
            </Card.Content>
          </Card>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[240px_1fr]">
        <Card className="h-fit border border-border/70 bg-surface p-3">
          <Card.Header className="p-1">
            <Card.Title className="text-sm">Inbox Manager 01</Card.Title>
            <Card.Description>PLWH Sales</Card.Description>
          </Card.Header>
          <Card.Content className="thin-scrollbar max-h-[640px] overflow-auto p-0 pt-2">
            {sections.map((section, index) => (
              <button
                className={[
                  "flex h-9 w-full items-center rounded-xl px-3 text-left text-[13px] font-medium transition",
                  index === 0 ? "bg-surface-secondary text-foreground" : "text-muted hover:bg-surface-secondary/70 hover:text-foreground",
                ].join(" ")}
                key={section}
              >
                {section}
              </button>
            ))}
          </Card.Content>
        </Card>

        <Card className="apple-shadow border border-border/70 bg-surface">
          <Card.Header className="border-b border-border/70">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Card.Title>Agent Information</Card.Title>
                <Card.Description>Control the sales persona attached to this PlusVibe inbox.</Card.Description>
              </div>
              <StatusPill tone="success">Auto reply enabled</StatusPill>
            </div>
          </Card.Header>
          <Card.Content className="grid gap-4 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              {["Agent Name", "Agent Role"].map((label, index) => (
                <label className="grid gap-1.5 text-sm font-medium text-foreground" key={label}>
                  {label}
                  <input
                    className="h-10 rounded-xl border border-border bg-surface-secondary px-3 text-sm outline-none transition focus:border-accent"
                    defaultValue={index === 0 ? "Alex - Sales Assistant" : "Outbound Sales Representative"}
                  />
                </label>
              ))}
            </div>
            <label className="grid gap-1.5 text-sm font-medium text-foreground">
              Persona
              <textarea
                className="min-h-24 rounded-xl border border-border bg-surface-secondary px-3 py-2 text-sm outline-none transition focus:border-accent"
                defaultValue="Friendly, concise and consultative B2B sales representative."
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium text-foreground">
                Tone
                <select className="h-10 rounded-xl border border-border bg-surface-secondary px-3 text-sm outline-none focus:border-accent" defaultValue="Consultative">
                  {["Professional", "Friendly", "Casual", "Consultative", "Direct"].map((tone) => (
                    <option key={tone}>{tone}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-foreground">
                Response Style
                <select className="h-10 rounded-xl border border-border bg-surface-secondary px-3 text-sm outline-none focus:border-accent" defaultValue="Balanced">
                  {["Concise", "Balanced", "Detailed"].map((style) => (
                    <option key={style}>{style}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="rounded-2xl border border-border/70 bg-surface-secondary p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-5 text-accent" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Safety constraints</p>
                  <p className="mt-1 text-sm text-muted">Never promise discounts, guaranteed results, or product capabilities that are not present in the approved knowledge base.</p>
                </div>
              </div>
            </div>
          </Card.Content>
          <Card.Footer className="justify-between border-t border-border/70">
            <div className="flex items-center gap-2 text-sm text-muted">
              <LockKeyhole className="size-4" />
              Secrets stay in backend environment variables.
            </div>
            <Button><CheckCircle2 className="size-4" />Save changes</Button>
          </Card.Footer>
        </Card>
      </section>
    </div>
  );
}
