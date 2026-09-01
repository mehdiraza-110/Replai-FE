import { useEffect, useMemo, useRef, useState } from "react";
import type { ClipboardEvent, ReactNode } from "react";
import { Avatar, Button, Card, ListBox, Select } from "@heroui/react";
import { Bold, Bot, Check, Italic, List, ListOrdered, Loader2, RefreshCw, RemoveFormatting, Search, Send, Underline, X, UserRoundX } from "lucide-react";
import { StatusPill } from "../components/ui/StatusPill";
import { messageService, plusVibeService } from "../services/api";
import type { AiResponseDraft, MessageConversationDetail, MessageConversationSummary, PlusVibeCampaign } from "../types";

const PAGE_SIZE = 20;
const COMMON_LABELS = ["AUTOMATIC_REPLY", "INTERESTED", "NOT_INTERESTED", "QUESTION", "MEETING_REQUEST", "OUT_OF_OFFICE"];
const ALL_CAMPAIGNS_KEY = "__all_campaigns";
const ALL_LABELS_KEY = "__all_labels";

export function Messages() {
  const [conversations, setConversations] = useState<MessageConversationSummary[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<MessageConversationDetail | null>(null);
  const [campaigns, setCampaigns] = useState<PlusVibeCampaign[]>([]);
  const [campaignFilter, setCampaignFilter] = useState("");
  const [labelFilter, setLabelFilter] = useState("");
  const [leadFilter, setLeadFilter] = useState("");
  const [leadDraft, setLeadDraft] = useState("");
  const [nextPageTrail, setNextPageTrail] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadConversations();
    plusVibeService.listCampaigns()
      .then(setCampaigns)
      .catch(() => setCampaigns([]));
  }, []);

  useEffect(() => {
    if (!activeThreadId) return;

    setIsLoadingThread(true);
    setNotice(null);
    setError(null);

    messageService.getConversation(activeThreadId)
      .then(setActiveConversation)
      .catch((requestError: Error) => setError(requestError.message || "Unable to load conversation"))
      .finally(() => setIsLoadingThread(false));
  }, [activeThreadId]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasMore || isLoadingMore) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMoreConversations();
    }, { rootMargin: "160px" });

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, nextPageTrail]);

  async function loadConversations(options: { preserveThreadId?: string | null } = {}) {
    setIsLoadingList(true);
    setError(null);

    try {
      const page = await messageService.listConversations({
        campaignId: campaignFilter,
        label: labelFilter,
        lead: leadFilter,
        limit: PAGE_SIZE,
      });
      setConversations((current) => pinSelectedConversation(page.items, current, options.preserveThreadId));
      setNextPageTrail(page.nextPageTrail);
      setHasMore(page.hasMore);
      setActiveThreadId(options.preserveThreadId || page.items[0]?.threadId || null);
      if (!options.preserveThreadId) setActiveConversation(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load replies");
    } finally {
      setIsLoadingList(false);
    }
  }

  async function loadMoreConversations() {
    if (!hasMore || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const page = await messageService.listConversations({
        campaignId: campaignFilter,
        label: labelFilter,
        lead: leadFilter,
        limit: PAGE_SIZE,
        pageTrail: nextPageTrail,
      });
      setConversations((current) => mergeConversations(current, page.items));
      setNextPageTrail(page.nextPageTrail);
      setHasMore(page.hasMore);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load more replies");
    } finally {
      setIsLoadingMore(false);
    }
  }

  const activeSummary = useMemo(
    () => conversations.find((conversation) => conversation.threadId === activeThreadId) ?? null,
    [activeThreadId, conversations]
  );
  const labelOptions = useMemo(() => {
    const observed = conversations.map((conversation) => conversation.label).filter(Boolean);
    return [...new Set([...COMMON_LABELS, ...observed])].sort();
  }, [conversations]);

  function applyFilters(next: Partial<{ campaign: string; label: string; lead: string }> = {}) {
    const nextCampaign = next.campaign ?? campaignFilter;
    const nextLabel = next.label ?? labelFilter;
    const nextLead = next.lead ?? leadFilter;

    if (nextLead && !isValidEmail(nextLead)) {
      setError("Enter the exact lead email address to filter replies.");
      return;
    }

    setCampaignFilter(nextCampaign);
    setLabelFilter(nextLabel);
    setLeadFilter(nextLead);
    setLeadDraft(nextLead);
    void reloadWithFilters(nextCampaign, nextLabel, nextLead);
  }

  async function reloadWithFilters(campaign: string, label: string, lead: string) {
    setIsLoadingList(true);
    setError(null);
    setNotice(null);

    try {
      const page = await messageService.listConversations({
        campaignId: campaign,
        label,
        lead,
        limit: PAGE_SIZE,
      });
      setConversations(page.items);
      setNextPageTrail(page.nextPageTrail);
      setHasMore(page.hasMore);
      setActiveThreadId(page.items[0]?.threadId ?? null);
      setActiveConversation(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load replies");
      setConversations([]);
      setActiveThreadId(null);
      setActiveConversation(null);
    } finally {
      setIsLoadingList(false);
    }
  }

  async function sendReply(payload: ReplyPayload) {
    if (!activeThreadId) return;

    setIsSending(true);
    setNotice(null);
    setError(null);

    try {
      await messageService.sendReply(activeThreadId, payload);
      setNotice("Reply sent through PlusVibe.");
      setActiveConversation(await messageService.getConversation(activeThreadId));
      await loadConversations({ preserveThreadId: activeThreadId });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to send reply");
    } finally {
      setIsSending(false);
    }
  }

  async function approveDraft(draft: AiResponseDraft, body: string) {
    setIsSending(true);
    setNotice(null);
    setError(null);

    try {
      const updated = await messageService.approveDraft(draft.id, { body, subject: draft.subject, from: draft.from, to: draft.to });
      setActiveConversation((current) => current ? { ...current, aiDraft: updated } : current);
      setNotice("AI draft approved and sent through PlusVibe.");
      await loadConversations({ preserveThreadId: draft.threadId });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to approve AI draft");
    } finally {
      setIsSending(false);
    }
  }

  async function generateDraft(regenerate = false) {
    if (!activeThreadId) return;

    setIsGeneratingDraft(true);
    setNotice(null);
    setError(null);

    try {
      const draft = await messageService.generateDraft(activeThreadId, { regenerate });
      setActiveConversation((current) => current ? { ...current, aiDraft: draft } : current);
      setNotice(regenerate ? "AI response regenerated." : "AI response generated.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to generate AI response");
    } finally {
      setIsGeneratingDraft(false);
    }
  }

  async function rejectDraft(draft: AiResponseDraft) {
    setIsSending(true);
    setNotice(null);
    setError(null);

    try {
      const updated = await messageService.rejectDraft(draft.id);
      setActiveConversation((current) => current ? { ...current, aiDraft: updated } : current);
      setNotice("AI draft rejected.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to reject AI draft");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-[1600px] gap-3 xl:grid-cols-[300px_minmax(0,1fr)_280px] 2xl:grid-cols-[320px_minmax(0,1fr)_340px]">
      <Card className="min-w-0 flex h-[calc(100vh-112px)] min-h-[640px] flex-col border border-border/70 bg-surface">
        <Card.Header className="border-b border-border/70">
          <div className="w-full space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Card.Title className="text-base">Conversation inbox</Card.Title>
                <Card.Description>Latest PlusVibe campaign replies</Card.Description>
              </div>
              <Button className="shrink-0" isIconOnly aria-label="Refresh conversations" size="sm" variant="ghost" onClick={() => loadConversations()}>
                <RefreshCw className="size-4" />
              </Button>
            </div>

            <div className="grid gap-2">
              <FilterSelect
                label="Filter by campaign"
                options={[
                  { id: ALL_CAMPAIGNS_KEY, name: "All campaigns" },
                  ...campaigns.map((campaign) => ({ id: campaign.plusVibeCampaignId, name: campaign.name })),
                ]}
                selectedKey={campaignFilter || ALL_CAMPAIGNS_KEY}
                onChange={(key) => applyFilters({ campaign: key === ALL_CAMPAIGNS_KEY ? "" : key })}
              />
              <div className="grid grid-cols-[minmax(0,1fr)_36px] gap-2">
                <FilterSelect
                  label="Filter by label"
                  options={[
                    { id: ALL_LABELS_KEY, name: "All labels" },
                    ...labelOptions.map((label) => ({ id: label, name: formatLabel(label) })),
                  ]}
                  selectedKey={labelFilter || ALL_LABELS_KEY}
                  onChange={(key) => applyFilters({ label: key === ALL_LABELS_KEY ? "" : key })}
                />
                <button
                  aria-label="Clear filters"
                  className="grid h-9 w-9 place-items-center rounded-xl bg-surface-secondary text-muted transition hover:bg-surface-tertiary hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                  onClick={() => {
                    setCampaignFilter("");
                    setLabelFilter("");
                    setLeadFilter("");
                    setLeadDraft("");
                    void reloadWithFilters("", "", "");
                  }}
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_36px] gap-2">
                <input
                  aria-label="Filter by lead email"
                  className="agent-field h-9 min-w-0 flex-1 px-3 text-sm text-foreground outline-none"
                  onChange={(event) => setLeadDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") applyFilters({ lead: leadDraft.trim() });
                  }}
                  placeholder="Exact lead email"
                  value={leadDraft}
                />
                <button
                  aria-label="Apply lead email filter"
                  className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-white transition hover:bg-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  onClick={() => applyFilters({ lead: leadDraft.trim() })}
                >
                  <Search className="size-4" />
                </button>
              </div>
              {campaignFilter || labelFilter || leadFilter ? (
                <p className="text-[11px] font-medium text-muted">
                  Showing {conversations.length} filtered replies{hasMore ? ", scroll for more" : ""}.
                </p>
              ) : null}
            </div>
          </div>
        </Card.Header>
        <Card.Content className="thin-scrollbar min-h-0 flex-1 overflow-auto p-2">
          {isLoadingList ? (
            <ConversationSkeleton />
          ) : conversations.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted">No PlusVibe replies are waiting right now.</div>
          ) : conversations.map((conversation) => (
            <ConversationButton
              conversation={conversation}
              isActive={conversation.threadId === activeThreadId}
              key={conversation.threadId}
              onSelect={() => setActiveThreadId(conversation.threadId)}
            />
          ))}
          <div ref={loadMoreRef} />
          {isLoadingMore ? (
            <div className="flex items-center justify-center gap-2 py-4 text-xs font-medium text-muted">
              <Loader2 className="size-3.5 animate-spin" />
              Loading more replies
            </div>
          ) : null}
        </Card.Content>
      </Card>

      <Card className="min-w-0 flex h-[calc(100vh-112px)] min-h-[640px] flex-col border border-border/70 bg-surface">
        <Card.Header className="border-b border-border/70">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <Card.Title className="truncate text-base">{activeSummary?.lead || "Select a conversation"}</Card.Title>
              <Card.Description className="truncate">
                {[activeSummary?.campaignName, activeSummary?.leadEmail, activeSummary?.assignedAgent?.name].filter(Boolean).join(" · ") || "PlusVibe thread"}
              </Card.Description>
            </div>
            {activeSummary ? <StatusPill tone={activeSummary.isUnread ? "warning" : "default"}>{formatLabel(activeSummary.label)}</StatusPill> : null}
          </div>
        </Card.Header>
        <Card.Content className="thin-scrollbar min-h-0 flex-1 overflow-auto p-0">
          {isLoadingThread ? (
            <div className="p-4">
              <ThreadSkeleton />
            </div>
          ) : activeConversation ? (
            <div className="divide-y divide-border/70">
              {activeConversation.messages.map((message) => (
                <EmailMessageCard
                  key={message.id || `${message.sender}-${message.timestamp}`}
                  message={message}
                />
              ))}
            </div>
          ) : (
            <div className="grid flex-1 place-items-center text-sm text-muted">Choose a reply to view the thread.</div>
          )}
        </Card.Content>
        {activeConversation ? (
          <ManualReplyComposer conversation={activeConversation} disabled={isSending} onSend={sendReply} />
        ) : null}
      </Card>

      <AiReviewPanel
        conversation={activeConversation}
        disabled={isSending}
        isGenerating={isGeneratingDraft}
        error={error}
        isLoading={isLoadingThread}
        notice={notice}
        onApprove={approveDraft}
        onGenerate={generateDraft}
        onReject={rejectDraft}
      />
    </div>
  );
}

