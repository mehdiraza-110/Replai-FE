import { apiRequest, ApiRequestError } from "../../services/api";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:3001").replace(/\/$/, "");

export type TicketStatus = "pending" | "in_review" | "approved" | "rejected" | "resolved";

export interface Ticket {
  id: string;
  ticketNumber: number;
  issueName: string;
  description: string;
  pageUrl: string | null;
  hasRecording: boolean;
  recordingBytes: number | null;
  durationSeconds: number | null;
  transcript: string | null;
  transcriptError: string | null;
  status: TicketStatus;
  statusUpdatedAt: string | null;
  createdAt: string;
  replyCount?: number;
  hasUnread?: boolean;
  /** Team only. */
  asanaTaskUrl?: string | null;
  asanaTaskError?: string | null;
  reporter?: { id: number; name: string; email: string | null };
  workspaceName?: string;
}
export interface TicketReply { id: string; body: string; isStaff: boolean; authorName: string; createdAt: string }
export interface WidgetConfig { maxHeight: number; maxDurationSeconds: number; transcription: boolean; recordingAvailable: boolean }
export interface InboxPage { items: Ticket[]; total: number; page: number; pageSize: number; counts: Record<"all" | TicketStatus, number> }

export interface AsanaTarget { connectionUserId: number | null; workspaceGid: string | null; workspaceName: string | null; projectGid: string | null; projectName: string | null; assigneeGid: string | null; assigneeName: string | null }
export interface TicketSettings { s3Prefix: string; maxHeight: number; maxDurationSeconds: number; transcription: { provider: "openai" | "internal" }; asana: AsanaTarget }
export interface AsanaConnection { id: string; accountName: string | null; accountEmail: string | null; status: "connected" | "needs_reconnect"; lastError: string | null }
export interface AsanaStatus { connected: boolean; connections: AsanaConnection[] }
export interface AsanaOption { gid: string; name: string; email?: string | null }

const call = async <T>(method: string, path: string, body?: unknown) =>
  (await apiRequest<T>(`/api/v1${path}`, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })).data;

/** Raw PUT of a video, with upload progress (fetch cannot report it). */
function putVideo(id: string, blob: Blob, onProgress?: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", `${API_BASE_URL}/api/v1/feedback/${id}/recording`);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Content-Type", blob.type.split(";")[0] || "video/webm");
    xhr.upload.onprogress = (event) => event.lengthComputable && onProgress?.(Math.round((event.loaded / event.total) * 100));
    xhr.onerror = () => reject(new ApiRequestError("We could not reach the server. Please try again.", 0));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let message = "We could not save the recording.";
      try { message = JSON.parse(xhr.responseText).message || message; } catch { /* keep the default */ }
      reject(new ApiRequestError(message, xhr.status));
    };
    xhr.send(blob);
  });
}

async function postAudio(path: string, method: "PUT" | "POST", audio: Blob) {
  const response = await fetch(`${API_BASE_URL}/api/v1${path}`, { method, credentials: "include", headers: { "Content-Type": audio.type.split(";")[0] || "audio/webm" }, body: audio });
  const json = await response.json().catch(() => null);
  if (!response.ok) throw new ApiRequestError(json?.message || "We could not process that audio.", response.status);
  return (json?.data ?? {}) as { text?: string; skipped?: boolean };
}

export const feedbackApi = {
  config: () => call<WidgetConfig>("GET", "/feedback/config"),
  create: (input: { issueName: string; description: string; pageUrl?: string; durationSeconds?: number }) => call<{ feedback: Ticket }>("POST", "/feedback", input).then((d) => d.feedback),
  mine: () => call<{ items: Ticket[] }>("GET", "/feedback/mine").then((d) => d.items),
  mineUnread: () => call<{ count: number }>("GET", "/feedback/mine/unread").then((d) => d.count),
  staffNew: (since: string) => call<{ count: number }>("GET", `/feedback/staff/new?since=${encodeURIComponent(since)}`).then((d) => d.count),
  inbox: (params: { status?: string; search?: string; page?: number }) => {
    const q = new URLSearchParams();
    if (params.status) q.set("status", params.status);
    if (params.search) q.set("search", params.search);
    q.set("page", String(params.page ?? 1));
    return call<InboxPage>("GET", `/feedback/inbox?${q}`);
  },
  thread: (id: string) => call<{ feedback: Ticket; replies: TicketReply[] }>("GET", `/feedback/${id}/thread`),
  reply: (id: string, body: string) => call<{ reply: TicketReply }>("POST", `/feedback/${id}/replies`, { body }).then((d) => d.reply),
  setStatus: (id: string, status: TicketStatus, message?: string) => call<{ id: string; status: TicketStatus; replied: boolean }>("PUT", `/feedback/${id}/status`, { status, message }),
  uploadRecording: putVideo,
  uploadTranscript: (id: string, audio: Blob) => postAudio(`/feedback/${id}/transcript`, "PUT", audio),
  transcribe: (audio: Blob) => postAudio("/feedback/transcribe", "POST", audio),
  createAsanaTask: (id: string) => call<{ asanaTaskUrl: string | null }>("POST", `/feedback/${id}/asana`),
  recordingUrl: (id: string, download = false) =>
    call<{ url: string | null; placeholder?: boolean; filename: string; title: string; durationSeconds: number | null }>("GET", `/feedback/${id}/recording-url${download ? "?download=1" : ""}`),

  settings: () => call<{ config: TicketSettings }>("GET", "/feedback/settings").then((d) => d.config),
  saveSettings: (input: Partial<Omit<TicketSettings, "asana">> & { asana?: { workspaceGid?: string | null; workspaceName?: string | null; projectGid?: string | null; projectName?: string | null; assigneeGid?: string | null; assigneeName?: string | null } }) =>
    call<{ config: TicketSettings }>("PUT", "/feedback/settings", input).then((d) => d.config),

  asanaStatus: () => call<AsanaStatus>("GET", "/asana/status"),
  asanaConnect: (token: string) => call<AsanaStatus>("POST", "/asana/connect", { token }),
  asanaTest: (id: string) => call<AsanaStatus>("POST", `/asana/connections/${id}/test`),
  asanaDisconnect: (id: string) => call<AsanaStatus>("DELETE", `/asana/connections/${id}`),
  asanaWorkspaces: () => call<{ items: AsanaOption[] }>("GET", "/asana/options").then((d) => d.items),
  asanaProjects: (workspaceGid: string) => call<{ items: AsanaOption[] }>("GET", `/asana/projects?workspaceGid=${encodeURIComponent(workspaceGid)}`).then((d) => d.items),
  asanaUsers: (workspaceGid: string) => call<{ items: AsanaOption[] }>("GET", `/asana/users?workspaceGid=${encodeURIComponent(workspaceGid)}`).then((d) => d.items),
};
