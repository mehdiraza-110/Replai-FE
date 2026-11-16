import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { feedbackApi, type Ticket } from "../../api/feedback";
import { FeedbackDetail } from "../../feedback/FeedbackDetail";
import { TicketCard } from "../../feedback/TicketCard";
import { useSvTitle } from "../../layout/chrome";
import { Button, EmptyState, PageHeader, SkeletonCard } from "../../ui";

/** Support: your own tickets, newest first. The floating Ticket button creates new ones. */
export function MyTickets() {
  useSvTitle([{ label: "Support" }]);
  const [items, setItems] = useState<Ticket[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(() => {
    feedbackApi.mine().then((list) => { setItems(list); setError(null); }).catch((e) => setError(e instanceof Error ? e.message : "We could not load your tickets."));
  }, []);

  useEffect(() => {
    load();
    window.addEventListener("feedback-submitted", load);
    window.addEventListener("feedback-unread-changed", load);
    return () => { window.removeEventListener("feedback-submitted", load); window.removeEventListener("feedback-unread-changed", load); };
  }, [load]);

  return (
    <div className="sv-page">
      <PageHeader title="Support" subtitle="Your tickets and the team's replies." actions={<span className="sv-hint">Use the Ticket button at the bottom right to report a problem.</span>} />
      {error ? <p className="sv-fb-error" role="alert">{error}</p> : null}
      {items === null && !error ? <SkeletonCard lines={4} /> : null}
      {items && items.length === 0 ? <EmptyState title="No tickets yet" body="When something goes wrong or you have an idea, send us a ticket and we will reply here." action={<Button icon={Plus} onClick={() => document.querySelector<HTMLButtonElement>(".sv-fb-fab")?.click()}>New ticket</Button>} /> : null}
      {items && items.length > 0 ? <div className="sv-fb-list">{items.map((t) => <TicketCard key={t.id} ticket={t} onOpen={() => setOpen(t.id)} />)}</div> : null}
      <FeedbackDetail id={open} staff={false} onClose={() => { setOpen(null); load(); }} onChanged={load} />
    </div>
  );
}
