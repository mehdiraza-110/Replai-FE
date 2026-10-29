import { apiRequest } from "../../services/api";
import type { Status } from "./ai";

export interface Site {
  id: number; name: string; slug: string; template: string | null; status: Status | "ready"; error: string | null; prompt: string;
  isPublished: boolean; publishedAt: string | null; hasUnpublishedChanges: boolean; customDomain: string | null; domainStatus: "none" | "pending" | "verified";
  createdAt: string; updatedAt: string; hasHtml: boolean; createdBy: string | null; html?: string | null;
}
export interface SiteDns { type: string; name: string; value: string; note: string | null }
export type SiteWithDns = Site & { dns?: SiteDns; detail?: string | null };
export interface SiteList { items: Site[]; templates: Array<{ id: string; label: string }>; limit: number }
export interface SiteVersion { id: number; note: string | null; createdAt: string }

// The published page is served by the API host.
export const API_ORIGIN = ((import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:3001").replace(/\/$/, "");
export const publicUrl = (slug: string) => `${API_ORIGIN}/s/${slug}`;

async function data<T>(request: Promise<{ data: T }>): Promise<T> {
  return (await request).data;
}
const send = <T>(method: string, path: string, body?: unknown) => data(apiRequest<T>(`/api/v1/ai/sites${path}`, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }));

export const sitesApi = {
  list: () => send<SiteList>("GET", ""),
  get: (id: number) => send<Site>("GET", `/${id}`),
  create: (body: { prompt?: string; template?: string; name?: string }) => send<Site>("POST", "", body),
  revise: (id: number, instruction: string) => send<Site>("POST", `/${id}/revise`, { instruction }),
  regenerate: (id: number) => send<Site>("POST", `/${id}/regenerate`),
  rename: (id: number, name: string) => send<Site>("PATCH", `/${id}`, { name }),
  versions: (id: number) => send<SiteVersion[]>("GET", `/${id}/versions`),
  restore: (id: number, versionId: number) => send<Site>("POST", `/${id}/versions/${versionId}/restore`),
  publish: (id: number) => send<Site>("POST", `/${id}/publish`),
  unpublish: (id: number) => send<Site>("POST", `/${id}/unpublish`),
  remove: (id: number) => send<{ deleted: true }>("DELETE", `/${id}`),
  setDomain: (id: number, domain: string) => send<SiteWithDns>("PUT", `/${id}/domain`, { domain }),
  checkDomain: (id: number) => send<SiteWithDns>("POST", `/${id}/domain/check`),
};
