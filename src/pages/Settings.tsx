import { Button, Card } from "@heroui/react";
import { Bell, ShieldCheck, Users } from "lucide-react";
import { StatusPill } from "../components/ui/StatusPill";

export function Settings() {
  return (
    <div className="mx-auto grid max-w-[1400px] gap-5 lg:grid-cols-[260px_1fr]">
      <Card className="h-fit border border-border/70 bg-surface p-2">
        {["Workspace", "Users", "Roles", "Notifications", "Security", "AI Defaults", "Audit Logs"].map((item, index) => (
          <button className={(index === 0 ? "bg-surface-secondary text-foreground" : "text-muted hover:bg-surface-secondary/70 hover:text-foreground") + " flex h-10 w-full items-center rounded-xl px-3 text-left text-sm font-medium transition"} key={item}>
            {item}
          </button>
        ))}
      </Card>

      <div className="space-y-5">
        <Card className="apple-shadow border border-border/70 bg-surface">
          <Card.Header>
            <Card.Title>Workspace</Card.Title>
            <Card.Description>Organization settings for ReplyOS.</Card.Description>
          </Card.Header>
          <Card.Content className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium text-foreground">
              Workspace Name
              <input className="h-10 rounded-xl border border-border bg-surface-secondary px-3 text-sm outline-none focus:border-accent" defaultValue="PLWH Sales" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-foreground">
              Plan
              <input className="h-10 rounded-xl border border-border bg-surface-secondary px-3 text-sm outline-none focus:border-accent" defaultValue="Enterprise" />
            </label>
          </Card.Content>
          <Card.Footer className="justify-end">
            <Button>Save workspace</Button>
          </Card.Footer>
        </Card>

        <div className="grid gap-5 md:grid-cols-3">
          {[
            [Users, "Roles", "Owner, Admin, Manager, Agent/User, Viewer", "Configured"],
            [Bell, "Notifications", "Review required, AI failure, webhook failure", "In-app + Email"],
            [ShieldCheck, "Security", "Masked credentials and backend-only secrets", "Protected"],
          ].map(([Icon, title, body, state]) => (
            <Card className="border border-border/70 bg-surface" key={String(title)}>
              <Card.Header>
                <Icon className="size-5 text-accent" />
                <Card.Title className="text-base">{title as string}</Card.Title>
                <Card.Description>{body as string}</Card.Description>
              </Card.Header>
              <Card.Footer>
                <StatusPill tone="success">{state as string}</StatusPill>
              </Card.Footer>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