type ReplyPayload = {
  body: string;
  subject?: string | null;
  from?: string | null;
  to?: string | null;
  replyToId?: string | null;
};

type ThreadMessage = MessageConversationDetail["messages"][number];

function EmailMessageCard({ message }: { message: ThreadMessage }) {
  const isSent = message.from === "human";

  return (
    <article className="bg-surface px-4 py-4">
      <div className="flex items-start gap-3">
        <Avatar className="size-9 shrink-0">
          <Avatar.Fallback>{initials(message.sender || message.fromEmail || "PV")}</Avatar.Fallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold text-foreground">{message.sender}</p>
                <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-[11px] font-medium text-muted">
                  {isSent ? "Sent" : "Received"}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted">
                From {message.fromEmail || "unknown"} to {message.toEmail || "unknown"}
              </p>
            </div>
            <time className="shrink-0 text-xs font-medium text-muted">{formatDateTime(message.timestamp)}</time>
          </div>

          <div className="mt-3 rounded-2xl border border-border/70 bg-background/60 px-4 py-4">
            <EmailBody html={message.bodyHtml} text={message.bodyText} />
          </div>
        </div>
      </div>
    </article>
  );
}

function EmailBody({ html, text }: { html?: string | null; text: string }) {
  const cleanedText = useMemo(() => stripQuotedEmailText(text), [text]);
  const sanitized = useMemo(() => sanitizeEmailHtml(html), [html]);

  if (sanitized && !containsQuotedEmailHistory(sanitized)) {
    return (
      <div
        className="email-body text-sm leading-6 text-foreground"
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    );
  }

  return <p className="whitespace-pre-line text-sm leading-6 text-foreground">{cleanedText}</p>;
}

