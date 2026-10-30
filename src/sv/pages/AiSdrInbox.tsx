import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, Bot, CalendarClock, CalendarCheck, ChevronRight, Filter, Forward as ForwardIcon, Info, Inbox, PanelLeft, Search, Settings as SettingsIcon, Star, Reply as ReplyIcon, Send, Video, X } from "lucide-react";
import { formatRelativeTime } from "../../utils/formatRelativeTime";
import { aiSdrApi, type BulkAction, type Folder, type Interest, type Outcome, type ThreadDetail, type ThreadList, type ThreadMessage, type ThreadSummary } from "../api/aiSdr";
import { useSvTitle } from "../layout/chrome";
import { svPath } from "../nav";
import { Badge, type BadgeTone, Button, Checkbox, Field, Menu, type MenuItem, Modal, Skeleton, SkeletonLines, useOutsideClose } from "../ui";

const OUTCOME_LABEL: Record<Outcome, string> = {
  none: "No status",
  escalated: "Escalated",
  meeting_booked: "Meeting Booked",
  do_not_contact: "Do not contact",
  out_of_office: "Out of Office",
  auto_reply: "Auto Reply",
  declined: "Declined",
};
const OUTCOME_TONE: Record<Outcome, BadgeTone> = {
  none: "neutral",
  escalated: "orange",
  meeting_booked: "purple",
  do_not_contact: "red",
  out_of_office: "neutral",
  auto_reply: "neutral",
  declined: "red",
};
const INTEREST_LABEL: Record<Interest, string> = { none: "", low: "Low Interest", medium: "Medium Interest", high: "High Interest", very_high: "Very High Interest" };
const INTEREST_TONE: Record<Interest, BadgeTone> = { none: "neutral", low: "yellow", medium: "green", high: "green", very_high: "green" };
const KIND_LABEL = { prospect: "Prospect Reply", ai: "AI SDR Reply", you: "You", campaign: "Campaign email" } as const;

const threadKey = (thread: { mailboxId: number; threadId: string }) => `${thread.mailboxId}|${thread.threadId}`;
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
const errorText = (error: unknown) => (error instanceof Error ? error.message : "Something went wrong. Try again.");

