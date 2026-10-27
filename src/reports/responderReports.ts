import { Activity, Bot, ClipboardCheck, HeartHandshake, MessageSquareText, PieChart, Route } from "lucide-react";
import { analyticsService, forwardedLeadService, leadService, messageService, reviewService } from "../services/api";
import type {
  AnalyticsAgentPerformance,
  ForwardedLeadRecord,
  HumanReviewItem,
  Lead,
  MessageConversationSummary,
} from "../types";
import { average, distinctOptions, fetchAllPages, formatDateTime, formatDay, kpi, round, sum, timeValue } from "./helpers";
import type { AnyReport, ReportDef, ReportTone } from "./types";

const PAGE = 100;
const MAX_CONVERSATION_PAGES = 40;

async function loadOverview(range: { start: string; end: string } | null) {
  return analyticsService.getOverview(range ? { startDate: range.start, endDate: range.end } : { preset: "last_30_days" });
}

function readPercent(text: string) {
  const parsed = Number.parseFloat(text);
  return Number.isNaN(parsed) ? null : parsed;
}

interface ActivityRow {
  period: string;
  incoming: number;
  sent: number;
  review: number;
}

const activityReport: ReportDef<ActivityRow> = {
  id: "activity",
  label: "Reply activity",
  description: "Replies received, answered by AI and routed to review.",
  icon: Activity,
  serverRange: true,
  load: async (range) => {
    const overview = await loadOverview(range);
    return overview.weeklyLoop.map((item) => ({
      period: item.date ? formatDay(item.date) : item.day,
      incoming: item.incoming,
      sent: item.sent,
      review: item.review,
    }));
  },
  search: (row) => row.period,
  searchPlaceholder: "Search by day",
  filters: [
    {
      key: "incoming",
      label: "Replies",
      allLabel: "All periods",
      options: [
        { value: "with", label: "With replies" },
        { value: "none", label: "No replies" },
      ],
      test: (row, value) => (value === "with" ? row.incoming > 0 : row.incoming === 0),
    },
    {
      key: "review",
      label: "Review",
      allLabel: "Any review volume",
      options: [
        { value: "some", label: "Needed review" },
        { value: "none", label: "No review needed" },
      ],
      test: (row, value) => (value === "some" ? row.review > 0 : row.review === 0),
    },
  ],
  columns: [
    { key: "period", label: "Period", value: (row) => row.period },
    { key: "incoming", label: "Replies received", align: "right", value: (row) => row.incoming },
    { key: "sent", label: "Sent by AI", align: "right", value: (row) => row.sent },
    { key: "review", label: "Sent to review", align: "right", value: (row) => row.review },
    { key: "autoRate", label: "Auto-sent (%)", align: "right", value: (row) => (row.incoming ? round((row.sent / row.incoming) * 100, 1) : null) },
  ],
  kpis: (rows) => {
    const incoming = sum(rows.map((row) => row.incoming));
    const sent = sum(rows.map((row) => row.sent));
    return [
      kpi("Replies received", incoming),
      kpi("Sent by AI", sent),
      kpi("Sent to review", sum(rows.map((row) => row.review))),
      kpi("Auto-sent share", incoming ? `${round((sent / incoming) * 100, 1)}%` : "N/A"),
    ];
  },
};

