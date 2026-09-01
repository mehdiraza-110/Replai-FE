export type StatusTone = "default" | "accent" | "success" | "warning" | "danger";

export interface AuthUser {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  profile_image: string | null;
  is_verified: boolean | null;
  is_admin_user: boolean;
  created_at: string;
  updated_at: string;
  roles: Array<{
    id: number;
    name: string;
  }>;
}

export type ConversationIntent =
  | "Interested"
  | "Question"
  | "Objection"
  | "Meeting Request"
  | "Not Interested"
  | "Human Review";

export interface Metric {
  label: string;
  value: string;
  change: string;
  tone: StatusTone;
}

export interface AnalyticsSummaryMetric {
  label: string;
  value: number;
  change: string;
  tone: "accent" | "success" | "warning";
  icon: "MessageSquareText" | "Bot" | "UserCheck" | "Target";
}

export interface AnalyticsWeeklyLoopItem {
  day: string;
  date?: string;
  incoming: number;
  sent: number;
  review: number;
}

export interface AnalyticsIntentMixItem {
  label: string;
  value: number;
  count: number;
  color: string;
}

export interface AnalyticsReviewTrigger {
  label: string;
  value: number;
  count: number;
}

export interface AnalyticsTrainingImpact {
  label: string;
  value: string;
  description: string;
  tone: "accent" | "success" | "default";
  icon: "TrendingUp" | "Clock3" | "Target";
}

export interface AnalyticsAgentPerformance {
  agent: string;
  inbox: string;
  replies: number;
  autoSent: string;
  confidence: string;
  meetings: number;
  review: string;
}

export interface AnalyticsOverview {
  range: {
    days?: number;
    preset?: string;
    startDate?: string;
    endDate?: string;
    label: string;
  };
  summary: AnalyticsSummaryMetric[];
  weeklyLoop: AnalyticsWeeklyLoopItem[];
  intentMix: AnalyticsIntentMixItem[];
  reviewTriggers: AnalyticsReviewTrigger[];
  trainingImpact: AnalyticsTrainingImpact[];
  agentPerformance: AnalyticsAgentPerformance[];
}

export interface Conversation {
  id: string;
  lead: string;
  company: string;
  role: string;
  email: string;
  latestMessage: string;
  intent: ConversationIntent;
  agent: string;
  status: string;
  updated: string;
  sentiment: string;
  stage: string;
  interest: string;
  confidence: number;
  recommendation: string;
  messages: Array<{
    from: "prospect" | "ai" | "human";
    sender: string;
    time: string;
    body: string;
  }>;
}

export interface MessageConversationSummary {
  id: string;
  threadId: string;
  lead: string;
  leadEmail: string | null;
  campaignId: string | null;
  campaignName: string;
  assignedAgent: {
    id: number;
    name: string;
    status: string;
  } | null;
  label: string;
  isUnread: boolean;
  hasDraft: boolean;
  latestMessage: string;
  latestMessageId: string | null;
  latestAt: string | null;
  fromEmail: string | null;
  toEmail: string | null;
  subject: string | null;
}

export interface MessageConversationPage {
  items: MessageConversationSummary[];
  nextPageTrail: string | null;
  hasMore: boolean;
}

export interface MessageThreadItem {
  id: string | null;
  replyToId: string | null;
  from: "prospect" | "human";
  sender: string;
  fromEmail: string | null;
  toEmail: string | null;
  subject: string | null;
  timestamp: string;
  preview: string | null;
  bodyText: string;
  bodyHtml: string | null;
  label: string | null;
}

export interface AiResponseDraft {
  id: number;
  threadId: string;
  replyToMessageId: string;
  aiAgentId: number | null;
  campaignId: string | null;
  leadEmail: string | null;
  subject: string | null;
  from: string | null;
  to: string | null;
  body: string;
  confidence: number;
  status: "Pending" | "Approved" | "Rejected" | "Sent";
  generatedBy: string;
  generationError: string | null;
  sentMessageId: string | null;
  updatedAt: string;
}

export interface MessageConversationDetail {
  threadId: string;
  leadEmail: string | null;
  campaign: {
    id: number;
    plusVibeCampaignId: string;
    name: string;
  } | null;
  assignedAgent: {
    id: number;
    name: string;
    status: string;
  } | null;
  messages: MessageThreadItem[];
  aiDraft: AiResponseDraft | null;
}

export interface InboxManager {
  name: string;
  workspace: string;
  status: "Active" | "Paused";
  agent: string;
  autoReply: boolean;
  repliesToday: number;
  humanReview: number;
}

