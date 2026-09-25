import { useEffect, useState } from "react";
import { Button, Spinner } from "@heroui/react";
import { ArrowDownLeft, ArrowUpRight, Inbox as InboxIcon, RefreshCw, Search, Send } from "lucide-react";
import { inboxService } from "../services/api";
import type { InboxThread, InboxThreadDetail } from "../types";

/**
 * The unified inbox: every reply across every mailbox, one screen, newest activity
 * first — no clicking into each mailbox individually. App-native (SES receiving under
 * the hood), not a real IMAP/SMTP mailbox. See PlusVibe-Plan.md section 7 / 1D.
 */
export function MailerInbox() {
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [threadsError, setThreadsError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);

  const [selected, setSelected] = useState<{ mailboxId: number; threadId: string } | null>(null);
  const [detail, setDetail] = useState<InboxThreadDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [replyBody, setReplyBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadOnly]);

  useEffect(() => {
    const timeout = window.setTimeout(() => loadThreads(), 300);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    void loadThread(selected.mailboxId, selected.threadId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.mailboxId, selected?.threadId]);

  async function loadThreads() {
    setIsLoadingThreads(true);
    setThreadsError(null);
    try {
      const page = await inboxService.listThreads({ search, unreadOnly, limit: 50 });
      setThreads(page.items);
      setTotalUnread(page.totalUnreadThreads);
    } catch (err) {
      setThreadsError(err instanceof Error ? err.message : "Unable to load inbox");
    } finally {
      setIsLoadingThreads(false);
    }
  }

  async function loadThread(mailboxId: number, threadId: string) {
    setIsLoadingDetail(true);
    setDetailError(null);
    setReplyBody("");
    setSendError(null);
    try {
      const data = await inboxService.getThread(mailboxId, threadId);
      setDetail(data);
      if (data.messages.some((message) => message.direction === "inbound" && !message.isRead)) {
        await inboxService.markThreadRead(mailboxId, threadId);
        setThreads((current) =>
          current.map((thread) =>
            thread.mailboxId === mailboxId && thread.threadId === threadId ? { ...thread, unreadCount: 0 } : thread
          )
        );
        setTotalUnread((current) => Math.max(0, current - 1));
      }
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Unable to load thread");
    } finally {
      setIsLoadingDetail(false);
    }
  }

  async function handleSendReply() {
    if (!selected || !replyBody.trim()) return;
    setIsSending(true);
    setSendError(null);
    try {
      const sent = await inboxService.sendReply(selected.mailboxId, selected.threadId, replyBody.trim());
      setDetail((current) => (current ? { ...current, messages: [...current.messages, sent] } : current));
      setReplyBody("");
      void loadThreads();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Unable to send reply");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-140px)] max-w-[1400px] gap-4">
      <div className="flex w-[360px] shrink-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-surface">
        <div className="border-b border-border/70 p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              className="h-9 w-full rounded-xl border border-border bg-surface-secondary pl-9 pr-3 text-[13px] outline-none transition focus:border-accent"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search inbox"
              value={search}
            />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <button
              className={`rounded-full px-3 py-1 text-[12px] font-medium transition ${
                unreadOnly ? "bg-accent/15 text-accent" : "text-muted hover:bg-surface-secondary"
              }`}
              onClick={() => setUnreadOnly((current) => !current)}
              type="button"
            >
              Unread {totalUnread > 0 ? `(${totalUnread})` : ""}
            </button>
            <button
              aria-label="Refresh inbox"
              className="grid size-7 place-items-center rounded-full text-muted transition hover:bg-surface-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              disabled={isLoadingThreads}
              onClick={loadThreads}
              type="button"
            >
              {isLoadingThreads ? <Spinner color="current" size="sm" /> : <RefreshCw className="size-3.5" />}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {threadsError ? (
            <div className="flex flex-col items-center gap-2 p-6 text-center">
              <p className="text-[13px] text-danger">{threadsError}</p>
              <Button onPress={loadThreads} size="sm" variant="secondary">Retry</Button>
            </div>
          ) : isLoadingThreads && threads.length === 0 ? (
            <div className="flex h-full items-center justify-center py-10">
              <Spinner size="sm" />
            </div>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-6 text-center">
              <InboxIcon className="size-8 text-muted" />
              <p className="text-[13px] text-muted">Nothing here yet.</p>
            </div>
          ) : (
            threads.map((thread) => {
              const isActive = selected?.mailboxId === thread.mailboxId && selected?.threadId === thread.threadId;
              return (
                <button
                  className={`flex w-full flex-col gap-1 border-b border-border/50 px-4 py-3 text-left transition hover:bg-surface-secondary ${
                    isActive ? "bg-surface-secondary" : ""
                  }`}
                  key={`${thread.mailboxId}:${thread.threadId}`}
                  onClick={() => setSelected({ mailboxId: thread.mailboxId, threadId: thread.threadId })}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted">
                      {thread.lastDirection === "outbound" ? (
                        <ArrowUpRight className="size-3 shrink-0 text-accent" />
                      ) : (
                        <ArrowDownLeft className="size-3 shrink-0 text-success" />
                      )}
                      <span className="truncate">{thread.lastDirection === "outbound" ? thread.toAddress : thread.fromAddress}</span>
                    </div>
                    {thread.unreadCount > 0 ? <span className="size-2 shrink-0 rounded-full bg-accent" /> : null}
                  </div>
                  <p className={`truncate text-[13px] ${thread.unreadCount > 0 ? "font-semibold text-foreground" : "font-medium text-foreground/90"}`}>
                    {thread.subject || "(no subject)"}
                  </p>
                  <p className="truncate text-[12px] text-muted">{thread.preview}</p>
                  <p className="text-[10px] text-muted">
                    {thread.mailboxEmail} · {new Date(thread.lastMessageAt).toLocaleString()}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border/70 bg-surface">
        {!selected ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <InboxIcon className="size-8 text-muted" />
            <p className="text-[13px] text-muted">Select a conversation to view it here.</p>
          </div>
        ) : detailError ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="text-[13px] text-danger">{detailError}</p>
            <Button onPress={() => selected && loadThread(selected.mailboxId, selected.threadId)} size="sm" variant="secondary">Retry</Button>
          </div>
        ) : isLoadingDetail && !detail ? (
          <div className="flex h-full items-center justify-center">
            <Spinner size="sm" />
          </div>
        ) : detail ? (
          <>
            <div className="border-b border-border/70 px-5 py-4">
              <p className="text-[14px] font-semibold text-foreground">{detail.leadName || detail.leadEmail}</p>
              <p className="text-[12px] text-muted">
                {detail.leadEmail} · via {detail.mailbox.email}
              </p>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {detail.messages.map((message) => (
                <div
                  className={`max-w-[80%] rounded-2xl border px-4 py-3 ${
                    message.direction === "outbound"
                      ? "ml-auto border-accent/20 bg-accent/5"
                      : "border-border/70 bg-surface-secondary/60"
                  }`}
                  key={message.id}
                >
                  <p className="text-[11px] text-muted">
                    {message.direction === "outbound" ? "Sent" : "Received"} · {new Date(message.createdAt).toLocaleString()}
                  </p>
                  {message.subject ? <p className="mt-1 text-[13px] font-semibold text-foreground">{message.subject}</p> : null}
                  <p className="mt-1 whitespace-pre-wrap text-[13px] leading-6 text-foreground">{message.bodyText}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-border/70 p-4">
              {sendError ? <p className="mb-2 text-[12px] text-danger">{sendError}</p> : null}
              <div className="flex items-end gap-2">
                <textarea
                  className="h-20 flex-1 resize-none rounded-xl border border-border bg-surface-secondary p-3 text-[13px] outline-none transition focus:border-accent"
                  onChange={(event) => setReplyBody(event.target.value)}
                  placeholder={`Reply as ${detail.mailbox.email}...`}
                  value={replyBody}
                />
                <Button isDisabled={isSending || !replyBody.trim()} onPress={handleSendReply} size="sm">
                  {isSending ? <Spinner color="current" size="sm" /> : <Send className="size-4" />}
                  Send
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