const agentReport: ReportDef<AnalyticsAgentPerformance> = {
  id: "agents",
  label: "Agent performance",
  description: "How each AI agent handled replies, confidence and meetings.",
  icon: Bot,
  serverRange: true,
  load: async (range) => (await loadOverview(range)).agentPerformance,
  search: (row) => `${row.agent} ${row.inbox}`,
  searchPlaceholder: "Search agents or inboxes",
  defaultSort: { key: "replies", dir: "desc" },
  filters: [
    {
      key: "agent",
      label: "Agent",
      allLabel: "All agents",
      options: (rows) => distinctOptions(rows, (row) => row.agent),
      test: (row, value) => row.agent === value,
    },
    {
      key: "inbox",
      label: "Inbox",
      allLabel: "All inboxes",
      options: (rows) => distinctOptions(rows, (row) => row.inbox),
      test: (row, value) => row.inbox === value,
    },
    {
      key: "meetings",
      label: "Meetings",
      allLabel: "Any meeting count",
      options: [
        { value: "booked", label: "Booked meetings" },
        { value: "none", label: "No meetings" },
      ],
      test: (row, value) => (value === "booked" ? row.meetings > 0 : row.meetings === 0),
    },
  ],
  columns: [
    { key: "agent", label: "Agent", value: (row) => row.agent },
    { key: "inbox", label: "Inbox", value: (row) => row.inbox },
    { key: "replies", label: "Replies handled", align: "right", value: (row) => row.replies },
    { key: "autoSent", label: "Auto-sent", align: "right", value: (row) => row.autoSent },
    { key: "confidence", label: "Avg confidence", align: "right", value: (row) => row.confidence },
    { key: "meetings", label: "Meetings booked", align: "right", value: (row) => row.meetings },
    { key: "review", label: "Review rate", align: "right", value: (row) => row.review },
  ],
  breakdown: { label: "Agents by inbox", get: (row) => row.inbox },
  kpis: (rows) => {
    const confidences = rows.map((row) => readPercent(row.confidence)).filter((value): value is number => value !== null);
    return [
      kpi("Agents", rows.length),
      kpi("Replies handled", sum(rows.map((row) => row.replies))),
      kpi("Meetings booked", sum(rows.map((row) => row.meetings))),
      kpi("Avg confidence", confidences.length ? `${average(confidences)}%` : "N/A"),
    ];
  },
};

interface MixRow {
  group: "Intent" | "Review trigger";
  label: string;
  count: number;
  share: number;
}

const mixReport: ReportDef<MixRow> = {
  id: "mix",
  label: "Intent & review triggers",
  description: "What prospects want and why replies were sent to review.",
  icon: PieChart,
  serverRange: true,
  load: async (range) => {
    const overview = await loadOverview(range);
    return [
      ...overview.intentMix.map((item): MixRow => ({ group: "Intent", label: item.label, count: item.count, share: item.value })),
      ...overview.reviewTriggers.map((item): MixRow => ({ group: "Review trigger", label: item.label, count: item.count, share: item.value })),
    ];
  },
  search: (row) => row.label,
  searchPlaceholder: "Search intents or triggers",
  defaultSort: { key: "count", dir: "desc" },
  filters: [
    {
      key: "group",
      label: "Type",
      allLabel: "Intents and triggers",
      options: [
        { value: "Intent", label: "Intent mix" },
        { value: "Review trigger", label: "Review triggers" },
      ],
      test: (row, value) => row.group === value,
    },
  ],
  columns: [
    { key: "group", label: "Type", value: (row) => row.group },
    { key: "label", label: "Name", value: (row) => row.label },
    { key: "count", label: "Replies", align: "right", value: (row) => row.count },
    { key: "share", label: "Share (%)", align: "right", value: (row) => round(row.share, 1) },
  ],
  breakdown: { label: "Rows by type", get: (row) => row.group },
  kpis: (rows) => {
    const intents = rows.filter((row) => row.group === "Intent");
    const triggers = rows.filter((row) => row.group === "Review trigger");
    const top = [...intents].sort((a, b) => b.count - a.count)[0];
    return [
      kpi("Intent categories", intents.length),
      kpi("Top intent", top ? top.label : "—", { hint: top ? `${top.count.toLocaleString()} replies` : undefined }),
      kpi("Review trigger types", triggers.length),
      kpi("Replies in review", sum(triggers.map((row) => row.count))),
    ];
  },
};

const reviewTone = (status: HumanReviewItem["status"]): ReportTone | undefined =>
  status === "Approved" || status === "Sent" ? "success" : status === "Rejected" ? "danger" : "warning";

