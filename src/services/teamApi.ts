import { apiRequest } from "./api";

export type WorkspaceRole = "owner" | "admin" | "member";
export type WorkspaceType = "organization" | "individual";

export interface MemberPermissions {
  auto_responder: boolean;
  cold_mailer: boolean;
}

export interface WorkspaceDetail {
  id: number;
  name: string;
  slug: string;
  type: WorkspaceType;
  status: "active" | "suspended";
  auto_responder_enabled: boolean;
  cold_mailer_enabled: boolean;
  role: WorkspaceRole;
  permissions: MemberPermissions;
  platform_ai_enabled?: boolean;
  viewingAs?: boolean;
  created_at?: string;
}

export interface Member {
  user_id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: WorkspaceRole;
  permissions: MemberPermissions;
  created_at: string;
  is_you: boolean;
}

export interface AddMemberPayload {
  email: string;
  role: "admin" | "member";
  permissions?: MemberPermissions;
  first_name?: string;
  last_name?: string;
  password?: string;
}

export interface UpdateMemberPayload {
  role?: WorkspaceRole;
  permissions?: MemberPermissions;
}

export const teamApi = {
  async getWorkspace() {
    const response = await apiRequest<WorkspaceDetail>("/api/v1/workspaces/current");
    return response.data;
  },

  async renameWorkspace(name: string) {
    const response = await apiRequest<WorkspaceDetail>("/api/v1/workspaces/current", {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
    return response.data;
  },

  async listMembers() {
    const response = await apiRequest<Member[]>("/api/v1/members");
    return response.data;
  },

  async addMember(payload: AddMemberPayload) {
    const response = await apiRequest<{ member: Member; temporaryPassword?: string }>("/api/v1/members", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  async updateMember(userId: number, payload: UpdateMemberPayload) {
    const response = await apiRequest<Member>(`/api/v1/members/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  async removeMember(userId: number) {
    await apiRequest<unknown>(`/api/v1/members/${userId}`, { method: "DELETE" });
  },
};

export function memberDisplayName(member: Pick<Member, "first_name" | "last_name" | "email">) {
  return [member.first_name, member.last_name].filter(Boolean).join(" ") || member.email;
}

export function canManageMember(actorRole: WorkspaceRole, member: Member, members: Member[]) {
  const ownerCount = members.filter((item) => item.role === "owner").length;
  const lastOwner = member.role === "owner" && ownerCount <= 1;
  const targetAllowed = actorRole === "owner" || (actorRole === "admin" && member.role === "member");

  return {
    canEdit: targetAllowed && !member.is_you,
    canRemove: targetAllowed && !lastOwner && (!member.is_you || actorRole === "owner"),
    lastOwner,
  };
}
