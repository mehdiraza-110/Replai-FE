import { useEffect, useRef } from "react";
import { getRealtimeSocket, type RealtimeEventPayload } from "../services/realtime";

/**
 * Subscribes to the live "event" stream and invokes `onEvent` whenever a
 * broadcast event's `eventType` matches one of `eventTypePrefixes` (e.g.
 * "ai.draft." matches "ai.draft.approved_sent", "ai.draft.rejected", ...).
 *
 * This is how pages stay live without polling: the server broadcasts every
 * meaningful mutation the moment it happens, and any open tab listening for
 * that kind of event reacts immediately — no refresh needed.
 */
export function useRealtimeEvent(eventTypePrefixes: string[], onEvent: (event: RealtimeEventPayload) => void) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const prefixesKey = eventTypePrefixes.join(",");

  useEffect(() => {
    const socket = getRealtimeSocket();
    const prefixes = prefixesKey.split(",").filter(Boolean);

    function handleEvent(event: RealtimeEventPayload) {
      if (prefixes.length === 0 || prefixes.some((prefix) => event.eventType.startsWith(prefix))) {
        onEventRef.current(event);
      }
    }

    socket.on("event", handleEvent);

    return () => {
      socket.off("event", handleEvent);
    };
  }, [prefixesKey]);
}
