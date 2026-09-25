import {
  agents,
  aiDebugRun,
  conversations,
  inboxManagers,
  leads,
  mailerCampaigns,
  mailerDomains,
  metrics,
  trainingExamples,
} from "./mockData";
import type {
  Agent,
  AiRampSchedule,
  AnalyticsOverview,
  AiResponseDraft,
  AuthUser,
  CalendarConnection,
  CampaignCreatePayload,
  CampaignLeadsPage,
  CampaignPage,
  ChangePasswordPayload,
  Domain,
  DomainOnboardResult,
  DomainPage,
  EventLogPage,
  ForwardedLeadPage,
  HostedZone,
  HumanReviewPage,
  KnowledgeItem,
  KnowledgePage,
  LeadPage,
  InboxThreadDetail,
  InboxThreadPage,
  Mailbox,
  MailboxCreateResult,
  MailboxInboxMessage,
  MailboxInboxPage,
  MailboxPage,
  LeadFileParseResult,
  MailerCampaign,
  MessageConversationDetail,
  MessageConversationPage,
  NotificationPage,
  PlusVibeCampaign,
  ProfileUpdatePayload,
  ReputationTrendPoint,
  SesAccountRequest,
  SesAccountStatus,
  WarmupSafetyTier,
  WarmupPoolAddResult,
  WarmupPoolStats,
  WarmupStrategy,
  WarmupSummary,
  WarmupTarget,
} from "../types";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:3001").replace(/\/$/, "");

interface ApiResponse<T> {
  success: boolean;
  message: string;
  code?: string;
  data: T;
}

export class ApiRequestError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

async function apiRequest<T>(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);

  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: "include",
      headers,
    });
  } catch {
    throw new ApiRequestError("We could not reach the server. Please check that ReplyOS is running and try again.", 0);
  }

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok) {
    throw new ApiRequestError(getFriendlyErrorMessage({
      path,
      status: response.status,
      message: payload?.message,
      code: payload?.code,
    }), response.status, payload?.code);
  }

  if (!payload) {
    throw new Error("Something went wrong while loading this data. Please try again.");
  }

  return payload;
}

function uploadWithProgress<T>(path: string, file: File, fieldName: string, onProgress?: (percent: number) => void) {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append(fieldName, file);

    xhr.open("POST", `${API_BASE_URL}${path}`);
    xhr.withCredentials = true;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let payload: ApiResponse<T> | null = null;
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        payload = null;
      }

      if (xhr.status >= 200 && xhr.status < 300 && payload) {
        resolve(payload.data);
      } else {
        reject(new ApiRequestError(getFriendlyErrorMessage({
          path,
          status: xhr.status,
          message: payload?.message,
          code: payload?.code,
        }), xhr.status, payload?.code));
      }
    };

    xhr.onerror = () => {
      reject(new ApiRequestError("We could not reach the server. Please check that ReplyOS is running and try again.", 0));
    };

    xhr.send(formData);
  });
}

const SURFACED_ERROR_CODES = new Set(["CALENDAR_CONFIG_MISSING", "CALENDAR_ENCRYPTION_KEY_MISSING", "CALENDAR_STATE_INVALID", "CALENDAR_CONNECTION_REVOKED"]);

function getFriendlyErrorMessage({
  message,
  path,
  status,
  code,
}: {
  message?: string;
  path: string;
  status: number;
  code?: string;
}) {
  const lowerMessage = String(message || "").toLowerCase();
  const isPlusVibeRoute = path.includes("/plusvibe") || path.includes("/messages") || path.includes("/leads") || lowerMessage.includes("plusvibe");

  // These are admin-facing setup/config problems, not internal errors to hide —
  // surfacing them is what lets someone actually fix the missing env var.
  if (code && SURFACED_ERROR_CODES.has(code) && message) return message;

  if (status === 0) return "We could not reach the server. Please check that ReplyOS is running and try again.";
  if (status === 401 || status === 403) return "Your session does not have access to this action. Please sign in again.";
  if (status === 404) return "We could not find that record. It may have been changed or removed.";
  if (status === 409) return "This item has already been updated. Please refresh and try again.";
  if (status === 429) {
    return isPlusVibeRoute
      ? "PlusVibe is receiving too many requests right now. Please wait a minute, then try again."
      : "Too many requests were made at once. Please wait a minute, then try again.";
  }
  if (status >= 500) return "Something went wrong on our side. Please try again in a moment.";

  if (message && !isTechnicalErrorMessage(message)) return message;

  return "Something went wrong. Please try again.";
}

