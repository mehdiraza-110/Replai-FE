import { useSyncExternalStore } from "react";

/** The release version baked in at build time from the VERSION file. */
export const APP_VERSION = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "dev";

export interface ReleaseNote { version: string; title: string; items: { title: string; detail?: string }[] }

/** Newest first. Add an entry whenever a release ships something people can see; its version must match the VERSION file. */
export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: "1.0.0.1",
    title: "Support tickets",
    items: [
      { title: "Report a problem from any page", detail: "The Ticket button at the bottom right lets you write a message, record a voice message, or record your screen with your voice." },
      { title: "Follow the reply in Support", detail: "Open Support in the sidebar to see your tickets. A badge and a short notice tell you when the team replies or changes the status." },
      { title: "Release version", detail: "The version number at the bottom of the sidebar opens this list." },
    ],
  },
];

// A tiny external store, so the sidebar label and the dialog share one open/closed state.
let open = false;
const listeners = new Set<() => void>();
export const setWhatsNewOpen = (next: boolean) => { open = next; listeners.forEach((l) => l()); };
export const useWhatsNewOpen = () => useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => open);

export const SEEN_KEY = "whats-new-seen-version";
export function hasSeenCurrent() {
  try { return localStorage.getItem(SEEN_KEY) === APP_VERSION; } catch { return false; } // blocked storage: it shows again next load
}
export function markSeenCurrent() {
  try { localStorage.setItem(SEEN_KEY, APP_VERSION); } catch { /* ignore */ }
}