function ConversationButton({
  conversation,
  isActive,
  onSelect,
}: {
  conversation: MessageConversationSummary;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={["w-full rounded-2xl p-3 text-left transition", isActive ? "bg-surface-secondary" : "hover:bg-surface-secondary/70"].join(" ")}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        <Avatar className="size-9">
          <Avatar.Fallback>{initials(conversation.lead)}</Avatar.Fallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-foreground">{conversation.lead}</p>
            <span className="shrink-0 text-[11px] text-muted">{relativeTime(conversation.latestAt)}</span>
          </div>
          <p className="truncate text-xs text-muted">{conversation.campaignName}</p>
          <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-foreground">{conversation.latestMessage}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusPill tone={conversation.isUnread ? "warning" : "default"}>{formatLabel(conversation.label)}</StatusPill>
            {conversation.assignedAgent ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                <Bot className="size-3" />
                <span className="max-w-[150px] truncate">{conversation.assignedAgent.name}</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
}

function FilterSelect({
  label,
  onChange,
  options,
  selectedKey,
}: {
  label: string;
  onChange: (key: string) => void;
  options: Array<{ id: string; name: string }>;
  selectedKey: string;
}) {
  const selectedOption = options.find((option) => option.id === selectedKey) || options[0];

  return (
    <Select
      aria-label={label}
      className="agent-select w-full"
      fullWidth
      selectedKey={selectedOption?.id}
      variant="primary"
      onSelectionChange={(key) => {
        if (key) onChange(String(key));
      }}
    >
      <Select.Trigger className="h-9 px-3 text-sm text-foreground">
        <Select.Value>{selectedOption?.name}</Select.Value>
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox aria-label={label} className="max-h-64 overflow-y-auto" items={options}>
          {(option) => (
            <ListBox.Item id={option.id} textValue={option.name}>
              <ListBox.ItemIndicator />
              {option.name}
            </ListBox.Item>
          )}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function ManualReplyComposer({ conversation, disabled, onSend }: { conversation: MessageConversationDetail; disabled: boolean; onSend: (payload: ReplyPayload) => void }) {
  const latest = [...conversation.messages].reverse().find((message) => message.from === "prospect" && message.replyToId);
  const latestSent = [...conversation.messages].reverse().find((message) => message.from === "human" && message.fromEmail);
  const toEmail = conversation.leadEmail || latest?.fromEmail || "";
  const fromEmail = latest?.toEmail || conversation.aiDraft?.from || latestSent?.fromEmail || "";
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [bodyHtml, setBodyHtml] = useState("");

  useEffect(() => {
    setBodyHtml("");
    if (editorRef.current) editorRef.current.innerHTML = "";
  }, [conversation.threadId]);

  function syncBody() {
    setBodyHtml(sanitizeComposerHtml(editorRef.current?.innerHTML || ""));
  }

  function runCommand(command: string) {
    editorRef.current?.focus();
    document.execCommand(command, false);
    syncBody();
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    syncBody();
  }

  const isBodyEmpty = isComposerEmpty(bodyHtml);

  return (
    <Card.Footer className="border-t border-border/70 bg-surface-secondary/45 p-4">
      <section className="w-full rounded-2xl bg-surface p-3 shadow-[0_1px_3px_color-mix(in_oklch,var(--foreground)_10%,transparent)]">
        <div className="grid gap-2 text-[12px] 2xl:grid-cols-2">
          <Field label="To" value={toEmail || "Lead email unavailable"} />
          <Field label="From" value={fromEmail || "Connected inbox unavailable"} />
          <Field className="2xl:col-span-2" label="Subject" value={ensureReplySubject(latest?.subject)} />
        </div>
        <div className="mt-3 overflow-hidden rounded-xl border border-border/70 bg-surface transition focus-within:border-accent">
          <div className="flex items-center gap-1 border-b border-border/70 bg-background/60 px-2 py-1.5">
            <ToolbarButton label="Bold" onClick={() => runCommand("bold")}><Bold className="size-4" /></ToolbarButton>
            <ToolbarButton label="Italic" onClick={() => runCommand("italic")}><Italic className="size-4" /></ToolbarButton>
            <ToolbarButton label="Underline" onClick={() => runCommand("underline")}><Underline className="size-4" /></ToolbarButton>
            <span className="mx-1 h-5 w-px bg-border/80" />
            <ToolbarButton label="Bulleted list" onClick={() => runCommand("insertUnorderedList")}><List className="size-4" /></ToolbarButton>
            <ToolbarButton label="Numbered list" onClick={() => runCommand("insertOrderedList")}><ListOrdered className="size-4" /></ToolbarButton>
            <span className="mx-1 h-5 w-px bg-border/80" />
            <ToolbarButton label="Clear formatting" onClick={() => runCommand("removeFormat")}><RemoveFormatting className="size-4" /></ToolbarButton>
          </div>
          <div className="relative">
            {isBodyEmpty ? (
              <p className="pointer-events-none absolute left-3 top-3 text-sm leading-6 text-muted">Write a manual reply...</p>
            ) : null}
            <div
              aria-label="Manual reply body"
              className="rich-reply-editor thin-scrollbar min-h-[108px] max-h-[260px] overflow-auto px-3 py-3 text-sm leading-6 text-foreground outline-none"
              contentEditable={!disabled}
              onInput={syncBody}
              onPaste={handlePaste}
              ref={editorRef}
              role="textbox"
              suppressContentEditableWarning
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            className="h-8 rounded-full px-4 text-[13px]"
            isDisabled={disabled || isBodyEmpty}
            size="sm"
            onClick={() => onSend({
              body: bodyHtml,
              subject: ensureReplySubject(latest?.subject),
              from: fromEmail,
              to: toEmail,
              replyToId: latest?.replyToId,
            })}
          >
            <Send className="size-4" />
            Send manual reply
          </Button>
        </div>
      </section>
    </Card.Footer>
  );
}

function ToolbarButton({ children, label, onClick }: { children: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      aria-label={label}
      className="grid size-7 place-items-center rounded-lg text-muted transition hover:bg-surface-tertiary hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      onMouseDown={(event) => {
        event.preventDefault();
        onClick();
      }}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function AiReviewPanel({
  conversation,
  disabled,
  error,
  isGenerating,
  isLoading,
  notice,
  onApprove,
  onGenerate,
  onReject,
}: {
  conversation: MessageConversationDetail | null;
  disabled: boolean;
  error: string | null;
  isGenerating: boolean;
  isLoading: boolean;
  notice: string | null;
  onApprove: (draft: AiResponseDraft, body: string) => void;
  onGenerate: (regenerate?: boolean) => void;
  onReject: (draft: AiResponseDraft) => void;
}) {
  const draft = conversation?.aiDraft ?? null;
  const [draftBody, setDraftBody] = useState("");

  useEffect(() => setDraftBody(draft?.body || ""), [draft?.id, draft?.body]);

  return (
    <Card className="min-w-0 flex h-[calc(100vh-112px)] min-h-[640px] flex-col border border-border/70 bg-surface">
      <Card.Header className="border-b border-border/70">
        <Card.Title className="flex items-center gap-2 text-base">
          <Bot className="size-4 text-accent" />
          AI response
        </Card.Title>
        <Card.Description>Review, edit, approve, or reject the suggested reply.</Card.Description>
      </Card.Header>
      <Card.Content className="thin-scrollbar min-h-0 flex-1 overflow-auto p-4">
        {error ? <p className="mb-3 rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</p> : null}
        {notice ? <p className="mb-3 rounded-xl bg-success/10 px-3 py-2 text-sm font-medium text-success">{notice}</p> : null}

        {isLoading ? (
          <ThreadSkeleton />
        ) : !conversation ? (
          <div className="grid h-full place-items-center text-center text-sm text-muted">Select a conversation to review the AI reply.</div>
        ) : !conversation.assignedAgent ? (
          <div className="rounded-2xl bg-surface-secondary p-4 text-sm leading-6 text-muted">
            No AI agent is assigned to this campaign yet. Assign one on the Campaigns page to generate reviewable responses.
          </div>
        ) : !draft ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-surface-secondary p-4 text-sm leading-6 text-muted">
              No AI response has been generated for this reply yet.
            </div>
            <Button className="w-full" isDisabled={isGenerating} onClick={() => onGenerate(false)}>
              {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <Bot className="size-4" />}
              {isGenerating ? "Generating" : "Generate response"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Metric label="Agent" value={conversation.assignedAgent.name} />
              <Metric label="Confidence" value={`${Math.round(draft.confidence)}%`} />
              <Metric label="Status" value={draft.status} />
              <Metric label="Source" value={draft.generatedBy} />
            </div>
            {draft.generationError ? (
              <p className="rounded-xl bg-warning/10 px-3 py-2 text-xs font-medium leading-5 text-warning">
                AI provider failed, so a local fallback draft was created.
              </p>
            ) : null}
            <label className="grid gap-2 text-sm font-semibold text-foreground">
              Draft body
              <textarea
                className="min-h-[260px] resize-y rounded-2xl border border-border/70 bg-surface-secondary p-4 text-sm font-normal leading-6 text-foreground outline-none transition focus:border-accent"
                disabled={draft.status !== "Pending"}
                onChange={(event) => setDraftBody(event.target.value)}
                value={draftBody}
              />
            </label>
          </div>
        )}
      </Card.Content>
      {draft && draft.status === "Pending" ? (
        <Card.Footer className="flex flex-wrap justify-end gap-2 border-t border-border/70">
          <Button isDisabled={disabled || isGenerating} size="sm" variant="secondary" onClick={() => onGenerate(true)}>
            {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            {isGenerating ? "Regenerating" : "Regenerate"}
          </Button>
          <Button isDisabled={disabled} size="sm" variant="secondary" onClick={() => onReject(draft)}>
            <UserRoundX className="size-4" />
            Reject
          </Button>
          <Button isDisabled={disabled || draftBody.trim().length === 0} size="sm" onClick={() => onApprove(draft, draftBody)}>
            {disabled ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {disabled ? "Sending" : "Approve & Send"}
          </Button>
        </Card.Footer>
      ) : null}
    </Card>
  );
}

function Field({ className = "", label, value }: { className?: string; label: string; value: string }) {
  return (
    <label className={`${className} flex min-h-9 items-center gap-2 rounded-xl bg-background/70 px-3`}>
      <span className="w-12 shrink-0 font-medium text-muted">{label}</span>
      <input className="min-w-0 flex-1 bg-transparent font-medium text-foreground outline-none" readOnly value={value} />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-secondary p-3">
      <p className="text-[11px] font-medium text-muted">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ConversationSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, index) => (
        <div className="rounded-2xl p-3" key={index}>
          <div className="h-4 w-2/3 animate-pulse rounded bg-surface-tertiary" />
          <div className="mt-3 h-3 w-full animate-pulse rounded bg-surface-tertiary" />
          <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-surface-tertiary" />
        </div>
      ))}
    </div>
  );
}

function ThreadSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="h-24 w-[80%] animate-pulse rounded-2xl bg-surface-secondary" key={index} />
      ))}
    </div>
  );
}