function isTechnicalErrorMessage(message: string) {
  return [
    /\b\d{3}\b/,
    /request failed/i,
    /failed with/i,
    /bind message/i,
    /prepared statement/i,
    /syntax error/i,
    /violates/i,
    /duplicate key/i,
    /foreign key/i,
    /null value/i,
    /column .* does not exist/i,
    /relation .* does not exist/i,
    /fetch failed/i,
    /networkerror/i,
    /timeout/i,
  ].some((pattern) => pattern.test(message));
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  fullName?: string;
}

function splitFullName(fullName?: string) {
  const parts = fullName?.trim().split(/\s+/).filter(Boolean) ?? [];
  const [firstName, ...rest] = parts;

  return {
    first_name: firstName || null,
    last_name: rest.length > 0 ? rest.join(" ") : null,
  };
}

export const authService = {
  async login(payload: LoginPayload) {
    const response = await apiRequest<{ user: AuthUser; token: string }>("/api/v1/users/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return response.data;
  },

  async register(payload: RegisterPayload) {
    const name = splitFullName(payload.fullName);

    await apiRequest<AuthUser>("/api/v1/users", {
      method: "POST",
      body: JSON.stringify({
        ...name,
        email: payload.email,
        password: payload.password,
      }),
    });

    return this.login({ email: payload.email, password: payload.password });
  },
};

export const userService = {
  async updateProfile(payload: ProfileUpdatePayload) {
    const response = await apiRequest<AuthUser>("/api/v1/users/profile", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    return response.data;
  },

  async updateAvatar(file: File) {
    const formData = new FormData();
    formData.set("avatar", file);

    const response = await apiRequest<AuthUser>("/api/v1/users/avatar", {
      method: "PATCH",
      body: formData,
    });

    return response.data;
  },

  async changePassword(payload: ChangePasswordPayload) {
    await apiRequest<null>("/api/v1/users/password", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};

export const analyticsService = {
  getDashboardMetrics: () => metrics,
  async getOverview({ preset = "last_30_days", startDate, endDate }: { preset?: string; startDate?: string | null; endDate?: string | null } = {}) {
    const params = new URLSearchParams();

    if (startDate && endDate) {
      params.set("startDate", startDate);
      params.set("endDate", endDate);
    } else {
      params.set("preset", preset);
    }

    const response = await apiRequest<AnalyticsOverview>(`/api/v1/analytics?${params.toString()}`);

    return response.data;
  },
};

export const conversationService = {
  list: () => conversations,
  getActive: () => conversations[0],
};

export const inboxManagerService = {
  list: () => inboxManagers,
};

export const mailerService = {
  listDomains: () => mailerDomains,
  listCampaigns: () => mailerCampaigns,
  createCampaign: (campaign: MailerCampaign) => {
    mailerCampaigns.unshift(campaign);
    return campaign;
  },
};

export const campaignService = {
  async list({ page = 1, limit = 10, search = "" }: { page?: number; limit?: number; search?: string } = {}) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set("search", search);
    const response = await apiRequest<CampaignPage>(`/api/v1/campaigns?${params.toString()}`);
    return response.data;
  },

  async create(payload: CampaignCreatePayload) {
    const response = await apiRequest<MailerCampaign>("/api/v1/campaigns", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  parseLeadsFile(file: File, onProgress?: (percent: number) => void) {
    return uploadWithProgress<LeadFileParseResult>("/api/v1/campaigns/parse-leads", file, "file", onProgress);
  },

  async listLeads(campaignId: number, { page = 1, limit = 20, search = "" }: { page?: number; limit?: number; search?: string } = {}) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set("search", search);
    const response = await apiRequest<CampaignLeadsPage>(`/api/v1/campaigns/${campaignId}/leads?${params.toString()}`);
    return response.data;
  },
};

export const warmupPoolService = {
  async getStats() {
    const response = await apiRequest<WarmupPoolStats>("/api/v1/warmup-pool/stats");
    return response.data;
  },

  addLeadsFromFile(file: File, onProgress?: (percent: number) => void) {
    return uploadWithProgress<WarmupPoolAddResult>("/api/v1/warmup-pool/leads/upload", file, "file", onProgress);
  },
};

export const warmupService = {
  async listStrategies() {
    const response = await apiRequest<WarmupStrategy[]>("/api/v1/warmup/strategies");
    return response.data;
  },

  async getSummary() {
    const response = await apiRequest<WarmupSummary>("/api/v1/warmup/summary");
    return response.data;
  },

  async createStrategy(payload: {
    name: string;
    description?: string;
    startDailyLimit: number;
    steadyStateDailyLimit: number;
    incrementPerStage: number;
    stageDurationDays: number;
    safetyTiers?: WarmupSafetyTier[];
    isAiGenerated?: boolean;
    aiRationale?: string | null;
    applyTo?: WarmupTarget;
  }) {
    const response = await apiRequest<{ strategy: WarmupStrategy; assignedCount: number }>("/api/v1/warmup/strategies", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  async assignStrategy(strategyId: number, target: WarmupTarget) {
    const response = await apiRequest<{ strategy: WarmupStrategy; assignedCount: number }>(`/api/v1/warmup/strategies/${strategyId}/assign`, {
      method: "POST",
      body: JSON.stringify(target),
    });
    return response.data;
  },

  async generateAiSchedule(payload: { domain?: string; mailboxIds?: number[] }) {
    const response = await apiRequest<AiRampSchedule>("/api/v1/warmup/generate-ai", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return response.data;
  },
};

export const domainService = {
  async list({ page = 1, limit = 10, search = "" }: { page?: number; limit?: number; search?: string } = {}) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set("search", search);
    const response = await apiRequest<DomainPage>(`/api/v1/domains?${params.toString()}`);
    return response.data;
  },

  async listHostedZones() {
    const response = await apiRequest<HostedZone[]>("/api/v1/domains/hosted-zones");
    return response.data;
  },

  async onboard(domains: string[]) {
    const response = await apiRequest<DomainOnboardResult[]>("/api/v1/domains/onboard", {
      method: "POST",
      body: JSON.stringify({ domains }),
    });
    return response.data;
  },

  async onboardExternal(domain: string) {
    const response = await apiRequest<DomainOnboardResult>("/api/v1/domains/onboard-external", {
      method: "POST",
      body: JSON.stringify({ domain }),
    });
    return response.data;
  },

  async refreshAll() {
    const response = await apiRequest<Domain[]>("/api/v1/domains/refresh", { method: "POST" });
    return response.data;
  },

  async refreshOne(domain: string) {
    const response = await apiRequest<Domain>(`/api/v1/domains/${encodeURIComponent(domain)}/refresh`, {
      method: "POST",
    });
    return response.data;
  },

  async getAccountStatus() {
    const response = await apiRequest<SesAccountStatus>("/api/v1/domains/account-status");
    return response.data;
  },

  async requestProductionAccess(payload: {
    mailType: "MARKETING" | "TRANSACTIONAL";
    websiteUrl: string;
    useCaseDescription?: string;
    additionalContactEmailAddresses?: string[];
  }) {
    const response = await apiRequest<SesAccountRequest>("/api/v1/domains/account-status/request", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  async getReputationTrend({ days = 7 }: { days?: number } = {}) {
    const response = await apiRequest<ReputationTrendPoint[]>(`/api/v1/domains/reputation-trend?days=${days}`);
    return response.data;
  },

  async remove(id: number) {
    const response = await apiRequest<{ id: number; domain: string; mailboxesDeleted: number }>(`/api/v1/domains/${id}`, {
      method: "DELETE",
    });
    return response.data;
  },
};

export const mailboxService = {
  async list({ page = 1, limit = 10, search = "" }: { page?: number; limit?: number; search?: string } = {}) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set("search", search);
    const response = await apiRequest<MailboxPage>(`/api/v1/mailboxes?${params.toString()}`);
    return response.data;
  },

  async create(payload: { domain: string; localParts: string[]; displayName?: string; dailyLimit?: number }) {
    const response = await apiRequest<MailboxCreateResult[]>("/api/v1/mailboxes", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  async refreshAll() {
    const response = await apiRequest<Mailbox[]>("/api/v1/mailboxes/refresh", { method: "POST" });
    return response.data;
  },

  async refreshOne(id: number) {
    const response = await apiRequest<Mailbox>(`/api/v1/mailboxes/${id}/refresh`, { method: "POST" });
    return response.data;
  },

  async remove(id: number) {
    const response = await apiRequest<{ id: number; email: string }>(`/api/v1/mailboxes/${id}`, {
      method: "DELETE",
    });
    return response.data;
  },

  async messages(id: number, { page = 1, limit = 30 }: { page?: number; limit?: number } = {}) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    const response = await apiRequest<MailboxInboxPage>(`/api/v1/mailboxes/${id}/messages?${params.toString()}`);
    return response.data;
  },
};

export const inboxService = {
  async listThreads({
    page = 1,
    limit = 25,
    search = "",
    mailboxId,
    unreadOnly = false,
  }: { page?: number; limit?: number; search?: string; mailboxId?: number; unreadOnly?: boolean } = {}) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set("search", search);
    if (mailboxId) params.set("mailboxId", String(mailboxId));
    if (unreadOnly) params.set("unreadOnly", "true");
    const response = await apiRequest<InboxThreadPage>(`/api/v1/mailer-inbox/threads?${params.toString()}`);
    return response.data;
  },

  async getThread(mailboxId: number, threadId: string) {
    const response = await apiRequest<InboxThreadDetail>(
      `/api/v1/mailer-inbox/threads/${mailboxId}/${encodeURIComponent(threadId)}`
    );
    return response.data;
  },

  async markThreadRead(mailboxId: number, threadId: string) {
    await apiRequest(`/api/v1/mailer-inbox/threads/${mailboxId}/${encodeURIComponent(threadId)}/read`, { method: "POST" });
  },

  async sendReply(mailboxId: number, threadId: string, body: string) {
    const response = await apiRequest<MailboxInboxMessage>(`/api/v1/mailer-inbox/threads/${mailboxId}/${encodeURIComponent(threadId)}/reply`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
    return response.data;
  },
};

export const aiAgentService = {
  async list() {
    try {
      const response = await apiRequest<Agent[]>("/api/v1/ai-agents");

      return response.data.map(normalizeAgentForUi);
    } catch (error) {
      if (!(error instanceof ApiRequestError) || error.status >= 500) {
        return agents;
      }

      throw error;
    }
  },

  async get(id: number) {
    const response = await apiRequest<Agent>(`/api/v1/ai-agents/${id}`);

    return normalizeAgentForUi(response.data);
  },

  async create(payload: CreateAgentPayload) {
    const response = await apiRequest<Agent>("/api/v1/ai-agents", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return normalizeAgentForUi(response.data);
  },

  async update(id: number, payload: Partial<CreateAgentPayload>) {
    const response = await apiRequest<Agent>(`/api/v1/ai-agents/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    return normalizeAgentForUi(response.data);
  },

  async delete(id: number) {
    await apiRequest<{ id: number }>(`/api/v1/ai-agents/${id}`, {
      method: "DELETE",
    });
  },
};

export interface CreateAgentPayload {
  name: string;
  description?: string;
  role: string;
  persona: string;
  tone: string;
  responseStyle: string;
  companyName: string;
  website?: string;
  industry?: string;
  valueProposition?: string;
  objective: string;
  successCriteria?: string;
  language: string;
  autoDetectLanguage: boolean;
  responseRules?: string;
  fallbackMeetingUrl?: string | null;
  meetingDurationMinutes?: number;
  workingHoursStart?: string;
  workingHoursEnd?: string;
  timezone?: string;
  knowledgeSources?: string;
  knowledgeSourceIds?: number[];
  trainingExamples?: string;
  aiProvider: string;
  model: string;
  automationMode: string;
  confidenceThreshold: number;
  humanReview: boolean;
  autoReplyEnabled: boolean;
  status: "Active" | "Paused" | "Draft";
}

function normalizeAgentForUi(agent: Agent): Agent {
  return {
    ...agent,
    purpose: agent.description || agent.objective || agent.purpose || "Configured sales response workflow",
    model: agent.aiProvider ? `${agent.aiProvider} · ${agent.model}` : agent.model,
    inbox: agent.inbox || "Unassigned",
    autoReply: Boolean(agent.autoReply),
    updated: agent.updated || formatAgentDate(agent.updatedAt),
  };
}

function formatAgentDate(date?: string) {
  if (!date) return "Just now";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export interface AiModelsResponse {
  provider: string;
  models: string[];
}

export const aiModelService = {
  async list(provider: string) {
    const response = await apiRequest<AiModelsResponse>(`/api/v1/ai-models?provider=${encodeURIComponent(provider)}`);

    return response.data.models;
  },
};

export const knowledgeService = {
  async list({
    category,
    page = 1,
    limit = 25,
    search,
    status,
  }: {
    category?: string;
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  } = {}) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    if (search) params.set("search", search);
    if (status && status !== "All") params.set("status", status);
    if (category && category !== "All") params.set("category", category);

    const response = await apiRequest<KnowledgePage>(`/api/v1/knowledge?${params.toString()}`);

    return {
      ...response.data,
      items: response.data.items.map(normalizeKnowledgeForUi),
    };
  },

  async create(payload: {
    agentIds?: number[];
    category?: string;
    contentText?: string;
    file?: File | null;
    owner?: string;
    sourceType?: string;
    sourceUrl?: string;
    status?: string;
    title: string;
    usageGuidance?: string;
  }) {
    const formData = new FormData();

    formData.set("title", payload.title);
    if (payload.category) formData.set("category", payload.category);
    if (payload.contentText) formData.set("contentText", payload.contentText);
    if (payload.owner) formData.set("owner", payload.owner);
    if (payload.sourceType) formData.set("sourceType", payload.sourceType);
    if (payload.sourceUrl) formData.set("sourceUrl", payload.sourceUrl);
    if (payload.status) formData.set("status", payload.status);
    if (payload.usageGuidance) formData.set("usageGuidance", payload.usageGuidance);
    if (payload.agentIds?.length) formData.set("agentIds", payload.agentIds.join(","));
    if (payload.file) formData.set("file", payload.file);

    const response = await apiRequest<KnowledgeItem>("/api/v1/knowledge", {
      method: "POST",
      body: formData,
    });

    return normalizeKnowledgeForUi(response.data);
  },

  async delete(id: number) {
    await apiRequest<{ id: number }>(`/api/v1/knowledge/${id}`, {
      method: "DELETE",
    });
  },
};

function normalizeKnowledgeForUi(source: KnowledgeItem): KnowledgeItem {
  return {
    ...source,
    updated: formatAgentDate(source.updatedAt || source.updated),
    agents: source.agents || [],
  };
}

export const reviewService = {
  async list({ page = 1, limit = 10 }: { page?: number; limit?: number } = {}) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    const response = await apiRequest<HumanReviewPage>(`/api/v1/reviews?${params.toString()}`);

    return response.data;
  },

  async count({ cap = 100 }: { cap?: number } = {}) {
    const response = await apiRequest<{ count: number }>("/api/v1/reviews/count");
    const count = response.data.count;

    return { count: Math.min(count, cap), hasMore: count > cap };
  },
};

export const leadService = {
  async list() {
    try {
      const response = await apiRequest<LeadPage>("/api/v1/leads");

      return {
        ...response.data,
        items: response.data.items.map((lead) => ({
          ...lead,
          updated: formatAgentDate(lead.updatedAt || lead.updated),
        })),
      };
    } catch (error) {
      if (!(error instanceof ApiRequestError) || error.status >= 500) {
        return {
          items: leads,
          stats: {
            totalLeads: leads.length,
            highInterest: leads.filter((lead) => lead.intent === "Interested" || lead.intent === "Meeting Request").length,
            meetingStage: leads.filter((lead) => lead.stage === "Meeting").length,
            humanManaged: leads.filter((lead) => lead.owner === "Human Managed").length,
          },
        };
      }

      throw error;
    }
  },
};

export const forwardedLeadService = {
  async list({ page = 1, limit = 10 }: { page?: number; limit?: number } = {}) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    const response = await apiRequest<ForwardedLeadPage>(`/api/v1/forwarded-leads?${params.toString()}`);

    return response.data;
  },
};

export const trainingService = {
  list: () => trainingExamples,
};

export const eventLogService = {
  async list({ page = 1, limit = 10 }: { page?: number; limit?: number } = {}) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    const response = await apiRequest<EventLogPage>(`/api/v1/event-logs?${params.toString()}`);

    return response.data;
  },
};

export const notificationService = {
  async list({ page = 1, limit = 20 }: { page?: number; limit?: number } = {}) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    const response = await apiRequest<NotificationPage>(`/api/v1/notifications?${params.toString()}`);

    return response.data;
  },
};

export const aiDebugService = {
  getLatestRun: () => aiDebugRun,
};

export interface PlusVibeConnection {
  id: number | null;
  provider: "PlusVibe";
  workspaceId: string;
  workspaceName: string;
  apiKeyScope: "account" | "workspace";
  webhookEventType: string;
  apiKeyConfigured: boolean;
  apiKeyPreview: string | null;
  webhookUrl: string;
  connectionStatus: "Connected" | "Configured" | "Disconnected" | "Error";
  apiStatus: string;
  webhookStatus: string;
  connectedInboxes: number;
  syncedCampaigns: number;
  lastApiRequest: string | null;
  lastWebhook: string | null;
  lastSync: string | null;
  lastError: string | null;
  updatedAt: string | null;
  remote?: {
    webhookCount?: number;
    inboxes?: PlusVibeInbox[];
    totalWorkspaces?: number | null;
    totalLeads?: number | null;
  };
}

export interface PlusVibeInbox {
  id: string | null;
  email: string | null;
  name: string;
  status: string;
  provider: string | null;
}

export interface PlusVibeConnectionPayload {
  apiKey?: string;
  apiKeyScope?: "account" | "workspace";
  workspaceId: string;
  workspaceName?: string;
  webhookEventType?: string;
  webhookUrl?: string;
}

export const plusVibeService = {
  async getConnection() {
    try {
      const response = await apiRequest<PlusVibeConnection>("/api/v1/plusvibe/connection");

      return response.data;
    } catch (error) {
      if (!(error instanceof ApiRequestError) || error.status >= 500) {
        return getDisconnectedPlusVibeState();
      }

      throw error;
    }
  },

  async saveConnection(payload: PlusVibeConnectionPayload) {
    const response = await apiRequest<PlusVibeConnection>("/api/v1/plusvibe/connection", {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    return response.data;
  },

  async testConnection(payload?: Partial<PlusVibeConnectionPayload>) {
    const response = await apiRequest<PlusVibeConnection>("/api/v1/plusvibe/test", {
      method: "POST",
      body: JSON.stringify(payload || {}),
    });

    return response.data;
  },

  async refresh() {
    const response = await apiRequest<PlusVibeConnection>("/api/v1/plusvibe/refresh", {
      method: "POST",
    });

    return response.data;
  },

  async listInboxes() {
    const response = await apiRequest<PlusVibeInbox[]>("/api/v1/plusvibe/inboxes");

    return response.data;
  },

  async listCampaigns() {
    const response = await apiRequest<PlusVibeCampaign[]>("/api/v1/plusvibe/campaigns");

    return response.data;
  },

  async syncCampaigns() {
    const response = await apiRequest<PlusVibeCampaign[]>("/api/v1/plusvibe/campaigns/sync", {
      method: "POST",
    });

    return response.data;
  },

  async assignCampaignAgent(campaignId: number, aiAgentId: number | null) {
    const response = await apiRequest<PlusVibeCampaign>(`/api/v1/plusvibe/campaigns/${campaignId}/agent`, {
      method: "PATCH",
      body: JSON.stringify({ aiAgentId }),
    });

    return response.data;
  },

  getWebhookEndpoint() {
    return `${API_BASE_URL}/api/v1/plusvibe/webhook`;
  },
};

export interface GhlConnection {
  id: number | null;
  provider: "GHL";
  locationId: string;
  locationName: string;
  apiKeyConfigured: boolean;
  apiKeyPreview: string | null;
  connectionStatus: "Connected" | "Configured" | "Disconnected" | "Error";
  apiStatus: string;
  syncedLeads: number;
  lastApiRequest: string | null;
  lastSync: string | null;
  lastError: string | null;
  updatedAt: string | null;
}

export interface GhlConnectionPayload {
  apiKey?: string;
  locationId: string;
  locationName?: string;
}

export const ghlService = {
  async getConnection() {
    try {
      const response = await apiRequest<GhlConnection>("/api/v1/ghl/connection");

      return response.data;
    } catch (error) {
      if (!(error instanceof ApiRequestError) || error.status >= 500) {
        return getDisconnectedGhlState();
      }

      throw error;
    }
  },

  async saveConnection(payload: GhlConnectionPayload) {
    const response = await apiRequest<GhlConnection>("/api/v1/ghl/connection", {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    return response.data;
  },

  async testConnection(payload?: Partial<GhlConnectionPayload>) {
    const response = await apiRequest<GhlConnection>("/api/v1/ghl/test", {
      method: "POST",
      body: JSON.stringify(payload || {}),
    });

    return response.data;
  },
};

export const calendarService = {
  async getConnections(agentId: number) {
    const response = await apiRequest<CalendarConnection[]>(`/api/v1/calendar/connections?agentId=${agentId}`);

    return response.data;
  },

  async startGoogleAuth(agentId: number) {
    const response = await apiRequest<{ url: string }>(`/api/v1/calendar/google/auth?agentId=${agentId}`);

    return response.data;
  },

  async disconnect(connectionId: number) {
    await apiRequest<{ id: number }>(`/api/v1/calendar/connections/${connectionId}`, {
      method: "DELETE",
    });
  },
};

export const messageService = {
  async listConversations({
    campaignId = "",
    label = "",
    lead = "",
    limit = 20,
    pageTrail = "",
  }: {
    campaignId?: string | null;
    label?: string | null;
    lead?: string | null;
    limit?: number;
    pageTrail?: string | null;
  } = {}) {
    const params = new URLSearchParams({
      limit: String(limit),
      pageTrail: pageTrail || "",
    });

    if (campaignId) params.set("campaignId", campaignId);
    if (label) params.set("label", label);
    if (lead) params.set("lead", lead);

    const response = await apiRequest<MessageConversationPage>(`/api/v1/messages/conversations?${params.toString()}`);

    return response.data;
  },

  async countConversations({ cap = 100 }: { cap?: number } = {}) {
    const pageSize = 50;
    let pageTrail = "";
    let count = 0;
    let hasMore = false;

    do {
      const page = await this.listConversations({ limit: pageSize, pageTrail });
      count += page.items.length;
      hasMore = page.hasMore;
      pageTrail = page.nextPageTrail || "";

      if (count > cap) {
        return { count: cap, hasMore: true };
      }
    } while (hasMore && pageTrail);

    return { count, hasMore };
  },

  async getConversation(threadId: string) {
    const response = await apiRequest<MessageConversationDetail>(`/api/v1/messages/conversations/${encodeURIComponent(threadId)}`);

    return response.data;
  },

  async sendReply(threadId: string, payload: { body: string; subject?: string | null; from?: string | null; to?: string | null; replyToId?: string | null }) {
    const response = await apiRequest<{ status: string; remoteMessageId: string | null }>(`/api/v1/messages/conversations/${encodeURIComponent(threadId)}/reply`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return response.data;
  },

  async generateDraft(threadId: string, payload: { regenerate?: boolean } = {}) {
    const response = await apiRequest<AiResponseDraft>(`/api/v1/messages/conversations/${encodeURIComponent(threadId)}/draft`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return response.data;
  },

  async approveDraft(draftId: number, payload: { body?: string; subject?: string | null; from?: string | null; to?: string | null } = {}) {
    const response = await apiRequest<AiResponseDraft>(`/api/v1/messages/drafts/${draftId}/approve`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return response.data;
  },

  async rejectDraft(draftId: number) {
    const response = await apiRequest<AiResponseDraft>(`/api/v1/messages/drafts/${draftId}/reject`, {
      method: "POST",
    });

    return response.data;
  },
};

function getDisconnectedPlusVibeState(): PlusVibeConnection {
  return {
    id: null,
    provider: "PlusVibe",
    workspaceId: "",
    workspaceName: "",
    apiKeyScope: "workspace",
    webhookEventType: "ALL_EMAIL_REPLIES",
    apiKeyConfigured: false,
    apiKeyPreview: null,
    webhookUrl: "",
    connectionStatus: "Disconnected",
    apiStatus: "Not configured",
    webhookStatus: "Not configured",
    connectedInboxes: 0,
    syncedCampaigns: 0,
    lastApiRequest: null,
    lastWebhook: null,
    lastSync: null,
    lastError: null,
    updatedAt: null,
  };
}

function getDisconnectedGhlState(): GhlConnection {
  return {
    id: null,
    provider: "GHL",
    locationId: "",
    locationName: "",
    apiKeyConfigured: false,
    apiKeyPreview: null,
    connectionStatus: "Disconnected",
    apiStatus: "Not configured",
    syncedLeads: 0,
    lastApiRequest: null,
    lastSync: null,
    lastError: null,
    updatedAt: null,
  };
}
