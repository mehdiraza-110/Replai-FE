export type StatusTone = "default" | "accent" | "success" | "warning" | "danger";

export type WarmupStage = "New" | "Ramping" | "Steady State" | "Paused";

export interface MailerMailbox {
  id: number;
  email: string;
  status: "Active" | "Paused" | "Error";
  warmupStage: WarmupStage;
  warmupEnabled: boolean;
  dailyLimit: number;
  sentToday: number;
  warmupDailyLimit: number;
  warmupSentToday: number;
  totalEmailsSent: number;
  warmupDeliverability7d: number;
  replyRate7d: number;
  bounceRate3d: number | null;
  campaignName: string | null;
  reputationStatus: "Healthy" | "Watch" | "At Risk";
  lastSentAt: string | null;
}

export interface MailerDomain {
  id: number;
  domain: string;
  registrar: string;
  spfStatus: "Verified" | "Pending" | "Failed";
  dkimStatus: "Verified" | "Pending" | "Failed";
  dmarcStatus: "Verified" | "Pending" | "Failed";
  mxStatus: "Verified" | "Pending" | "Failed";
  status: "Active" | "Provisioning" | "Suspended";
  configurationSetStatus: "Configured" | "Pending";
  mailboxes: MailerMailbox[];
}

export type DnsCheckStatus = "Not started" | "Pending" | "Success" | "Failed";

