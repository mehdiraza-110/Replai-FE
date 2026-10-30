import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { ArrowRight, CheckCircle2, Copy, Eye, EyeOff, RefreshCw, ShieldAlert, ShieldCheck, TestTube2 } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { ghlService, plusVibeService } from "../../../services/api";
import type { GhlConnection, PlusVibeConnection } from "../../../services/api";
import { useSvTitle } from "../../layout/chrome";
import { Badge, type BadgeTone, Button, Card, Field, Modal, PageHeader, Skeleton } from "../../ui";
import { Banner, errorText } from "../crm/shared";
import "./tools.css";

type Status = "Connected" | "Configured" | "Disconnected" | "Available" | "Error";
type LogoProps = { className?: string };

const when = (value?: string | null) => (value ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)) : "Not yet");
const maskToken = (url: string) => url.replace(/([?&]token=)[^&]+/, "$1••••••••");
const STATUS_TONE: Record<Status, BadgeTone> = { Connected: "green", Configured: "yellow", Error: "red", Disconnected: "neutral", Available: "neutral" };

const OTHERS: Array<{ name: string; description: string; action: string; logo: ComponentType<LogoProps> }> = [
  { name: "Gmail", description: "Connect your Google Workspace account.", action: "Connect Gmail", logo: GmailLogo },
  { name: "Outlook", description: "Connect your Microsoft 365 or Outlook account.", action: "Connect Outlook", logo: OutlookLogo },
  { name: "Smartlead", description: "Connect your Smartlead email automation account.", action: "Connect Smartlead", logo: SmartleadLogo },
  { name: "Instantly", description: "Connect your Instantly email automation account.", action: "Connect Instantly", logo: InstantlyLogo },
];

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="sv-tools-metric"><span>{label}</span><strong title={value}>{value}</strong></div>;
}

