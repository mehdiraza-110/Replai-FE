import { apiRequest } from "./api";
import type { PlanLimitKey, PlanLimitPeriod, WorkspacePlan } from "../types";

export type WorkspaceType = "organization" | "individual";
export type WorkspaceStatus = "active" | "suspended";
export type MemberRole = "owner" | "admin" | "member";

export interface MemberPermissions {
  auto_responder: boolean;
  cold_mailer: boolean;
}

export interface AdminMember {
  user_id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: MemberRole;
  permissions: MemberPermissions;
  created_at: string;
  is_you?: boolean;
}

export interface AdminWorkspace {
  id: number;
  name: string;
  slug: string;
  type: WorkspaceType;
  status: WorkspaceStatus;
  auto_responder_enabled: boolean;
  cold_mailer_enabled: boolean;
  platform_ai_enabled: boolean;
  created_at: string;
  member_count: number;
  owner: { id: number; email: string; name: string } | null;
  counts: { domains: number; mailboxes: number; campaigns: number; agents: number };
  /** List rows carry the plan name plus trial_ends_at/days_left; the detail endpoint returns the full plan object. */
  plan?: "trial" | "standard" | WorkspacePlan;
  trial_ends_at?: string | null;
  days_left?: number;
}

export interface AdminPlanInfo {
  type: "trial" | "standard";
  startedAt: string | null;
  endsAt: string | null;
  daysLeft: number;
  ended: boolean;
  limits: NonNullable<WorkspacePlan["limits"]>;
}

/** Reads a workspace's plan from either the list shape (string + trial_ends_at) or the detail shape (object). */
export function resolveAdminPlan(w: AdminWorkspace): AdminPlanInfo {
  const plan = w.plan;
  if (plan && typeof plan === "object") {
    return {
      type: plan.type,
      startedAt: plan.trial_started_at ?? null,
      endsAt: plan.trial_ends_at ?? null,
      daysLeft: plan.days_left ?? 0,
      ended: Boolean(plan.ended),
      limits: plan.limits ?? [],
    };
  }
  const endsAt = w.trial_ends_at ?? null;
  const ended = plan === "trial" && endsAt ? new Date(endsAt).getTime() < Date.now() : false;
  return { type: plan === "trial" ? "trial" : "standard", startedAt: null, endsAt, daysLeft: w.days_left ?? 0, ended, limits: [] };
}

export type PlanLimitsPayload = Partial<Record<PlanLimitKey, { limit: number | null; period: PlanLimitPeriod }>>;

export interface AdminAiProvider {
  provider: string;
  configured: boolean;
  preview?: string | null;
  source?: "workspace" | "platform" | null;
  updated_at?: string | null;
}

export interface AdminWorkspaceDetail extends AdminWorkspace {
  members: AdminMember[];
  aiProviders: AdminAiProvider[];
  usage: { emailsSent: number; repliesReceived: number; draftsGenerated: number };
}

export interface Paged<T> {
  items: T[];
  total: number;
  page?: number;
  limit?: number;
}

export interface WorkspaceListParams {
  search?: string;
  status?: WorkspaceStatus | "";
  page?: number;
  limit?: number;
}

export interface WorkspacePatch {
  name?: string;
  type?: WorkspaceType;
  status?: WorkspaceStatus;
  auto_responder_enabled?: boolean;
  cold_mailer_enabled?: boolean;
  platform_ai_enabled?: boolean;
  plan?: "trial" | "standard";
  trial_ends_at?: string;
  extend_trial_days?: number;
  limits?: PlanLimitsPayload;
}

export interface AddMemberPayload {
  email: string;
  role: "admin" | "member";
  permissions?: MemberPermissions;
  first_name?: string;
  last_name?: string;
  password?: string;
}

export interface AdminUser {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_super_admin: boolean;
  is_deleted: boolean;
  created_at: string;
  workspaces: Array<{ id: number; name: string; role: MemberRole }>;
}