const reviewReport: ReportDef<HumanReviewItem> = {
  id: "review",
  label: "Human review log",
  description: "Every AI draft that went to review and what happened to it.",
  icon: ClipboardCheck,
  load: () => fetchAllPages((page) => reviewService.list({ page, limit: PAGE })),
  dateFields: [
    { key: "created", label: "Drafted", get: (row) => row.createdAt },
    { key: "updated", label: "Last updated", get: (row) => row.updatedAt },
  ],
  search: (row) => `${row.leadName} ${row.leadEmail ?? ""} ${row.company} ${row.subject ?? ""} ${row.campaignName}`,
  searchPlaceholder: "Search leads, companies or subjects",
  defaultSort: { key: "created", dir: "desc" },
  filters: [
    {
      key: "agent",
      label: "Agent",
      allLabel: "All agents",
      options: (rows) => distinctOptions(rows, (row) => row.agentName),
      test: (row, value) => row.agentName === value,
    },
    {
      key: "status",
      label: "Status",
      allLabel: "All statuses",
      options: ["Pending", "Approved", "Rejected", "Sent"].map((value) => ({ value, label: value })),
      test: (row, value) => row.status === value,
    },
    {
      key: "campaign",
      label: "Campaign",
      allLabel: "All campaigns",
      options: (rows) => distinctOptions(rows, (row) => row.campaignName),
      test: (row, value) => row.campaignName === value,
    },
    {
      key: "confidence",
      label: "Confidence",
      allLabel: "Any confidence",
      options: [
        { value: "high", label: "High (80%+)" },
        { value: "medium", label: "Medium (50–79%)" },
        { value: "low", label: "Low (under 50%)" },
      ],
      test: (row, value) => (value === "high" ? row.confidence >= 80 : value === "medium" ? row.confidence >= 50 && row.confidence < 80 : row.confidence < 50),
    },
    {
      key: "generation",
      label: "Generation",
      allLabel: "All drafts",
      options: [
        { value: "failed", label: "Failed to generate" },
        { value: "ok", label: "Generated cleanly" },
      ],
      test: (row, value) => (value === "failed" ? Boolean(row.generationError) : !row.generationError),
    },
  ],
  columns: [
    { key: "created", label: "Drafted", sortValue: (row) => timeValue(row.createdAt), value: (row) => formatDateTime(row.createdAt) },
    { key: "lead", label: "Lead", value: (row) => row.leadName },
    { key: "email", label: "Email", value: (row) => row.leadEmail ?? "" },
    { key: "company", label: "Company", value: (row) => row.company },
    { key: "campaign", label: "Campaign", value: (row) => row.campaignName },
    { key: "agent", label: "Agent", value: (row) => row.agentName },
    { key: "status", label: "Status", value: (row) => row.status, tone: (row) => reviewTone(row.status) },
    { key: "confidence", label: "Confidence (%)", align: "right", value: (row) => row.confidence },
    { key: "subject", label: "Subject", value: (row) => row.subject ?? "" },
    { key: "error", label: "Generation error", value: (row) => row.generationError ?? "" },
    { key: "updated", label: "Last updated", sortValue: (row) => timeValue(row.updatedAt), value: (row) => formatDateTime(row.updatedAt) },
  ],
  breakdown: { label: "Drafts by status", get: (row) => row.status },
  kpis: (rows) => {
    const decided = rows.filter((row) => row.status !== "Pending");
    const approved = rows.filter((row) => row.status === "Approved" || row.status === "Sent").length;
    return [
      kpi("Drafts reviewed", rows.length),
      kpi("Still pending", rows.filter((row) => row.status === "Pending").length, { tone: rows.some((row) => row.status === "Pending") ? "warning" : undefined }),
      kpi("Approval rate", decided.length ? `${round((approved / decided.length) * 100, 1)}%` : "N/A"),
      kpi("Avg confidence", rows.length ? `${average(rows.map((row) => row.confidence))}%` : "N/A"),
    ];
  },
};

async function loadConversations() {
  const items: MessageConversationSummary[] = [];
  let pageTrail = "";
  for (let page = 0; page < MAX_CONVERSATION_PAGES; page += 1) {
    const result = await messageService.listConversations({ limit: 50, pageTrail });
    items.push(...result.items);
    pageTrail = result.nextPageTrail || "";
    if (!result.hasMore || !pageTrail) break;
  }
  return items;
}

