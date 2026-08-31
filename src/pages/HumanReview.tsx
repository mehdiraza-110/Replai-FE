import { Button, Card } from "@heroui/react";
import { Check, Pause, RefreshCw, Send, UserRoundX } from "lucide-react";
import { StatusPill } from "../components/ui/StatusPill";
import { reviewService } from "../services/api";

export function HumanReview() {
  const reviews = reviewService.list();
  const active = reviews[0];

  return (
    <div className="mx-auto grid max-w-[1500px] gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
      <Card className="h-fit border border-border/70 bg-surface">
        <Card.Header>
          <Card.Title>Human Review Queue</Card.Title>
          <Card.Description>Conversations that need approval before ReplyOS sends.</Card.Description>
        </Card.Header>
        <Card.Content className="space-y-2">
          {reviews.map((review, index) => (
            <button
              className={(index === 0 ? "bg-surface-secondary" : "hover:bg-surface-secondary/70") + " w-full rounded-2xl p-4 text-left transition"}
              key={review.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{review.lead}</p>
                  <p className="text-xs text-muted">{review.company} · {review.age}</p>
                </div>
                <StatusPill tone={review.status === "Needs Review" ? "warning" : "default"}>{review.status}</StatusPill>
              </div>
              <p className="mt-3 line-clamp-2 text-sm leading-5 text-foreground">{review.trigger}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-muted">
                <span>{review.agent}</span>
                <span>{review.confidence}% confidence</span>
              </div>
            </button>
          ))}
        </Card.Content>
      </Card>

      <div className="space-y-5">
        <Card className="apple-shadow border border-border/70 bg-surface">
          <Card.Header className="flex-row items-start justify-between gap-4">
            <div>
              <Card.Title>{active.lead}</Card.Title>
              <Card.Description>{active.company} · {active.agent}</Card.Description>
            </div>
            <StatusPill tone="warning">{active.trigger}</StatusPill>
          </Card.Header>
          <Card.Content className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Review status", active.status],
                ["Confidence", `${active.confidence}%`],
                ["Waiting", active.age],
              ].map(([label, value]) => (
                <div className="rounded-2xl bg-surface-secondary p-4" key={label}>
                  <p className="text-xs text-muted">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
                </div>
              ))}
            </div>
            <label className="grid gap-2 text-sm font-semibold text-foreground">
              AI draft
              <textarea
                className="min-h-[180px] resize-y rounded-2xl border border-border bg-surface-secondary p-4 text-sm font-normal leading-6 text-foreground outline-none focus:border-accent"
                defaultValue={active.draft}
              />
            </label>
          </Card.Content>
          <Card.Footer className="flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="secondary"><RefreshCw className="size-4" />Regenerate</Button>
            <Button size="sm" variant="secondary"><UserRoundX className="size-4" />Reject</Button>
            <Button size="sm" variant="secondary"><Pause className="size-4" />Take over</Button>
            <Button size="sm" variant="secondary"><Check className="size-4" />Approve</Button>
            <Button size="sm"><Send className="size-4" />Approve & Send</Button>
          </Card.Footer>
        </Card>
      </div>
    </div>
  );
}