export interface AdminAnalytics {
  totals: {
    workspaces: number;
    users: number;
    domains: number;
    mailboxes: number;
    campaigns: number;
    emailsSent: number;
    repliesReceived: number;
    draftsGenerated: number;
    meetingsBooked: number;
  };
  series: Array<{ date: string; emailsSent: number; repliesReceived: number }>;
  byWorkspace: Array<{
    workspaceId: number;
    name: string;
    emailsSent: number;
    repliesReceived: number;
    draftsGenerated: number;
    domains: number;
    mailboxes: number;
    campaigns: number;
    lastActivityAt: string | null;
  }>;
}


export interface AdminDomainWorkspaceRef {
  id: number;
  name: string;
  slug: string;
  type: WorkspaceType;
  status: WorkspaceStatus;
}

export interface AdminDomain {
  id: number;
  domain: string;
  provider: string;
  provider_label: string;
  status: string;
  mailbox_count: number;
  active_mailbox_count: number;
  warmup: { stages: Record<string, number>; avg_daily_limit: number | null };
  workspace: AdminDomainWorkspaceRef;
  owner: { id: number; email: string; name: string } | null;
  assigned_at: string | null;
  assigned_by_email: string | null;
  previous_workspace: { id: number; name: string } | null;
  created_at: string;
}

export interface AdminDomainMailbox {
  id: number;
  email: string;
  status: string;
  provider: string;
  provider_label: string;
  daily_limit: number | null;
  warmup_stage: string | null;
  warmup_strategy_name: string | null;
}

export interface AdminDomainHistoryEntry {
  at: string;
  from_workspace: string | null;
  to_workspace: string | null;
  by_email: string | null;
  notes: string | null;
}

export interface AdminDomainDetail extends AdminDomain {
  mailboxes: AdminDomainMailbox[];
  history: AdminDomainHistoryEntry[];
}

