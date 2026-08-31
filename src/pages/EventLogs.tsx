import { Button, Card } from "@heroui/react";
import { RefreshCw } from "lucide-react";
import { StatusPill } from "../components/ui/StatusPill";
import { eventLogService } from "../services/api";

export function EventLogs() {
  const events = eventLogService.list();

  return (
    <div className="mx-auto max-w-[1400px]">
      <Card className="apple-shadow border border-border/70 bg-surface">
        <Card.Header className="flex-row items-center justify-between gap-4">
          <div>
            <Card.Title>Event Logs</Card.Title>
            <Card.Description>Webhook, AI processing, review, and PlusVibe delivery events.</Card.Description>
          </div>
          <Button size="sm" variant="secondary"><RefreshCw className="size-4" />Refresh</Button>
        </Card.Header>
        <Card.Content className="overflow-x-auto p-0">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="border-y border-border/70 text-xs text-muted">
              <tr>
                {["Timestamp", "Event", "Workspace", "Lead", "Conversation", "Status", "Processing Time", "Error"].map((header) => (
                  <th className="px-4 py-3 font-medium" key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr className="border-b border-border/60 last:border-0" key={`${event.timestamp}-${event.event}-${event.conversation}`}>
                  <td className="px-4 py-4 text-muted">{event.timestamp}</td>
                  <td className="px-4 py-4 font-semibold text-foreground">{event.event}</td>
                  <td className="px-4 py-4 text-muted">{event.workspace}</td>
                  <td className="px-4 py-4 text-muted">{event.lead}</td>
                  <td className="px-4 py-4 text-muted">{event.conversation}</td>
                  <td className="px-4 py-4"><StatusPill tone={event.status === "Failed" ? "danger" : event.status === "Processing" ? "warning" : "success"}>{event.status}</StatusPill></td>
                  <td className="px-4 py-4 text-muted">{event.duration}</td>
                  <td className="px-4 py-4 text-muted">{event.error ?? "None"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card.Content>
      </Card>
    </div>
  );
}
