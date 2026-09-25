import { Card } from "@heroui/react";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SYSTEMS } from "../constants/systems";
import { mailerService } from "../services/api";

export function Overview() {
  const navigate = useNavigate();
  const domains = mailerService.listDomains();
  const mailerMailboxes = domains.reduce((sum, domain) => sum + domain.mailboxes.length, 0);

  const systemStats: Record<string, { label: string; value: string }[]> = {
    mailer: [
      { label: "Domains", value: String(domains.length) },
      { label: "Mailboxes", value: String(mailerMailboxes) },
    ],
    responder: [
      { label: "Active agents", value: "—" },
      { label: "Needs review", value: "—" },
    ],
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Choose a system</h2>
        <p className="mt-1 text-sm text-muted">ReplyOS is split into two systems — jump into either one, or switch anytime from the sidebar.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {SYSTEMS.map((system) => {
          const Icon = system.icon;

          return (
            <Card
              className="apple-shadow group cursor-pointer border border-border/70 bg-surface p-5 transition hover:border-accent/50"
              key={system.id}
              onClick={() => navigate(system.homePath)}
            >
              <Card.Header className="items-start justify-between p-0">
                <span className="grid size-11 place-items-center rounded-full bg-default-100 text-foreground">
                  <Icon className="size-5" />
                </span>
                <ArrowRight className="size-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-foreground" />
              </Card.Header>
              <Card.Content className="p-0 pt-4">
                <Card.Title className="text-base">{system.label}</Card.Title>
                <Card.Description className="mt-1">{system.description}</Card.Description>
                <div className="mt-4 flex gap-4">
                  {systemStats[system.id].map((stat) => (
                    <div key={stat.label}>
                      <p className="text-lg font-semibold leading-none text-foreground">{stat.value}</p>
                      <p className="mt-1 text-[11px] text-muted">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </Card.Content>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