export function Integrations() {
  useSvTitle([{ label: "Tools" }, { label: "Integrations" }]);
  const [pv, setPv] = useState<PlusVibeConnection | null>(null);
  const [pvLoading, setPvLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ghl, setGhl] = useState<GhlConnection | null>(null);
  const [ghlLoading, setGhlLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [pvOpen, setPvOpen] = useState(false);
  const [ghlOpen, setGhlOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    plusVibeService.getConnection().then((d) => alive && setPv(d)).catch((e) => alive && setError(errorText(e))).finally(() => alive && setPvLoading(false));
    ghlService.getConnection().then((d) => alive && setGhl(d)).catch((e) => alive && setError(errorText(e))).finally(() => alive && setGhlLoading(false));
    return () => { alive = false; };
  }, []);

  async function refreshPlusVibe() {
    setRefreshing(true); setNotice(""); setError("");
    try { setPv(await plusVibeService.refresh()); setNotice("PlusVibe sync refreshed."); } catch (e) { setError(errorText(e)); } finally { setRefreshing(false); }
  }

  return (
    <div className="sv-page">
      <div className="sv-tools-wide">
        <PageHeader title="Integrations" subtitle="Connect the tools that send campaigns or receive replies" />
        <Banner error={error} />
        {notice ? <p className="sv-banner is-ok" role="status" style={{ margin: 0 }}>{notice}</p> : null}

        <section className="sv-set-card">
          <div className="sv-tools-head">
            <div className="sv-tools-title"><img className="sv-tools-logo" src="/plusvibe.svg" alt="" /><div><h2>PlusVibe</h2><p>Primary outbound campaign source for replies, lead context and send-back actions.</p></div></div>
            <Badge tone={STATUS_TONE[pv?.connectionStatus ?? "Disconnected"]}>{pv?.connectionStatus ?? "Disconnected"}</Badge>
          </div>
          <div className="sv-tools-split">
            {pvLoading ? <div className="sv-skel-stack" role="status" aria-label="Loading" style={{ flex: 1 }}><Skeleton width="40%" /><Skeleton width="55%" /><Skeleton width="45%" /></div> : (
              <div className="sv-tools-metrics">
                <Metric label="Workspace" value={pv?.workspaceName || pv?.workspaceId || "Not configured"} />
                <Metric label="API status" value={pv?.apiStatus || "Not configured"} />
                <Metric label="Webhook status" value={pv?.webhookStatus || "Not configured"} />
                <Metric label="Webhook event" value={pv?.webhookEventType || "ALL_EMAIL_REPLIES"} />
                <Metric label="Connected inboxes" value={String(pv?.connectedInboxes ?? 0)} />
                <Metric label="Synced campaigns" value={String(pv?.syncedCampaigns ?? 0)} />
                <Metric label="Last sync" value={when(pv?.lastSync)} />
              </div>
            )}
            <div className="sv-tools-box">
              <div><b>Webhook endpoint</b><p className="sv-tools-url" style={{ marginTop: 4 }}>{maskToken(pv?.webhookUrl || plusVibeService.getWebhookEndpoint())}</p></div>
              <div className="sv-tools-row">
                <Button variant="primary" onClick={() => setPvOpen(true)}>{pv?.id ? "Manage PlusVibe" : "Connect PlusVibe"}<ArrowRight className="sv-icon" aria-hidden /></Button>
                <Button icon={RefreshCw} disabled={!pv?.id || refreshing} onClick={() => void refreshPlusVibe()}>{refreshing ? "Refreshing…" : "Refresh"}</Button>
              </div>
            </div>
          </div>
        </section>

        {pv?.id ? <WebhookProtection connection={pv} onChanged={(patch) => setPv((current) => (current ? { ...current, ...patch } : current))} /> : null}

        <section className="sv-set-card">
          <div className="sv-tools-head">
            <div className="sv-tools-title"><img className="sv-tools-logo" src="/ghl_logo.png" alt="" /><div><h2>GoHighLevel</h2><p>Sends every AI-approved or auto-sent lead reply into GHL Conversations.</p></div></div>
            <Badge tone={STATUS_TONE[ghl?.connectionStatus ?? "Disconnected"]}>{ghl?.connectionStatus ?? "Disconnected"}</Badge>
          </div>
          <div className="sv-tools-split">
            {ghlLoading ? <div className="sv-skel-stack" role="status" aria-label="Loading" style={{ flex: 1 }}><Skeleton width="40%" /><Skeleton width="55%" /><Skeleton width="45%" /></div> : (
              <div className="sv-tools-metrics">
                <Metric label="Location" value={ghl?.locationName || ghl?.locationId || "Not configured"} />
                <Metric label="API status" value={ghl?.apiStatus || "Not configured"} />
                <Metric label="Leads synced" value={String(ghl?.syncedLeads ?? 0)} />
              </div>
            )}
            <div className="sv-tools-box">
              <div><b>Sends replies to</b><p className="sv-hint" style={{ marginTop: 4 }}>Every AI-approved or auto-sent lead reply is logged into GHL Conversations for this location.</p></div>
              <div className="sv-tools-row"><Button variant="primary" onClick={() => setGhlOpen(true)}>{ghl?.id ? "Manage GHL" : "Connect GHL"}<ArrowRight className="sv-icon" aria-hidden /></Button></div>
            </div>
          </div>
        </section>

        <h2 className="sv-set-title" style={{ margin: "8px 0 0" }}>More integrations</h2>
        <div className="sv-tools-others">
          {OTHERS.map((o) => (
            <Card key={o.name} className="sv-tools-other">
              <div className="sv-tools-title"><o.logo className="sv-tools-logo" /><div><h3>{o.name}</h3><p>{o.description}</p></div></div>
              <div className="sv-tools-row" style={{ marginTop: "auto", justifyContent: "space-between" }}><Badge>Coming soon</Badge><Button disabled>{o.action}</Button></div>
            </Card>
          ))}
        </div>
      </div>

      {pvOpen ? <PlusVibeModal connection={pv} onClose={() => setPvOpen(false)} onSaved={(d, message) => { setPv(d); if (message) { setNotice(message); setError(""); } }} /> : null}
      {ghlOpen ? <GhlModal connection={ghl} onClose={() => setGhlOpen(false)} onSaved={(d, message) => { setGhl(d); if (message) { setNotice(message); setError(""); } }} /> : null}
    </div>
  );
}

