import { Card } from "@heroui/react";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { SYSTEMS, isSystemEnabled } from "../constants/systems";
import { useEffect, useState } from "react";
import { LimitReachedAlert } from "../components/trial/LimitReachedAlert";
import { aiAgentService, domainService, mailboxService, reviewService } from "../services/api";

export function Overview() {
  const navigate = useNavigate();
  const { activeWorkspace } = useAuth();
  const enabled = SYSTEMS.filter((system) => isSystemEnabled(system.id, activeWorkspace));
  const disabled = SYSTEMS.filter((system) => !isSystemEnabled(system.id, activeWorkspace));
  const [counts, setCounts] = useState<Record<string, string>>({});
  const mailerOn = isSystemEnabled("mailer", activeWorkspace);
  const responderOn = isSystemEnabled("responder", activeWorkspace);

  useEffect(() => {
    let active = true;
    const put = (key: string, value: string) => active && setCounts((current) => ({ ...current, [key]: value }));
    setCounts({});
    if (mailerOn) {
      domainService.list({ limit: 1 }).then((page) => put("domains", String(page.total))).catch(() => undefined);
      mailboxService.list({ limit: 1 }).then((page) => put("mailboxes", String(page.total))).catch(() => undefined);
    }
    if (responderOn) {
      aiAgentService.list().then((items) => put("agents", String(items.filter((agent) => agent.status === "Active").length))).catch(() => undefined);
      reviewService.count({ cap: 100 }).then(({ count, hasMore }) => put("review", hasMore ? "100+" : String(count))).catch(() => undefined);
    }
    return () => {
      active = false;
    };
  }, [mailerOn, responderOn, activeWorkspace?.id]);

  const systemStats: Record<string, { label: string; value: string }[]> = {
    mailer: [
      { label: "Domains", value: counts.domains ?? "—" },
      { label: "Mailboxes", value: counts.mailboxes ?? "—" },
    ],
    responder: [
      { label: "Active agents", value: counts.agents ?? "—" },
      { label: "Needs review", value: counts.review ?? "—" },
    ],
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <LimitReachedAlert />
      <div>
        <h2 className="text-lg font-semibold text-foreground">{enabled.length === 1 ? `Welcome to ${enabled[0].label}` : "Choose a system"}</h2>
        <p className="mt-1 text-sm text-muted">
          {enabled.length === 0
            ? "No products are enabled for you in this workspace yet."
            : enabled.length === 1
              ? "Jump in below. Other products appear here when they are enabled for your workspace."
              : "SendVybe is split into two systems. Jump into either one, or switch anytime from the sidebar."}
        </p>
      </div>

      <div className={`grid gap-4 ${enabled.length > 1 ? "md:grid-cols-2" : "max-w-[640px]"}`}>
        {enabled.map((system) => {
          const Icon = system.icon;

          return (
            <Card
              className="apple-shadow group cursor-pointer border border-border/70 bg-surface p-5 transition hover:border-accent/50"
              key={system.id}
              onClick={() => navigate(system.homePath)}
            >
              <Card.Header className="flex-row items-start justify-between p-0">
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

      {disabled.length > 0 ? (
        <ul className="space-y-2">
          {disabled.map((system) => (
            <li className="rounded-xl border border-border/70 bg-default-100 px-4 py-3 text-[13px] text-muted" key={system.id}>
              <span className="font-medium text-foreground">{system.label}</span> is not enabled
              {activeWorkspace?.role === "member" ? " for you" : " for this workspace"}. Contact support to turn it on.
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
