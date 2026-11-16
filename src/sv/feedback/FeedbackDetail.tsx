import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Video } from "lucide-react";
import { feedbackApi, type Ticket, type TicketReply, type TicketStatus } from "../api/feedback";
import { Button, Modal, SkeletonLines } from "../ui";
import { svPath } from "../nav";
import { FEEDBACK_STATUSES, FeedbackStatusBadge, formatLength, formatWhen } from "./feedbackStatus";
import { UNREAD_CHANGED_EVENT } from "./useTicketAlerts";

/** A ticket's thread. The sender can reply; the team can also set the status, with an optional message. */
export function FeedbackDetail({ id, staff, onClose, onChanged }: { id: string | null; staff: boolean; onClose: () => void; onChanged?: () => void }) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<TicketStatus>("pending");
  const [statusMessage, setStatusMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  const load = useCallback(async (ticketId: string) => {
    try {
      const data = await feedbackApi.thread(ticketId);
      setTicket(data.feedback);
      setReplies(data.replies);
      setStatus(data.feedback.status);
      setError(null);
      // Opening your own ticket marks it read, which moves the badge.
      window.dispatchEvent(new Event(UNREAD_CHANGED_EVENT));
    } catch (e) {
      setError(e instanceof Error ? e.message : "We could not load this ticket.");
    }
  }, []);

  useEffect(() => {
    setTicket(null); setReplies([]); setBody(""); setStatusMessage(""); setError(null);
    if (id) void load(id);
  }, [id, load]);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [replies.length]);

  async function send() {
    if (!id || !body.trim() || sending) return;
    setSending(true);
    try {
      const reply = await feedbackApi.reply(id, body.trim());
      setReplies((list) => [...list, reply]);
      setBody("");
      if (staff && ticket?.status === "pending") setTicket({ ...ticket, status: "in_review" }), setStatus("in_review");
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "We could not send that reply.");
    } finally { setSending(false); }
  }

  async function saveStatus() {
    if (!id || saving) return;
    setSaving(true);
    try {
      await feedbackApi.setStatus(id, status, statusMessage.trim() || undefined);
      setStatusMessage("");
      await load(id);
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "We could not change the status.");
    } finally { setSaving(false); }
  }

  const canChangeStatus = staff && ticket && (status !== ticket.status || statusMessage.trim());

  return (
    <Modal open={Boolean(id)} title={ticket ? `#${ticket.ticketNumber} · ${ticket.issueName}` : "Ticket"} onClose={onClose} wide>
      {!ticket && !error ? <SkeletonLines lines={5} /> : null}
      {error ? <p className="sv-fb-error" role="alert">{error}</p> : null}
      {ticket ? (
        <div className="sv-fb-detail">
          <div className="sv-fb-meta">
            <FeedbackStatusBadge status={ticket.status} />
            <span>{formatWhen(ticket.createdAt)}</span>
            {staff && ticket.reporter ? <span>{ticket.reporter.name}{ticket.reporter.email ? ` · ${ticket.reporter.email}` : ""}</span> : null}
            {staff && ticket.workspaceName ? <span>Workspace: {ticket.workspaceName}</span> : null}
          </div>

          {ticket.description ? <p className="sv-fb-desc">{ticket.description}</p> : null}
          {ticket.pageUrl ? <p className="sv-hint">Reported on <a href={ticket.pageUrl} target="_blank" rel="noreferrer">{ticket.pageUrl}</a></p> : null}
          {ticket.transcript && !ticket.description.includes(ticket.transcript) ? <div className="sv-fb-box"><strong>Transcript</strong><p>{ticket.transcript}</p></div> : null}
          {staff && ticket.transcriptError ? <p className="sv-hint">Transcription failed: {ticket.transcriptError}</p> : null}

          {ticket.hasRecording ? (
            <Link className="sv-btn is-sm" style={{ alignSelf: "flex-start" }} to={svPath(`feedback/${ticket.id}/recording`)} target="_blank">
              <Video className="sv-icon" aria-hidden />Watch recording{ticket.durationSeconds ? ` (${formatLength(ticket.durationSeconds)})` : ""}
            </Link>
          ) : null}

          {staff ? (
            <div className="sv-fb-box">
              {ticket.asanaTaskUrl ? <a href={ticket.asanaTaskUrl} target="_blank" rel="noreferrer" className="sv-fb-link"><ExternalLink className="sv-icon" aria-hidden />Open the Asana task</a> : <span className="sv-hint">{ticket.asanaTaskError ? `No Asana task: ${ticket.asanaTaskError}` : "No Asana task was created for this ticket."}</span>}
            </div>
          ) : null}

          <div className="sv-fb-thread" aria-label="Conversation">
            {replies.map((r) => (
              <div key={r.id} className={`sv-fb-msg${r.isStaff ? " is-staff" : ""}`}>
                <div className="sv-fb-msg-head"><strong>{r.authorName}</strong>{r.isStaff ? <span className="sv-fb-tag">Team</span> : null}<span>{formatWhen(r.createdAt)}</span></div>
                <p>{r.body}</p>
              </div>
            ))}
            <div ref={end} />
          </div>

          <div className="sv-fb-compose">
            <textarea className="sv-textarea" rows={3} value={body} maxLength={4000} placeholder={staff ? "Reply to the reporter…" : "Write a reply…"} aria-label="Reply" onChange={(e) => setBody(e.target.value)} />
            <Button variant="primary" disabled={!body.trim() || sending} onClick={() => void send()}>{sending ? "Sending…" : "Send reply"}</Button>
          </div>

          {staff ? (
            <div className="sv-fb-box sv-fb-status">
              <strong>Status</strong>
              <div className="sv-fb-status-row">
                <select className="sv-select" value={status} aria-label="Status" onChange={(e) => setStatus(e.target.value as TicketStatus)}>
                  {FEEDBACK_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label} · {s.hint}</option>)}
                </select>
                <Button disabled={!canChangeStatus || saving} onClick={() => void saveStatus()}>{saving ? "Saving…" : "Update"}</Button>
              </div>
              <input className="sv-input" value={statusMessage} maxLength={4000} placeholder="Optional message to the reporter, posted as a reply" aria-label="Status message" onChange={(e) => setStatusMessage(e.target.value)} />
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
