import {
  agents,
  aiDebugRun,
  conversations,
  inboxManagers,
  knowledgeItems,
  leadDestinations,
  leadRoutingRules,
  leads,
  metrics,
  trainingExamples,
} from "./mockData";
import type {
  Agent,
  AnalyticsOverview,
  AiResponseDraft,
  AuthUser,
  EventLogPage,
  HumanReviewPage,
  LeadPage,
  MessageConversationDetail,
  MessageConversationPage,
  PlusVibeCampaign,
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

  if (options.body && !headers.has("Content-Type")) {
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
    }), response.status, payload?.code);
  }

  if (!payload) {
    throw new Error("Something went wrong while loading this data. Please try again.");
  }

  return payload;
}

function getFriendlyErrorMessage({
  message,
  path,
  status,
}: {
  message?: string;
  path: string;
  status: number;
}) {
  const lowerMessage = String(message || "").toLowerCase();
  const isPlusVibeRoute = path.includes("/plusvibe") || path.includes("/messages") || path.includes("/leads") || lowerMessage.includes("plusvibe");

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
  knowledgeSources?: string;
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
  list: () => knowledgeItems,
};

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

export const leadRoutingService = {
  listDestinations: () => leadDestinations,
  listRules: () => leadRoutingRules,
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
