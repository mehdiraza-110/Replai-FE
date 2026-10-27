import {
  BellRing,
  Bot,
  CalendarCheck,
  CalendarClock,
  Database,
  GitBranch,
  Inbox,
  Megaphone,
  MousePointerClick,
  Send,
  Zap,
} from "lucide-react";
import type { ComponentType } from "react";
import type { GraphNode, NodeType, WorkflowMeta, WorkflowNodeData } from "../../services/workflowApi";

export type NodeGroup = "Triggers" | "Actions" | "Meetings" | "Logic";

/** Singular name shown on a node card. */
export const GROUP_KIND: Record<NodeGroup, string> = { Triggers: "Trigger", Actions: "Action", Meetings: "Meeting", Logic: "Condition" };

export interface HandleDef {
  id: string;
  label: string;
  tone: "success" | "danger" | "warning";
}

/** Nodes with several named outputs; every edge leaving them must use one of these handles. */
export const NODE_HANDLES: Partial<Record<NodeType, HandleDef[]>> = {
  "condition.keyword": [{ id: "yes", label: "yes", tone: "success" }, { id: "no", label: "no", tone: "danger" }],
  "condition.slot_selected": [{ id: "yes", label: "yes", tone: "success" }, { id: "no", label: "no", tone: "danger" }],
  "action.book_meeting": [{ id: "booked", label: "booked", tone: "success" }, { id: "unavailable", label: "unavailable", tone: "warning" }],
};

export const MEETING_NODE_TYPES: NodeType[] = ["action.offer_times", "condition.slot_selected", "action.book_meeting"];

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
    description: "Optional: the message and lead profile are always saved, even without this step.",
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
    type: "action.notify_email",
    label: "Notify by email",
    description: "Email your team about this reply. Best effort, never blocks the flow.",
    group: "Actions",
    icon: BellRing,
    tone: "bg-warning/12 text-warning",
    defaults: () => ({ to: [], notifyOwners: true, includeReply: true, subject: "New reply from {{lead_email}}", message: "{{lead_name}} ({{lead_email}}) replied to {{campaign}}.\n\nOpen SendVybe to review: {{review_link}}" }),
  },
  {
    type: "action.offer_times",
    label: "Offer times",
    description: "Pick free times on the agent's calendar for the AI step to offer.",
    group: "Meetings",
    icon: CalendarClock,
    tone: "bg-accent/12 text-accent",
    defaults: () => ({ count: 3 }),
  },
  {
    type: "condition.slot_selected",
    label: "Slot selected",
    description: "Yes when the prospect's reply picks one of the offered times.",
    group: "Meetings",
    icon: MousePointerClick,
    tone: "bg-default-200 text-foreground",
    defaults: () => ({}),
  },
  {
    type: "action.book_meeting",
    label: "Book meeting",
    description: "Book the chosen time on the calendar with a Meet link.",
    group: "Meetings",
    icon: CalendarCheck,
    tone: "bg-success/12 text-success",
    defaults: () => ({}),
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
      if (ids.length === 1) return (meta?.plusvibeCampaigns ?? []).find((c) => c.id === ids[0])?.name ?? "1 campaign";
      return `${ids.length} campaigns`;
    }
    case "action.save_to_db":
      return "Message and lead profile";
    case "action.ai_agent": {
      const agent = d.agentId === "campaign"
        ? "Campaign's agent"
        : meta?.agents.find((a) => a.id === d.agentId)?.name;
      if (!agent) return "Choose an agent";
      if (d.mode === "agent_default") return `${agent} · follows agent settings`;
      return `${agent} · ${d.mode === "auto_send" ? "auto-send" : "review first"}`;
    }
    case "action.send_reply":
      if (d.via === "plusvibe") return "Via PlusVibe";
      return meta?.mailboxes.find((m) => m.id === d.mailboxId)?.email ?? "Choose a mailbox";
    case "action.offer_times":
    case "action.book_meeting": {
      const agent = d.agentId === "campaign" ? "Campaign's agent" : meta?.agents.find((a) => a.id === d.agentId)?.name;
      if (!agent) return "Choose an agent";
      const noCalendar = typeof d.agentId === "number" && meta?.calendarAgentIds && !meta.calendarAgentIds.includes(d.agentId);
      if (noCalendar) return `${agent} · no calendar connected`;
      return node.type === "action.offer_times" ? `${agent} · ${d.count ?? 3} times` : `${agent} calendar`;
    }
    case "condition.slot_selected":
      return "Did they pick an offered time?";
    case "action.notify_email": {
      const n = (d.to ?? []).length;
      const parts = [n ? `${n} recipient${n === 1 ? "" : "s"}` : "", d.notifyOwners ? "owners and admins" : ""].filter(Boolean);
      return parts.length ? parts.join(" + ") : "Add recipients";
    }
    case "condition.keyword": {
      const words = d.keywords ?? [];
      const on = d.matchOn === "subject" ? "subject" : "reply";
      return words.length ? `${on} contains ${words.slice(0, 3).join(", ")}${words.length > 3 ? "..." : ""}` : "Add keywords";
    }
  }
}
