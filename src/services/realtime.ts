import { io, type Socket } from "socket.io-client";
import { getViewAs, VIEW_AS_CHANGED_EVENT } from "../utils/viewAs";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:3001").replace(/\/$/, "");

export interface RealtimeEventPayload {
  id: number;
  eventType: string;
  source: string;
  status: string;
  workspaceId: string | null;
  workspaceName: string | null;
  campaignId: string | null;
  campaignName: string | null;
  aiAgentId: number | null;
  aiAgentName: string | null;
  leadEmail: string | null;
  threadId: string | null;
  messageId: string | null;
  draftId: number | null;
  durationMs: number | null;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  createdBy: number | null;
  createdAt: string;
}

let socket: Socket | null = null;

/**
 * A single shared socket connection for the whole app — every page that wants
 * live updates subscribes to the same "event" stream via `useRealtimeEvent`
 * rather than opening its own connection.
 */
export function getRealtimeSocket() {
  if (!socket) {
    socket = io(API_BASE_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      // Evaluated on every (re)connect, so a super admin's "view as" target is always current.
      auth: (callback) => {
        const viewAs = getViewAs();
        callback(viewAs ? { viewAs: viewAs.id } : {});
      },
    });

    window.addEventListener(VIEW_AS_CHANGED_EVENT, reconnectRealtime);
  }

  return socket;
}

/**
 * Drops and re-opens the shared socket on the same instance (so existing listeners survive). The backend puts a
 * socket in its workspace's room at connect time, so this must run whenever the active workspace or view-as changes.
 */
export function reconnectRealtime() {
  if (!socket) return;

  socket.disconnect();
  socket.connect();
}

/** A new support ticket arrived (support team only). */
export interface TicketNewPayload { id: string; ticketNumber: number; title: string; from: string }
/** The team replied to, or changed the status of, one of your tickets. */
export interface TicketUpdatedPayload { id: string; ticketNumber: number; title: string; status: string | null }

export function onTicketNew(handler: (payload: TicketNewPayload) => void) {
  const s = getRealtimeSocket();
  s.on("ticket:new", handler);
  return () => { s.off("ticket:new", handler); };
}

export function onTicketUpdated(handler: (payload: TicketUpdatedPayload) => void) {
  const s = getRealtimeSocket();
  s.on("ticket:updated", handler);
  return () => { s.off("ticket:updated", handler); };
}

/** A lead replied positively in a workspace you are alerted for (workspace admins, and the all-workspaces people). */
export interface LeadPositivePayload { workspaceId: number; workspaceName: string; leadName: string | null; leadEmail: string; campaignName: string | null }

export function onLeadPositive(handler: (payload: LeadPositivePayload) => void) {
  const s = getRealtimeSocket();
  s.on("lead:positive", handler);
  return () => { s.off("lead:positive", handler); };
}
