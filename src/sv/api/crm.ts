import { apiRequest } from "../../services/api";

export interface Paged<T> { items: T[]; page: number; limit: number; total: number; totalPages: number }
export type DealStage = "lead" | "qualified" | "meeting" | "proposal" | "won" | "lost";
export const DEAL_STAGES: DealStage[] = ["lead", "qualified", "meeting", "proposal", "won", "lost"];
export const STAGE_LABEL: Record<DealStage, string> = { lead: "Lead", qualified: "Qualified", meeting: "Meeting booked", proposal: "Proposal", won: "Won", lost: "Lost" };

export interface Task {
  id: number; title: string; description: string | null; dueAt: string | null; overdue: boolean; status: "open" | "done"; source: string | null;
  recordType: string | null; recordId: string | null; recordLabel: string | null; assigneeUserId: number | null; assigneeName: string | null; createdAt: string; completedAt: string | null;
}
export interface Company { custom: Record<string, string | number | boolean>; id: number; name: string; website: string | null; industry: string | null; size: string | null; location: string | null; people: number; deals: number; openDealValue: number; createdAt: string }
export interface Deal {
  id: number; title: string; value: number; stage: DealStage; companyId: number | null; companyName: string | null; personEmail: string | null; personName: string | null;
  ownerUserId: number | null; ownerName: string | null; expectedClose: string | null; createdAt: string; closedAt: string | null; custom: Record<string, string | number | boolean>;
}
export interface DealList { items: Deal[]; stages: DealStage[]; byStage: Record<DealStage, { count: number; value: number }>; summary: { openValue: number; openCount: number; wonValue: number; wonCount: number } }
export interface Note { id: number; body: string; recordType: string | null; recordId: string | null; recordLabel: string | null; authorName: string | null; authorUserId: number | null; createdAt: string }
export interface Person { id: number; email: string; name: string; company: string | null; role: string | null; phone: string | null; location: string | null; campaigns: number; replied: boolean; lastContactedAt: string | null; createdAt: string }
export interface Appointment { id: number; leadName: string | null; leadEmail: string | null; meetingType: string | null; handlerName: string | null; start: string; end: string; meetLink: string | null; status: string; outcome: string | null }
export interface Scheduled { mailboxId: number; threadId: string; dueAt: string; sentSoFar: number; scheduledBy: string | null; prospect: string | null; subject: string | null }
export interface Submission { id: number; prospect: string | null; subject: string | null; forwardedTo: string; at: string }
export interface Member { id: number; name: string; email: string }

export type WidgetType = "stat" | "chart" | "list";
export type WidgetSize = "s" | "m" | "l";
export interface WidgetDef { key: string; type: WidgetType; label: string; description: string; defaultSize: WidgetSize; snapshot?: boolean; format?: "money" }
export interface ViewWidget { key: string; size: WidgetSize }
export interface DashboardView { id: number; name: string; widgets: ViewWidget[]; isDefault: boolean; updatedAt: string }
export interface WidgetData { value?: number; previous?: number; series?: Array<Record<string, number | string>>; rows?: Array<Record<string, string | number | boolean | null>> }

async function data<T>(request: Promise<{ data: T }>): Promise<T> {
  return (await request).data;
}
const qs = (params: Record<string, string | number | undefined | null>) => {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") out.set(k, String(v));
  return out.toString();
};
const send = <T>(method: string, path: string, body?: unknown) => data(apiRequest<T>(`/api/v1/crm${path}`, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }));
const get = <T>(path: string, params: Record<string, string | number | undefined | null> = {}) => data(apiRequest<T>(`/api/v1/crm${path}?${qs(params)}`));

export const crmApi = {
  members: () => get<Member[]>("/members"),
  tasks: (p: { status?: string; assignee?: string; overdue?: boolean; search?: string; sort?: string; page?: number }) =>
    get<Paged<Task> & { overdueTotal: number }>("/tasks", { ...p, overdue: p.overdue ? "1" : undefined }),
  createTask: (body: Partial<{ title: string; description: string; dueAt: string | null; assigneeUserId: number | null }>) => send<Task>("POST", "/tasks", body),
  updateTask: (id: number, body: Partial<{ title: string; description: string; dueAt: string | null; assigneeUserId: number | null; status: "open" | "done" }>) => send<Task>("PATCH", `/tasks/${id}`, body),
  deleteTask: (id: number) => send<{ deleted: true }>("DELETE", `/tasks/${id}`),
  companies: (p: { search?: string; page?: number }) => get<Paged<Company>>("/companies", p),
  createCompany: (body: Partial<Omit<Company, "custom">> & { custom?: Record<string, string | number | boolean | null> }) => send<Company>("POST", "/companies", body),
  updateCompany: (id: number, body: Partial<Omit<Company, "custom">> & { custom?: Record<string, string | number | boolean | null> }) => send<Company>("PATCH", `/companies/${id}`, body),
  deleteCompany: (id: number) => send<{ deleted: true }>("DELETE", `/companies/${id}`),
  deals: (p: { search?: string; stage?: string }) => get<DealList>("/deals", p),
  createDeal: (body: Partial<{ title: string; value: number; stage: DealStage; companyId: number | null; personEmail: string; personName: string; ownerUserId: number | null; expectedClose: string | null; custom: Record<string, string | number | boolean | null> }>) => send<Deal>("POST", "/deals", body),
  updateDeal: (id: number, body: Partial<{ title: string; value: number; stage: DealStage; companyId: number | null; personEmail: string; personName: string; ownerUserId: number | null; expectedClose: string | null; custom: Record<string, string | number | boolean | null> }>) => send<Deal>("PATCH", `/deals/${id}`, body),
  deleteDeal: (id: number) => send<{ deleted: true }>("DELETE", `/deals/${id}`),
  notes: (p: { search?: string; page?: number }) => get<Paged<Note>>("/notes", p),
  createNote: (body: { body: string; recordType?: string; recordLabel?: string }) => send<Note>("POST", "/notes", body),
  deleteNote: (id: number) => send<{ deleted: true }>("DELETE", `/notes/${id}`),
  people: (p: { search?: string; page?: number }) => get<Paged<Person>>("/people", p),
  appointments: (p: { when?: "upcoming" | "past" | "all"; page?: number }) => get<Paged<Appointment>>("/appointments", p),
  setOutcome: (id: number, outcome: string | null) => send<{ id: number; outcome: string | null }>("PATCH", `/appointments/${id}`, { outcome }),
  scheduled: (p: { page?: number }) => get<Paged<Scheduled>>("/scheduled", p),
  submissions: (p: { page?: number }) => get<Paged<Submission>>("/submissions", p),

  catalog: () => get<{ widgets: WidgetDef[]; ranges: number[] }>("/dashboard/catalog"),
  dashboardData: (days: number, widgets: string[]) => get<{ days: number; widgets: Record<string, WidgetData> }>("/dashboard/data", { days, widgets: widgets.join(",") }),
  views: () => get<DashboardView[]>("/dashboard/views"),
  createView: (body: { name: string; widgets?: ViewWidget[] }) => send<DashboardView>("POST", "/dashboard/views", body),
  updateView: (id: number, body: Partial<{ name: string; widgets: ViewWidget[]; isDefault: boolean }>) => send<DashboardView>("PATCH", `/dashboard/views/${id}`, body),
  deleteView: (id: number) => send<{ deleted: true }>("DELETE", `/dashboard/views/${id}`),
};
