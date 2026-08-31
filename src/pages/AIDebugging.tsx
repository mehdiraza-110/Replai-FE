import { Card } from "@heroui/react";
import { StatusPill } from "../components/ui/StatusPill";
import { aiDebugService } from "../services/api";

export function AIDebugging() {
  const run = aiDebugService.getLatestRun();

  return (
    <div className="mx-auto grid max-w-[1400px] gap-5 xl:grid-cols-[340px_1fr]">
      <Card className="h-fit border border-border/70 bg-surface">
        <Card.Header>
          <Card.Title>Latest AI Run</Card.Title>
          <Card.Description>Structured admin trace for the selected conversation.</Card.Description>
        </Card.Header>
        <Card.Content className="space-y-3">
          {[
            ["Conversation", run.conversation],
            ["Lead", run.lead],
            ["Agent", run.agent],
            ["Model", run.model],
            ["Confidence", `${run.confidence}%`],
          ].map(([label, value]) => (
            <div className="rounded-2xl bg-surface-secondary p-3" key={label}>
              <p className="text-xs text-muted">{label}</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
            </div>
          ))}
          <StatusPill tone={run.automationDecision === "Human Review" ? "warning" : "success"}>{run.automationDecision}</StatusPill>
        </Card.Content>
      </Card>

      <Card className="apple-shadow border border-border/70 bg-surface">
        <Card.Header>
          <Card.Title>Decision Trace</Card.Title>
          <Card.Description>Inputs, classifications, strategy, and deterministic safety result.</Card.Description>
        </Card.Header>
        <Card.Content className="grid gap-3 md:grid-cols-2">
          {run.sections.map((section) => (
            <article className="rounded-2xl bg-surface-secondary p-4" key={section.title}>
              <p className="text-sm font-semibold text-foreground">{section.title}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{section.value}</p>
            </article>
          ))}
        </Card.Content>
      </Card>
    </div>
  );
}
