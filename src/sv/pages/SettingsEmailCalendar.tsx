import { useCallback, useEffect, useRef, useState } from "react";
import { Link2, Trash2 } from "lucide-react";
import { schedulingApi, type CalendarStatus } from "../api/aiSdr";
import { useSvTitle } from "../layout/chrome";
import { Badge, Button, PageHeader, SettingsCard } from "../ui";

const errorText = (error: unknown) => (error instanceof Error ? error.message : "Something went wrong. Try again.");

export function SettingsEmailCalendar() {
  useSvTitle([{ label: "Email & Calendar" }]);
  const [status, setStatus] = useState<CalendarStatus | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const popup = useRef<Window | null>(null);

  const load = useCallback(async () => {
    try {
      setStatus(await schedulingApi.calendar());
      setError("");
    } catch (caught) {
      setError(errorText(caught));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // The popup page tells its opener when it is done. The message content is never trusted: it only triggers a re-read from the server.
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== popup.current) return;
      const type = (event.data as { type?: string } | null)?.type;
      if (type === "google-calendar-connected") setNotice("Google Calendar connected.");
      if (type === "google-calendar-error") setError("Google could not connect that calendar. Try again.");
      void load();
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [load]);

  async function connect() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { url } = await schedulingApi.connectUrl();
      popup.current = window.open(url, "sendvybe-google-calendar", "width=520,height=680");
      if (!popup.current) setError("Your browser blocked the Google window. Allow pop-ups for this site and try again.");
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setError("");
    try {
      await schedulingApi.disconnect();
      setNotice("Calendar disconnected.");
      await load();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  const connection = status?.connection;
  const healthy = connection?.status === "connected";

  return (
    <div className="sv-page">
      <div className="sv-settings-col">
        <PageHeader title="Email & Calendar" subtitle="Connect Google once. Your calendar blocks the times you're busy, and the AI SDR books meetings on it." />
        {error ? <p className="sv-banner is-error" role="alert" style={{ marginBottom: 16 }}>{error}</p> : null}
        {notice ? <p className="sv-banner is-ok" role="status" style={{ marginBottom: 16 }}>{notice}</p> : null}

        <SettingsCard title="Connected account" description="The calendar the AI SDR checks for free times and adds booked meetings to, with a video link.">
          {!status ? <p className="sv-hint">Loading…</p> : null}
          {status && !connection ? (
            <>
              <p className="sv-hint">No calendar connected. Until you connect one, the AI SDR can only share your booking link.</p>
              {!status.googleConfigured ? <p className="sv-banner is-warn">Google Calendar is not set up on this server yet, so it cannot be connected here.</p> : null}
              <div><Button variant="primary" icon={Link2} disabled={busy || !status.googleConfigured} onClick={() => void connect()}>Connect Google Calendar</Button></div>
            </>
          ) : null}
          {connection ? (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{connection.googleEmail || "Google account"}</div>
                  <div className="sv-hint">Google email and calendar</div>
                </div>
                <Badge tone={healthy ? "green" : "red"}>{healthy ? "Connected" : "Needs reconnecting"}</Badge>
              </div>
              {!healthy ? <p className="sv-banner is-warn">Google no longer lets us use this calendar. Reconnect it so the AI SDR can book meetings again.</p> : null}
              <div className="sv-actions">
                {!healthy ? <Button variant="primary" icon={Link2} disabled={busy || !status?.googleConfigured} onClick={() => void connect()}>Reconnect</Button> : null}
                <Button variant="danger" icon={Trash2} disabled={busy} onClick={() => void disconnect()}>Disconnect</Button>
              </div>
            </>
          ) : null}
        </SettingsCard>
      </div>
    </div>
  );
}