function WebhookProtection({ connection, onChanged }: { connection: PlusVibeConnection; onChanged: (patch: Partial<PlusVibeConnection>) => void }) {
  const { activeWorkspace, isSuperAdmin } = useAuth();
  const canManage = isSuperAdmin || activeWorkspace?.role === "owner" || activeWorkspace?.role === "admin";
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState<"rotate" | "enforce" | null>(null);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const enforced = Boolean(connection.webhookSecretEnforced);
  const hasSecret = /[?&]token=/.test(connection.webhookUrl || "");
  const url = connection.webhookUrl || plusVibeService.getWebhookEndpoint();

  async function copyUrl() {
    try { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 2000); }
    catch { setMessage({ tone: "error", text: "We couldn't copy automatically. Reveal the URL and copy it by hand." }); }
  }
  async function rotate() {
    setWorking(true); setMessage(null);
    try {
      const result = await plusVibeService.rotateWebhookSecret();
      onChanged({ webhookUrl: result.webhookUrl }); setRevealed(true); setConfirm(null);
      setMessage({ tone: "ok", text: "New secret created. Copy the new URL into PlusVibe now; the old URL is no longer valid once protection is enforced." });
    } catch (e) { setMessage({ tone: "error", text: errorText(e) }); } finally { setWorking(false); }
  }
  async function setEnforced(next: boolean) {
    setWorking(true); setMessage(null);
    try {
      await plusVibeService.setWebhookEnforced(next);
      onChanged({ webhookSecretEnforced: next }); setConfirm(null);
      setMessage({ tone: "ok", text: next ? "Protection is on. Requests without the secret are now rejected." : "Protection is off. Requests without the secret are accepted again." });
    } catch (e) { setMessage({ tone: "error", text: errorText(e) }); } finally { setWorking(false); }
  }

  return (
    <section className="sv-set-card">
      <div className="sv-tools-head">
        <div className="sv-tools-title">
          <span className="sv-tools-icon">{enforced ? <ShieldCheck className="sv-icon" aria-hidden /> : <ShieldAlert className="sv-icon" aria-hidden />}</span>
          <div><h2>PlusVibe webhook protection</h2><p>A secret in the webhook URL proves a reply really came from PlusVibe.</p></div>
        </div>
        <Badge tone={enforced ? "green" : "yellow"}>{enforced ? "Enforced" : "Not enforced yet"}</Badge>
      </div>
      <div className="sv-tools-box">
        <b>Webhook URL for PlusVibe</b>
        <p className="sv-tools-url">{revealed ? url : maskToken(url)}</p>
        <div className="sv-tools-row">
          <Button icon={Copy} onClick={() => void copyUrl()}>{copied ? "Copied" : "Copy URL"}</Button>
          {hasSecret ? <Button icon={revealed ? EyeOff : Eye} aria-pressed={revealed} onClick={() => setRevealed((v) => !v)}>{revealed ? "Hide secret" : "Show secret"}</Button> : null}
        </div>
      </div>
      <p className="sv-set-desc" style={{ margin: 0 }}>
        {enforced
          ? "Protection is on: PlusVibe replies are only accepted when they arrive at the URL above, secret included."
          : "Protection is not enforced yet, so replies are still accepted without the secret. To switch it on safely, first paste the URL above into PlusVibe, then enforce it here. If you enforce before updating PlusVibe, new replies will stop arriving."}
      </p>
      {canManage ? (
        <div className="sv-tools-row">
          {confirm === "rotate" ? (
            <>
              <span className="sv-hint">This creates a new secret and the current URL stops working once protection is enforced. Continue?</span>
              <Button variant="primary" disabled={working} onClick={() => void rotate()}>{working ? "Working…" : "Create new secret"}</Button>
              <Button disabled={working} onClick={() => setConfirm(null)}>Cancel</Button>
            </>
          ) : confirm === "enforce" ? (
            <>
              <span className="sv-hint">Have you already pasted the URL above into PlusVibe?</span>
              <Button variant="primary" disabled={working} onClick={() => void setEnforced(true)}>{working ? "Working…" : "Yes, enforce protection"}</Button>
              <Button disabled={working} onClick={() => setConfirm(null)}>Not yet</Button>
            </>
          ) : (
            <>
              <Button icon={RefreshCw} onClick={() => setConfirm("rotate")}>{hasSecret ? "Rotate secret" : "Create secret"}</Button>
              {enforced ? <Button disabled={working} onClick={() => void setEnforced(false)}>Stop enforcing</Button> : <Button variant="primary" icon={ShieldCheck} disabled={!hasSecret} onClick={() => setConfirm("enforce")}>Enforce protection</Button>}
            </>
          )}
        </div>
      ) : <p className="sv-hint" style={{ margin: 0 }}>Only workspace owners and admins can change webhook protection.</p>}
      {message ? <p className={message.tone === "ok" ? "sv-tools-ok" : "sv-tools-bad"} role={message.tone === "error" ? "alert" : "status"} style={{ margin: 0 }}>{message.text}</p> : null}
    </section>
  );
}

