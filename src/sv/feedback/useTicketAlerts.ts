import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { onTicketNew, onTicketUpdated } from "../../services/realtime";
import { feedbackApi } from "../api/feedback";

export const TICKETS_SEEN_KEY = "sv-tickets-seen-at";
export const TICKET_NEW_EVENT = "ticket-new";
export const UNREAD_CHANGED_EVENT = "feedback-unread-changed";

export function readSeenAt() {
  try { return localStorage.getItem(TICKETS_SEEN_KEY) || new Date(0).toISOString(); } catch { return new Date(0).toISOString(); }
}
/** Visiting the dashboard clears the team badge without touching anything on the server. */
export function markTicketsSeen() {
  try { localStorage.setItem(TICKETS_SEEN_KEY, new Date().toISOString()); } catch { /* blocked storage: it just shows again */ }
  window.dispatchEvent(new Event(UNREAD_CHANGED_EVENT));
}

/** Number for the sidebar badge: your tickets with a new team reply, plus (team only) tickets that arrived since you last looked. */
export function useTicketAlerts() {
  const { user, isSuperAdmin } = useAuth();
  const staff = isSuperAdmin;
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const [own, fresh] = await Promise.all([feedbackApi.mineUnread(), staff ? feedbackApi.staffNew(readSeenAt()) : Promise.resolve(0)]);
      setCount(own + fresh);
    } catch { /* a missed refresh is caught by the next poll */ }
  }, [staff]);

  useEffect(() => {
    if (!user) return;
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60_000);
    const offNew = staff ? onTicketNew(() => void refresh()) : () => undefined;
    const offUpdated = onTicketUpdated(() => void refresh());
    window.addEventListener(TICKET_NEW_EVENT, refresh);
    window.addEventListener(UNREAD_CHANGED_EVENT, refresh);
    return () => {
      window.clearInterval(timer);
      offNew();
      offUpdated();
      window.removeEventListener(TICKET_NEW_EVENT, refresh);
      window.removeEventListener(UNREAD_CHANGED_EVENT, refresh);
    };
  }, [user, staff, refresh]);

  return count;
}
