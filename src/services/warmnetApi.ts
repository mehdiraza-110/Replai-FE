import { apiRequest } from "./api";

// Super-admin warm-up network ("Deliverability"). Shapes mirror Replai-BE services/warmnet*.service.js.

export type WarmState = "queued" | "warming" | "paused" | "ready" | "released";
export type Placement = "unknown" | "inbox" | "spam" | "other";
export type WarningLevel = "info" | "warn" | "error" | "success";

export interface TickSummary {
  sent?: number;
  failed?: number;
  seedReplies?: number;
  counterReplies?: number;
  rolled?: number;
  ready?: number;
  skippedNoSeed?: number;
  skippedBlocklisted?: number;
  inWindow?: boolean;
  skipped?: string;
}

export interface WarmnetOverview {
  enabled: boolean;
  timezone: string;
  mailboxes: Record<WarmState, number>;
  mailboxTotal: number;
  domains: number;
  seeds: { active: number; paused: number; error: number; activeCapacity: number };
  today: { sent: number; failed: number; replies: number };
  placement7d: { inbox: number; spam: number; unknown: number; rescued: number; inboxRate: number | null; replied: number };
  capacity: { demand: number; seedCapacity: number; shortBy: number };
  ips: { total: number; listed: number; unchecked: number };
  engine: { lastTickAt: string | null; lastTickSummary: TickSummary | null; lastSeedPollAt: string | null };
  warnings: Array<{ level: WarningLevel; text: string }>;
}

export interface TrendPoint {
  day: string;
  sent: number;
  inbox: number;
  spam: number;
  replies: number;
}

export interface WarmnetConfig {
  startPerDay: number;
  incrementPerDay: number;
  maxPerDay: number;
  maintenancePerDay: number;
  weekendFactor: number;
  timezone: string;
  windowStartHour: number;
  windowEndHour: number;
  replyRate: number;
  counterReplyRate: number;
  starRate: number;
  readyAfterDays: number;
  readyMinInboxRate: number;
  readyMinPlaced: number;
  holdBelowInboxRate: number;
  holdMinPlaced: number;
  maxConsecutiveFailures: number;
  maxSendsPerTick: number;
}

export interface WarmnetSettings {
  enabled: boolean;
  config: WarmnetConfig;
  defaults: WarmnetConfig;
  lastTickAt: string | null;
  lastTickSummary: TickSummary | null;
  lastSeedPollAt: string | null;
}

export interface Paged<T> {
  total: number;
  page: number;
  limit: number;
  items: T[];
}

export interface WarmMailbox {
  mailboxId: number;
  email: string;
  displayName: string | null;
  domainId: number;
  domain: string;
  ip: string | null;
  ipClean: boolean | null;
  state: WarmState;
  rampDay: number;
  heldDays: number;
  todayTarget: number;
  todaySent: number;
  totalSent: number;
  inbox7d: number;
  spam7d: number;
  inboxRate7d: number | null;
  replies7d: number;
  pauseReason: string | null;
  consecutiveFailures: number;
  startedAt: string | null;
  readyAt: string | null;
  releasedAt: string | null;
  lastSentAt: string | null;
  mailboxStatus: string;
}

export type MailboxAction = "start" | "resume" | "pause" | "reset" | "release";

export interface WarmDomain {
  id: number;
  domain: string;
  status: string;
  workspaceId: number | null;
  workspaceName: string | null;
  ipId: number | null;
  ip: string | null;
  poolName: string | null;
  ipClean: boolean | null;
  mailboxes: number;
  states: Record<WarmState, number>;
  totalSent: number;
  inbox7d: number;
  spam7d: number;
  inboxRate7d: number | null;
}

export interface RegisterDomainEntry {
  domain: string;
  ip?: string;
  pool?: string;
}

export interface RegisterDomainsResult {
  workspaceId: number;
  perDomain: number;
  registered: number;
  results: Array<{ domain: string; ok: boolean; error?: string; domainId?: number; mailboxes?: number }>;
}

export interface WarmMessage {
  id: number;
  mailboxEmail: string;
  seedEmail: string;
  direction: "to_seed" | "from_seed";
  kind: "initial" | "reply";
  subject: string | null;
  status: "sent" | "failed" | "received";
  placement: Placement;
  rescued: boolean;
  seedReadAt: string | null;
  repliedAt: string | null;
  error: string | null;
  sentAt: string | null;
}

export type SeedProvider = "gmail" | "outlook" | "yahoo" | "other";

export interface SeedPreset {
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
}

export interface WarmSeed {
  id: number;
  email: string;
  displayName: string | null;
  provider: SeedProvider;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  status: "active" | "paused" | "error";
  dailyReceiveCap: number;
  receivedToday: number;
  received7d: number;
  inbox7d: number;
  spam7d: number;
  replies7d: number;
  lastPolledAt: string | null;
  lastError: string | null;
  createdAt: string | null;
}

