import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpDown, CreditCard, Flame, ListFilter, Mail, MoreHorizontal, Pause, Pencil, Play, Plus, RefreshCw, Search, Trash2, Upload } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { emailAccountsApi, type AccountKind, type BulkResult, type DomainPage, type HealthFilter, type Inbox, type InboxPage, type InboxSort, type InboxStatus } from "../../api/emailAccounts";
import { useSvTitle } from "../../layout/chrome";
import { svPath } from "../../nav";
import { Badge, type BadgeTone, Button, Card, Menu, Modal, SkeletonRows } from "../../ui";
import { domainService, mailboxService } from "../../../services/api";
import { CreateInboxesModal, DnsModal, HealthPanel, ImportPostalModal, MessagesModal, OnboardModal, SyncMaildosoModal, WarmupPanel } from "./AccountTools";
import { errorText, formatDate } from "./shared";

const PROVIDER_LABEL: Record<string, string> = { Maildoso: "Maildoso", Postal: "Own server (Hetzner)", "Amazon SES": "Amazon SES (retired)", SES: "Amazon SES (retired)" };

const KIND_TONE: Record<AccountKind, BadgeTone> = { warmed: "green", warming: "blue", queued: "neutral", paused: "yellow", prewarmed: "purple", external: "neutral" };
const STATUS_TONE: Record<InboxStatus, BadgeTone> = { Active: "green", Paused: "yellow", Error: "red" };
const KIND_LABEL: Record<AccountKind, string> = { warmed: "Warmed", warming: "Warming up", queued: "Queued for warm-up", paused: "Warm-up paused", prewarmed: "Pre-warmed", external: "Other" };

function HealthCell({ inbox }: { inbox: Inbox }) {
  const { score, reasons, label } = inbox.health;
  const tone = score >= 75 ? "var(--ds-green-text)" : score >= 50 ? "var(--ds-yellow-text)" : "var(--ds-red-text)";
  return (
    <span className="sv-health" title={reasons.length ? `${label}. ${reasons.join("; ")}` : `${label}. No problems found.`}>
      <span className="sv-health-bar" aria-hidden><i style={{ width: `${score}%`, background: tone }} /></span>
      <span style={{ fontVariantNumeric: "tabular-nums", minWidth: 34, textAlign: "right" }}>{score}%</span>
    </span>
  );
}

const authTone = (value: string): BadgeTone => (value === "Success" ? "green" : value === "Failed" ? "red" : "yellow");