export interface AdminDomainListParams {
  search?: string;
  workspaceId?: number | "";
  provider?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface AssignPreview {
  domains: Array<{
    domain: string;
    provider_label: string;
    // The backend sends `workspace` / `owner_email`; the `current_*` names are accepted for older responses.
    workspace?: { id: number; name: string } | null;
    owner_email?: string | null;
    current_workspace?: { id: number; name: string } | null;
    current_owner_email?: string | null;
    mailboxes: Array<{ email: string; warmup_stage: string | null; daily_limit: number | null }>;
  }>;
  campaigns: Array<{
    id: number;
    name: string;
    workspaceName: string;
    mode?: string;
    isWarmup?: boolean;
    willKeepRunning: boolean;
    remainingMailboxes: number;
    willPause: boolean;
  }>;
  mailboxesMoving: number;
  warnings: string[];
  blocked: string[];
  requiresConfirmation?: boolean;
  requiresPlatformConfirmation?: boolean;
}

export interface AssignDomainsRequest {
  domains: string[];
  workspaceId: number;
  orderId?: number;
  confirmFromPlatform?: boolean;
  notes?: string;
}

export interface AssignDomainsResult {
  workspace: { id: number; name: string };
  domains: Array<{ id: number; domain: string; from_workspace: string | { id?: number; name: string } | null; mailboxes?: unknown[] }>;
  mailboxesMoved: number;
  campaigns: Array<{ id: number; name: string; outcome: "kept" | "paused"; remainingMailboxes: number }>;
  warmup?: unknown;
  order?: unknown;
}

/** The platform's own workspace: domains sitting here are the pool the super admin hands out from. */
export const PLATFORM_WORKSPACE_SLUG = "koval-group";

function qs(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

export const adminApi = {
  async getAnalytics(days: number) {
    return (await apiRequest<AdminAnalytics>(`/api/v1/admin/analytics${qs({ days })}`)).data;
  },
  async listWorkspaces(params: WorkspaceListParams) {
    return (await apiRequest<Paged<AdminWorkspace>>(`/api/v1/admin/workspaces${qs({ ...params })}`)).data;
  },
  async createWorkspace(payload: { name: string; type: WorkspaceType; ownerEmail: string }) {
    return (await apiRequest<AdminWorkspace>("/api/v1/admin/workspaces", json("POST", payload))).data;
  },
  async getWorkspace(id: number | string) {
    return (await apiRequest<AdminWorkspaceDetail>(`/api/v1/admin/workspaces/${id}`)).data;
  },
  async updateWorkspace(id: number | string, patch: WorkspacePatch) {
    return (await apiRequest<AdminWorkspace>(`/api/v1/admin/workspaces/${id}`, json("PATCH", patch))).data;
  },
  async startTrial(id: number | string, payload: { days?: number; limits?: PlanLimitsPayload } = {}) {
    return (await apiRequest<unknown>(`/api/v1/admin/workspaces/${id}/trial`, json("POST", payload))).data;
  },
  async resetUsage(id: number | string, kind?: PlanLimitKey) {
    return (await apiRequest<unknown>(`/api/v1/admin/workspaces/${id}/usage/reset`, json("POST", kind ? { kind } : {}))).data;
  },
  async deleteWorkspace(id: number | string) {
    await apiRequest<null>(`/api/v1/admin/workspaces/${id}`, json("DELETE"));
  },
  async addMember(workspaceId: number | string, payload: AddMemberPayload) {
    return (
      await apiRequest<{ member: AdminMember; temporaryPassword?: string }>(
        `/api/v1/admin/workspaces/${workspaceId}/members`,
        json("POST", payload),
      )
    ).data;
  },
  async updateMember(
    workspaceId: number | string,
    userId: number,
    patch: { role?: MemberRole; permissions?: MemberPermissions },
  ) {
    return (
      await apiRequest<AdminMember>(`/api/v1/admin/workspaces/${workspaceId}/members/${userId}`, json("PATCH", patch))
    ).data;
  },
  async removeMember(workspaceId: number | string, userId: number) {
    await apiRequest<null>(`/api/v1/admin/workspaces/${workspaceId}/members/${userId}`, json("DELETE"));
  },
  async listDomains(params: AdminDomainListParams) {
    return (await apiRequest<Paged<AdminDomain>>(`/api/v1/admin/domains${qs({ ...params })}`)).data;
  },
  async getDomain(id: number | string) {
    return (await apiRequest<AdminDomainDetail>(`/api/v1/admin/domains/${id}`)).data;
  },
  async previewAssign(payload: { domains: string[]; workspaceId: number }) {
    return (await apiRequest<AssignPreview>("/api/v1/admin/domains/assign/preview", json("POST", payload))).data;
  },
  async assignDomains(payload: AssignDomainsRequest) {
    return (await apiRequest<AssignDomainsResult>("/api/v1/admin/domains/assign", json("POST", payload))).data;
  },
  /** Every workspace, for pickers (pages through the list endpoint). */
  async listAllWorkspaces() {
    const all: AdminWorkspace[] = [];
    for (let page = 1; page <= 20; page += 1) {
      const result = await adminApi.listWorkspaces({ page, limit: 100 });
      all.push(...result.items);
      if (all.length >= result.total || result.items.length === 0) break;
    }
    return all;
  },
  async listUsers(params: { search?: string; page?: number; limit?: number }) {
    return (await apiRequest<Paged<AdminUser>>(`/api/v1/admin/users${qs({ ...params })}`)).data;
  },
  async updateUser(id: number, patch: { is_super_admin?: boolean; is_deleted?: boolean }) {
    return (await apiRequest<AdminUser>(`/api/v1/admin/users/${id}`, json("PATCH", patch))).data;
  },
};

export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  return error instanceof Error && error.message ? error.message : fallback;
}