function ConnectionModal({ title, subtitle, wide, canTest, canSave, saveLabel, busy, error, onTest, onSave, onClose, children }: { title: string; subtitle: string; wide?: boolean; canTest: boolean; canSave: boolean; saveLabel: string; busy: "" | "save" | "test"; error: string; onTest: () => void; onSave: () => void; onClose: () => void; children: ReactNode }) {
  return (
    <Modal wide={wide} open title={title} onClose={onClose} footer={
      <>
        <Button icon={TestTube2} disabled={!canTest || busy !== ""} onClick={onTest} style={{ marginRight: "auto" }}>{busy === "test" ? "Testing…" : "Test connection"}</Button>
        <Button onClick={onClose} disabled={busy === "save"}>Cancel</Button>
        <Button variant="primary" icon={CheckCircle2} disabled={!canSave || busy !== ""} onClick={onSave}>{busy === "save" ? "Saving…" : saveLabel}</Button>
      </>
    }>
      <p className="sv-set-desc" style={{ margin: 0 }}>{subtitle}</p>
      <div className="sv-tools-formgrid">{children}</div>
      {error ? <p className="sv-banner is-error" role="alert" style={{ margin: 0 }}>{error}</p> : null}
    </Modal>
  );
}

function PlusVibeModal({ connection, onClose, onSaved }: { connection: PlusVibeConnection | null; onClose: () => void; onSaved: (c: PlusVibeConnection, message?: string) => void }) {
  const [apiKey, setApiKey] = useState("");
  const [scope, setScope] = useState<"account" | "workspace">(connection?.apiKeyScope || "workspace");
  const [workspaceId, setWorkspaceId] = useState(connection?.workspaceId || "");
  const [workspaceName, setWorkspaceName] = useState(connection?.workspaceName || "");
  const [eventType, setEventType] = useState(connection?.webhookEventType || "ALL_EMAIL_REPLIES");
  const [webhookUrl, setWebhookUrl] = useState((connection?.webhookUrl || plusVibeService.getWebhookEndpoint()).replace(/[?&]token=[^&]*/, ""));
  const [busy, setBusy] = useState<"" | "save" | "test">("");
  const [error, setError] = useState("");
  const hasKey = Boolean(apiKey) || Boolean(connection?.apiKeyConfigured);

  async function save() {
    setBusy("save"); setError("");
    try { onSaved(await plusVibeService.saveConnection({ apiKey, apiKeyScope: scope, workspaceId, workspaceName, webhookEventType: eventType, webhookUrl }), "PlusVibe connection saved."); onClose(); }
    catch (e) { setError(errorText(e)); setBusy(""); }
  }
  async function test() {
    setBusy("test"); setError("");
    try { onSaved(await plusVibeService.testConnection({ apiKey, workspaceId }), "PlusVibe connection tested."); } catch (e) { setError(errorText(e)); } finally { setBusy(""); }
  }
  return (
    <ConnectionModal wide title="PlusVibe connection" subtitle="Connect reply ingestion, webhook status and send-back access through backend-held credentials." canTest={hasKey && Boolean(workspaceId)} canSave={hasKey && Boolean(workspaceId)} saveLabel="Save PlusVibe" busy={busy} error={error} onTest={() => void test()} onSave={() => void save()} onClose={onClose}>
      <Field label="API key" htmlFor="pv-key"><input id="pv-key" className="sv-input" type="password" autoComplete="off" placeholder={connection?.apiKeyConfigured ? "Leave blank to keep the existing key" : "Paste your PlusVibe API key"} value={apiKey} onChange={(e) => setApiKey(e.target.value)} /></Field>
      <Field label="API key scope" htmlFor="pv-scope"><select id="pv-scope" className="sv-select" value={scope} onChange={(e) => setScope(e.target.value as "account" | "workspace")}><option value="workspace">Workspace API key</option><option value="account">Account API key</option></select></Field>
      <Field label="Workspace ID" htmlFor="pv-ws"><input id="pv-ws" className="sv-input" placeholder="65099a0dd96fae8ab61130c0" value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} /></Field>
      <Field label="Workspace name" htmlFor="pv-name"><input id="pv-name" className="sv-input" placeholder="PLWH Sales" value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} /></Field>
      <Field label="Webhook event type" htmlFor="pv-event"><select id="pv-event" className="sv-select" value={eventType} onChange={(e) => setEventType(e.target.value)}><option value="ALL_EMAIL_REPLIES">All Email Replies</option><option value="FIRST_EMAIL_REPLIES">First Email Replies</option><option value="ALL_POSITIVE_REPLIES">All Positive Replies</option></select></Field>
      <Field label="Webhook URL" htmlFor="pv-url"><input id="pv-url" className="sv-input" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} /></Field>
      <div className="sv-tools-box is-full">
        <b>Configure this URL in PlusVibe</b>
        <p className="sv-tools-url">{plusVibeService.getWebhookEndpoint()}</p>
        <p className="sv-hint">Use event type <b>All Email Replies</b>. Workspace ID is the PlusVibe workspace identifier, not the sender email address.</p>
      </div>
    </ConnectionModal>
  );
}

