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
