import { io, type Socket } from "socket.io-client";

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
    });
  }

  return socket;
}
