import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, Link2, Sparkles, Zap } from "lucide-react";
import { orderService, OPEN_STATUSES, ORDER_STATUS_LABEL, type OrderRequest, type OrderStatus } from "../../../services/orderApi";
import { useSvTitle } from "../../layout/chrome";
import { svPath } from "../../nav";
import { Badge, type BadgeTone, Button, Card, Field, SkeletonRows } from "../../ui";
import { errorText, formatDate } from "./shared";

const STATUS_TONE: Record<OrderStatus, BadgeTone> = { requested: "yellow", approved: "blue", in_progress: "blue", fulfilled: "green", rejected: "red", cancelled: "neutral" };

function Points({ items }: { items: string[] }) {
  return (
    <ul className="sv-points">
      {items.map((item) => <li key={item}><Check className="sv-icon" aria-hidden /> {item}</li>)}
    </ul>
  );
}

export function AddInboxes() {
  useSvTitle([{ label: "Cold Email Agent" }, { label: "Email Accounts" }, { label: "Add inboxes" }]);
  const [orders, setOrders] = useState<OrderRequest[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  // pre-warmed
  const [count, setCount] = useState(3);
  const [pNotes, setPNotes] = useState("");
  // done for you
  const [domainText, setDomainText] = useState("");
  const [perDomain, setPerDomain] = useState(3);
  const [dNotes, setDNotes] = useState("");

  const load = useCallback(() => orderService.list().then((list) => setOrders(list as OrderRequest[])).catch((caught) => setError(errorText(caught))), []);
  useEffect(() => { void load(); }, [load]);

  const domains = [...new Set(domainText.split(/[\s,;]+/).map((d) => d.trim().toLowerCase()).filter(Boolean))];

  async function submit(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(success);
      await load();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  const open = (orders ?? []).filter((o) => OPEN_STATUSES.includes(o.status));

  return (
    <div className="sv-page">
      <Link className="sv-link" to={svPath("cold-email-campaign-agent/email-accounts")} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16 }}><ArrowLeft className="sv-icon" aria-hidden /> Back to Email Accounts</Link>
      <h1 className="sv-h1" style={{ marginBottom: 20 }}>Add inboxes to your workspace</h1>
      {error ? <p className="sv-banner is-error" role="alert" style={{ marginBottom: 16 }}>{error}</p> : null}
      {notice ? <p className="sv-banner is-ok" role="status" style={{ marginBottom: 16 }}>{notice}</p> : null}

      <div className="sv-inbox-cards">
        <Card className="sv-pad">
          <div className="sv-card-head"><span className="sv-card-icon" style={{ background: "var(--ds-green-bg)", color: "var(--ds-green-text)" }}><Zap className="sv-icon" aria-hidden /></span><h2>Pre-warmed inboxes</h2></div>
          <p className="sv-set-desc">Inboxes that are already warmed up, assigned to your workspace so you can start sending sooner.</p>
          <Points items={["Warmed up on our own mail server before they reach you", "Each inbox has its own domain, kept separate from other customers", "SPF, DKIM and DMARC set up for you", "You see health and warm-up progress for every inbox"]} />
          <Field label="How many inboxes?" htmlFor="pre-count"><input id="pre-count" type="number" min={1} max={500} className="sv-input" value={count} onChange={(event) => setCount(Math.max(1, Math.min(500, Number(event.target.value) || 1)))} /></Field>
          <Field label="Anything we should know? (optional)" htmlFor="pre-notes"><textarea id="pre-notes" className="sv-textarea" style={{ minHeight: 64 }} maxLength={1000} value={pNotes} onChange={(event) => setPNotes(event.target.value)} /></Field>
          <p className="sv-hint">We review every request, then confirm and assign the inboxes. You'll see its status below.</p>
          <div><Button variant="primary" disabled={busy} onClick={() => void submit(() => orderService.create({ type: "mailboxes", quantity: count, details: pNotes.trim() ? { notes: pNotes.trim() } : {} }), `Requested ${count} pre-warmed inbox${count === 1 ? "" : "es"}.`)}>Request {count} inbox{count === 1 ? "" : "es"}</Button></div>
        </Card>

        <Card className="sv-pad">
          <div className="sv-card-head"><span className="sv-card-icon" style={{ background: "var(--ds-purple-bg)", color: "var(--ds-purple-text)" }}><Sparkles className="sv-icon" aria-hidden /></span><h2>Done-for-you setup</h2></div>
          <p className="sv-set-desc">Tell us the domains you want. We register, configure and warm up the inboxes for you.</p>
          <p className="sv-banner is-warn" style={{ margin: 0 }}>New domains need a warm-up period before they can be added to campaigns. Skipping it risks getting your inboxes flagged.</p>
          <Points items={["Real, professional email accounts on your own domains", "All technical setup handled for you, no DNS knowledge needed", "Warmed up on our own server before they go live"]} />
          <Field label="Domains you want (one per line, optional)" htmlFor="dfy-domains"><textarea id="dfy-domains" className="sv-textarea" style={{ minHeight: 84, fontFamily: "ui-monospace, monospace", fontSize: 12 }} placeholder={"yourbrand.com\ntryyourbrand.com"} value={domainText} onChange={(event) => setDomainText(event.target.value)} /></Field>
          <Field label="Inboxes per domain" htmlFor="dfy-per"><select id="dfy-per" className="sv-select" value={perDomain} onChange={(event) => setPerDomain(Number(event.target.value))}>{[1, 2, 3, 4, 5, 6, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}</select></Field>
          <Field label="Notes (optional)" htmlFor="dfy-notes"><textarea id="dfy-notes" className="sv-textarea" style={{ minHeight: 64 }} maxLength={1000} value={dNotes} onChange={(event) => setDNotes(event.target.value)} /></Field>
          <div>
            <Button
              variant="primary"
              disabled={busy || domains.length > 50}
              onClick={() => void submit(() => orderService.create({ type: "domains", quantity: Math.max(domains.length, 1), details: { ...(domains.length ? { preferredDomains: domains } : {}), mailboxesPerDomain: perDomain, ...(dNotes.trim() ? { notes: dNotes.trim() } : {}) } }), `Requested ${Math.max(domains.length, 1)} domain${domains.length > 1 ? "s" : ""} with ${perDomain} inbox${perDomain === 1 ? "" : "es"} each.`)}
            >
              Request setup{domains.length ? ` for ${domains.length} domain${domains.length === 1 ? "" : "s"}` : ""}
            </Button>
            {domains.length > 50 ? <span className="sv-hint" style={{ marginLeft: 12 }}>At most 50 domains per request.</span> : null}
          </div>
        </Card>

        <Card className="sv-pad" >
          <div className="sv-card-head" style={{ opacity: 0.7 }}><span className="sv-card-icon"><Link2 className="sv-icon" aria-hidden /></span><h2>Connect existing accounts</h2></div>
          <p className="sv-set-desc">Already have inboxes? Connect any IMAP or SMTP provider and manage everything from one place.</p>
          <Points items={["Connect any IMAP or SMTP provider", "Replies sync automatically to your AI SDR inbox"]} />
          <div><Badge>Coming soon</Badge></div>
        </Card>
      </div>

      <h2 className="sv-set-title" style={{ margin: "32px 0 12px" }}>Your requests</h2>
      <Card>
        <div className="sv-table-wrap">
          <table className="sv-table">
            <thead><tr><th>Request</th><th className="is-num">Quantity</th><th>Status</th><th>Requested</th><th>Notes from us</th><th style={{ width: 90 }} /></tr></thead>
            <tbody>
              {!orders && !error ? <SkeletonRows columns={6} /> : null}
              {orders && orders.length === 0 ? <tr><td colSpan={6} className="sv-hint" style={{ padding: 20 }}>No requests yet.</td></tr> : null}
              {orders?.map((o) => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 500 }}>{o.type === "mailboxes" ? "Pre-warmed inboxes" : o.type === "domains" ? "Done-for-you setup" : "Limit increase"}{o.details?.preferredDomains?.length ? <div className="sv-hint">{o.details.preferredDomains.slice(0, 3).join(", ")}{o.details.preferredDomains.length > 3 ? ` +${o.details.preferredDomains.length - 3}` : ""}</div> : null}</td>
                  <td className="is-num">{o.quantity}</td>
                  <td><Badge tone={STATUS_TONE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge></td>
                  <td>{formatDate(o.created_at)}</td>
                  <td className="sv-hint">{o.admin_notes || "—"}</td>
                  <td>{OPEN_STATUSES.includes(o.status) ? <Button size="sm" disabled={busy} onClick={() => void submit(() => orderService.cancel(o.id), "Request cancelled.")}>Cancel</Button> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {open.length > 0 ? <p className="sv-hint" style={{ marginTop: 12 }}>{open.length} open request{open.length === 1 ? "" : "s"}. You can have up to 10 open at a time.</p> : null}
    </div>
  );
}
