import { MessageSquare, Video } from "lucide-react";
import type { Ticket } from "../api/feedback";
import { FeedbackStatusBadge, formatWhen } from "./feedbackStatus";

/** One row of a ticket list. `showReporter` is for the team inbox. */
export function TicketCard({ ticket, onOpen, showReporter }: { ticket: Ticket; onOpen: () => void; showReporter?: boolean }) {
  return (
    <button type="button" className="sv-fb-card" onClick={onOpen}>
      <span className="sv-fb-num">#{ticket.ticketNumber}</span>
      <span className="sv-fb-card-main">
        <span className="sv-fb-card-title">
          {ticket.hasUnread ? <span className="sv-fb-dot" aria-label="New activity" /> : null}
          {ticket.issueName}
        </span>
        <span className="sv-fb-card-sub">
          {showReporter && ticket.reporter ? `${ticket.reporter.name} · ` : ""}
          {formatWhen(ticket.createdAt)}
          {ticket.workspaceName ? ` · ${ticket.workspaceName}` : ""}
        </span>
      </span>
      {ticket.hasRecording ? <Video className="sv-icon" aria-label="Has a recording" /> : null}
      <span className="sv-fb-replies" title="Replies"><MessageSquare className="sv-icon" aria-hidden />{ticket.replyCount ?? 0}</span>
      <FeedbackStatusBadge status={ticket.status} />
    </button>
  );
}
