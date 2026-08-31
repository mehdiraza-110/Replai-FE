import { Button, Card } from "@heroui/react";
import { Copy, Pause, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { StatusPill } from "../components/ui/StatusPill";
import { aiAgentService } from "../services/api";

export function AIAgents() {
  const agents = aiAgentService.list();

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div className="flex justify-end">
        <Link to="/agents/new">
          <Button><Plus className="size-4" />Create Agent</Button>
        </Link>
      </div>
      <Card className="apple-shadow border border-border/70 bg-surface">
        <Card.Header>
          <Card.Title>AI agent control center</Card.Title>
          <Card.Description>Activation state, assigned inbox, automation, and model settings.</Card.Description>
        </Card.Header>
        <Card.Content className="overflow-x-auto p-0">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-y border-border/70 text-xs text-muted">
              <tr>
                {["Agent Name", "Purpose", "Model", "Status", "Inbox", "Auto Reply", "Last Updated", "Actions"].map((header) => (
                  <th className="px-4 py-3 font-medium" key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr className="border-b border-border/60 last:border-0" key={agent.name}>
                  <td className="px-4 py-4 font-semibold text-foreground">{agent.name}</td>
                  <td className="px-4 py-4 text-foreground">{agent.purpose}</td>
                  <td className="px-4 py-4 text-muted">{agent.model}</td>
                  <td className="px-4 py-4"><StatusPill tone={agent.status === "Active" ? "success" : "warning"}>{agent.status}</StatusPill></td>
                  <td className="px-4 py-4 text-muted">{agent.inbox}</td>
                  <td className="px-4 py-4"><StatusPill tone={agent.autoReply ? "accent" : "default"}>{agent.autoReply ? "Enabled" : "Disabled"}</StatusPill></td>
                  <td className="px-4 py-4 text-muted">{agent.updated}</td>
                  <td className="px-4 py-4">
                    <div className="flex gap-1">
                      <Button size="sm" variant="secondary">Open</Button>
                      <Button size="sm" variant="secondary" aria-label="Duplicate"><Copy className="size-4" /></Button>
                      <Button size="sm" variant="secondary" aria-label="Pause"><Pause className="size-4" /></Button>
                      <Button size="sm" variant="danger" aria-label="Delete"><Trash2 className="size-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card.Content>
      </Card>

    </div>
  );
}
