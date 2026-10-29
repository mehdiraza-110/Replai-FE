import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Copy, Download, ExternalLink, History, Monitor, RefreshCw, Send, Smartphone, Trash2 } from "lucide-react";
import { publicUrl, sitesApi, type SiteWithDns } from "../../api/sites";
import { useSvTitle } from "../../layout/chrome";
import { svPath } from "../../nav";
import { Badge, Button, Card, EmptyState, Field, Modal } from "../../ui";
import { errorText } from "../cold-email/shared";
import { Banner, useRemote } from "../crm/shared";
import { downloadText, slugify, useCopy, usePolling, when } from "../ai/shared";
import { SITES_BASE } from "./Sites";

export function SiteEditor() {
  const { id } = useParams();
  const siteId = Number(id);
  useSvTitle([{ label: "Sites" }, { label: "Websites" }]);
  const navigate = useNavigate();
  const site = useRemote(() => sitesApi.get(siteId), [siteId]);
  const versions = useRemote(() => sitesApi.versions(siteId), [siteId, site.data?.updatedAt]);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [instruction, setInstruction] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [domainInput, setDomainInput] = useState<string | null>(null);
  const [dnsInfo, setDnsInfo] = useState<SiteWithDns | null>(null);
  const { done, copy } = useCopy();
  const s = site.data;
  usePolling(s?.status === "processing", site.reload, 2500);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true); setError("");
    try { await fn(); site.reload(); } catch (caught) { setError(errorText(caught)); } finally { setBusy(false); }
  }

  if (!s) return <div className="sv-page"><Banner error={site.error} />{site.error ? <Link className="sv-link" to={svPath(SITES_BASE)}>Back to websites</Link> : <p className="sv-hint">Loading…</p>}</div>;
  const live = publicUrl(s.slug);
  const dns = dnsInfo?.id === s.id ? dnsInfo : null;

  return (
    <div className="sv-page" style={{ paddingBottom: 24 }}>
      <Link className="sv-link" to={svPath(SITES_BASE)} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 12 }}><ArrowLeft className="sv-icon" aria-hidden /> All websites</Link>
      <div className="sv-page-head" style={{ marginBottom: 12 }}>
        <div>
          <h1 className="sv-h1" style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button type="button" style={{ font: "inherit", textAlign: "left" }} title="Rename" onClick={() => setRenaming(s.name)}>{s.name}</button>
            {s.status === "processing" ? <Badge tone="blue">Building…</Badge> : s.status === "failed" ? <Badge tone="red">Failed</Badge> : s.isPublished ? <Badge tone="green">{s.hasUnpublishedChanges ? "Live · changes pending" : "Live"}</Badge> : <Badge>Draft</Badge>}
          </h1>
          {s.isPublished ? <p className="sv-hint" style={{ margin: 0 }}><a className="sv-link" href={live} target="_blank" rel="noreferrer">{live}</a> · published {when(s.publishedAt)}</p> : null}
        </div>
        <div className="sv-actions">
          <div className="sv-seg" role="group" aria-label="Preview size">
            <button type="button" className={device === "desktop" ? "is-active" : ""} aria-label="Desktop preview" onClick={() => setDevice("desktop")}><Monitor className="sv-icon" aria-hidden /></button>
            <button type="button" className={device === "mobile" ? "is-active" : ""} aria-label="Mobile preview" onClick={() => setDevice("mobile")}><Smartphone className="sv-icon" aria-hidden /></button>
          </div>
          {s.html ? <Button icon={Download} onClick={() => downloadText(`${slugify(s.name)}.html`, s.html ?? "")}>Download</Button> : null}
          {s.isPublished ? <><Button icon={ExternalLink} onClick={() => window.open(live, "_blank", "noopener")}>View live</Button><Button disabled={busy} onClick={() => void act(() => sitesApi.unpublish(s.id))}>Unpublish</Button></> : null}
          <Button variant="primary" disabled={busy || !s.html || s.status === "processing" || (s.isPublished && !s.hasUnpublishedChanges)} onClick={() => void act(() => sitesApi.publish(s.id))}>{s.isPublished ? "Publish changes" : "Publish"}</Button>
        </div>
      </div>
      <Banner error={error || site.error} />
      {s.error && s.status !== "processing" ? <p className="sv-banner is-warn" role="status" style={{ margin: "0 0 12px" }}>{s.error}</p> : null}

      <div className="sv-site-editor">
        <aside className="sv-site-side">
          <Card className="sv-pad">
            <h3 className="sv-set-title" style={{ fontSize: 14, marginTop: 0 }}>Change this site</h3>
            <textarea className="sv-textarea" aria-label="Describe a change" style={{ minHeight: 90 }} maxLength={2000} placeholder="e.g. Make the header darker and add a section about our service area." value={instruction} disabled={!s.html || s.status === "processing"} onChange={(event) => setInstruction(event.target.value)} />
            <div style={{ marginTop: 8 }}><Button variant="primary" icon={Send} disabled={busy || !instruction.trim() || !s.html || s.status === "processing"} onClick={() => void act(async () => { await sitesApi.revise(s.id, instruction.trim()); setInstruction(""); })}>{s.status === "processing" ? "Working…" : "Apply change"}</Button></div>
            <p className="sv-hint" style={{ marginBottom: 0 }}>Each change keeps the previous version, so you can go back.</p>
          </Card>

          <Card className="sv-pad">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 className="sv-set-title" style={{ fontSize: 14, margin: 0 }}>Versions</h3>
              <Button size="sm" icon={History} onClick={() => setHistoryOpen(true)}>History ({versions.data?.length ?? 0})</Button>
            </div>
            <div style={{ marginTop: 8 }}><Button size="sm" icon={RefreshCw} disabled={busy || s.status === "processing"} onClick={() => { if (window.confirm("Rebuild the page from the original description? The current page is kept in the history.")) void act(() => sitesApi.regenerate(s.id)); }}>Start over from the description</Button></div>
          </Card>

          <Card className="sv-pad">
            <h3 className="sv-set-title" style={{ fontSize: 14, marginTop: 0 }}>Domain</h3>
            {s.customDomain ? <p style={{ margin: "0 0 8px" }}><b>{s.customDomain}</b> <Badge tone={s.domainStatus === "verified" ? "green" : "yellow"}>{s.domainStatus === "verified" ? "Connected" : "Waiting for DNS"}</Badge></p> : <p className="sv-hint" style={{ marginTop: 0 }}>Uses <code>{live.replace(/^https?:\/\//, "")}</code> until you connect your own domain.</p>}
            <Field label={s.customDomain ? "Change domain" : "Your domain"} htmlFor="site-domain"><input id="site-domain" className="sv-input" placeholder="www.yourbrand.com" value={domainInput ?? s.customDomain ?? ""} onChange={(event) => setDomainInput(event.target.value)} /></Field>
            <div className="sv-actions">
              <Button disabled={busy || domainInput === null || domainInput === (s.customDomain ?? "")} onClick={() => void act(async () => { const out = await sitesApi.setDomain(s.id, domainInput ?? ""); setDnsInfo(out); setDomainInput(null); })}>{domainInput === "" ? "Disconnect" : "Connect"}</Button>
              {s.customDomain ? <Button disabled={busy} onClick={() => void act(async () => setDnsInfo(await sitesApi.checkDomain(s.id)))}>Check DNS</Button> : null}
            </div>
            {s.customDomain && dns?.dns ? (
              <div className="sv-banner" style={{ margin: "10px 0 0" }}>
                <b>Add this DNS record</b>
                <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, wordBreak: "break-all" }}>{dns.dns.type} {dns.dns.name} → {dns.dns.value}</div>
                {dns.dns.note ? <div className="sv-hint">{dns.dns.note}</div> : null}
                {dns.detail ? <div className="sv-hint">{dns.detail}</div> : null}
                <div className="sv-hint">Your own domain also needs a certificate on the hosting side, which isn't set up automatically yet.</div>
              </div>
            ) : null}
            {s.isPublished ? <div style={{ marginTop: 10 }}><Button size="sm" icon={done === "url" ? Check : Copy} onClick={() => void copy("url", live)}>{done === "url" ? "Copied" : "Copy live link"}</Button></div> : null}
          </Card>

          <Button icon={Trash2} onClick={() => { if (window.confirm(`Delete "${s.name}"? This also takes it offline. This can't be undone.`)) void act(async () => { await sitesApi.remove(s.id); navigate(svPath(SITES_BASE)); }); }}>Delete website</Button>
        </aside>

        <section className="sv-site-preview" aria-label="Preview">
          {s.status === "processing" && !s.html ? <EmptyState title="Building your website…" body="This usually takes under a minute. You can leave this page; it will be here when you come back." /> : null}
          {s.status === "failed" && !s.html ? <EmptyState title="We couldn't build this site" body={s.error || "Something went wrong."} action={<Button variant="primary" icon={RefreshCw} onClick={() => void act(() => sitesApi.regenerate(s.id))}>Try again</Button>} /> : null}
          {s.html ? (
            <div className={`sv-site-frame is-${device}`}>
              {/* An empty sandbox: the page can't run script, submit forms or touch this app, whatever the model wrote. */}
              <iframe title={`Preview of ${s.name}`} sandbox="" srcDoc={s.html} />
              {s.status === "processing" ? <div className="sv-site-overlay"><Badge tone="blue">Applying your change…</Badge></div> : null}
            </div>
          ) : null}
        </section>
      </div>

      <Modal open={renaming !== null} title="Rename website" onClose={() => setRenaming(null)} footer={<><Button onClick={() => setRenaming(null)}>Cancel</Button><Button variant="primary" disabled={!renaming?.trim()} onClick={() => { const name = renaming ?? ""; setRenaming(null); void act(() => sitesApi.rename(s.id, name)); }}>Save</Button></>}>
        <input className="sv-input" aria-label="Website name" value={renaming ?? ""} onChange={(event) => setRenaming(event.target.value)} autoFocus />
      </Modal>
      <Modal open={historyOpen} title="Version history" onClose={() => setHistoryOpen(false)} footer={<Button onClick={() => setHistoryOpen(false)}>Close</Button>}>
        {versions.data?.length === 0 ? <p className="sv-hint" style={{ margin: 0 }}>No earlier versions yet. One is saved every time the page changes.</p> : null}
        <div className="sv-stack" style={{ maxHeight: 320, overflowY: "auto" }}>
          {versions.data?.map((v) => (
            <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <span><b>{when(v.createdAt)}</b><span className="sv-hint" style={{ display: "block" }}>{v.note}</span></span>
              <Button size="sm" disabled={busy || s.status === "processing"} onClick={() => { setHistoryOpen(false); void act(() => sitesApi.restore(s.id, v.id)); }}>Restore</Button>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
