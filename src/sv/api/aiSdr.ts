import { apiRequest } from "../../services/api";

export type Outcome = "none" | "escalated" | "meeting_booked" | "do_not_contact" | "out_of_office" | "auto_reply" | "declined";
export type Interest = "none" | "low" | "medium" | "high" | "very_high";
export type Folder = "inbox" | "attention" | "favorites" | "disabled";
export type BulkAction = "read" | "unread" | "favorite" | "unfavorite" | "disable_ai" | "enable_ai" | "resolve";

export interface ThreadSummary {
  mailboxId: number;
  threadId: string;
  prospectName: string;
  prospectEmail: string;
  company: string | null;
  subject: string;
  preview: string;
  lastMessageAt: string;
  lastDirection: "inbound" | "outbound";
  unreadCount: number;
  messageCount: number;
  campaignId: number | null;
  campaignName: string | null;
  mailboxEmail: string;
  outcome: Outcome;
  interest: Interest;
  isFavorite: boolean;
  aiDisabled: boolean;
  needsAttention: boolean;
  attentionReason: string | null;
  followUpAt: string | null;
  replyState: "new" | "replied";
}

export interface ThreadList {
  items: ThreadSummary[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  counts: {
    inbox: { unread: number; total: number };
    attention: { unread: number; total: number };
    favorites: { total: number };
    disabled: { total: number };
  };
}

export type MessageKind = "prospect" | "ai" | "you" | "campaign";

export interface ThreadMessage {
  id: number;
  direction: "inbound" | "outbound";
  kind: MessageKind;
  fromAddress: string;
  toAddress: string;
  subject: string | null;
  bodyText: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface ThreadDetail {
  mailbox: { id: number; email: string; displayName: string | null } | null;
  state: { outcome: Outcome; interest: Interest; isFavorite: boolean; aiDisabled: boolean; needsAttention: boolean; attentionReason: string | null; classifiedBy: string | null; followUpAt: string | null; followupBy: "auto" | "manual" | null; followupCount: number };
  bookings: Array<{ id: number; startTime: string; endTime: string; meetLink: string | null }>;
  contact: {
    name: string | null;
    email: string | null;
    company: string | null;
    jobTitle: string | null;
    website: string | null;
    industry: string | null;
    linkedin: string | null;
    location: string | null;
    phone: string | null;
    campaign: { id: number; name: string } | null;
  };
  messages: ThreadMessage[];
  pendingDraft: { id: number; subject: string | null; body: string; intent: string | null; interest: string | null; generatedBy: string | null; createdAt: string } | null;
}

export interface MeetingType {
  id: number;
  name: string;
  campaignType: string;
  durationMinutes: number;
  calendarTitle: string;
  isDefault: boolean;
}

export interface Resource {
  id: number;
  title: string;
  url: string;
  campaignId: number | null;
  campaignName: string | null;
}

export interface Brain {
  companyName: string;
  website: string;
  whoYouSellTo: string;
  whatYouSell: string;
  podcastName: string;
  senderFirstName: string;
  senderLastName: string;
  senderTitle: string;
  senderEmail: string;
  senderContact: string;
  senderAddress: string;
}

export interface SdrSettingsBundle {
  settings: { enabled: boolean; requireApproval: boolean; knowledgeBase: string; callHandlerUserId: number | null; bookingLink: string; webhookUrl: string; webhookSecretSet: boolean; followupEnabled: boolean; followupDelayDays: number; followupMax: number };
  rules: Array<{ id: number; rule: string }>;
  meetingTypes: MeetingType[];
  resources: Resource[];
  brain: Brain;
  handlers: Array<{ id: number; email: string; name: string; role: string }>;
}

export type SettingsInput = Partial<Pick<SdrSettingsBundle["settings"], "enabled" | "requireApproval" | "knowledgeBase" | "callHandlerUserId" | "bookingLink" | "webhookUrl" | "followupEnabled" | "followupDelayDays" | "followupMax">>;
export interface CampaignOverride {
  campaignId: number;
  campaignName: string;
  enabled: boolean | null;
  requireApproval: boolean | null;
  meetingTypeId: number | null;
  bookingLink: string;
  notes: string;
  hasOverride: boolean;
}

export type OverrideInput = Pick<CampaignOverride, "enabled" | "requireApproval" | "meetingTypeId" | "bookingLink" | "notes">;

export type WeekDay = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export interface Availability {
  timezone: string;
  weekly: Record<WeekDay, Array<[string, string]>>;
  bufferBeforeMin: number;
  bufferAfterMin: number;
  saved: boolean;
}

export interface CalendarStatus {
  connection: { id: number; provider: string; googleEmail: string | null; status: string; createdAt: string } | null;
  googleConfigured: boolean;
}

export type MeetingTypeInput = Pick<MeetingType, "name" | "campaignType" | "durationMinutes" | "calendarTitle">;

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });
const post = (body: unknown): RequestInit => ({ method: "POST", ...json(body) });
const enc = encodeURIComponent;
const threadPath = (mailboxId: number, threadId: string) => `/api/v1/ai-sdr/threads/${mailboxId}/${enc(threadId)}`;

async function data<T>(request: Promise<{ data: T }>): Promise<T> {
  return (await request).data;
}

