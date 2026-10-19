import { ApiRequestError, apiRequest } from "./api";
import { getViewAs } from "../utils/viewAs";

export type TriggerType = "trigger.inbox_mail" | "trigger.plusvibe_reply" | "trigger.mail_sent";
export type NodeType =
  | TriggerType
  | "action.save_to_db"
  | "action.ai_agent"
  | "action.send_reply"
  | "condition.keyword"
  | "action.offer_times"
  | "condition.slot_selected"
  | "action.book_meeting"
  | "action.notify_email";

export type WorkflowNodeData = {
  mailboxIds?: number[] | "all";
  campaignIds?: string[] | "all";
  agentId?: number | "campaign";
  tone?: string;
  instructions?: string;
  mode?: "auto_send" | "review" | "agent_default";
  via?: "plusvibe" | "mailbox";
  mailboxId?: number;
  keywords?: string[];
  matchOn?: "reply" | "subject";
  /** offer_times: how many times to offer (1-5, default 3). */
  count?: number;
  /** notify_email */
  to?: string[];
  notifyOwners?: boolean;
  subject?: string;
  message?: string;
  includeReply?: boolean;
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
  trigger_type: TriggerType | null;
  trigger_scope?: "all" | "specific" | null;
  /** "all" or the campaign/mailbox ids the trigger is limited to. */
  trigger_targets?: "all" | (string | number)[] | null;
  /** Run order among workflows active for the same trigger: lower runs first (1 to 1000, default 100). */
  priority?: number;
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
  /** Test runs only: other active workflows that would also run on this trigger. */
  note?: string;
  other_active_workflows?: { id: number; name: string; priority: number }[];
}

export interface CampaignInfo {
  id: string;
  name: string;
  agentId?: number | null;
  agentName?: string | null;
}

export interface WorkflowMeta {
  mailboxes: { id: number; email: string }[];
  agents: { id: number; name: string }[];
  plusvibeConnected: boolean;
  plusvibeCampaigns: CampaignInfo[];
  campaigns?: CampaignInfo[];
  /** Agents (of this workspace) with a connected Google Calendar. */
  calendarAgentIds?: number[];
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
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const viewAs = getViewAs();
  if (viewAs) headers["X-View-As-Workspace"] = String(viewAs.id);
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: "include",
      headers,
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiRequestError("We could not reach the server. Please check your connection and try again.", 0);
  }
  const payload = await response.json().catch(() => null) as
    | { message?: string; code?: string; data?: { problems?: WorkflowProblem[] } & T }
    | null;
  if (!response.ok) {
    const message = payload?.message || "The workflow could not be saved.";
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
    return (await apiRequest<WorkflowSummary[]>("/api/v1/workflows")).data;
  },
  async meta() {
    return (await apiRequest<WorkflowMeta>("/api/v1/workflows/meta")).data;
  },
  async get(id: number | string) {
    return (await apiRequest<Workflow>(`/api/v1/workflows/${id}`)).data;
  },
  create(body: {
    name: string;
    description?: string;
    template?: "default_reply" | "book_meetings";
    /** book_meetings only. */
    trigger?: "inbox_mail" | "plusvibe_reply";
    mode?: "auto_send" | "review" | "agent_default";
    priority?: number;
  }) {
    return writeRequest<Workflow>("/api/v1/workflows", "POST", body);
  },
  update(id: number | string, body: { name?: string; description?: string; graph?: Graph; is_active?: boolean; priority?: number }) {
    return writeRequest<Workflow>(`/api/v1/workflows/${id}`, "PUT", body);
  },
  async remove(id: number | string) {
    await apiRequest<unknown>(`/api/v1/workflows/${id}`, { method: "DELETE" });
  },
  async test(id: number | string, sample?: SampleEmail) {
    return (await apiRequest<Run>(`/api/v1/workflows/${id}/test`, {
      method: "POST",
      body: JSON.stringify(sample ? { sample } : {}),
    })).data;
  },
  async runs(id: number | string, limit = 20) {
    return (await apiRequest<Run[]>(`/api/v1/workflows/${id}/runs?limit=${limit}`)).data;
  },
};

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