function formatClock(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(value));
}
function formatFull(value: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

/** Splits a reply into the new text and the quoted earlier messages. */
function splitQuoted(text: string) {
  const lines = text.split(/\r?\n/);
  const cut = lines.findIndex((line) => /^\s*On .{5,120}wrote:\s*$/i.test(line) || /^\s*>/.test(line) || /^\s*-{2,}\s*Original Message/i.test(line));
  if (cut <= 0) return { fresh: text.trim(), quoted: "" };
  return { fresh: lines.slice(0, cut).join("\n").trim(), quoted: lines.slice(cut).join("\n").trim() };
}

function ThreadChips({ thread }: { thread: ThreadSummary }) {
  return (
    <div className="sv-chips">
      {thread.unreadCount > 0 ? <Badge tone="blue">New</Badge> : thread.replyState === "replied" ? <Badge>Replied</Badge> : null}
      {thread.aiDisabled ? <Badge tone="red">AI SDR Disabled</Badge> : null}
      {thread.outcome !== "none" ? <Badge tone={OUTCOME_TONE[thread.outcome]}>{OUTCOME_LABEL[thread.outcome]}</Badge> : null}
      {thread.interest !== "none" ? <Badge tone={INTEREST_TONE[thread.interest]}>{INTEREST_LABEL[thread.interest]}</Badge> : null}
    </div>
  );
}

function ThreadRow({ thread, selected, checked, onOpen, onCheck, onStar }: { thread: ThreadSummary; selected: boolean; checked: boolean; onOpen: () => void; onCheck: (next: boolean) => void; onStar: () => void }) {
  const unread = thread.unreadCount > 0;
  return (
    <div className={`sv-thread${selected ? " is-selected" : ""}${unread ? " is-unread" : ""}`}>
      <div className="sv-thread-top">
        <Checkbox checked={checked} onChange={onCheck} label={`Select ${thread.prospectName}`} />
        <button type="button" className="sv-thread-main" onClick={onOpen}>
          <span className="sv-thread-name">{thread.prospectName}</span>
          <span className="sv-thread-time">{formatRelativeTime(thread.lastMessageAt)}</span>
        </button>
        <button type="button" className={`sv-star${thread.isFavorite ? " is-on" : ""}`} aria-label={thread.isFavorite ? "Remove from favorites" : "Add to favorites"} aria-pressed={thread.isFavorite} onClick={onStar}>
          <Star className="sv-icon" aria-hidden />
        </button>
      </div>
      <button type="button" className="sv-thread-body" onClick={onOpen}>
        <span className="sv-thread-subject">{thread.subject}</span>
        <span className="sv-thread-preview">{thread.preview}</span>
      </button>
      <ThreadChips thread={thread} />
    </div>
  );
}

function ContactPopover({ detail, onClose }: { detail: ThreadDetail; onClose: () => void }) {
  const ref = useOutsideClose(onClose);
  const c = detail.contact;
  const rows: Array<[string, string | null]> = [
    ["Campaign", c.campaign?.name ?? null],
    ["Email", c.email],
    ["Website", c.website],
    ["Industry", c.industry],
    ["Job Title", c.jobTitle],
    ["LinkedIn", c.linkedin],
    ["Location", c.location],
    ["Phone", c.phone],
    ["Company Name", c.company],
  ];
  return (
    <div ref={ref} className="sv-popover sv-contact" style={{ top: 40, left: 0 }}>
      <div className="sv-contact-head">
        <span className="sv-avatar" style={{ width: 40, height: 40, fontSize: 14 }}>{initials(c.name || "")}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 500, fontSize: 16 }}>{c.name}</div>
          <div className="sv-hint">{c.email}</div>
        </div>
      </div>
      <dl className="sv-contact-rows">
        {rows.filter(([, value]) => value).map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function MessageCard({ message, onForward }: { message: ThreadMessage; onForward: (message: ThreadMessage) => void }) {
  const [showQuoted, setShowQuoted] = useState(false);
  const { fresh, quoted } = splitQuoted(message.bodyText || "");
  const tone: BadgeTone = message.kind === "ai" ? "blue" : message.kind === "prospect" ? "neutral" : "neutral";
  return (
    <article className="sv-msg">
      <header className="sv-msg-head">
        <div style={{ minWidth: 0 }}>
          <div className="sv-msg-subject">{message.subject || "(no subject)"}</div>
          <div className="sv-hint"><b>from:</b> {message.fromAddress}</div>
          <div className="sv-hint"><b>to:</b> {message.toAddress}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <Badge tone={tone} icon={message.kind === "ai" ? Bot : undefined}>{KIND_LABEL[message.kind]}</Badge>
          <div className="sv-hint" style={{ marginTop: 6 }}>{formatFull(message.createdAt)}</div>
          <button type="button" className="sv-link" style={{ marginTop: 4, display: "inline-flex", alignItems: "center", gap: 4 }} onClick={() => onForward(message)}>
            <ForwardIcon className="sv-icon" style={{ width: 12, height: 12 }} aria-hidden /> Forward
          </button>
        </div>
      </header>
      <div className="sv-msg-body">{fresh || "(empty message)"}</div>
      {quoted ? (
        <>
          <button type="button" className="sv-link" onClick={() => setShowQuoted((current) => !current)}>
            {showQuoted ? "Hide quoted text" : "Show quoted text"}
          </button>
          {showQuoted ? <div className="sv-msg-body sv-msg-quoted">{quoted}</div> : null}
        </>
      ) : null}
    </article>
  );
}

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function atNineAm(daysAhead: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  date.setHours(9, 0, 0, 0);
  return date;
}

/** Schedules (or clears) the thread's next follow-up. The SDR sends it at that time if the prospect has not answered. */
function FollowUpControl({ state, disabled, onSave }: { state: ThreadDetail["state"]; disabled: boolean; onSave: (iso: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(() => toLocalInputValue(atNineAm(1)));
  const ref = useOutsideClose(() => setOpen(false));
  const scheduled = state.followUpAt ? new Date(state.followUpAt) : null;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <Button size="sm" icon={CalendarClock} aria-expanded={open} onClick={() => setOpen((current) => !current)} disabled={disabled}>
        {scheduled ? `Follow-up ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(scheduled)}` : "No follow-up scheduled"}
      </Button>
      {open ? (
        <div className="sv-popover" style={{ top: 38, left: 0, width: 300, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontWeight: 500 }}>Schedule a follow-up</div>
          <p className="sv-hint">If they have not answered by then, the AI SDR writes and sends a short follow-up. With the AI SDR off, you get a task instead.</p>
          <div className="sv-actions" style={{ flexWrap: "wrap" }}>
            <Button size="sm" onClick={() => setValue(toLocalInputValue(atNineAm(1)))}>Tomorrow</Button>
            <Button size="sm" onClick={() => setValue(toLocalInputValue(atNineAm(3)))}>In 3 days</Button>
            <Button size="sm" onClick={() => setValue(toLocalInputValue(atNineAm(7)))}>Next week</Button>
          </div>
          <input type="datetime-local" className="sv-input" value={value} onChange={(event) => setValue(event.target.value)} aria-label="Follow-up date and time" />
          {scheduled ? <p className="sv-hint">Scheduled by {state.followupBy === "manual" ? "you" : "the AI SDR"}. {state.followupCount} follow-up{state.followupCount === 1 ? "" : "s"} sent so far.</p> : null}
          <div className="sv-actions" style={{ justifyContent: "flex-end" }}>
            {scheduled ? <Button size="sm" onClick={() => { setOpen(false); onSave(null); }}>Clear</Button> : null}
            <Button size="sm" variant="primary" disabled={!value} onClick={() => { setOpen(false); onSave(new Date(value).toISOString()); }}>Schedule</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ForwardModal({ message, mailboxId, threadId, onClose, onDone }: { message: ThreadMessage; mailboxId: number; threadId: string; onClose: () => void; onDone: () => void }) {
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    setBusy(true);
    setError("");
    try {
      await aiSdrApi.forward(mailboxId, threadId, message.id, to.trim(), note);
      onDone();
      onClose();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      title="Forward message"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={Send} disabled={busy || !to.trim()} onClick={() => void send()}>{busy ? "Sending…" : "Forward"}</Button>
        </>
      }
    >
      {error ? <p className="sv-banner is-error" role="alert" style={{ margin: 0 }}>{error}</p> : null}
      <Field label="To" htmlFor="fwd-to"><input id="fwd-to" type="email" className="sv-input" value={to} onChange={(event) => setTo(event.target.value)} placeholder="colleague@company.com" autoFocus /></Field>
      <Field label="Note (optional)" htmlFor="fwd-note"><textarea id="fwd-note" className="sv-textarea" value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={2000} /></Field>
      <p className="sv-hint">Sends "Fwd: {message.subject || "(no subject)"}" from this inbox with the original message below your note. It is not added to the conversation with the prospect.</p>
    </Modal>
  );
}

function DetailPane({ mailboxId, threadId, onChanged }: { mailboxId: number; threadId: string; onChanged: () => void }) {
  const [detail, setDetail] = useState<ThreadDetail | null>(null);
  const [error, setError] = useState("");
  const [contactOpen, setContactOpen] = useState(false);
  const [composing, setComposing] = useState(false);
  const [reply, setReply] = useState("");
  const [draftText, setDraftText] = useState("");
  const [busy, setBusy] = useState(false);
  const [forwardTarget, setForwardTarget] = useState<ThreadMessage | null>(null);
  const [notice, setNotice] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const next = await aiSdrApi.thread(mailboxId, threadId);
      setDetail(next);
      setDraftText(next.pendingDraft?.body ?? "");
      setError("");
      return next;
    } catch (caught) {
      setError(errorText(caught));
      return null;
    }
  }, [mailboxId, threadId]);

  useEffect(() => {
    setDetail(null);
    setComposing(false);
    setReply("");
    setContactOpen(false);
    void load().then((next) => {
      if (next?.messages.some((message) => message.direction === "inbound" && !message.isRead)) {
        void aiSdrApi.bulk([{ mailboxId, threadId }], "read").then(onChanged).catch(() => undefined);
      }
    });
    // Reloading when the selected thread changes is the point; onChanged is stable enough for this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mailboxId, threadId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [detail?.messages.length, detail?.pendingDraft?.id]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
      await load();
      onChanged();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  if (error && !detail) return <div className="sv-pane-empty"><p>{error}</p></div>;
  if (!detail) return (
    <section className="sv-detail" aria-label="Conversation" role="status">
      <header className="sv-detail-head">
        <Skeleton width={40} height={40} circle />
        <div style={{ flex: 1, display: "grid", gap: 8 }}><Skeleton width="30%" height={16} /><Skeleton width="50%" /></div>
      </header>
      <div style={{ padding: 20, display: "grid", gap: 24 }}>
        {[0, 1, 2].map((i) => <div key={i} style={{ display: "grid", gap: 10 }}><Skeleton width="25%" height={14} /><SkeletonLines lines={4} /></div>)}
      </div>
    </section>
  );

  const { state, contact } = detail;
  const statusItems: MenuItem[] = (Object.keys(OUTCOME_LABEL) as Outcome[]).map((outcome) => ({
    label: OUTCOME_LABEL[outcome],
    selected: state.outcome === outcome,
    onSelect: () => void run(() => aiSdrApi.patchThread(mailboxId, threadId, { outcome })),
  }));

  return (
    <section className="sv-detail" aria-label="Conversation">
      <header className="sv-detail-head">
        <span className="sv-avatar sv-avatar-lg">{initials(contact.name || "")}</span>
        <div style={{ minWidth: 0 }}>
          <div className="sv-detail-name">
            {contact.name} <span className="sv-hint" style={{ display: "inline" }}>{contact.email}</span>
          </div>
          <div className="sv-hint">{detail.messages.length} Messages | {formatClock(detail.messages[detail.messages.length - 1].createdAt)}</div>
        </div>
      </header>
      <div className="sv-detail-bar">
        <div style={{ position: "relative" }}>
          <Button size="sm" icon={Info} onClick={() => setContactOpen((open) => !open)} aria-expanded={contactOpen}>
            Contact details
          </Button>
          {contactOpen ? <ContactPopover detail={detail} onClose={() => setContactOpen(false)} /> : null}
        </div>
        <Menu
          className={`sv-btn is-sm sv-status-btn${state.outcome !== "none" ? ` is-${OUTCOME_TONE[state.outcome]}` : ""}`}
          trigger={<>{OUTCOME_LABEL[state.outcome]} <ChevronRight className="sv-icon" style={{ transform: "rotate(90deg)", width: 12, height: 12 }} aria-hidden /></>}
          items={statusItems}
          label="Thread status"
        />
        {state.interest !== "none" ? <Badge tone={INTEREST_TONE[state.interest]}>{INTEREST_LABEL[state.interest]}</Badge> : null}
        <FollowUpControl state={state} disabled={busy} onSave={(iso) => void run(() => aiSdrApi.patchThread(mailboxId, threadId, { followUpAt: iso }))} />
        <div style={{ flex: 1 }} />
        <Button size="sm" icon={Bot} disabled={busy} onClick={() => void run(() => aiSdrApi.patchThread(mailboxId, threadId, { aiDisabled: !state.aiDisabled }))}>
          {state.aiDisabled ? "Enable AI SDR" : "Disable AI SDR"}
        </Button>
      </div>

      <div className="sv-detail-scroll">
        {state.needsAttention ? (
          <div className="sv-banner is-warn" role="status">
            <AlertTriangle className="sv-icon" aria-hidden />
            <span style={{ flex: 1 }}><b>Needs attention.</b> {state.attentionReason || "A person should look at this thread."}</span>
            <Button size="sm" disabled={busy} onClick={() => void run(() => aiSdrApi.patchThread(mailboxId, threadId, { needsAttention: false }))}>
              Mark resolved
            </Button>
          </div>
        ) : null}
        {detail.bookings.map((booking) => (
          <div key={booking.id} className="sv-banner is-ok" role="status">
            <CalendarCheck className="sv-icon" aria-hidden />
            <span style={{ flex: 1 }}><b>Meeting booked</b> for {formatFull(booking.startTime)}</span>
            {booking.meetLink ? <a className="sv-btn is-sm" href={booking.meetLink} target="_blank" rel="noreferrer"><Video className="sv-icon" aria-hidden /> Join</a> : null}
          </div>
        ))}
        {notice ? <div className="sv-banner is-ok" role="status">{notice}</div> : null}
        {error ? <div className="sv-banner is-error" role="alert">{error}</div> : null}

        {detail.messages.map((message) => <MessageCard key={message.id} message={message} onForward={setForwardTarget} />)}

        {detail.pendingDraft ? (
          <article className="sv-msg sv-draft">
            <header className="sv-msg-head">
              <div className="sv-msg-subject">AI SDR draft, waiting for you</div>
              <Badge tone="blue" icon={Bot}>Draft</Badge>
            </header>
            <textarea className="sv-textarea" value={draftText} onChange={(event) => setDraftText(event.target.value)} aria-label="Draft reply" rows={6} />
            <div className="sv-actions" style={{ justifyContent: "flex-end" }}>
              <Button size="sm" disabled={busy} onClick={() => void run(() => aiSdrApi.discardDraft(mailboxId, threadId, detail.pendingDraft!.id))}>Discard</Button>
              <Button size="sm" variant="primary" icon={Send} disabled={busy || !draftText.trim()} onClick={() => void run(() => aiSdrApi.sendDraft(mailboxId, threadId, detail.pendingDraft!.id, draftText))}>
                Send reply
              </Button>
            </div>
          </article>
        ) : null}
        <div ref={endRef} />
      </div>

      {forwardTarget ? <ForwardModal message={forwardTarget} mailboxId={mailboxId} threadId={threadId} onClose={() => setForwardTarget(null)} onDone={() => setNotice("Message forwarded.")} /> : null}

      <footer className="sv-composer">
        {composing ? (
          <>
            <textarea className="sv-textarea" autoFocus value={reply} onChange={(event) => setReply(event.target.value)} placeholder={`Reply to ${contact.name || "prospect"}…`} aria-label="Reply" rows={5} />
            <div className="sv-actions" style={{ justifyContent: "flex-end" }}>
              <Button size="sm" onClick={() => { setComposing(false); setReply(""); }}>Cancel</Button>
              <Button size="sm" variant="primary" icon={Send} disabled={busy || !reply.trim()} onClick={() => void run(async () => { await aiSdrApi.reply(mailboxId, threadId, reply); setReply(""); setComposing(false); })}>
                Send
              </Button>
            </div>
          </>
        ) : (
          <Button variant="primary" icon={ReplyIcon} onClick={() => setComposing(true)}>Reply</Button>
        )}
      </footer>
    </section>
  );
}

const FOLDERS: Array<{ id: Folder; label: string; icon: typeof Inbox }> = [
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "attention", label: "Needs Attention", icon: AlertTriangle },
  { id: "favorites", label: "Favorites", icon: Star },
  { id: "disabled", label: "AI SDR Disabled", icon: Bot },
];

export function AiSdrInbox() {
  useSvTitle([{ label: "AI SDR Inbox" }]);
  const [params, setParams] = useSearchParams();
  const selectedMailbox = Number(params.get("mailbox")) || null;
  const selectedThread = params.get("thread");

  const [folder, setFolder] = useState<Folder>("inbox");
  const [campaignId, setCampaignId] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [list, setList] = useState<ThreadList | null>(null);
  const [campaigns, setCampaigns] = useState<Array<{ id: number; name: string }>>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [navHidden, setNavHidden] = useState(false);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((current) => current + 1), []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchText);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    let cancelled = false;
    aiSdrApi
      .threads({ folder, campaignId, outcome, search, page })
      .then((next) => {
        if (cancelled) return;
        setList(next);
        setError("");
      })
      .catch((caught) => !cancelled && setError(errorText(caught)));
    return () => {
      cancelled = true;
    };
  }, [folder, campaignId, outcome, search, page, version]);

  useEffect(() => {
    aiSdrApi.campaigns().then(setCampaigns).catch(() => undefined);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => document.visibilityState === "visible" && refresh(), 30000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const open = (thread: ThreadSummary) => setParams({ mailbox: String(thread.mailboxId), thread: thread.threadId }, { replace: true });
  const selectedRows = useMemo(() => (list?.items ?? []).filter((thread) => checked.has(threadKey(thread))), [list, checked]);

  async function bulk(action: BulkAction, threads = selectedRows) {
    if (threads.length === 0) return;
    try {
      await aiSdrApi.bulk(threads.map((thread) => ({ mailboxId: thread.mailboxId, threadId: thread.threadId })), action);
      setChecked(new Set());
      refresh();
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  const counts = list?.counts;
  const campaignName = campaigns.find((campaign) => campaign.id === campaignId)?.name;
  const allChecked = Boolean(list && list.items.length > 0 && list.items.every((thread) => checked.has(threadKey(thread))));
  const actionItems: MenuItem[] = [
    { label: "Mark as read", onSelect: () => void bulk("read") },
    { label: "Mark as unread", onSelect: () => void bulk("unread") },
    { label: "Add to favorites", onSelect: () => void bulk("favorite") },
    { label: "Remove from favorites", onSelect: () => void bulk("unfavorite") },
    { label: "Disable AI SDR", onSelect: () => void bulk("disable_ai") },
    { label: "Enable AI SDR", onSelect: () => void bulk("enable_ai") },
    { label: "Mark resolved", onSelect: () => void bulk("resolve") },
  ];

  const countsFor = (id: Folder) => {
    if (!counts) return null;
    if (id === "inbox") return counts.inbox;
    if (id === "attention") return counts.attention;
    if (id === "favorites") return { total: counts.favorites.total };
    return { total: counts.disabled.total };
  };

  return (
    <div className="sv-inbox sv-fill" data-nav-hidden={navHidden || undefined}>
      {!navHidden ? (
        <aside className="sv-inbox-nav" aria-label="Folders">
          <nav className="sv-inbox-folders">
            {FOLDERS.map((item) => {
              const count = countsFor(item.id) as { unread?: number; total: number } | null;
              return (
                <button key={item.id} type="button" className={`sv-nav-item${folder === item.id ? " is-active" : ""}`} aria-current={folder === item.id ? "true" : undefined} onClick={() => { setFolder(item.id); setPage(1); setChecked(new Set()); }}>
                  <item.icon className="sv-icon" aria-hidden />
                  <span className="sv-nav-label">{item.label}</span>
                  {count ? (
                    <span className="sv-counts">
                      {count.unread ? <span className="sv-count is-blue">{count.unread}</span> : null}
                      <span className="sv-count">{count.total}</span>
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
          <div className="sv-inbox-filters">
            <div className="sv-group-label" style={{ cursor: "default" }}><Filter className="sv-icon" aria-hidden /> Filter by</div>
            <Menu
              className="sv-nav-item"
              trigger={<><span className="sv-nav-label">{campaignName ? `Campaign: ${campaignName}` : "Campaign"}</span><ChevronRight className="sv-icon" aria-hidden /></>}
              items={[{ label: "All campaigns", selected: !campaignId, onSelect: () => { setCampaignId(null); setPage(1); } }, ...campaigns.map((campaign) => ({ label: campaign.name, selected: campaign.id === campaignId, onSelect: () => { setCampaignId(campaign.id); setPage(1); } }))]}
              label="Filter by campaign"
            />
            <Menu
              className="sv-nav-item"
              trigger={<><span className="sv-nav-label">{outcome ? `Status: ${OUTCOME_LABEL[outcome]}` : "Status"}</span><ChevronRight className="sv-icon" aria-hidden /></>}
              items={[{ label: "All statuses", selected: !outcome, onSelect: () => { setOutcome(null); setPage(1); } }, ...(Object.keys(OUTCOME_LABEL) as Outcome[]).filter((value) => value !== "none").map((value) => ({ label: OUTCOME_LABEL[value], selected: value === outcome, onSelect: () => { setOutcome(value); setPage(1); } }))]}
              label="Filter by status"
            />
          </div>
          <div className="sv-inbox-foot">
            <Link to={svPath("settings/ai-sdr-agent")} className="sv-btn is-sm" style={{ flex: 1 }}>
              <SettingsIcon className="sv-icon" aria-hidden /> AI SDR Settings
            </Link>
            <button type="button" className="sv-icon-btn" aria-label="Hide folders" onClick={() => setNavHidden(true)}>
              <PanelLeft className="sv-icon" aria-hidden />
            </button>
          </div>
        </aside>
      ) : (
        <button type="button" className="sv-icon-btn sv-inbox-reopen" aria-label="Show folders" onClick={() => setNavHidden(false)}>
          <PanelLeft className="sv-icon" aria-hidden />
        </button>
      )}

      <section className="sv-inbox-list" aria-label="Threads">
        <div className="sv-list-head">
          <label className="sv-settings-search" style={{ margin: 0 }}>
            <Search className="sv-icon" aria-hidden />
            <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search mail" aria-label="Search mail" />
            {searchText ? <button type="button" aria-label="Clear search" onClick={() => setSearchText("")}><X className="sv-icon" aria-hidden /></button> : null}
          </label>
          <div className="sv-list-page">
            <span className="sv-hint">
              {list && list.total > 0 ? `${(list.page - 1) * list.limit + 1}-${Math.min(list.page * list.limit, list.total)} of ${list.total} threads` : "0 threads"}
            </span>
            <span className="sv-actions">
              <Button size="sm" disabled={!list || page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
              <Button size="sm" disabled={!list || page >= list.totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button>
            </span>
          </div>
          <div className="sv-list-page">
            <label className="sv-hint" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Checkbox
                checked={allChecked}
                onChange={(next) => setChecked(next && list ? new Set(list.items.map(threadKey)) : new Set())}
                label="Select all"
              />
              Select all
            </label>
            <Menu className="sv-btn is-sm" trigger={<>Actions <ChevronRight className="sv-icon" style={{ transform: "rotate(90deg)", width: 12, height: 12 }} aria-hidden /></>} items={actionItems} align="right" disabled={selectedRows.length === 0} label="Bulk actions" />
          </div>
        </div>
        <div className="sv-list-scroll">
          {error ? <p className="sv-banner is-error" role="alert" style={{ margin: 12 }}>{error}</p> : null}
          {!list && !error ? (
            <div role="status" aria-label="Loading" style={{ padding: 12, display: "grid", gap: 4 }}>
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 4px" }}>
                  <Skeleton width={36} height={36} circle style={{ flex: "none" }} />
                  <div style={{ flex: 1, display: "grid", gap: 8 }}><Skeleton width="40%" height={13} /><Skeleton width="85%" /></div>
                </div>
              ))}
            </div>
          ) : null}
          {list && list.items.length === 0 ? (
            <div className="sv-pane-empty" style={{ padding: 24 }}>
              <p>{search || campaignId || outcome ? "No threads match these filters." : folder === "inbox" ? "No replies yet. Replies to your campaigns will show up here." : "Nothing here."}</p>
            </div>
          ) : null}
          {list?.items.map((thread) => (
            <ThreadRow
              key={threadKey(thread)}
              thread={thread}
              selected={selectedMailbox === thread.mailboxId && selectedThread === thread.threadId}
              checked={checked.has(threadKey(thread))}
              onOpen={() => open(thread)}
              onCheck={(next) => setChecked((current) => { const copy = new Set(current); if (next) copy.add(threadKey(thread)); else copy.delete(threadKey(thread)); return copy; })}
              onStar={() => void bulk(thread.isFavorite ? "unfavorite" : "favorite", [thread])}
            />
          ))}
        </div>
      </section>

      <div className="sv-inbox-detail">
        {selectedMailbox && selectedThread ? (
          <DetailPane key={`${selectedMailbox}|${selectedThread}`} mailboxId={selectedMailbox} threadId={selectedThread} onChanged={refresh} />
        ) : (
          <div className="sv-pane-empty">
            <h3>Select an email to view</h3>
            <p>Choose from the list on the left</p>
          </div>
        )}
      </div>
    </div>
  );
}