export const aiSdrApi = {
  threads(params: { folder: Folder; campaignId?: number | null; outcome?: Outcome | null; search?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams({ folder: params.folder, page: String(params.page ?? 1), limit: String(params.limit ?? 20) });
    if (params.campaignId) query.set("campaignId", String(params.campaignId));
    if (params.outcome) query.set("outcome", params.outcome);
    if (params.search?.trim()) query.set("search", params.search.trim());
    return data(apiRequest<ThreadList>(`/api/v1/ai-sdr/threads?${query}`));
  },
  campaigns: () => data(apiRequest<Array<{ id: number; name: string }>>("/api/v1/ai-sdr/campaigns")),
  thread: (mailboxId: number, threadId: string) => data(apiRequest<ThreadDetail>(threadPath(mailboxId, threadId))),
  patchThread: (mailboxId: number, threadId: string, body: Partial<{ outcome: Outcome; interest: Interest; isFavorite: boolean; aiDisabled: boolean; needsAttention: boolean; followUpAt: string | null }>) =>
    data(apiRequest<ThreadDetail>(threadPath(mailboxId, threadId), { method: "PATCH", ...json(body) })),
  bulk: (threads: Array<{ mailboxId: number; threadId: string }>, action: BulkAction) => data(apiRequest<{ updated: number }>("/api/v1/ai-sdr/threads/bulk", post({ threads, action }))),
  reply: (mailboxId: number, threadId: string, body: string) => data(apiRequest<{ id: number }>(`${threadPath(mailboxId, threadId)}/reply`, post({ body }))),
  sendDraft: (mailboxId: number, threadId: string, draftId: number, body?: string) => data(apiRequest<{ id: number }>(`${threadPath(mailboxId, threadId)}/drafts/${draftId}/send`, post({ body }))),
  discardDraft: (mailboxId: number, threadId: string, draftId: number) => data(apiRequest<{ discarded: boolean }>(`${threadPath(mailboxId, threadId)}/drafts/${draftId}/discard`, post({}))),

  forward: (mailboxId: number, threadId: string, messageId: number, to: string, note: string) => data(apiRequest<{ forwarded: boolean }>(`${threadPath(mailboxId, threadId)}/messages/${messageId}/forward`, post({ to, note }))),
  overrides: () => data(apiRequest<CampaignOverride[]>("/api/v1/ai-sdr/overrides")),
  saveOverride: (campaignId: number, body: OverrideInput) => data(apiRequest<CampaignOverride>(`/api/v1/ai-sdr/overrides/${campaignId}`, { method: "PUT", ...json(body) })),
  clearOverride: (campaignId: number) => data(apiRequest<{ cleared: boolean }>(`/api/v1/ai-sdr/overrides/${campaignId}`, { method: "DELETE" })),

  settings: () => data(apiRequest<SdrSettingsBundle>("/api/v1/ai-sdr/settings")),
  saveSettings: (body: SettingsInput) => data(apiRequest<SdrSettingsBundle>("/api/v1/ai-sdr/settings", { method: "PUT", ...json(body) })),
  saveRules: (rules: string[]) => data(apiRequest<SdrSettingsBundle>("/api/v1/ai-sdr/rules", { method: "PUT", ...json({ rules }) })),
  saveBrain: (body: Partial<Brain>) => data(apiRequest<Brain>("/api/v1/ai-sdr/brain", { method: "PUT", ...json(body) })),
  createMeetingType: (body: MeetingTypeInput) => data(apiRequest<MeetingType>("/api/v1/ai-sdr/meeting-types", post(body))),
  updateMeetingType: (id: number, body: MeetingTypeInput) => data(apiRequest<MeetingType>(`/api/v1/ai-sdr/meeting-types/${id}`, { method: "PUT", ...json(body) })),
  deleteMeetingType: (id: number) => data(apiRequest<{ deleted: boolean }>(`/api/v1/ai-sdr/meeting-types/${id}`, { method: "DELETE" })),
  createResource: (body: { title: string; url: string; campaignId?: number | null }) => data(apiRequest<Resource>("/api/v1/ai-sdr/resources", post(body))),
  deleteResource: (id: number) => data(apiRequest<{ deleted: boolean }>(`/api/v1/ai-sdr/resources/${id}`, { method: "DELETE" })),
  webhookSecret: () => data(apiRequest<{ secret: string | null }>("/api/v1/ai-sdr/webhook/secret", post({}))),
  rotateWebhookSecret: () => data(apiRequest<{ secret: string }>("/api/v1/ai-sdr/webhook/secret/rotate", post({}))),
  testWebhook: () => data(apiRequest<{ status: number; ok: boolean }>("/api/v1/ai-sdr/webhook/test", post({}))),
};

export const schedulingApi = {
  availability: () => data(apiRequest<Availability>("/api/v1/scheduling/availability")),
  saveAvailability: (body: Pick<Availability, "timezone" | "weekly" | "bufferBeforeMin" | "bufferAfterMin">) => data(apiRequest<Availability>("/api/v1/scheduling/availability", { method: "PUT", ...json(body) })),
  calendar: () => data(apiRequest<CalendarStatus>("/api/v1/scheduling/calendar")),
  connectUrl: () => data(apiRequest<{ url: string }>("/api/v1/scheduling/calendar/google/url", post({}))),
  disconnect: () => data(apiRequest<{ disconnected: boolean }>("/api/v1/scheduling/calendar", { method: "DELETE" })),
};
