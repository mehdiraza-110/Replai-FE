import { apiRequest } from "../../services/api";

export type CampaignStatus = "Active" | "Paused" | "Draft" | "Completed";
export type DateRange = "all" | "7d" | "30d" | "90d";

export interface CampaignRow {
  id: number;
  name: string;
  status: CampaignStatus;
  leadsContacted: number;
  replies: number;
  replyRate: number;
  positiveReplies: number;
  positiveReplyRate: number;
  bounced: number;
  bounceRate: number;
  callsBooked: number;
  startedAt: string | null;
  createdAt: string;
}

export interface CampaignOverview {
  summary: { contactedLeads: number; positiveReplies: number; positiveReplyRate: number; bookedCallRate: number; callsBooked: number };
  items: CampaignRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CampaignAnalytics {
  campaign: { id: number; name: string; status: CampaignStatus; startedAt: string | null; createdAt: string };
  leadsUploaded: number;
  leadsContacted: number;
  replies: number;
  replyRate: number;
  positiveReplies: number;
  positiveReplyRate: number;
  bookedCalls: number;
  bookedCallRate: number;
  targets: { positiveRate: number; bookedRate: number };
  series: Array<{ date: string; contacted: number; replied: number; positive: number }>;
  steps: Array<{ step: number; label: string; sent: number }>;
  delivery: { sent: number; delivered: number; bounced: number; bounceRate: number; replied: number; pending: number; suppressed: number; failed: number };
  byInbox: Array<{ id: number; email: string; sent: number; bounced: number; bounceRate: number; replied: number; replyRate: number }>;
  placement: { tests: number; inbox: number; spam: number; inboxRate: number } | null;
}

async function data<T>(request: Promise<{ data: T }>): Promise<T> {
  return (await request).data;
}

export const campaignInsightsApi = {
  overview(params: { status?: CampaignStatus | ""; range?: DateRange; search?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams({ page: String(params.page ?? 1), limit: String(params.limit ?? 25), range: params.range ?? "all" });
    if (params.status) query.set("status", params.status);
    if (params.search?.trim()) query.set("search", params.search.trim());
    return data(apiRequest<CampaignOverview>(`/api/v1/campaigns/overview?${query}`));
  },
  analytics: (id: number, days = 30) => data(apiRequest<CampaignAnalytics>(`/api/v1/campaigns/${id}/analytics?days=${days}`)),
  saveTargets: (id: number, body: { positiveRate: number; bookedRate: number }) =>
    data(apiRequest<{ positiveRate: number; bookedRate: number }>(`/api/v1/campaigns/${id}/targets`, { method: "PUT", body: JSON.stringify(body) })),
};

export interface GeneratedSequence {
  steps: Array<{ subject: string; body: string; delayDays: number }>;
  generatedBy: string;
}

export const sequenceApi = {
  generate: (body: { name: string; audience?: string; steps?: number }) =>
    data(apiRequest<GeneratedSequence>("/api/v1/campaigns/generate-sequence", { method: "POST", body: JSON.stringify(body) })),
};