export interface Domain {
  id: number;
  domain: string;
  registrar: string;
  dnsProvider: string;
  hostedZoneId: string | null;
  awsRegion: string;
  mailFromSubdomain: string | null;
  spfStatus: DnsCheckStatus;
  dkimStatus: DnsCheckStatus;
  dmarcStatus: DnsCheckStatus;
  mxStatus: DnsCheckStatus;
  mailFromStatus: DnsCheckStatus;
  provider: string;
  status: "Provisioning" | "Pending Verification" | "Verified" | "Failed";
  reputation: string;
  lastCheckedAt: string | null;
  lastError: string | null;
  dkimTokens: string[];
  mailboxCount: number | null;
  configurationSetName: string | null;
  emailsSent14d: number | null;
  emailsDelivered14d: number | null;
  emailsBounced14d: number | null;
  emailsComplained14d: number | null;
  bounceRate: number | null;
  complaintRate: number | null;
  deliveryRate: number | null;
  reputationCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DomainStatusCounts {
  total: number;
  verified: number;
  pending: number;
  failed: number;
}

export interface DomainPage {
  items: Domain[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  statusCounts: DomainStatusCounts;
}

export interface HostedZone {
  domain: string;
  hostedZoneId: string;
}

export interface DnsRecordInstruction {
  purpose: string;
  type: string;
  host: string;
  value: string;
}

export interface DomainOnboardResult {
  domain: string;
  status: string;
  record?: Domain;
  error?: string;
  dnsRecords?: DnsRecordInstruction[];
}

export interface SesAccountRequest {
  id: number;
  awsRegion: string;
  mailType: "MARKETING" | "TRANSACTIONAL";
  websiteUrl: string;
  useCaseDescription: string | null;
  additionalContactEmails: string[];
  status: string;
  errorMessage: string | null;
  requestedAt: string;
}

export interface SesAccountStatus {
  awsRegion: string;
  sendingEnabled: boolean | null;
  productionAccessEnabled: boolean;
  enforcementStatus: string | null;
  max24HourSend: number | null;
  maxSendRate: number | null;
  sentLast24Hours: number | null;
  latestRequest: SesAccountRequest | null;
}

export type MailboxStatus = "Active" | "Paused" | "Error";
export type MailboxWarmupStage = "New" | "Ramping" | "Steady State" | "Paused";
export type MailboxReputationStatus = "Healthy" | "Watch" | "At Risk";

export interface Mailbox {
  id: number;
  domainId: number;
  domain: string;
  domainStatus: Domain["status"];
  domainBounceRate: number | null;
  domainComplaintRate: number | null;
  email: string;
  localPart: string;
  displayName: string | null;
  status: MailboxStatus;
  dailyLimit: number;
  sentToday: number;
  warmupStage: MailboxWarmupStage;
  reputationStatus: MailboxReputationStatus;
  lastSentAt: string | null;
  lastCheckedAt: string | null;
  warmupStrategyId: number | null;
  warmupStrategyName: string | null;
  warmupStartedAt: string | null;
  warmupLastTickAt: string | null;
  warmupLastAction: string | null;
  createdAt: string;
  updatedAt: string;
  campaignSentToday: number;
  warmupDeliverability7d: number | null;
  replyRate7d: number | null;
  bounceRate3d: number | null;
  activeCampaigns: string[];
  totalEmailSent: number;
  totalContactedLeads: number;
  newLeadsContacted: number;
  totalCompletedLeads: number;
  replyRateExclOoo7d: number | null;
  positiveReplyRate7d: number | null;
}

export interface MailboxStatusCounts {
  total: number;
  active: number;
  paused: number;
  error: number;
}

export interface MailboxPage {
  items: Mailbox[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  statusCounts: MailboxStatusCounts;
}

export interface MailboxCreateResult {
  email: string;
  status: string;
  record?: Mailbox;
  error?: string;
}

// The app-native per-mailbox inbox (SES receiving, not a real IMAP/SMTP mailbox) —
// see PlusVibe-Plan.md 1B and the `messages` table.
export interface MailboxInboxMessage {
  id: number;
  mailboxId: number;
  direction: "outbound" | "inbound";
  campaignId: number | null;
  campaignLeadId: number | null;
  threadId: string;
  messageId: string | null;
  inReplyTo: string | null;
  fromAddress: string;
  toAddress: string;
  subject: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface MailboxInboxPage {
  items: MailboxInboxMessage[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// The unified inbox — one screen across every mailbox, see PlusVibe-Plan.md section 7 / 1D.
export interface InboxThread {
  mailboxId: number;
  mailboxEmail: string;
  mailboxDisplayName: string | null;
  threadId: string;
  campaignId: number | null;
  campaignName: string | null;
  lastDirection: "outbound" | "inbound";
  fromAddress: string;
  toAddress: string;
  subject: string | null;
  preview: string;
  unreadCount: number;
  lastMessageAt: string;
}

export interface InboxThreadPage {
  items: InboxThread[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  totalUnreadThreads: number;
}

export interface InboxThreadDetail {
  mailbox: { id: number; email: string; displayName: string | null };
  leadEmail: string;
  leadName: string | null;
  messages: MailboxInboxMessage[];
}

export interface WarmupSafetyTier {
  key: "wrong" | "very-wrong" | "extremely-wrong";
  label: string;
  description: string;
  action: "decrement" | "stop";
  amount: number;
}

export interface WarmupStrategy {
  id: number;
  name: string;
  description: string | null;
  startDailyLimit: number;
  steadyStateDailyLimit: number;
  incrementPerStage: number;
  stageDurationDays: number;
  safetyTiers: WarmupSafetyTier[];
  isAiGenerated: boolean;
  aiRationale: string | null;
  assignedMailboxCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WarmupSummary {
  inWarmup: number;
  atSteadyState: number;
  avgProgress: number;
  activeStrategies: number;
}

// The always-on warmup lane's shared, single-use lead pool. See PlusVibe-Plan.md 1E.
export interface WarmupPoolStats {
  campaignId: number;
  available: number;
  used: number;
  suppressed: number;
  failed: number;
  total: number;
}

export interface WarmupPoolAddResult {
  added: number;
  skippedSuppressed: number;
  skippedAlreadyInPool: number;
  totalRows?: number;
  invalidCount?: number;
}

export interface WarmupTarget {
  all?: boolean;
  domain?: string;
  mailboxIds?: number[];
}

export interface AiRampWeeklyStage {
  label: string;
  range: string;
}

export interface AiRampSchedule {
  startDailyLimit: number;
  steadyStateDailyLimit: number;
  incrementPerStage: number;
  stageDurationDays: number;
  weeklySchedule: AiRampWeeklyStage[];
  rationale: string | null;
}

export interface MailerCampaign {
  id: number;
  name: string;
  status: "Active" | "Paused" | "Draft" | "Completed";
  mailboxCount: number;
  sentToday: number;
  sentTotal: number;
  replyRate: number;
  bounceRate: number;
  startedAt: string;
  leadsCount: number;
  contactedCount: number;
  contactedPercent: number;
  replyCount: number;
  positiveReplyRate: number | null;
  openTrackingSupported: boolean;
  totalSequenceEmails: number;
}

export interface ReputationTrendPoint {
  date: string;
  sentVolume: number;
  bounceRate: number;
  complaintRate: number;
}

export interface CampaignPage {
  items: MailerCampaign[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CampaignFollowUpPayload {
  delayDays: number;
  body: string;
}

export interface ParsedLead {
  email: string;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  role: string | null;
  phone: string | null;
  raw: Record<string, unknown>;
}

export interface LeadFileParseResult {
  headers: string[];
  fieldMap: Partial<Record<"email" | "fullName" | "firstName" | "lastName" | "company" | "role" | "phone", string>>;
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  leads: ParsedLead[];
}

export interface CampaignLead {
  id: number;
  email: string;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  role: string | null;
  phone: string | null;
  status: "Pending" | "Sent" | "Replied" | "Bounced";
  raw: Record<string, unknown>;
  createdAt: string;
}

export interface CampaignLeadsPage {
  items: CampaignLead[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CampaignCreatePayload {
  name: string;
  objective?: string;
  subject: string;
  body: string;
  leads: ParsedLead[];
  followUps: CampaignFollowUpPayload[];
  mailboxMode: "all" | "specific";
  mailboxIds?: number[];
  dailyLimitOverride?: number | null;
  sendingDays: string[];
  windowStart: string;
  windowEnd: string;
  timezone: string;
  aiAgentId?: number | null;
  humanReviewRequired: boolean;
}

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

export interface ProfileUpdatePayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
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

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  description: string;
  tone: StatusTone;
  createdAt: string;
}

export interface NotificationPage {
  items: NotificationItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
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
  fallbackMeetingUrl?: string | null;
  meetingDurationMinutes?: number;
  workingHoursStart?: string;
  workingHoursEnd?: string;
  timezone?: string;
  salesRules?: string | null;
  safetyRules?: string | null;
  knowledgeSources?: string | null;
  knowledgeSourceIds?: number[];
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

export interface CalendarConnection {
  id: number;
  provider: "google";
  googleEmail: string;
  status: "connected" | "revoked" | "error";
  createdAt: string;
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

export interface KnowledgeSourceAgent {
  id: number;
  name: string;
}

export interface KnowledgeItem {
  id: number;
  title: string;
  category: string;
  sourceType: "Text" | "Document" | "URL" | "FAQ";
  owner: string;
  status: "Published" | "Draft" | "Review";
  contentText?: string | null;
  usageGuidance?: string | null;
  sourceUrl?: string | null;
  fileName?: string | null;
  fileMimeType?: string | null;
  fileSize?: number | null;
  fileStoragePath?: string | null;
  chunks: number;
  agents: KnowledgeSourceAgent[];
  lastIndexedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  updated?: string;
}

export interface KnowledgePage {
  items: KnowledgeItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
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

export interface ForwardedLeadRecord {
  id: number;
  leadEmail: string | null;
  platform: string;
  destination: string | null;
  status: "Forwarded" | "Failed";
  contactId: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface ForwardedLeadPage {
  items: ForwardedLeadRecord[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
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
