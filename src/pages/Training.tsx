import { Button, Card } from "@heroui/react";
import { Plus } from "lucide-react";
import { StatusPill } from "../components/ui/StatusPill";
import { trainingService } from "../services/api";

export function Training() {
  const examples = trainingService.list();

  return (
    <div className="mx-auto grid max-w-[1400px] gap-5 lg:grid-cols-[1fr_340px]">
      <Card className="apple-shadow border border-border/70 bg-surface">
        <Card.Header className="flex-row items-center justify-between gap-4">
          <div>
            <Card.Title>Training Examples</Card.Title>
            <Card.Description>Historical conversations that shape reply behavior and retrieval.</Card.Description>
          </div>
          <Button size="sm"><Plus className="size-4" />Add Example</Button>
        </Card.Header>
        <Card.Content className="space-y-3">
          {examples.map((example) => (
            <article className="rounded-2xl bg-surface-secondary p-4" key={example.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{example.intent}</p>
                  <p className="text-xs text-muted">Updated {example.updated}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusPill tone={example.quality === "High" ? "success" : "default"}>{example.quality} Quality</StatusPill>
                  <StatusPill tone={example.included ? "accent" : "default"}>{example.included ? "Included" : "Excluded"}</StatusPill>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl bg-surface p-3">
                  <p className="text-xs font-medium text-muted">Prospect</p>
                  <p className="mt-1 text-sm leading-6 text-foreground">{example.prospectMessage}</p>
                </div>
                <div className="rounded-xl bg-surface p-3">
                  <p className="text-xs font-medium text-muted">Human response</p>
                  <p className="mt-1 text-sm leading-6 text-foreground">{example.humanResponse}</p>
                </div>
              </div>
            </article>
          ))}
        </Card.Content>
      </Card>

      <Card className="h-fit border border-border/70 bg-surface">
        <Card.Header>
          <Card.Title>Dataset</Card.Title>
          <Card.Description>Current training coverage for the active workspace.</Card.Description>
        </Card.Header>
        <Card.Content className="space-y-3">
          {[
            ["Total examples", "428"],
            ["High quality", "312"],
            ["Meeting booked", "91"],
            ["Objection handling", "126"],
            ["Pricing", "64"],
            ["Qualification", "83"],
          ].map(([label, value]) => (
            <div className="flex items-center justify-between rounded-2xl bg-surface-secondary p-3 text-sm" key={label}>
              <span className="text-muted">{label}</span>
              <span className="font-semibold text-foreground">{value}</span>
            </div>
          ))}
        </Card.Content>
      </Card>
    </div>
  );
}
