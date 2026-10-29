import { apiRequest, downloadFile } from "../../services/api";

export type Theme = "light" | "dark" | "system";
export interface NotificationPrefs {
  desktop: boolean;
  sounds: { enabled: boolean; ringtone: string; message: string; escalation: string; positive: string };
  interrupts: { calls: boolean; textReplies: boolean; escalations: boolean; positiveReplies: boolean; paymentProblems: boolean };
  quiet: { enabled: boolean; from: string; to: string; timezone: string };
}
export interface SidebarPrefs { hidden: string[]; groupNames: Record<string, string>; order: Record<string, string[]> }
export interface Preferences {
  notifications: NotificationPrefs;
  appearance: { theme: Theme; sidebar: SidebarPrefs };
  soundOptions: Record<"ringtone" | "message" | "escalation" | "positive", string[]>;
}
export interface PreferencesInput { notifications?: DeepPartial<NotificationPrefs>; appearance?: { theme?: Theme; sidebar?: Partial<SidebarPrefs> } }
type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

export interface WorkspaceSettings {
  color: string;
  colorConfigured: boolean;
  conferencing: { type: "google_meet" | "static"; staticUrl: string };
  sharing: { communication: boolean };
  coldEmail: { schedule: { from: string; to: string; timezone: string; days: string[] } };
  callAnalyzer: { language: string; frameworks: Record<string, string> };
  coldEmailConfigured: boolean;
  weekdays: string[];
}
export interface WorkspaceSettingsInput {
  color?: string;
  conferencing?: Partial<WorkspaceSettings["conferencing"]>;
  sharing?: Partial<WorkspaceSettings["sharing"]>;
  coldEmail?: { schedule: Partial<WorkspaceSettings["coldEmail"]["schedule"]> };
  callAnalyzer?: { language?: string; frameworks?: Record<string, string> };
}
export interface AuditEntry { id: number; summary: string; at: string; who: string }

export interface ApiToken { id: number; kind: "personal" | "workspace"; name: string; prefix: string; createdAt: string; lastUsedAt: string | null; createdBy: string | null; mine: boolean }
export interface Template { id: number; name: string; subject: string; body: string; shared: boolean; mine: boolean; ownerName: string | null; updatedAt: string }
export type FieldType = "text" | "number" | "date" | "select" | "checkbox";
export interface CustomField { id: number; entity: "deal" | "company"; key: string; label: string; type: FieldType; options: string[]; position: number }
export interface Outcome { id: number; name: string; group: "call" | "meeting"; system: boolean; position: number }
export interface Snapshot { id: string; name: string; description: string | null; version: number; builtIn: boolean; counts: { rules: number; templates: number; meetingTypes: number; outcomes: number; customFields: number; knowledgeBase: number }; updatedAt: string | null }
export interface BlockEntry { id: number; email: string; reason: string; source: string; campaignName: string | null; createdAt: string }
export interface BlockPage { items: BlockEntry[]; page: number; limit: number; total: number; totalPages: number }
export interface BillingSummary {
  plan: { type: "trial" | "standard"; trial_ends_at: string | null; days_left: number; ended: boolean; limits?: Array<{ key: string; label: string; limit: number | null; period: string; used: number; remaining: number | null }> } | null;
  domains: Array<{ id: number; domain: string; status: string; provider: string; inboxes: number; activeInboxes: number; addedAt: string }>;
  totals: { domains: number; inboxes: number; activeInboxes: number };
  openRequests: number;
}

async function data<T>(request: Promise<{ data: T }>): Promise<T> {
  return (await request).data;
}
const call = <T>(method: string, path: string, body?: unknown) => data(apiRequest<T>(`/api/v1/settings${path}`, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }));

export const settingsApi = {
  preferences: () => call<Preferences>("GET", "/preferences"),
  savePreferences: (body: PreferencesInput) => call<Preferences>("PATCH", "/preferences", body),
  workspace: () => call<WorkspaceSettings>("GET", "/workspace"),
  saveWorkspace: (body: WorkspaceSettingsInput) => call<WorkspaceSettings>("PATCH", "/workspace", body),
  audit: (area: string) => call<AuditEntry[]>("GET", `/audit?area=${encodeURIComponent(area)}`),

  tokens: (kind: "personal" | "workspace") => call<ApiToken[]>("GET", `/tokens?kind=${kind}`),
  createToken: (kind: "personal" | "workspace", name: string) => call<{ token: string; item: ApiToken }>("POST", "/tokens", { kind, name }),
  revokeToken: (id: number) => call<{ revoked: true }>("DELETE", `/tokens/${id}`),

  templates: (search = "") => call<{ items: Template[]; variables: string[] }>("GET", `/templates?search=${encodeURIComponent(search)}`),
  createTemplate: (body: Partial<Template>) => call<Template>("POST", "/templates", body),
  updateTemplate: (id: number, body: Partial<Template>) => call<Template>("PATCH", `/templates/${id}`, body),
  deleteTemplate: (id: number) => call<{ deleted: true }>("DELETE", `/templates/${id}`),

  fields: () => call<CustomField[]>("GET", "/custom-fields"),
  createField: (body: { entity: string; label: string; type: FieldType; options?: string[] }) => call<CustomField>("POST", "/custom-fields", body),
  updateField: (id: number, body: { label?: string; options?: string[] }) => call<CustomField>("PATCH", `/custom-fields/${id}`, body),
  deleteField: (id: number) => call<{ deleted: true }>("DELETE", `/custom-fields/${id}`),

  outcomes: () => call<Outcome[]>("GET", "/outcomes"),
  createOutcome: (body: { name: string; group: string }) => call<Outcome>("POST", "/outcomes", body),
  updateOutcome: (id: number, name: string) => call<Outcome>("PATCH", `/outcomes/${id}`, { name }),
  deleteOutcome: (id: number) => call<{ deleted: true }>("DELETE", `/outcomes/${id}`),

  snapshots: () => call<{ builtIn: Snapshot[]; custom: Snapshot[] }>("GET", "/snapshots"),
  captureSnapshot: (body: { name: string; description?: string }) => call<Snapshot>("POST", "/snapshots", body),
  applySnapshot: (id: string) => call<{ added: Record<string, number> }>("POST", `/snapshots/${encodeURIComponent(id)}/apply`, {}),
  deleteSnapshot: (id: string) => call<{ deleted: true }>("DELETE", `/snapshots/${encodeURIComponent(id)}`),

  blocklist: (p: { search?: string; page?: number }) => call<BlockPage>("GET", `/blocklist?page=${p.page ?? 1}&search=${encodeURIComponent(p.search ?? "")}`),
  blockAdd: (emails: string) => call<{ added: number; invalid: string[] }>("POST", "/blocklist", { emails }),
  blockRemove: (ids: number[]) => call<{ removed: number }>("POST", "/blocklist/remove", { ids }),
  blockImport: (text: string) => call<{ added: number; alreadyBlocked: number; invalid: string[]; invalidCount: number }>("POST", "/blocklist/import", { text }),
  blockExport: () => downloadFile("/api/v1/settings/blocklist/export", "blocklist.csv"),

  billing: () => call<BillingSummary>("GET", "/billing"),
};
