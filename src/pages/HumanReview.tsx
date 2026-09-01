import { Button, Card, Spinner } from "@heroui/react";
import { CheckCircle2, Inbox, RefreshCw, Send, UserRoundX } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LoadingState } from "../components/ui/LoadingState";
import { StatusPill } from "../components/ui/StatusPill";
import { useRealtimeEvent } from "../hooks/useRealtimeEvent";
import { messageService, reviewService } from "../services/api";
import type { AiResponseDraft, HumanReviewItem } from "../types";

const PAGE_SIZE = 10;

export function HumanReview() {
  const [reviews, setReviews] = useState<HumanReviewItem[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [draftBody, setDraftBody] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = useMemo(
    () => reviews.find((review) => review.id === activeId) || reviews[0] || null,
    [activeId, reviews],
  );

  async function loadReviews(nextPage = page, options: { quiet?: boolean } = {}) {
    if (options.quiet) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await reviewService.list({ page: nextPage, limit: PAGE_SIZE });
      setReviews(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setPage(data.page);
      setActiveId((current) => {
        if (current && data.items.some((item) => item.id === current)) return current;
        return data.items[0]?.id ?? null;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "We could not load the review queue. Please try again.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    loadReviews(page);
  }, []);

  useEffect(() => {
    setDraftBody(active?.body || "");
  }, [active?.id, active?.body]);

  // Live push: the moment any signed-in reviewer approves, rejects, or
  // generates a draft, everyone else looking at this queue refreshes
  // automatically — this is exactly what stops the double-approve/reject
  // race, since a draft another tab just claimed disappears from the list
  // before you can act on it.
  useRealtimeEvent(["ai.draft."], () => {
    loadReviews(page, { quiet: true });
  });

  async function approveActiveDraft() {
    if (!active) return;

    setIsApproving(true);
    setError(null);
    try {
      await messageService.approveDraft(active.draftId, {
        body: draftBody,
        subject: active.subject,
        from: active.from,
        to: active.to,
      });
      const nextPage = reviews.length === 1 && page > 1 ? page - 1 : page;
      await loadReviews(nextPage, { quiet: true });
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : "We could not send this reply. Please try again.");
    } finally {
      setIsApproving(false);
    }
  }

  async function rejectActiveDraft() {
    if (!active) return;

    setIsRejecting(true);
    setError(null);
    try {
      await messageService.rejectDraft(active.draftId);
      const nextPage = reviews.length === 1 && page > 1 ? page - 1 : page;
      await loadReviews(nextPage, { quiet: true });
    } catch (rejectError) {
      setError(rejectError instanceof Error ? rejectError.message : "We could not reject this draft. Please try again.");
    } finally {
      setIsRejecting(false);
    }
  }

  async function regenerateActiveDraft() {
    if (!active) return;

    setIsRegenerating(true);
    setError(null);
    try {
      const draft = await messageService.generateDraft(active.threadId, { regenerate: true });
      setDraftBody(draft.body);
      setReviews((current) => current.map((item) => (item.id === active.id ? mergeDraft(item, draft) : item)));
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "We could not regenerate this draft. Please try again.");
    } finally {
      setIsRegenerating(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-[1500px] gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
      <Card className="h-fit border border-border/70 bg-surface">
        <Card.Header className="flex-row items-center justify-between gap-4 border-b border-border/70">
          <div>
            <Card.Title className="text-base">Human Review Queue</Card.Title>
            <Card.Description>Positive PlusVibe replies with AI drafts ready for approval.</Card.Description>
          </div>
          <Button size="sm" variant="secondary" onPress={() => loadReviews(page, { quiet: true })} isDisabled={isLoading || isRefreshing}>
            {isRefreshing ? <Spinner color="accent" size="sm" /> : <RefreshCw className="size-4" />}
          </Button>
        </Card.Header>

        <Card.Content className="space-y-3">
          {error ? <FriendlyError message={error} /> : null}

          {isLoading ? (
            <QueueSkeleton />
          ) : reviews.length === 0 ? (
            <EmptyQueue />
          ) : (
            <>
              <div className="space-y-2">
                {reviews.map((review) => {
                  const isActive = active?.id === review.id;

                  return (
                    <button
                      className={[
                        "w-full rounded-[14px] p-4 text-left transition",
                        isActive ? "bg-surface-secondary" : "hover:bg-surface-secondary/70",
                      ].join(" ")}
                      key={review.id}
                      onClick={() => setActiveId(review.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{review.leadName}</p>
                          <p className="truncate text-xs text-muted">{review.campaignName}</p>
                        </div>
                        <span className="shrink-0 text-xs text-muted">{formatAge(review.updatedAt)}</span>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm leading-5 text-foreground">{review.triggerPreview || review.body}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <StatusPill tone="warning">Needs review</StatusPill>
                        <StatusPill tone="accent">{review.confidence}%</StatusPill>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between border-t border-border/70 pt-3 text-xs text-muted">
                <span>{total} pending</span>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" onPress={() => loadReviews(page - 1)} isDisabled={isLoading || page <= 1}>
                    Previous
                  </Button>
                  <span>Page {page} of {totalPages}</span>
                  <Button size="sm" variant="secondary" onPress={() => loadReviews(page + 1)} isDisabled={isLoading || page >= totalPages}>
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card.Content>
      </Card>

      <Card className="apple-shadow min-h-[520px] border border-border/70 bg-surface">
        {active ? (
          <>
            <Card.Header className="flex-row items-start justify-between gap-4 border-b border-border/70">
              <div className="min-w-0">
                <Card.Title className="truncate text-base">{active.leadName}</Card.Title>
                <Card.Description className="truncate">
                  {active.leadEmail || "No lead email"} · {active.campaignName} · {active.agentName}
                </Card.Description>
              </div>
              <StatusPill tone="warning">{active.status}</StatusPill>
            </Card.Header>

            <Card.Content className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-4">
                <ReviewMeta label="Agent" value={active.agentName} />
                <ReviewMeta label="Confidence" value={`${active.confidence}%`} />
                <ReviewMeta label="Source" value={formatSource(active.generatedBy)} />
                <ReviewMeta label="Updated" value={formatAge(active.updatedAt)} />
              </div>

              <div className="grid gap-2">
                <p className="text-sm font-semibold text-foreground">Lead reply</p>
                <div className="max-h-[220px] overflow-auto rounded-[16px] border border-border bg-surface p-4 text-sm leading-6 text-foreground">
                  {active.triggerMessage || "The original lead reply was not included with this draft."}
                </div>
              </div>

              <div className="grid gap-2">
                <p className="text-sm font-semibold text-foreground">Draft body</p>
                <textarea
                  className="min-h-[300px] resize-y rounded-[16px] border border-border bg-surface-secondary p-4 text-sm leading-6 text-foreground outline-none transition focus:border-accent focus:bg-surface"
                  value={draftBody}
                  onChange={(event) => setDraftBody(event.target.value)}
                />
              </div>

              <div className="grid gap-2 rounded-[16px] bg-surface-secondary p-4 text-sm">
                <div className="flex min-w-0 gap-2">
                  <span className="w-14 shrink-0 text-muted">To</span>
                  <span className="truncate font-medium text-foreground">{active.to || active.leadEmail || "Lead"}</span>
                </div>
                <div className="flex min-w-0 gap-2">
                  <span className="w-14 shrink-0 text-muted">From</span>
                  <span className="truncate font-medium text-foreground">{active.from || "Connected inbox"}</span>
                </div>
                <div className="flex min-w-0 gap-2">
                  <span className="w-14 shrink-0 text-muted">Subject</span>
                  <span className="truncate font-medium text-foreground">{active.subject || "Reply"}</span>
                </div>
              </div>
            </Card.Content>

            <Card.Footer className="flex flex-wrap justify-end gap-2 border-t border-border/70">
              <Button size="sm" variant="secondary" onPress={regenerateActiveDraft} isDisabled={isRegenerating || isApproving || isRejecting}>
                {isRegenerating ? <Spinner color="accent" size="sm" /> : <RefreshCw className="size-4" />}
                Regenerate
              </Button>
              <Button size="sm" variant="secondary" onPress={rejectActiveDraft} isDisabled={isRejecting || isApproving || isRegenerating}>
                {isRejecting ? <Spinner color="accent" size="sm" /> : <UserRoundX className="size-4" />}
                Reject
              </Button>
              <Button size="sm" onPress={approveActiveDraft} isDisabled={!draftBody.trim() || isApproving || isRejecting || isRegenerating}>
                {isApproving ? <Spinner color="current" size="sm" /> : <Send className="size-4" />}
                Approve & Send
              </Button>
            </Card.Footer>
          </>
        ) : (
          <div className="grid min-h-[520px] place-items-center p-8 text-center">
            <div className="max-w-sm">
              <div className="mx-auto grid size-11 place-items-center rounded-full bg-surface-secondary text-accent">
                <CheckCircle2 className="size-5" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-foreground">No draft selected</h2>
              <p className="mt-1 text-sm text-muted">Positive replies with AI drafts will appear here as soon as PlusVibe sends the webhook.</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function FriendlyError({ message }: { message: string }) {
  return (
    <div className="rounded-[14px] border border-danger/20 bg-danger-50 px-4 py-3 text-sm font-medium text-danger">
      {message}
    </div>
  );
}

function EmptyQueue() {
  return (
    <div className="grid min-h-[260px] place-items-center rounded-[16px] bg-surface-secondary p-8 text-center">
      <div className="max-w-xs">
        <div className="mx-auto grid size-11 place-items-center rounded-full bg-surface text-accent">
          <Inbox className="size-5" />
        </div>
        <h2 className="mt-4 text-sm font-semibold text-foreground">Nothing needs review</h2>
        <p className="mt-1 text-sm leading-5 text-muted">New positive PlusVibe replies will appear here after the assigned AI agent prepares a draft.</p>
      </div>
    </div>
  );
}

function QueueSkeleton() {
  return <LoadingState />;
}

function ReviewMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[14px] bg-surface-secondary p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function mergeDraft(item: HumanReviewItem, draft: AiResponseDraft): HumanReviewItem {
  return {
    ...item,
    body: draft.body,
    confidence: draft.confidence,
    status: draft.status,
    generatedBy: draft.generatedBy,
    generationError: draft.generationError,
    updatedAt: draft.updatedAt,
  };
}

function formatAge(value?: string | null) {
  if (!value) return "Just now";

  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Just now";

  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.round(hours / 24);
  return `${days}d`;
}

function formatSource(value?: string | null) {
  if (!value) return "AI";

  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