const conversationReport: ReportDef<MessageConversationSummary> = {
  id: "conversations",
  label: "Conversations",
  description: "Reply threads with labels, assigned agent and draft status.",
  icon: MessageSquareText,
  load: loadConversations,
  dateFields: [{ key: "latest", label: "Latest message", get: (row) => row.latestAt }],
  search: (row) => `${row.lead} ${row.leadEmail ?? ""} ${row.subject ?? ""} ${row.campaignName}`,
  searchPlaceholder: "Search leads, emails or subjects",
  defaultSort: { key: "latest", dir: "desc" },
  filters: [
    {
      key: "agent",
      label: "Agent",
      allLabel: "All agents",
      options: (rows) => [{ value: "__none", label: "No agent assigned" }, ...distinctOptions(rows, (row) => row.assignedAgent?.name)],
      test: (row, value) => (value === "__none" ? !row.assignedAgent : row.assignedAgent?.name === value),
    },
    {
      key: "label",
      label: "Label",
      allLabel: "All labels",
      options: (rows) => distinctOptions(rows, (row) => row.label),
      test: (row, value) => row.label === value,
    },
    {
      key: "campaign",
      label: "Campaign",
      allLabel: "All campaigns",
      options: (rows) => distinctOptions(rows, (row) => row.campaignName),
      test: (row, value) => row.campaignName === value,
    },
    {
      key: "read",
      label: "Read state",
      allLabel: "Read and unread",
      options: [
        { value: "unread", label: "Unread" },
        { value: "read", label: "Read" },
      ],
      test: (row, value) => (value === "unread" ? row.isUnread : !row.isUnread),
    },
    {
      key: "draft",
      label: "AI draft",
      allLabel: "With or without draft",
      options: [
        { value: "yes", label: "Has a draft" },
        { value: "no", label: "No draft" },
      ],
      test: (row, value) => (value === "yes" ? row.hasDraft : !row.hasDraft),
    },
  ],
  columns: [
    { key: "latest", label: "Latest message", sortValue: (row) => timeValue(row.latestAt), value: (row) => formatDateTime(row.latestAt) },
    { key: "lead", label: "Lead", value: (row) => row.lead },
    { key: "email", label: "Email", value: (row) => row.leadEmail ?? "" },
    { key: "campaign", label: "Campaign", value: (row) => row.campaignName },
    { key: "agent", label: "Agent", value: (row) => row.assignedAgent?.name ?? "Unassigned" },
    { key: "label", label: "Label", value: (row) => row.label },
    { key: "unread", label: "Unread", value: (row) => (row.isUnread ? "Yes" : "No"), tone: (row) => (row.isUnread ? "warning" : undefined) },
    { key: "draft", label: "AI draft", value: (row) => (row.hasDraft ? "Yes" : "No") },
    { key: "subject", label: "Subject", value: (row) => row.subject ?? "" },
  ],
  breakdown: { label: "Conversations by label", get: (row) => row.label || "No label" },
  kpis: (rows) => [
    kpi("Conversations", rows.length),
    kpi("Unread", rows.filter((row) => row.isUnread).length, { tone: rows.some((row) => row.isUnread) ? "warning" : undefined }),
    kpi("With AI draft", rows.filter((row) => row.hasDraft).length),
    kpi("No agent assigned", rows.filter((row) => !row.assignedAgent).length),
  ],
};

