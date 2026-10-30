import { apiRequest } from "../../services/api";

export type ReplyMode = "default" | "auto" | "draft" | "escalate" | "no_reply";

export interface ReplyType {
  intent: string;
  label: string;
  hint: string;
  defaultMode: ReplyMode;
  locked?: boolean;
  mode: ReplyMode;
  instruction: string;
  customised: boolean;
}

export interface CoverageCampaign { id: number; name: string; status: string; agentId: number | null; agentName: string | null }

/** The legacy agent record (ai_agents). Only the fields the Replier edits are typed. */
export interface ReplierAgent {
  id: number;
  name: string;
  description: string | null;
  role: string;
  persona: string;
  tone: string;
  responseStyle: string;
  companyName: string;
  website: string | null;
  objective: string;
  language: string;
  responseRules: string | null;
  knowledgeSources: string | null;
  knowledgeSourceIds: number[];
  aiProvider: string;
  model: string;
  automationMode: string;
  confidenceThreshold: number;
  humanReview: boolean;
  autoReply: boolean;
  status: "Active" | "Paused" | "Draft" | "Archived";
  updatedAt: string;
}

export type AgentInput = Partial<Omit<ReplierAgent, "id" | "updatedAt" | "autoReply" | "model">> & { model?: string; autoReplyEnabled?: boolean };

export interface KnowledgeSource { id: number; title: string; category: string | null; sourceType: string; status: string }

const body = (value: unknown): RequestInit => ({ body: JSON.stringify(value) });
const put = (value: unknown): RequestInit => ({ method: "PUT", ...body(value) });

export const replierApi = {
  agents: async () => (await apiRequest<ReplierAgent[]>("/api/v1/ai-agents")).data,
  createAgent: async (input: AgentInput) => (await apiRequest<ReplierAgent>("/api/v1/ai-agents", { method: "POST", ...body(input) })).data,
  updateAgent: async (id: number, input: AgentInput) => (await apiRequest<ReplierAgent>(`/api/v1/ai-agents/${id}`, { method: "PATCH", ...body(input) })).data,
  deleteAgent: async (id: number) => { await apiRequest(`/api/v1/ai-agents/${id}`, { method: "DELETE" }); },
  knowledge: async () => (await apiRequest<{ items: KnowledgeSource[] }>("/api/v1/knowledge?page=1&limit=100")).data.items,
  models: async (provider: string) => (await apiRequest<{ models: string[] }>(`/api/v1/ai-models?provider=${encodeURIComponent(provider)}`)).data.models,
  replyTypes: async (agentId: number | "sdr") => (await apiRequest<ReplyType[]>(`/api/v1/replier/agents/${agentId}/reply-types`)).data,
  saveReplyTypes: async (agentId: number | "sdr", items: Array<Pick<ReplyType, "intent" | "mode" | "instruction">>) =>
    (await apiRequest<ReplyType[]>(`/api/v1/replier/agents/${agentId}/reply-types`, put({ replyTypes: items }))).data,
  coverage: async () => (await apiRequest<CoverageCampaign[]>("/api/v1/replier/coverage")).data,
  assignCampaign: async (campaignId: number, agentId: number | null) =>
    (await apiRequest<CoverageCampaign[]>(`/api/v1/replier/campaigns/${campaignId}/agent`, put({ agentId }))).data,
};