export interface Agent {
  id?: number;
  name: string;
  purpose?: string;
  description?: string | null;
  role?: string;
  persona?: string;
  tone?: string;
  responseStyle?: string;
  companyName?: string;
  website?: string | null;
  industry?: string | null;
  valueProposition?: string | null;
  objective?: string;
  successCriteria?: string | null;
  language?: string;
  autoDetectLanguage?: boolean;
  responseRules?: string | null;
  salesRules?: string | null;
  safetyRules?: string | null;
  knowledgeSources?: string | null;
  trainingExamples?: string | null;
  aiProvider?: string;
  model: string;
  automationMode?: string;
  confidenceThreshold?: number;
  humanReview?: boolean;
  status: "Active" | "Paused" | "Draft" | "Archived";
  inbox?: string | null;
  workspace?: string | null;
  autoReply: boolean;
  updated?: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface PlusVibeCampaign {
  id: number;
  plusVibeCampaignId: string;
  name: string;
  status: string | null;
  tags: string[];
  lastLeadSent: string | null;
  lastLeadReplied: string | null;
  assignedAiAgentId: number | null;
  assignedAgent: {
    id: number;
    name: string;
    status: string;
  } | null;
  lastSyncedAt: string;
  updatedAt: string;
}

export interface KnowledgeItem {
  title: string;
  category: string;
  status: "Published" | "Draft" | "Review";
  updated: string;
}

export interface ReviewItem {
  id: string;
  lead: string;
  company: string;
  trigger: string;
  confidence: number;
  status: "Needs Review" | "Edited" | "Approved" | "Paused";
  agent: string;
  age: string;
  draft: string;
}

export interface HumanReviewItem {
  id: number;
  draftId: number;
  threadId: string;
  replyToMessageId: string;
  leadEmail: string | null;
  leadName: string;
  company: string;
  role: string | null;
  workspaceId: string | null;
  workspaceName: string | null;
  campaignId: string | null;
  campaignName: string;
  agentId: number | null;
  agentName: string;
  agentStatus: string | null;
  subject: string | null;
  from: string | null;
  to: string | null;
  triggerMessage: string | null;
  triggerPreview: string | null;
  body: string;
  confidence: number;
  status: "Pending" | "Approved" | "Rejected" | "Sent";
  generatedBy: string;
  generationError: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface HumanReviewPage {
  items: HumanReviewItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Lead {
  id?: string;
  threadId?: string;
  name: string;
  email: string;
  company: string;
  role: string;
  campaign: string;
  campaignId?: string | null;
  intent: ConversationIntent;
  sentiment: string;
  stage: string;
  owner: string;
  updated: string;
  updatedAt?: string;
}

export interface LeadStats {
  totalLeads: number;
  highInterest: number;
  meetingStage: number;
  humanManaged: number;
}

export interface LeadPage {
  items: Lead[];
  stats: LeadStats;
}

export interface LeadDestination {
  name: string;
  description: string;
  status: "Connected" | "Available";
  destinationType: "CRM" | "Automation" | "Webhook";
  lastForwarded: string;
  leadsForwarded: number;
}

export interface LeadRoutingRule {
  name: string;
  criteria: string;
  destination: string;
  status: "Active" | "Paused";
  forwardedToday: number;
  lastRun: string;
}

export interface TrainingExample {
  id: string;
  prospectMessage: string;
  humanResponse: string;
  intent: string;
  outcome: string;
  quality: "High" | "Medium" | "Low";
  meetingBooked: boolean;
  included: boolean;
  updated: string;
}

export interface EventLogItem {
  timestamp: string;
  event: string;
  workspace: string;
  lead: string;
  conversation: string;
  status: "Success" | "Processing" | "Failed";
  duration: string;
  error?: string;
}

export interface EventLogRecord {
  id: number;
  eventType: string;
  source: string;
  status: "Success" | "Processing" | "Failed" | "Skipped";
  workspaceId: string | null;
  workspaceName: string | null;
  campaignId: string | null;
  campaignName: string | null;
  aiAgentId: number | null;
  aiAgentName: string | null;
  leadEmail: string | null;
  threadId: string | null;
  messageId: string | null;
  draftId: number | null;
  durationMs: number | null;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  createdBy: number | null;
  createdAt: string;
}

export interface EventLogPage {
  items: EventLogRecord[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AiDebugRun {
  conversation: string;
  lead: string;
  agent: string;
  model: string;
  confidence: number;
  automationDecision: "Auto Send" | "Human Review" | "Paused";
  sections: Array<{
    title: string;
    value: string;
  }>;
}
