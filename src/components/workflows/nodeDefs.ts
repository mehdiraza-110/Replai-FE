import {
  Bot,
  Database,
  GitBranch,
  Inbox,
  Megaphone,
  Send,
  Zap,
} from "lucide-react";
import type { ComponentType } from "react";
import type { GraphNode, NodeType, WorkflowMeta, WorkflowNodeData } from "../../services/workflowApi";

export type NodeGroup = "Triggers" | "Actions" | "Logic";

export interface NodeDef {
  type: NodeType;
  label: string;
  description: string;
  group: NodeGroup;
  icon: ComponentType<{ className?: string }>;
  /** Tailwind classes for the icon badge. */
  tone: string;
  defaults: () => WorkflowNodeData;
}

export const NODE_DEFS: NodeDef[] = [
  {
    type: "trigger.inbox_mail",
    label: "Mail received",
    description: "A reply lands in one of your mailboxes.",
    group: "Triggers",
    icon: Inbox,
    tone: "bg-accent/12 text-accent",
    defaults: () => ({ mailboxIds: "all" }),
  },
  {
    type: "trigger.plusvibe_reply",
    label: "PlusVibe reply",
    description: "PlusVibe reports a reply to a campaign.",
    group: "Triggers",
    icon: Megaphone,
    tone: "bg-accent/12 text-accent",
    defaults: () => ({ campaignIds: "all" }),
  },
  {
    type: "trigger.mail_sent",
    label: "Mail sent",
    description: "An email was sent by the cold mailer.",
    group: "Triggers",
    icon: Zap,
    tone: "bg-accent/12 text-accent",
    defaults: () => ({ mailboxIds: "all" }),
  },
  {
    type: "action.save_to_db",
    label: "Save to database",
    description: "Store the message and the lead profile.",
    group: "Actions",
    icon: Database,
    tone: "bg-success/12 text-success",
    defaults: () => ({}),
  },
  {
    type: "action.ai_agent",
    label: "AI agent",
    description: "Draft a reply with one of your agents.",
    group: "Actions",
    icon: Bot,
    tone: "bg-warning/12 text-warning",
    defaults: () => ({ mode: "review" }),
  },
  {
    type: "action.send_reply",
    label: "Send reply",
    description: "Send via PlusVibe or one of your mailboxes.",
    group: "Actions",
    icon: Send,
    tone: "bg-success/12 text-success",
    defaults: () => ({ via: "mailbox" }),
  },
  {
    type: "condition.keyword",
    label: "Keyword condition",
    description: "Branch yes or no on matching keywords.",
    group: "Logic",
    icon: GitBranch,
    tone: "bg-default-200 text-foreground",
    defaults: () => ({ keywords: [], matchOn: "reply" }),
  },
];

export const NODE_DEF_BY_TYPE = Object.fromEntries(NODE_DEFS.map((def) => [def.type, def])) as Record<NodeType, NodeDef>;

export const isTrigger = (type: string) => type.startsWith("trigger.");

export function summarize(node: Pick<GraphNode, "type" | "data">, meta: WorkflowMeta | null): string {
  const d = node.data;
  switch (node.type) {
    case "trigger.inbox_mail":
    case "trigger.mail_sent": {
      const ids = d.mailboxIds;
      if (ids === "all" || ids === undefined) return "All mailboxes";
      if (ids.length === 0) return "No mailbox selected";
      if (ids.length === 1) return meta?.mailboxes.find((m) => m.id === ids[0])?.email ?? "1 mailbox";
      return `${ids.length} mailboxes`;
    }
    case "trigger.plusvibe_reply": {
      const ids = d.campaignIds;
      if (ids === "all" || ids === undefined) return "All campaigns";
      if (ids.length === 0) return "No campaign selected";
      if (ids.length === 1) return meta?.plusvibeCampaigns.find((c) => c.id === ids[0])?.name ?? "1 campaign";
      return `${ids.length} campaigns`;
    }
    case "action.save_to_db":
      return "Message and lead profile";
    case "action.ai_agent": {
      const agent = meta?.agents.find((a) => a.id === d.agentId)?.name;
      const mode = d.mode === "auto_send" ? "auto-send" : "review first";
      return agent ? `${agent}, ${mode}` : "Choose an agent";
    }
    case "action.send_reply":
      if (d.via === "plusvibe") return "Via PlusVibe";
      return meta?.mailboxes.find((m) => m.id === d.mailboxId)?.email ?? "Choose a mailbox";
    case "condition.keyword": {
      const words = d.keywords ?? [];
      const on = d.matchOn === "subject" ? "subject" : "reply";
      return words.length ? `${on} contains ${words.slice(0, 3).join(", ")}${words.length > 3 ? "..." : ""}` : "Add keywords";
    }
  }
}
