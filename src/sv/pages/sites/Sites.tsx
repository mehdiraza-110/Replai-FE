import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Globe, LayoutTemplate, Plus, Sparkles } from "lucide-react";
import { sitesApi, type Site } from "../../api/sites";
import { useSvTitle } from "../../layout/chrome";
import { svPath } from "../../nav";
import { Badge, Button, Card, EmptyState, PageHeader, Skeleton } from "../../ui";
import { errorText } from "../cold-email/shared";
import { Banner, useRemote } from "../crm/shared";
import { usePolling, when } from "../ai/shared";

export const SITES_BASE = "sites/websites";
const TEMPLATE_BLURB: Record<string, string> = {
  landing: "One focused offer, benefits, steps and a call to action.",
  business: "Hero, about, services, process and contact.",
  portfolio: "Intro, work areas, skills and contact for one professional.",
  agency: "Services, approach, who you work with and a call to action.",
  local: "Service area, services list and contact for a local business.",
  personal: "Bold intro, what you help with and ways to work together.",
};

function siteBadge(site: Site) {
  if (site.status === "processing") return <Badge tone="blue">Building</Badge>;
  if (site.status === "failed") return <Badge tone="red">Failed</Badge>;
  if (site.isPublished) return <Badge tone="green">{site.hasUnpublishedChanges ? "Live · changes pending" : "Live"}</Badge>;
  return <Badge>Draft</Badge>;
}

export function Sites() {
  useSvTitle([{ label: "Sites" }, { label: "Websites" }]);
  const navigate = useNavigate();
  const list = useRemote(() => sitesApi.list(), []);
  const [tab, setTab] = useState<"projects" | "templates" | "domains">("projects");
  const [prompt, setPrompt] = useState("");
  const [template, setTemplate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  usePolling(Boolean(list.data?.items.some((s) => s.status === "processing")), list.reload);

  async function build(body: { prompt?: string; template?: string }) {
    setBusy(true); setError("");
    try {
      const site = await sitesApi.create(body);
      navigate(svPath(`${SITES_BASE}/${site.id}`));
    } catch (caught) { setError(errorText(caught)); setBusy(false); }
  }
  const items = list.data?.items ?? [];
  const templates = list.data?.templates ?? [];

  return (
    <div className="sv-page">
      <PageHeader title="Websites" subtitle="Describe a website and the AI builds it. Change it in plain words, then publish." />
      <Banner error={error || list.error} />
      <Card className="sv-pad" >
        <textarea className="sv-textarea" aria-label="Describe your website" style={{ minHeight: 96 }} maxLength={4000} placeholder="e.g. A site for Acme Plumbing in Austin. We repair leaks and install water heaters. Customers call or email for a quote." value={prompt} onChange={(event) => setPrompt(event.target.value)} />
        <div className="sv-chips" role="group" aria-label="Start from a template" style={{ margin: "10px 0" }}>
          {templates.map((t) => <button key={t.id} type="button" className={`sv-chip${template === t.id ? " is-active" : ""}`} aria-pressed={template === t.id} onClick={() => setTemplate(template === t.id ? "" : t.id)}>{t.label}</button>)}
        </div>
        <div className="sv-actions" style={{ justifyContent: "space-between" }}>
          <span className="sv-hint">{template ? `Starting from the ${templates.find((t) => t.id === template)?.label} layout. ` : ""}Only what you write goes on the site; nothing is invented.</span>
          <Button variant="primary" icon={Sparkles} disabled={busy || (prompt.trim().length < 15 && !template)} onClick={() => void build({ prompt: prompt.trim() || undefined, template: template || undefined })}>{busy ? "Starting…" : "Build website"}</Button>
        </div>
      </Card>

      <nav className="sv-tabs" aria-label="Sites sections" style={{ margin: "24px 0 16px" }}>
        {([["projects", "Projects"], ["templates", "Templates"], ["domains", "Domains"]] as const).map(([id, label]) => <button key={id} type="button" className={`sv-tab${tab === id ? " is-active" : ""}`} aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}>{label}</button>)}
      </nav>

      {(tab === "projects" || tab === "templates") && !list.data && !list.error ? <div className="sv-site-grid" role="status" aria-label="Loading">{Array.from({ length: 6 }, (_, i) => <div key={i} className="sv-site-card"><Skeleton height={110} style={{ borderRadius: 8 }} /><Skeleton width="60%" height={14} /><Skeleton width="40%" /></div>)}</div> : null}

      {tab === "projects" && (list.data || list.error) ? (
        items.length === 0 && list.data ? <EmptyState title="No websites yet" body="Describe one above, or pick a template to start." /> : (
          <div className="sv-site-grid">
            {items.map((s) => (
              <Link key={s.id} className="sv-site-card" to={svPath(`${SITES_BASE}/${s.id}`)}>
                <span className="sv-site-thumb" aria-hidden><Globe className="sv-icon" /></span>
                <span className="sv-site-meta"><strong>{s.name}</strong><span className="sv-hint">Edited {when(s.updatedAt)}</span>{siteBadge(s)}</span>
              </Link>
            ))}
          </div>
        )
      ) : null}

      {tab === "templates" && list.data ? (
        <div className="sv-site-grid">
          {templates.map((t) => (
            <Card key={t.id} className="sv-pad">
              <span className="sv-site-thumb" aria-hidden style={{ marginBottom: 10 }}><LayoutTemplate className="sv-icon" /></span>
              <strong>{t.label}</strong>
              <p className="sv-hint" style={{ margin: "4px 0 12px" }}>{TEMPLATE_BLURB[t.id]}</p>
              <Button icon={Plus} disabled={busy} onClick={() => void build({ template: t.id, prompt: prompt.trim() || undefined })}>Use this template</Button>
            </Card>
          ))}
        </div>
      ) : null}

      {tab === "domains" ? (
        <Card>
          <div className="sv-table-wrap"><table className="sv-table">
            <thead><tr><th>Site</th><th>Domain</th><th>Status</th><th style={{ width: 90 }} /></tr></thead>
            <tbody>
              {items.length === 0 ? <tr><td colSpan={4} className="sv-hint" style={{ padding: 20 }}>No websites yet.</td></tr> : null}
              {items.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 500 }}>{s.name}</td>
                  <td>{s.customDomain ?? <span className="sv-hint">None. Uses a SendVybe address.</span>}</td>
                  <td>{s.customDomain ? <Badge tone={s.domainStatus === "verified" ? "green" : "yellow"}>{s.domainStatus === "verified" ? "Connected" : "Waiting for DNS"}</Badge> : "—"}</td>
                  <td><Link className="sv-link" to={svPath(`${SITES_BASE}/${s.id}`)}>{s.customDomain ? "Manage" : "Connect"}</Link></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </Card>
      ) : null}
    </div>
  );
}
