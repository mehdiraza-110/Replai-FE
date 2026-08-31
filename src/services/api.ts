import {
  agents,
  aiDebugRun,
  conversations,
  eventLogs,
  inboxManagers,
  knowledgeItems,
  leadDestinations,
  leadRoutingRules,
  leads,
  metrics,
  reviewQueue,
  trainingExamples,
} from "./mockData";
import type { AuthUser } from "../types";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:3001").replace(/\/$/, "");

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

async function apiRequest<T>(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok) {
    throw new Error(payload?.message || "Request failed");
  }

  if (!payload) {
    throw new Error("Empty response from server");
  }

  return payload;
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
};

export const conversationService = {
  list: () => conversations,
  getActive: () => conversations[0],
};

export const inboxManagerService = {
  list: () => inboxManagers,
};

export const aiAgentService = {
  list: () => agents,
};

export const knowledgeService = {
  list: () => knowledgeItems,
};

export const reviewService = {
  list: () => reviewQueue,
};

export const leadService = {
  list: () => leads,
};

export const leadRoutingService = {
  listDestinations: () => leadDestinations,
  listRules: () => leadRoutingRules,
};

export const trainingService = {
  list: () => trainingExamples,
};

export const eventLogService = {
  list: () => eventLogs,
};

export const aiDebugService = {
  getLatestRun: () => aiDebugRun,
};

export const plusVibeService = {
  getStatus: () => ({
    workspace: "PLWH Sales",
    apiStatus: "Connected",
    webhookStatus: "Receiving",
    lastWebhook: "4 minutes ago",
    lastApiRequest: "2 minutes ago",
  }),
};
