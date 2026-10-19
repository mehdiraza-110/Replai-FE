import { apiRequest } from "./api";

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
}

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