const leadReport: ReportDef<Lead> = {
  id: "leads",
  label: "Lead sentiment",
  description: "Leads by sentiment, intent, stage and who owns them.",
  icon: HeartHandshake,
  load: async () => (await leadService.list()).items,
  dateFields: [{ key: "updated", label: "Last updated", get: (row) => row.updatedAt ?? null }],
  search: (row) => `${row.name} ${row.email} ${row.company} ${row.campaign}`,
  searchPlaceholder: "Search leads, emails or companies",
  defaultSort: { key: "updated", dir: "desc" },
  filters: [
    {
      key: "sentiment",
      label: "Sentiment",
      allLabel: "All sentiments",
      options: (rows) => distinctOptions(rows, (row) => row.sentiment),
      test: (row, value) => row.sentiment === value,
    },
    {
      key: "intent",
      label: "Intent",
      allLabel: "All intents",
      options: (rows) => distinctOptions(rows, (row) => row.intent),
      test: (row, value) => row.intent === value,
    },
    {
      key: "stage",
      label: "Stage",
      allLabel: "All stages",
      options: (rows) => distinctOptions(rows, (row) => row.stage),
      test: (row, value) => row.stage === value,
    },
    {
      key: "owner",
      label: "Owner",
      allLabel: "All owners",
      options: (rows) => distinctOptions(rows, (row) => row.owner),
      test: (row, value) => row.owner === value,
    },
    {
      key: "campaign",
      label: "Campaign",
      allLabel: "All campaigns",
      options: (rows) => distinctOptions(rows, (row) => row.campaign),
      test: (row, value) => row.campaign === value,
    },
  ],
  columns: [
    { key: "name", label: "Lead", value: (row) => row.name },
    { key: "email", label: "Email", value: (row) => row.email },
    { key: "company", label: "Company", value: (row) => row.company },
    { key: "role", label: "Role", value: (row) => row.role },
    { key: "campaign", label: "Campaign", value: (row) => row.campaign },
    { key: "sentiment", label: "Sentiment", value: (row) => row.sentiment },
    { key: "intent", label: "Intent", value: (row) => row.intent },
    { key: "stage", label: "Stage", value: (row) => row.stage },
    { key: "owner", label: "Owner", value: (row) => row.owner },
    { key: "updated", label: "Last updated", sortValue: (row) => timeValue(row.updatedAt), value: (row) => formatDateTime(row.updatedAt) },
  ],
  breakdown: { label: "Leads by sentiment", get: (row) => row.sentiment },
  kpis: (rows) => [
    kpi("Leads", rows.length),
    kpi("High interest", rows.filter((row) => row.intent === "Interested" || row.intent === "Meeting Request").length),
    kpi("At meeting stage", rows.filter((row) => row.stage === "Meeting").length),
    kpi("Human managed", rows.filter((row) => row.owner === "Human Managed").length),
  ],
};

const forwardedReport: ReportDef<ForwardedLeadRecord> = {
  id: "forwarded",
  label: "Forwarded leads",
  description: "Leads sent to external platforms and whether delivery worked.",
  icon: Route,
  load: () => fetchAllPages((page) => forwardedLeadService.list({ page, limit: PAGE })),
  dateFields: [{ key: "created", label: "Forwarded", get: (row) => row.createdAt }],
  search: (row) => `${row.leadEmail ?? ""} ${row.platform} ${row.destination ?? ""}`,
  searchPlaceholder: "Search emails or platforms",
  defaultSort: { key: "created", dir: "desc" },
  filters: [
    {
      key: "status",
      label: "Status",
      allLabel: "All statuses",
      options: ["Forwarded", "Failed"].map((value) => ({ value, label: value })),
      test: (row, value) => row.status === value,
    },
    {
      key: "platform",
      label: "Platform",
      allLabel: "All platforms",
      options: (rows) => distinctOptions(rows, (row) => row.platform),
      test: (row, value) => row.platform === value,
    },
    {
      key: "destination",
      label: "Destination",
      allLabel: "All destinations",
      options: (rows) => distinctOptions(rows, (row) => row.destination),
      test: (row, value) => row.destination === value,
    },
  ],
  columns: [
    { key: "created", label: "Forwarded", sortValue: (row) => timeValue(row.createdAt), value: (row) => formatDateTime(row.createdAt) },
    { key: "email", label: "Lead email", value: (row) => row.leadEmail ?? "" },
    { key: "platform", label: "Platform", value: (row) => row.platform },
    { key: "destination", label: "Destination", value: (row) => row.destination ?? "" },
    { key: "status", label: "Status", value: (row) => row.status, tone: (row) => (row.status === "Forwarded" ? "success" : "danger") },
    { key: "contact", label: "Contact ID", value: (row) => row.contactId ?? "" },
    { key: "error", label: "Error", value: (row) => row.errorMessage ?? "" },
  ],
  breakdown: { label: "Forwards by platform", get: (row) => row.platform },
  kpis: (rows) => {
    const failed = rows.filter((row) => row.status === "Failed").length;
    return [
      kpi("Leads forwarded", rows.length),
      kpi("Delivered", rows.length - failed),
      kpi("Failed", failed, { tone: failed > 0 ? "danger" : undefined }),
      kpi("Success rate", rows.length ? `${round(((rows.length - failed) / rows.length) * 100, 1)}%` : "N/A"),
    ];
  },
};

export const RESPONDER_REPORTS: AnyReport[] = [
  activityReport,
  agentReport,
  mixReport,
  reviewReport,
  conversationReport,
  leadReport,
  forwardedReport,
];