function mergeConversations(current: MessageConversationSummary[], incoming: MessageConversationSummary[]) {
  const seen = new Set(current.map((conversation) => conversation.threadId));
  return [...current, ...incoming.filter((conversation) => !seen.has(conversation.threadId))];
}

function pinSelectedConversation(
  incoming: MessageConversationSummary[],
  current: MessageConversationSummary[],
  threadId?: string | null
) {
  if (!threadId) return incoming;
  if (incoming.some((conversation) => conversation.threadId === threadId)) return incoming;

  const selected = current.find((conversation) => conversation.threadId === threadId);
  return selected ? [selected, ...incoming] : incoming;
}

function initials(name: string) {
  return name.split(/[ @._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "PV";
}

function ensureReplySubject(subject?: string | null) {
  if (!subject) return "Re: PlusVibe reply";
  return /^re:/i.test(subject) ? subject : `Re: ${subject}`;
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function sanitizeEmailHtml(value?: string | null) {
  if (!value || typeof window === "undefined") return null;

  const documentNode = new DOMParser().parseFromString(value, "text/html");
  documentNode.querySelectorAll("script, style, link, meta, iframe, object, embed").forEach((node) => node.remove());
  documentNode.querySelectorAll([
    "blockquote",
    ".gmail_quote",
    "[class*='gmail_quote']",
    "[id*='gmail_quote']",
    ".yahoo_quoted",
    "[class*='yahoo_quoted']",
    ".protonmail_quote",
    "[class*='protonmail_quote']",
    ".moz-cite-prefix",
    "[id*='divRplyFwdMsg']",
    "[id*='appendonsend']",
  ].join(",")).forEach((node) => node.remove());
  documentNode.body.querySelectorAll("div, p, span").forEach((node) => {
    const text = node.textContent?.replace(/\s+/g, " ").trim() || "";

    if (isQuotedEmailIntro(text)) {
      node.remove();
    }
  });
  documentNode.body.querySelectorAll("*").forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const content = attribute.value.trim().toLowerCase();

      if (name.startsWith("on") || content.startsWith("javascript:")) {
        node.removeAttribute(attribute.name);
      }
    });
  });

  return documentNode.body.innerHTML.trim() || null;
}

