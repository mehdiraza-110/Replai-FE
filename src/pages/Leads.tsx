import { Card } from "@heroui/react";
import { StatusPill } from "../components/ui/StatusPill";
import { leadService } from "../services/api";

export function Leads() {
  const leads = leadService.list();

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total Leads", "1,284"],
          ["High Interest", "214"],
          ["Meeting Stage", "47"],
          ["Human Managed", "18"],
        ].map(([label, value]) => (
          <Card className="border border-border/70 bg-surface" key={label}>
            <Card.Content className="p-4">
              <p className="text-xs font-medium text-muted">{label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-normal text-foreground">{value}</p>
            </Card.Content>
          </Card>
        ))}
      </div>

      <Card className="apple-shadow border border-border/70 bg-surface">
        <Card.Header>
          <Card.Title>Leads</Card.Title>
          <Card.Description>Prospects enriched by PlusVibe data and AI-derived sales context.</Card.Description>
        </Card.Header>
        <Card.Content className="overflow-x-auto p-0">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-y border-border/70 text-xs text-muted">
              <tr>
                {["Lead", "Company", "Campaign", "Intent", "Sentiment", "Stage", "Owner", "Updated"].map((header) => (
                  <th className="px-4 py-3 font-medium" key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr className="border-b border-border/60 last:border-0" key={lead.email}>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-foreground">{lead.name}</p>
                    <p className="text-xs text-muted">{lead.email}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-medium text-foreground">{lead.company}</p>
                    <p className="text-xs text-muted">{lead.role}</p>
                  </td>
                  <td className="px-4 py-4 text-muted">{lead.campaign}</td>
                  <td className="px-4 py-4"><StatusPill tone={lead.intent === "Meeting Request" ? "success" : lead.intent === "Objection" ? "warning" : "accent"}>{lead.intent}</StatusPill></td>
                  <td className="px-4 py-4 text-muted">{lead.sentiment}</td>
                  <td className="px-4 py-4 text-muted">{lead.stage}</td>
                  <td className="px-4 py-4 text-muted">{lead.owner}</td>
                  <td className="px-4 py-4 text-muted">{lead.updated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card.Content>
      </Card>
    </div>
  );
}
