import { apiRequest, downloadFile, uploadWithProgress } from "./api";
import type {
  LeadFilter,
  LeadImportResult,
  LeadLibraryStats,
  LeadList,
  LeadSelection,
  LeadSelectionSummary,
  LeadSort,
  LibraryLead,
  LibraryLeadDetail,
  Paged,
} from "../types";

const BASE = "/api/v1/lead-library";

function query(values: Record<string, string | number | null | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  return params.toString();
}

function json(method: string, body: unknown) {
  return { method, body: JSON.stringify(body) };
}

export interface LeadQuery extends LeadFilter {
  page?: number;
  limit?: number;
  sort?: LeadSort;
}

export interface LeadInput {
  email: string;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  role?: string | null;
  phone?: string | null;
  location?: string | null;
  website?: string | null;
  linkedinUrl?: string | null;
}

export const leadLibraryService = {
  async stats() {
    return (await apiRequest<LeadLibraryStats>(`${BASE}/stats`)).data;
  },

  async listLists({ page = 1, limit = 12, search = "" }: { page?: number; limit?: number; search?: string } = {}) {
    return (await apiRequest<Paged<LeadList>>(`${BASE}/lists?${query({ page, limit, search })}`)).data;
  },

  async createList(payload: { name: string; description?: string }) {
    return (await apiRequest<LeadList>(`${BASE}/lists`, json("POST", payload))).data;
  },

  async updateList(id: number, payload: { name: string; description?: string }) {
    return (await apiRequest<LeadList>(`${BASE}/lists/${id}`, json("PATCH", payload))).data;
  },

  async deleteList(id: number) {
    return (await apiRequest<{ id: number; name: string }>(`${BASE}/lists/${id}`, { method: "DELETE" })).data;
  },

  async listLeads({ page = 1, limit = 25, search = "", listId, status = "", sort = "newest" }: LeadQuery = {}) {
    return (await apiRequest<Paged<LibraryLead>>(`${BASE}/contacts?${query({ page, limit, search, listId, status, sort })}`)).data;
  },

  async getLead(id: number) {
    return (await apiRequest<LibraryLeadDetail>(`${BASE}/contacts/${id}`)).data;
  },

  async addLeads(payload: { listId: number; emails?: string; contacts?: LeadInput[] }) {
    return (await apiRequest<{ added: number; invalid: number; duplicates: number }>(`${BASE}/contacts`, json("POST", payload))).data;
  },

  async updateLead(id: number, payload: LeadInput) {
    return (await apiRequest<LibraryLeadDetail>(`${BASE}/contacts/${id}`, json("PATCH", payload))).data;
  },

  importFile(file: File, target: { listId?: number; newListName?: string }, onProgress?: (percent: number) => void) {
    const fields: Record<string, string> = {};
    if (target.listId) fields.listId = String(target.listId);
    if (target.newListName) fields.newListName = target.newListName;
    return uploadWithProgress<LeadImportResult>(`${BASE}/contacts/import`, file, "file", onProgress, fields);
  },

  async deleteLeads(selection: LeadSelection) {
    return (await apiRequest<{ deleted: number }>(`${BASE}/contacts/delete`, json("POST", { selection }))).data;
  },

  async moveLeads(selection: LeadSelection, targetListId: number, mode: "move" | "copy") {
    return (
      await apiRequest<{ list: { id: number; name: string }; mode: string; matched: number; added: number; alreadyInTarget: number; removedFromSource: number }>(
        `${BASE}/contacts/move`,
        json("POST", { selection, targetListId, mode })
      )
    ).data;
  },

  async summarize(source: { listIds?: number[]; contacts?: LeadSelection | null }) {
    return (await apiRequest<LeadSelectionSummary>(`${BASE}/contacts/summary`, json("POST", source))).data;
  },

  exportLeads(filter: LeadFilter) {
    return downloadFile(`${BASE}/contacts/export?${query({ search: filter.search, listId: filter.listId, status: filter.status })}`, "leads.csv");
  },
};