function GhlModal({ connection, onClose, onSaved }: { connection: GhlConnection | null; onClose: () => void; onSaved: (c: GhlConnection, message?: string) => void }) {
  const [apiKey, setApiKey] = useState("");
  const [locationId, setLocationId] = useState(connection?.locationId || "");
  const [locationName, setLocationName] = useState(connection?.locationName || "");
  const [busy, setBusy] = useState<"" | "save" | "test">("");
  const [error, setError] = useState("");
  const hasKey = Boolean(apiKey) || Boolean(connection?.apiKeyConfigured);

  async function save() {
    setBusy("save"); setError("");
    try { onSaved(await ghlService.saveConnection({ apiKey, locationId, locationName }), "GHL connection saved."); onClose(); }
    catch (e) { setError(errorText(e)); setBusy(""); }
  }
  async function test() {
    setBusy("test"); setError("");
    try { onSaved(await ghlService.testConnection({ apiKey, locationId }), "GHL connection tested."); } catch (e) { setError(errorText(e)); } finally { setBusy(""); }
  }
  return (
    <ConnectionModal title="GHL connection" subtitle="Connect a GoHighLevel location to log AI-sent lead replies as conversations." canTest={hasKey && Boolean(locationId)} canSave={hasKey && Boolean(locationId)} saveLabel="Save GHL" busy={busy} error={error} onTest={() => void test()} onSave={() => void save()} onClose={onClose}>
      <Field label="Private integration token" htmlFor="ghl-key"><input id="ghl-key" className="sv-input" type="password" autoComplete="off" placeholder={connection?.apiKeyConfigured ? "Leave blank to keep the existing key" : "Paste your GHL API key"} value={apiKey} onChange={(e) => setApiKey(e.target.value)} /></Field>
      <Field label="Location ID" htmlFor="ghl-loc"><input id="ghl-loc" className="sv-input" placeholder="ve9EPM428h8vShlRW1KT" value={locationId} onChange={(e) => setLocationId(e.target.value)} /></Field>
      <Field label="Location name" htmlFor="ghl-name"><input id="ghl-name" className="sv-input" placeholder="PLWH Sales" value={locationName} onChange={(e) => setLocationName(e.target.value)} /></Field>
      <div className="sv-tools-box is-full"><b>What this connects</b><p className="sv-hint">Once a lead's AI reply is approved or auto-sent, SendVybe upserts the lead as a contact in this location and logs the reply into GHL Conversations.</p></div>
    </ConnectionModal>
  );
}

