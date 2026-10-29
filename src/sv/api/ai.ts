import { apiRequest } from "../../services/api";
import type { Paged } from "./crm";

export type Status = "processing" | "completed" | "failed";
export type CallType = "discovery" | "sales" | "interview" | "podcast";
export type ReportSlug = "market-research" | "offer" | "growth-plan";

export interface Persona { id: string; name: string; blurb: string }
export interface ChatThread { id: number; title: string; persona: string; updatedAt: string; createdAt: string }
export interface ChatMessage { id: number; role: "user" | "assistant"; content: string; createdAt: string }
export interface ChatThreadFull extends ChatThread { messages: ChatMessage[] }

export interface Criterion { name: string; score: number; feedback: string[]; examples: string[]; improvement: string }
export interface Stage { name: string; score: number; criteria: Criterion[] }
export interface Insights { painPoints: string[]; objections: string[]; buyingSignals: string[]; topics: string[]; quotes: string[] }
export interface CallResult { summary: string; stages: Stage[]; totalScore: number; averageScore: number; marketingInsights: Insights }
export interface Call {
  id: number; submissionId: string; type: CallType; typeLabel: string; status: Status; error: string | null;
  prospectName: string | null; prospectEmail: string | null; company: string | null; role: string | null; callDate: string | null;
  submittedBy: string | null; createdAt: string; completedAt: string | null; totalScore: number | null; averageScore: number | null; hasInsights: boolean;
  transcript?: string; result?: CallResult | null;
}
export interface TypeStat { type: CallType; label: string; calls: number; enough: boolean; average: number | null; latest: number | null }
export interface CallList extends Paged<Call> { types: TypeStat[] }

export interface ReportSection { heading: string; body: string; bullets: string[] }
export interface Report {
  id: number; kind: string; title: string | null; status: Status; error: string | null; prospectName: string | null; prospectCompany: string | null;
  createdBy: string | null; createdByEmail: string | null; createdAt: string; completedAt: string | null;
  input?: Record<string, string>; output?: { title: string; sections: ReportSection[] } | null;
}

async function data<T>(request: Promise<{ data: T }>): Promise<T> {
  return (await request).data;
}
const qs = (params: Record<string, string | number | undefined | null>) => {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") out.set(k, String(v));
  return out.toString();
};
const send = <T>(method: string, path: string, body?: unknown) => data(apiRequest<T>(`/api/v1/ai${path}`, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }));
const get = <T>(path: string, params: Record<string, string | number | undefined | null> = {}) => data(apiRequest<T>(`/api/v1/ai${path}?${qs(params)}`));

export const aiApi = {
  chatList: () => get<{ personas: Persona[]; threads: ChatThread[] }>("/chat"),
  chatGet: (id: number) => get<ChatThreadFull>(`/chat/${id}`),
  chatDelete: (id: number) => send<{ deleted: true }>("DELETE", `/chat/${id}`),
  chatSend: (body: { threadId?: number; persona?: string; message: string }) => send<{ thread: ChatThread; userMessage: ChatMessage; reply: ChatMessage }>("POST", "/chat/messages", body),

  calls: (p: { type?: string; status?: string; search?: string; page?: number }) => get<CallList>("/calls", p),
  call: (id: number) => get<Call>(`/calls/${id}`),
  createCall: (body: { type: CallType; prospectName?: string; prospectEmail?: string; company?: string; role?: string; callDate?: string; transcript: string }) => send<Call>("POST", "/calls", body),
  reanalyze: (id: number) => send<Call>("POST", `/calls/${id}/reanalyze`),
  deleteCall: (id: number) => send<{ deleted: true }>("DELETE", `/calls/${id}`),

  reports: (slug: ReportSlug, p: { status?: string; page?: number }) => get<Paged<Report>>(`/reports/${slug}`, p),
  report: (slug: ReportSlug, id: number) => get<Report>(`/reports/${slug}/${id}`),
  createReport: (slug: ReportSlug, body: Record<string, string>) => send<Report>("POST", `/reports/${slug}`, body),
  retryReport: (slug: ReportSlug, id: number) => send<Report>("POST", `/reports/${slug}/${id}/retry`),
  deleteReport: (slug: ReportSlug, id: number) => send<{ deleted: true }>("DELETE", `/reports/${slug}/${id}`),
  prefillGrowth: (transcript: string) => send<{ fields: Record<string, string>; filled: number }>("POST", "/reports/growth-plan/prefill", { transcript }),
};
