import { apiRequest } from "./api";

export type OrderType = "domains" | "mailboxes";
export type OrderStatus = "requested" | "approved" | "in_progress" | "fulfilled" | "rejected" | "cancelled";

export interface OrderDetails {
  preferredDomains?: string[];
  mailboxesPerDomain?: number;
  mailboxNames?: string[];
  notes?: string;
  domainIds?: number[];
}

export interface OrderRequest {
  id: number;
  type: OrderType;
  quantity: number;
  details: OrderDetails | null;
  status: OrderStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  fulfilled_at: string | null;
  requested_by: { id: number; name: string; email: string } | null;
}

export interface AdminOrderRequest extends OrderRequest {
  workspace: { id: number; name: string; slug: string };
}

export interface AdminOrderPage {
  items: AdminOrderRequest[];
  total: number;
  page: number;
  limit: number;
}

export interface OrderCounts {
  requested: number;
  approved: number;
  in_progress: number;
}

export interface CreateOrderPayload {
  type: OrderType;
  quantity: number;
  details?: OrderDetails;
}

export interface AssignDomainsPayload {
  domains: string[];
  orderId?: number;
  confirmFromPlatform?: boolean;
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  requested: "Requested",
  approved: "Approved",
  in_progress: "In progress",
  fulfilled: "Fulfilled",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export const OPEN_STATUSES: OrderStatus[] = ["requested", "approved", "in_progress"];

/** Legal admin transitions, mirroring the server state machine. */
export const ADMIN_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  requested: ["approved", "rejected"],
  approved: ["in_progress", "rejected", "cancelled"],
  in_progress: ["fulfilled", "rejected"],
  fulfilled: [],
  rejected: [],
  cancelled: [],
};

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

export const orderService = {
  async list() {
    return (await apiRequest<OrderRequest[]>("/api/v1/orders")).data;
  },
  async get(id: number) {
    return (await apiRequest<OrderRequest>(`/api/v1/orders/${id}`)).data;
  },
  async create(payload: CreateOrderPayload) {
    return (await apiRequest<OrderRequest>("/api/v1/orders", json("POST", payload))).data;
  },
  async cancel(id: number) {
    return (await apiRequest<OrderRequest>(`/api/v1/orders/${id}/cancel`, json("POST"))).data;
  },
};

export const adminOrderService = {
  async list(params: { status?: OrderStatus | ""; workspaceId?: number; page?: number; limit?: number }) {
    return (await apiRequest<AdminOrderPage>(`/api/v1/admin/orders${qs({ ...params })}`)).data;
  },
  async count() {
    return (await apiRequest<OrderCounts>("/api/v1/admin/orders/count")).data;
  },
  async get(id: number) {
    return (await apiRequest<AdminOrderRequest>(`/api/v1/admin/orders/${id}`)).data;
  },
  async update(id: number, patch: { status?: OrderStatus; admin_notes?: string }) {
    return (await apiRequest<AdminOrderRequest>(`/api/v1/admin/orders/${id}`, json("PATCH", patch))).data;
  },
  async assignDomains(workspaceId: number, payload: AssignDomainsPayload) {
    return (await apiRequest<unknown>(`/api/v1/admin/workspaces/${workspaceId}/assign-domains`, json("POST", payload))).data;
  },
};

/** Parses a free-form domain entry; returns a normalised hostname or null when it does not look like a domain. */
export function normalizeDomain(raw: string): string | null {
  const value = raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
  return /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))*\.[a-z]{2,}$/.test(value) ? value : null;
}