function GmailLogo(props: LogoProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" {...props}>
      <path d="M5 9.5C5 8.1 6.1 7 7.5 7H9L16 12.5L23 7H24.5C25.9 7 27 8.1 27 9.5V24.5H22V14.8L16 19.5L10 14.8V24.5H5V9.5Z" fill="#F2F2F2" />
      <path d="M5 9.5L10 13.4V24.5H5V9.5Z" fill="#4285F4" />
      <path d="M22 13.4L27 9.5V24.5H22V13.4Z" fill="#34A853" />
      <path d="M9 7L16 12.5L23 7L16 18.2L9 7Z" fill="#EA4335" />
      <path d="M5 9.5C5 8.1 6.1 7 7.5 7H9L16 18.2L5 9.5Z" fill="#FBBC05" />
      <path d="M27 9.5L16 18.2L23 7H24.5C25.9 7 27 8.1 27 9.5Z" fill="#EA4335" />
    </svg>
  );
}
function OutlookLogo(props: LogoProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" {...props}>
      <rect x="12" y="7" width="15" height="18" rx="2" fill="#0A5BD3" />
      <path d="M13 9H26V13H13V9Z" fill="#41A5EE" />
      <path d="M13 14H26V18H13V14Z" fill="#2B7CD3" />
      <path d="M13 19H26V23H13V19Z" fill="#185ABD" />
      <rect x="5" y="10" width="14" height="14" rx="2" fill="#0078D4" />
      <path d="M8.5 17C8.5 14.8 9.8 13.2 12 13.2C14.2 13.2 15.5 14.8 15.5 17C15.5 19.2 14.2 20.8 12 20.8C9.8 20.8 8.5 19.2 8.5 17ZM10.5 17C10.5 18.3 11 19.1 12 19.1C13 19.1 13.5 18.3 13.5 17C13.5 15.7 13 14.9 12 14.9C11 14.9 10.5 15.7 10.5 17Z" fill="white" />
    </svg>
  );
}
function SmartleadLogo(props: LogoProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" {...props}>
      <rect x="4" y="4" width="24" height="24" rx="7" fill="#7457F6" />
      <path d="M10 11.5L17.5 8.5V23.5L10 20.5V11.5Z" fill="white" />
      <path d="M19.5 11.5H22.5V20.5H19.5V11.5Z" fill="white" />
      <path d="M8.2 14.2H11.2V17.8H8.2C7.5 17.8 7 17.3 7 16.6V15.4C7 14.7 7.5 14.2 8.2 14.2Z" fill="white" />
    </svg>
  );
}
function InstantlyLogo(props: LogoProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" {...props}>
      <circle cx="16" cy="16" r="13" fill="#0A68FF" />
      <path d="M17.2 7.5L9.8 17.2H15L13.9 24.5L22.3 13.8H16.8L17.2 7.5Z" fill="white" />
    </svg>
  );
}