export interface SeedInput {
  email: string;
  displayName?: string;
  provider: SeedProvider;
  password: string;
  dailyReceiveCap?: number;
  imapHost?: string;
  imapPort?: number;
  smtpHost?: string;
  smtpPort?: number;
}

export interface SeedTestResult {
  imap: { ok: boolean; folders?: number; junkFolder?: string | null; error?: string };
  smtp: { ok: boolean; error?: string };
}

export interface WarmIp {
  id: number;
  ip: string;
  hostname: string | null;
  poolName: string | null;
  notes: string | null;
  clean: boolean | null;
  listings: string[];
  unchecked: string[];
  lastCheckedAt: string | null;
  domains: number;
  mailboxes: number;
}

const BASE = "/api/v1/admin/warmnet";

function qs(params: Record<string, string | number | boolean | undefined | null>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "" && value !== false) search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

export const warmnetApi = {
  async overview() {
    return (await apiRequest<WarmnetOverview>(`${BASE}/overview`)).data;
  },
  async trend(days = 14) {
    return (await apiRequest<TrendPoint[]>(`${BASE}/trend${qs({ days })}`)).data;
  },
  async getSettings() {
    return (await apiRequest<WarmnetSettings>(`${BASE}/settings`)).data;
  },
  async updateSettings(patch: { enabled?: boolean; config?: Partial<WarmnetConfig> }) {
    return (await apiRequest<WarmnetSettings>(`${BASE}/settings`, json("PATCH", patch))).data;
  },

  async listMailboxes(params: { state?: WarmState | ""; search?: string; domainId?: number; page?: number; limit?: number }) {
    return (await apiRequest<Paged<WarmMailbox>>(`${BASE}/mailboxes${qs({ ...params })}`)).data;
  },
  async mailboxAction(payload: { ids: number[]; action: MailboxAction; reason?: string; force?: boolean; strategyId?: number }) {
    return (await apiRequest<{ affected: number }>(`${BASE}/mailboxes/action`, json("POST", payload))).data;
  },

  async listDomains() {
    return (await apiRequest<WarmDomain[]>(`${BASE}/domains`)).data;
  },
  async registerDomains(payload: { domains: RegisterDomainEntry[]; mailboxesPerDomain: number; autoStart: boolean; workspaceId?: number }) {
    return (await apiRequest<RegisterDomainsResult>(`${BASE}/domains/register`, json("POST", payload))).data;
  },

  async listMessages(params: { placement?: Placement | ""; direction?: "to_seed" | "from_seed" | ""; status?: "failed" | ""; mailboxId?: number; seedId?: number; page?: number; limit?: number }) {
    return (await apiRequest<Paged<WarmMessage>>(`${BASE}/messages${qs({ ...params })}`)).data;
  },

  async listSeeds() {
    return (await apiRequest<{ items: WarmSeed[]; presets: Record<string, SeedPreset> }>(`${BASE}/seeds`)).data;
  },
  async createSeed(payload: SeedInput) {
    return (await apiRequest<WarmSeed>(`${BASE}/seeds`, json("POST", payload))).data;
  },
  async updateSeed(id: number, patch: { status?: "active" | "paused"; dailyReceiveCap?: number; displayName?: string; password?: string }) {
    return (await apiRequest<WarmSeed>(`${BASE}/seeds/${id}`, json("PATCH", patch))).data;
  },
  async deleteSeed(id: number) {
    await apiRequest<null>(`${BASE}/seeds/${id}`, json("DELETE"));
  },
  async testSeed(id: number) {
    return (await apiRequest<SeedTestResult>(`${BASE}/seeds/${id}/test`, json("POST", {}))).data;
  },

  async listIps() {
    return (await apiRequest<{ items: WarmIp[]; blocklists: string[] }>(`${BASE}/ips`)).data;
  },
  async addIp(payload: { ip: string; hostname?: string; poolName?: string; notes?: string }) {
    return (await apiRequest<WarmIp>(`${BASE}/ips`, json("POST", payload))).data;
  },
  async deleteIp(id: number) {
    await apiRequest<null>(`${BASE}/ips/${id}`, json("DELETE"));
  },
  async checkIp(id: number) {
    return (await apiRequest<{ id: number; listings: string[]; unchecked: string[]; clean: boolean }>(`${BASE}/ips/${id}/check`, json("POST", {}))).data;
  },
  async checkAllIps() {
    return (await apiRequest<Array<{ id: number; listings: string[]; unchecked: string[]; clean: boolean }>>(`${BASE}/ips/check`, json("POST", {}))).data;
  },

  async runEngine(force = false) {
    return (await apiRequest<TickSummary>(`${BASE}/engine/tick`, json("POST", { force }))).data;
  },
  async pollSeeds() {
    return (await apiRequest<Array<{ seedId: number; checked?: number; matched?: number; error?: string }>>(`${BASE}/engine/poll-seeds`, json("POST", {}))).data;
  },
};