function stripQuotedEmailText(value?: string | null) {
  const normalized = String(value || "")
    .replace(/\s+(On [^\n]{1,260} wrote:)/i, "\n$1")
    .replace(/\s+(_{6,})/g, "\n$1")
    .replace(/\s+>/g, "\n>");
  const lines = normalized.split(/\r?\n/);
  const quotedIndex = lines.findIndex((line) => {
    const text = line.trim();

    return (
      isQuotedEmailIntro(text) ||
      /^>/.test(text) ||
      /^-{2,}\s*Original Message\s*-{2,}$/i.test(text) ||
      /^_{6,}$/.test(text)
    );
  });

  return (quotedIndex >= 0 ? lines.slice(0, quotedIndex) : lines).join("\n").trim();
}

function containsQuotedEmailHistory(value?: string | null) {
  if (!value || typeof window === "undefined") return false;

  const documentNode = new DOMParser().parseFromString(value, "text/html");
  const text = documentNode.body.textContent || "";

  return /(^|\n|\s)On .{1,260} wrote:/i.test(text) || /(^|\n)\s*>/.test(text) || /Original Message/i.test(text);
}

function isQuotedEmailIntro(value: string) {
  if (value.length > 280) return false;

  return (
    /^On .+ wrote:$/i.test(value) ||
    /^From:\s.+/i.test(value) ||
    /^Sent:\s.+/i.test(value) ||
    /^To:\s.+/i.test(value) ||
    /^Subject:\s.+/i.test(value)
  );
}

function sanitizeComposerHtml(value: string) {
  if (!value || typeof window === "undefined") return "";

  const documentNode = new DOMParser().parseFromString(value, "text/html");
  documentNode.querySelectorAll("script, style, link, meta, iframe, object, embed, img, table").forEach((node) => node.remove());
  documentNode.body.querySelectorAll("*").forEach((node) => {
    const tagName = node.tagName.toLowerCase();
    const allowedTags = new Set(["b", "strong", "i", "em", "u", "p", "div", "br", "ul", "ol", "li"]);

    if (!allowedTags.has(tagName)) {
      node.replaceWith(documentNode.createTextNode(node.textContent || ""));
      return;
    }

    [...node.attributes].forEach((attribute) => node.removeAttribute(attribute.name));
  });

  return documentNode.body.innerHTML.trim();
}

function isComposerEmpty(value: string) {
  if (!value) return true;

  const text = value
    .replace(/<br\s*\/?>/gi, "")
    .replace(/<\/?(div|p|ul|ol|li|strong|b|em|i|u)>/gi, "")
    .replace(/&nbsp;/g, " ")
    .trim();

  return text.length === 0;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function formatDateTime(value?: string | null) {
  if (!value) return "Unknown time";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function relativeTime(value?: string | null) {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}
