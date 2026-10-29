import { apiRequest } from "../../services/api";

export type InboxStatus = "Active" | "Paused" | "Error";
export type AccountKind = "warmed" | "warming" | "queued" | "paused" | "prewarmed" | "external";
export type HealthFilter = "" | "attention" | "healthy";
export type InboxSort = "created" | "name" | "email" | "sent" | "warmup" | "health" | "status";

export interface Inbox {
  id: number;
  name: string;
  email: string;
  domain: string;
  status: InboxStatus;
  sentToday: number;
  dailyLimit: number;
  warmupSent: number;
  warmupStage: string;
  warmupState: string | null;
  warmupDay: number | null;
  health: { score: number; reasons: string[]; label: string };
  accountType: { kind: AccountKind; label: string; source: string };
  lastSentAt: string | null;
  createdAt: string;
}

export interface InboxPage {
  items: Inbox[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  summary: { total: number; active: number; paused: number; error: number; warming: number; needAttention: number; averageHealth: number | null };
}

export interface DomainRow {
  id: number;
  domain: string;
  provider: string;
  status: string;
  spf: string;
  dkim: string;
  dmarc: string;
  mx: string;
  reputation: string | null;
  lastCheckedAt: string | null;
  lastError: string | null;
  bounceRate: number | null;
  complaintRate: number | null;
  inboxes: number;
  activeInboxes: number;
  warmingInboxes: number;
  createdAt: string;
}

export interface DomainPage {
  items: DomainRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface BulkResult {
  requested: number;
  registered: number;
  failed: number;
  inboxesCreated: number;
  results: Array<{ domain: string; ok: boolean; error?: string; mailboxes?: number }>;
}

export interface DnsRecord { key: string; type: string; name: string; value: string; purpose: string; required: boolean; manual?: boolean; status: string }
export interface DomainDns { managed: boolean; provider: string; domain: string; note?: string; records: DnsRecord[]; dkimSelector?: string | null; unreliable?: boolean; canAutoApply?: boolean; registrar?: string }
export interface ApplyResult { added: string[]; alreadyThere: string[]; conflicts: Array<{ key: string; existing: string[] }>; dns: DomainDns }

export interface OnboardStep { step: string; ok: boolean; detail: string }
export interface OnboardResult { domain: string; ok: boolean; dryRun?: boolean; steps: OnboardStep[]; error?: string; needsAttention?: boolean; pool?: { name: string; ip: string | null } | null }
export interface OnboardOutcome { dryRun: boolean; requested: number; succeeded: number; failed: number; results: OnboardResult[] }
export interface SyncOutcome { inPostal: number; alreadyHere: number; added: string[]; failed: Array<{ domain: string; error?: string }>; pools: Array<{ name: string; domains: number }>; perPool: number }
export interface PostalReadiness { mailServer: boolean; dns: boolean; perPool: number }

async function data<T>(request: Promise<{ data: T }>): Promise<T> {
  return (await request).data;
}

export const emailAccountsApi = {
  inboxes(params: { search?: string; status?: InboxStatus | ""; type?: AccountKind | ""; health?: HealthFilter; sort?: InboxSort; dir?: "asc" | "desc"; page?: number; limit?: number }) {
    const query = new URLSearchParams({ page: String(params.page ?? 1), limit: String(params.limit ?? 50), sort: params.sort ?? "created", dir: params.dir ?? "desc" });
    if (params.search?.trim()) query.set("search", params.search.trim());
    if (params.status) query.set("status", params.status);
    if (params.type) query.set("type", params.type);
    if (params.health) query.set("health", params.health);
    return data(apiRequest<InboxPage>(`/api/v1/email-accounts/inboxes?${query}`));
  },
  updateInbox: (id: number, body: Partial<{ status: "Active" | "Paused"; displayName: string }>) =>
    data(apiRequest<Inbox>(`/api/v1/email-accounts/inboxes/${id}`, { method: "PATCH", body: JSON.stringify(body) })),
  domains(params: { search?: string; status?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams({ page: String(params.page ?? 1), limit: String(params.limit ?? 50) });
    if (params.search?.trim()) query.set("search", params.search.trim());
    if (params.status) query.set("status", params.status);
    return data(apiRequest<DomainPage>(`/api/v1/email-accounts/domains?${query}`));
  },
  domainDns: (id: number) => data(apiRequest<DomainDns>(`/api/v1/email-accounts/domains/${id}/dns`)),
  setDkim: (id: number, dkimSelector: string) => data(apiRequest<DomainDns>(`/api/v1/email-accounts/domains/${id}/dkim`, { method: "PATCH", body: JSON.stringify({ dkimSelector }) })),
  applyDns: (id: number) => data(apiRequest<ApplyResult>(`/api/v1/email-accounts/domains/${id}/apply-dns`, { method: "POST" })),
  postalStatus: () => data(apiRequest<PostalReadiness>("/api/v1/email-accounts/postal/status")),
  onboard: (body: { domains: string[]; mailboxesPerDomain: number; autoStart: boolean; dryRun: boolean }) =>
    data(apiRequest<OnboardOutcome>("/api/v1/email-accounts/domains/onboard", { method: "POST", body: JSON.stringify(body) })),
  syncPostal: () => data(apiRequest<SyncOutcome>("/api/v1/email-accounts/domains/sync-postal", { method: "POST" })),
  bulkRegister: (body: { domains: string[]; mailboxesPerDomain: number; autoStart: boolean }) =>
    data(apiRequest<BulkResult>("/api/v1/email-accounts/domains/bulk", { method: "POST", body: JSON.stringify(body) })),
};
