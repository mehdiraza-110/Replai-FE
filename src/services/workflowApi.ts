import { ApiRequestError, apiRequest } from "./api";

export type TriggerType = "trigger.inbox_mail" | "trigger.plusvibe_reply" | "trigger.mail_sent";
export type NodeType =
  | TriggerType
  | "action.save_to_db"
  | "action.ai_agent"
  | "action.send_reply"
  | "condition.keyword";

export type WorkflowNodeData = {
  mailboxIds?: number[] | "all";
  campaignIds?: string[] | "all";
  agentId?: number;
  tone?: string;
  instructions?: string;
  mode?: "auto_send" | "review";
  via?: "plusvibe" | "mailbox";
  mailboxId?: number;
  keywords?: string[];
  matchOn?: "reply" | "subject";
  [key: string]: unknown;
};

export interface GraphNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: WorkflowNodeData;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface RunSummary {
  status: string;
  started_at: string;
}

export interface WorkflowSummary {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  node_count: number;
  updated_at: string;
  last_run: RunSummary | null;
}

export interface Workflow extends WorkflowSummary {
  graph: Graph;
}

export interface RunStep {
  nodeId: string;
  type: string;
  status: string;
  startedAt?: string;
  finishedAt?: string;
  output?: unknown;
  error?: string | null;
}

export interface Run {
  id: number;
  workflow_id: number;
  trigger_type: string;
  status: string;
  dry_run: boolean;
  steps: RunStep[];
  error: string | null;
  started_at: string;
  finished_at: string | null;
}

export interface WorkflowMeta {
  mailboxes: { id: number; email: string }[];
  agents: { id: number; name: string }[];
  plusvibeConnected: boolean;
  plusvibeCampaigns: { id: string; name: string }[];
}

export interface WorkflowProblem {
  nodeId?: string;
  message: string;
}

export interface SampleEmail {
  from: string;
  subject: string;
  body: string;
}

export class WorkflowProblemsError extends Error {
  problems: WorkflowProblem[];
  status: number;
  constructor(message: string, problems: WorkflowProblem[], status: number) {
    super(message);
    this.name = "WorkflowProblemsError";
    this.problems = problems;
    this.status = status;
  }
}

/**
 * apiRequest drops the response body on errors, so error payloads that carry
 * `data.problems` are re-read with a small raw fetch only for save calls.
 */
const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:3001").replace(/\/$/, "");

async function writeRequest<T>(path: string, method: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiRequestError("We could not reach the server. Please check your connection and try again.", 0);
  }
  const payload = await response.json().catch(() => null) as
    | { message?: string; code?: string; data?: { problems?: WorkflowProblem[] } & T }
    | null;
  if (!response.ok) {
    const message = payload?.message || (response.status === 409
      ? "Another workflow is already active for this trigger."
      : "The workflow could not be saved.");
    const problems = payload?.data?.problems;
    if (Array.isArray(problems) && problems.length > 0) {
      throw new WorkflowProblemsError(message, problems, response.status);
    }
    throw new ApiRequestError(message, response.status, payload?.code);
  }
  return payload?.data as T;
}

export const workflowApi = {
  async list() {
    return (await apiRequest<WorkflowSummary[]>("/workflows")).data;
  },
  async meta() {
    return (await apiRequest<WorkflowMeta>("/workflows/meta")).data;
  },
  async get(id: number | string) {
    return (await apiRequest<Workflow>(`/workflows/${id}`)).data;
  },
  create(body: { name: string; description?: string; template?: "default_reply" }) {
    return writeRequest<Workflow>("/workflows", "POST", body);
  },
  update(id: number | string, body: { name?: string; description?: string; graph?: Graph; is_active?: boolean }) {
    return writeRequest<Workflow>(`/workflows/${id}`, "PUT", body);
  },
  async remove(id: number | string) {
    await apiRequest<unknown>(`/workflows/${id}`, { method: "DELETE" });
  },
  async test(id: number | string, sample?: SampleEmail) {
    return (await apiRequest<Run>(`/workflows/${id}/test`, {
      method: "POST",
      body: JSON.stringify(sample ? { sample } : {}),
    })).data;
  },
  async runs(id: number | string, limit = 20) {
    return (await apiRequest<Run[]>(`/workflows/${id}/runs?limit=${limit}`)).data;
  },
};

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