export function EmailAccounts() {
  useSvTitle([{ label: "Cold Email Agent" }, { label: "Email Accounts" }]);
  const { isSuperAdmin } = useAuth();
  const [tab, setTab] = useState<"inboxes" | "domains" | "warmup" | "health">("inboxes");
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<InboxStatus | "">("");
  const [type, setType] = useState<AccountKind | "">("");
  const [health, setHealth] = useState<HealthFilter>("");
  const [sort, setSort] = useState<{ key: InboxSort; dir: "asc" | "desc" }>({ key: "created", dir: "desc" });
  const [page, setPage] = useState(1);
  const [inboxes, setInboxes] = useState<InboxPage | null>(null);
  const [domains, setDomains] = useState<DomainPage | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [renaming, setRenaming] = useState<Inbox | null>(null);
  const [renameText, setRenameText] = useState("");
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [viewing, setViewing] = useState<Inbox | null>(null);
  const [dnsFor, setDnsFor] = useState<{ id: number; domain: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => { const t = window.setTimeout(() => { setSearch(searchText); setPage(1); }, 300); return () => window.clearTimeout(t); }, [searchText]);

  useEffect(() => {
    if (tab === "warmup" || tab === "health") return;
    let cancelled = false;
    const request = tab === "inboxes"
      ? emailAccountsApi.inboxes({ search, status, type, health, sort: sort.key, dir: sort.dir, page }).then((next) => !cancelled && setInboxes(next))
      : emailAccountsApi.domains({ search, page }).then((next) => !cancelled && setDomains(next));
    request.then(() => !cancelled && setError("")).catch((caught) => !cancelled && setError(errorText(caught)));
    return () => { cancelled = true; };
  }, [tab, search, status, type, health, sort, page, version]);

  async function act(action: () => Promise<unknown>) {
    setError("");
    try {
      await action();
      refresh();
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  async function refreshStatuses() {
    setRefreshing(true);
    await act(() => (tab === "domains" ? domainService.refreshAll() : mailboxService.refreshAll()));
    setRefreshing(false);
  }
  const removeInbox = (box: Inbox) => { if (window.confirm(`Remove ${box.email}? It is deleted from the app and from the mail provider. This can't be undone.`)) void act(() => mailboxService.remove(box.id)); };
  const removeDomain = (d: { id: number; domain: string; inboxes: number }) => { if (window.confirm(`Remove ${d.domain}${d.inboxes ? ` and its ${d.inboxes} inbox${d.inboxes === 1 ? "" : "es"}` : ""}? This can't be undone.`)) void act(() => domainService.remove(d.id)); };

  const th = (label: string, key: InboxSort) => (
    <button type="button" className="sv-th-btn" onClick={() => { setSort((c) => ({ key, dir: c.key === key && c.dir === "asc" ? "desc" : "asc" })); setPage(1); }}>
      {label} <ArrowUpDown className="sv-icon" style={{ width: 12, height: 12 }} aria-hidden />
    </button>
  );
  const s = inboxes?.summary;
  const listTab = tab === "inboxes" || tab === "domains";
  const pager = tab === "inboxes" ? inboxes : tab === "domains" ? domains : null;

  return (
    <div className="sv-page">
      <div className="sv-page-head" style={{ marginBottom: 16 }}>
        <h1 className="sv-h1">All Inboxes</h1>
        <div className="sv-actions">
          {listTab ? <label className="sv-settings-search" style={{ margin: 0, width: 240, height: 36 }}>
            <Search className="sv-icon" aria-hidden />
            <input placeholder={tab === "inboxes" ? "Search email accounts…" : "Search domains…"} aria-label="Search" value={searchText} onChange={(event) => setSearchText(event.target.value)} />
          </label> : null}
          {listTab ? <Button icon={RefreshCw} disabled={refreshing} onClick={() => void refreshStatuses()}>{refreshing ? "Refreshing…" : tab === "domains" ? "Re-check DNS" : "Refresh status"}</Button> : null}
          {isSuperAdmin && tab === "inboxes" ? <><Button onClick={() => setSyncOpen(true)}>Sync Maildoso</Button><Button icon={Mail} onClick={() => setCreateOpen(true)}>Create inboxes</Button></> : null}
          <Link className="sv-btn" to={svPath("settings/billing")}><CreditCard className="sv-icon" aria-hidden /> Manage Billing</Link>
          {tab === "inboxes" ? (
            <Menu
              className="sv-btn"
              label="Filters"
              trigger={<><ListFilter className="sv-icon" aria-hidden /> {status || (type ? KIND_LABEL[type] : health === "attention" ? "Needs attention" : health === "healthy" ? "Healthy" : "Status")}</>}
              items={[
                { label: "All inboxes", selected: !status && !type && !health, onSelect: () => { setStatus(""); setType(""); setHealth(""); setPage(1); } },
                ...(["Active", "Paused", "Error"] as InboxStatus[]).map((value) => ({ label: `Status: ${value}`, selected: status === value, onSelect: () => { setStatus(value); setType(""); setHealth(""); setPage(1); } })),
                { label: "Needs attention (health under 75)", selected: health === "attention", onSelect: () => { setHealth("attention"); setStatus(""); setType(""); setPage(1); } },
                { label: "Healthy", selected: health === "healthy", onSelect: () => { setHealth("healthy"); setStatus(""); setType(""); setPage(1); } },
                ...(["warmed", "warming", "queued", "prewarmed"] as AccountKind[]).map((value) => ({ label: `Type: ${KIND_LABEL[value]}`, selected: type === value, onSelect: () => { setType(value); setStatus(""); setHealth(""); setPage(1); } })),
              ]}
              align="right"
            />
          ) : null}
          {tab === "domains" && isSuperAdmin ? <><Button onClick={() => setImportOpen(true)}>Import from Postal</Button><Button icon={Upload} onClick={() => setOnboardOpen(true)}>Onboard domains</Button></> : null}
          <Link className="sv-btn is-primary" to={svPath("cold-email-campaign-agent/email-accounts/new")}><Plus className="sv-icon" aria-hidden /> Add New Inboxes</Link>
        </div>
      </div>

      <nav className="sv-tabs" aria-label="Email accounts sections" style={{ marginBottom: 16 }}>
        {([["inboxes", "Inboxes"], ["domains", "Domains"], ["warmup", "Warm-up"], ["health", "Health"]] as const).map(([id, label]) => <button key={id} type="button" className={`sv-tab${tab === id ? " is-active" : ""}`} aria-current={tab === id ? "page" : undefined} onClick={() => { setTab(id); setPage(1); setSearchText(""); setError(""); }}>{label}</button>)}
      </nav>

      {tab === "inboxes" && s ? (
        <p className="sv-hint" style={{ margin: "0 0 12px" }}>
          {s.total} inbox{s.total === 1 ? "" : "es"} · {s.active} active · {s.warming} warming up · {s.paused} paused{s.error ? ` · ${s.error} in error` : ""} · {s.needAttention} need attention{s.averageHealth !== null ? ` · average health ${s.averageHealth}%` : ""}
        </p>
      ) : null}
      {error ? <p className="sv-banner is-error" role="alert" style={{ margin: "0 0 12px" }}>{error}</p> : null}

      {tab === "warmup" ? <WarmupPanel /> : tab === "health" ? <HealthPanel /> : (
      <Card>
        <div className="sv-table-wrap">
          {tab === "inboxes" ? (
            <table className="sv-table">
              <thead><tr><th>{th("Name", "name")}</th><th>{th("Email", "email")}</th><th className="is-num">{th("Emails sent", "sent")}</th><th className="is-num">{th("Warm-up emails", "warmup")}</th><th>{th("Health score", "health")}</th><th>Account type</th><th>{th("Status", "status")}</th><th style={{ width: 36 }}>Warm-up</th><th style={{ width: 40 }} /></tr></thead>
              <tbody>
                {!inboxes && !error ? <SkeletonRows columns={9} /> : null}
                {inboxes && inboxes.items.length === 0 ? <tr><td colSpan={9} className="sv-hint" style={{ padding: 20 }}>{inboxes.summary.total === 0 ? "No inboxes yet. Add some to start sending." : "No inboxes match these filters."}</td></tr> : null}
                {inboxes?.items.map((box) => (
                  <tr key={box.id}>
                    <td style={{ fontWeight: 500 }}>{box.name}</td>
                    <td>{box.email}</td>
                    <td className="is-num">{box.sentToday} <span className="sv-hint">of {box.dailyLimit}</span></td>
                    <td className="is-num">{box.warmupSent.toLocaleString()}</td>
                    <td><HealthCell inbox={box} /></td>
                    <td><Badge tone={KIND_TONE[box.accountType.kind]}>{box.accountType.label}</Badge></td>
                    <td><Badge tone={STATUS_TONE[box.status]}>{box.status}</Badge></td>
                    <td style={{ textAlign: "center" }}><Flame className="sv-icon" style={{ color: box.warmupState === "warming" ? "var(--ds-orange-text)" : box.warmupState === "ready" || box.warmupState === "released" ? "var(--ds-green-text)" : "var(--ds-text-tertiary)" }} aria-label={box.warmupState ? `Warm-up: ${box.warmupState}${box.warmupDay ? `, day ${box.warmupDay}` : ""}` : "Not in the warm-up network"} /></td>
                    <td>
                      <Menu
                        className="sv-icon-btn" align="right" label={`Actions for ${box.email}`} trigger={<MoreHorizontal className="sv-icon" aria-hidden />}
                        items={[
                          box.status === "Active" ? { label: "Pause", icon: Pause, onSelect: () => void act(() => emailAccountsApi.updateInbox(box.id, { status: "Paused" })) } : { label: "Resume", icon: Play, onSelect: () => void act(() => emailAccountsApi.updateInbox(box.id, { status: "Active" })) },
                          { label: "Rename", icon: Pencil, onSelect: () => { setRenaming(box); setRenameText(box.name); } },
                          { label: "View messages", icon: Mail, onSelect: () => setViewing(box) },
                          { label: "Refresh status", icon: RefreshCw, onSelect: () => void act(() => mailboxService.refreshOne(box.id)) },
                          ...(isSuperAdmin ? [{ label: "Remove", icon: Trash2, danger: true, onSelect: () => removeInbox(box) }] : []),
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="sv-table">
              <thead><tr><th>Domain</th><th>Provider</th><th>Status</th><th>SPF</th><th>DKIM</th><th>DMARC</th><th>MX</th><th>Reputation</th><th className="is-num">Bounce</th><th className="is-num">Complaints</th><th className="is-num">Inboxes</th><th>Checked</th><th style={{ width: 40 }} /></tr></thead>
              <tbody>
                {!domains && !error ? <SkeletonRows columns={13} /> : null}
                {domains && domains.items.length === 0 ? <tr><td colSpan={13} className="sv-hint" style={{ padding: 20 }}>No domains yet.</td></tr> : null}
                {domains?.items.map((d) => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 500 }}>{d.domain}{d.lastError ? <div className="sv-hint" style={{ color: "var(--ds-red-text)" }} title={d.lastError}>{d.lastError.slice(0, 60)}</div> : null}</td>
                    <td>{PROVIDER_LABEL[d.provider] ?? (d.provider || "—")}</td>
                    <td><Badge tone={d.status === "Verified" ? "green" : d.status === "Failed" ? "red" : "yellow"}>{d.status}</Badge></td>
                    <td><Badge tone={authTone(d.spf)}>{d.spf}</Badge></td>
                    <td><Badge tone={authTone(d.dkim)}>{d.dkim}</Badge></td>
                    <td><Badge tone={authTone(d.dmarc)}>{d.dmarc}</Badge></td>
                    <td><Badge tone={authTone(d.mx)}>{d.mx}</Badge></td>
                    <td>{d.reputation ?? "—"}</td>
                    <td className="is-num">{d.bounceRate === null ? "—" : `${d.bounceRate}%`}</td>
                    <td className="is-num">{d.complaintRate === null ? "—" : `${d.complaintRate}%`}</td>
                    <td className="is-num">{d.inboxes}{d.warmingInboxes ? <span className="sv-hint"> · {d.warmingInboxes} warming</span> : null}</td>
                    <td>{formatDate(d.lastCheckedAt ?? d.createdAt)}</td>
                    <td><Menu className="sv-icon-btn" align="right" label={`Actions for ${d.domain}`} trigger={<MoreHorizontal className="sv-icon" aria-hidden />} items={[{ label: "DNS records", icon: Search, onSelect: () => setDnsFor({ id: d.id, domain: d.domain }) }, { label: "Re-check DNS", icon: RefreshCw, onSelect: () => void act(() => domainService.refreshOne(d.domain)) }, ...(isSuperAdmin ? [{ label: "Remove", icon: Trash2, danger: true, onSelect: () => removeDomain(d) }] : [])]} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
      )}

      {pager ? (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
          <span className="sv-hint">{pager.total === 0 ? "0 results" : `Viewing ${(pager.page - 1) * pager.limit + 1}-${Math.min(pager.page * pager.limit, pager.total)} of ${pager.total.toLocaleString()} results`}</span>
          <span className="sv-actions"><Button size="sm" disabled={page <= 1} onClick={() => setPage((c) => c - 1)}>Previous</Button><Button size="sm" disabled={page >= pager.totalPages} onClick={() => setPage((c) => c + 1)}>Next</Button></span>
        </div>
      ) : null}

      <Modal
        open={renaming !== null}
        title="Rename inbox"
        onClose={() => setRenaming(null)}
        footer={<><Button onClick={() => setRenaming(null)}>Cancel</Button><Button variant="primary" disabled={!renameText.trim()} onClick={() => { const target = renaming; setRenaming(null); if (target) void act(() => emailAccountsApi.updateInbox(target.id, { displayName: renameText.trim() })); }}>Save</Button></>}
      >
        <p className="sv-hint">This is the name recipients see on emails from {renaming?.email}.</p>
        <input className="sv-input" aria-label="Inbox name" value={renameText} onChange={(event) => setRenameText(event.target.value)} autoFocus />
      </Modal>
      {onboardOpen ? <OnboardModal onClose={() => setOnboardOpen(false)} onDone={refresh} /> : null}
      {importOpen ? <ImportPostalModal onClose={() => setImportOpen(false)} onDone={refresh} /> : null}
      {createOpen ? <CreateInboxesModal onClose={() => setCreateOpen(false)} onDone={refresh} /> : null}
      {syncOpen ? <SyncMaildosoModal onClose={() => setSyncOpen(false)} onDone={refresh} /> : null}
      {dnsFor ? <DnsModal domain={dnsFor} onClose={() => setDnsFor(null)} onChanged={refresh} /> : null}
      {viewing ? <MessagesModal inbox={viewing} onClose={() => setViewing(null)} /> : null}
    </div>
  );
}
