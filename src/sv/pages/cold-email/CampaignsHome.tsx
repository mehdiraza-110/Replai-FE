import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, ListFilter, Mail, MoreHorizontal, Pause, Pencil, Phone, Play, Plus, Search, Settings as SettingsIcon, ThumbsUp, Trash2, Users, MessageSquare, ArrowUpDown } from "lucide-react";
import { campaignService } from "../../../services/api";
import { campaignInsightsApi, type CampaignOverview, type CampaignRow, type CampaignStatus, type DateRange } from "../../api/campaigns";
import { useSvTitle } from "../../layout/chrome";
import { svPath } from "../../nav";
import { Badge, Button, Card, Checkbox, EmptyState, FilterButton, Menu, Modal, PageHeader, StatCard, SkeletonRows } from "../../ui";
import { errorText, formatDate, pctText, STATUS_TONE } from "./shared";

const RANGE_LABEL: Record<DateRange, string> = { all: "All time", "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days" };
const STATUSES: CampaignStatus[] = ["Active", "Paused", "Draft", "Completed"];

type SortKey = "name" | "status" | "leadsContacted" | "replies" | "bounced" | "positiveReplies" | "callsBooked" | "startedAt";

const detailPath = (id: number) => svPath(`cold-email-campaign-agent/${id}`);

export function CampaignsHome() {
  useSvTitle([{ label: "Cold Email Agent" }]);
  const navigate = useNavigate();
  const [status, setStatus] = useState<CampaignStatus | "">("");
  const [range, setRange] = useState<DateRange>("all");
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CampaignOverview | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "startedAt", dir: -1 });
  const [confirmDelete, setConfirmDelete] = useState<CampaignRow[] | null>(null);
  const [rename, setRename] = useState<CampaignRow | null>(null);
  const [renameText, setRenameText] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(() => setVersion((current) => current + 1), []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchText);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    let cancelled = false;
    campaignInsightsApi
      .overview({ status, range, search, page })
      .then((next) => {
        if (cancelled) return;
        setData(next);
        setError("");
      })
      .catch((caught) => !cancelled && setError(errorText(caught)));
    return () => {
      cancelled = true;
    };
  }, [status, range, search, page, version]);

  const rows = useMemo(() => {
    const list = [...(data?.items ?? [])];
    const { key, dir } = sort;
    list.sort((a, b) => {
      const av = a[key] ?? "";
      const bv = b[key] ?? "";
      return (av < bv ? -1 : av > bv ? 1 : 0) * dir;
    });
    return list;
  }, [data, sort]);

  const chosen = rows.filter((row) => selected.has(row.id));
  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
      setSelected(new Set());
      refresh();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  const setStatusOf = (campaigns: CampaignRow[], next: "Active" | "Paused") =>
    run(() => Promise.all(campaigns.filter((c) => c.status !== next).map((c) => campaignService.update(c.id, { status: next }))));

  const header = (label: string, key: SortKey) => (
    <button type="button" className="sv-th-btn" onClick={() => setSort((current) => ({ key, dir: current.key === key ? (current.dir === 1 ? -1 : 1) : 1 }))}>
      {label} <ArrowUpDown className="sv-icon" style={{ width: 12, height: 12 }} aria-hidden />
    </button>
  );

  const summary = data?.summary;
  const nothing = data && data.total === 0 && !status && !search && range === "all";

  return (
    <div className="sv-page">
      <PageHeader
        title="All Campaigns"
        actions={
          <>
            <Link className="sv-btn" to={svPath("settings/cold-email-agent")}><SettingsIcon className="sv-icon" aria-hidden /> Settings</Link>
            <Link className="sv-btn" to={svPath("cold-email-campaign-agent/email-accounts")}><Mail className="sv-icon" aria-hidden /> Email Accounts</Link>
            <Link className="sv-btn is-primary" to={svPath("cold-email-campaign-agent/new")}><Plus className="sv-icon" aria-hidden /> New Campaign</Link>
          </>
        }
      />

      <div className="sv-stats">
        <StatCard label="Contacted Leads" value={summary ? summary.contactedLeads.toLocaleString() : "—"} icon={Users} hint="Emails sent across your campaigns" />
        <StatCard label="Positive Replies" value={summary ? summary.positiveReplies.toLocaleString() : "—"} icon={ThumbsUp} hint="Replies the AI SDR scored as high or very high interest" />
        <StatCard label="Positive Reply Rate" value={summary ? pctText(summary.positiveReplyRate) : "—"} icon={MessageSquare} hint="Positive replies as a share of emails sent" />
        <StatCard label="Booked Call Rate" value={summary ? pctText(summary.bookedCallRate) : "—"} icon={Phone} hint="Share of positive replies that became a booked call" />
        <StatCard label="Calls Booked" value={summary ? summary.callsBooked.toLocaleString() : "—"} icon={Calendar} hint="Meetings booked from campaign replies" />
      </div>

      {error ? <p className="sv-banner is-error" role="alert" style={{ margin: "16px 0 0" }}>{error}</p> : null}

      <div style={{ display: "flex", gap: 8, margin: "24px 0 16px", alignItems: "center", flexWrap: "wrap" }}>
        <Menu
          className="sv-filter"
          trigger={<><ListFilter className="sv-icon" aria-hidden /> {status || "Status"}</>}
          items={[{ label: "All statuses", selected: !status, onSelect: () => { setStatus(""); setPage(1); } }, ...STATUSES.map((value) => ({ label: value, selected: status === value, onSelect: () => { setStatus(value); setPage(1); } }))]}
          label="Filter by status"
        />
        <Menu
          className="sv-filter"
          trigger={<><Calendar className="sv-icon" aria-hidden /> {range === "all" ? "Date Range" : RANGE_LABEL[range]}</>}
          items={(Object.keys(RANGE_LABEL) as DateRange[]).map((value) => ({ label: RANGE_LABEL[value], selected: range === value, onSelect: () => { setRange(value); setPage(1); } }))}
          label="Filter by date range"
        />
        <div style={{ flex: 1 }} />
        <label className="sv-settings-search" style={{ margin: 0, width: 260, height: 36 }}>
          <Search className="sv-icon" aria-hidden />
          <input placeholder="Search campaigns…" aria-label="Search campaigns" value={searchText} onChange={(event) => setSearchText(event.target.value)} />
        </label>
      </div>

      {nothing ? (
        <Card><div style={{ padding: 16 }}><EmptyState title="No campaigns yet" body="Create your first campaign and the AI SDR will handle the replies." action={<Link className="sv-btn is-primary" to={svPath("cold-email-campaign-agent/new")}><Plus className="sv-icon" aria-hidden /> New Campaign</Link>} /></div></Card>
      ) : (
        <Card>
          <div className="sv-table-wrap">
            <table className="sv-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}><Checkbox checked={allSelected} onChange={(next) => setSelected(next ? new Set(rows.map((row) => row.id)) : new Set())} label="Select all campaigns" /></th>
                  <th>{header("Campaign", "name")}</th>
                  <th>{header("Status", "status")}</th>
                  <th className="is-num">{header("Leads Contacted", "leadsContacted")}</th>
                  <th className="is-num">{header("Replies", "replies")}</th>
                  <th className="is-num">{header("Bounced", "bounced")}</th>
                  <th className="is-num">{header("Positive Replies", "positiveReplies")}</th>
                  <th className="is-num">{header("Calls Booked", "callsBooked")}</th>
                  <th>{header("Started At", "startedAt")}</th>
                  <th style={{ width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {!data && !error ? <SkeletonRows columns={10} /> : null}
                {data && rows.length === 0 ? <tr><td colSpan={10} className="sv-hint" style={{ padding: 20 }}>No campaigns match these filters.</td></tr> : null}
                {rows.map((row) => (
                  <tr key={row.id} className={selected.has(row.id) ? "is-selected" : undefined}>
                    <td><Checkbox checked={selected.has(row.id)} onChange={(next) => setSelected((current) => { const copy = new Set(current); if (next) copy.add(row.id); else copy.delete(row.id); return copy; })} label={`Select ${row.name}`} /></td>
                    <td><Link to={detailPath(row.id)} className="sv-table-link">{row.name}</Link></td>
                    <td><Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge></td>
                    <td className="is-num">{row.leadsContacted.toLocaleString()}</td>
                    <td className="is-num">{row.replies.toLocaleString()} <span className="sv-hint">| {pctText(row.replyRate)}</span></td>
                    <td className="is-num">{row.bounced.toLocaleString()} <span className="sv-hint">| {pctText(row.bounceRate)}</span></td>
                    <td className="is-num">{row.positiveReplies.toLocaleString()} <span className="sv-hint">| {pctText(row.positiveReplyRate)}</span></td>
                    <td className="is-num">{row.callsBooked.toLocaleString()}</td>
                    <td>{formatDate(row.startedAt ?? row.createdAt)}</td>
                    <td>
                      <Menu
                        className="sv-icon-btn"
                        align="right"
                        label={`Actions for ${row.name}`}
                        trigger={<MoreHorizontal className="sv-icon" aria-hidden />}
                        items={[
                          { label: "View details", icon: Search, onSelect: () => navigate(detailPath(row.id)) },
                          { label: "Rename", icon: Pencil, onSelect: () => { setRename(row); setRenameText(row.name); } },
                          row.status === "Active" ? { label: "Pause", icon: Pause, onSelect: () => void setStatusOf([row], "Paused") } : { label: row.status === "Draft" ? "Launch" : "Resume", icon: Play, onSelect: () => void setStatusOf([row], "Active") },
                          { label: "Delete", icon: Trash2, danger: true, onSelect: () => setConfirmDelete([row]) },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {data ? (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
          <span className="sv-hint">{data.total === 0 ? "0 results" : `Viewing ${(data.page - 1) * data.limit + 1}-${Math.min(data.page * data.limit, data.total)} of ${data.total} results`}</span>
          <span className="sv-actions">
            <Button size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
            <Button size="sm" disabled={page >= data.totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button>
          </span>
        </div>
      ) : null}

      {chosen.length > 0 ? (
        <div className="sv-bulkbar" role="toolbar" aria-label="Bulk actions">
          <span>{chosen.length} selected</span>
          {chosen.some((c) => c.status === "Active") ? <Button size="sm" icon={Pause} disabled={busy} onClick={() => void setStatusOf(chosen, "Paused")}>Pause campaigns</Button> : null}
          {chosen.some((c) => c.status !== "Active") ? <Button size="sm" icon={Play} disabled={busy} onClick={() => void setStatusOf(chosen, "Active")}>Resume campaigns</Button> : null}
          <Button size="sm" variant="danger" icon={Trash2} disabled={busy} onClick={() => setConfirmDelete(chosen)}>Delete campaigns</Button>
        </div>
      ) : null}

      <Modal
        open={confirmDelete !== null}
        title={confirmDelete && confirmDelete.length > 1 ? `Delete ${confirmDelete.length} campaigns?` : "Delete campaign?"}
        onClose={() => setConfirmDelete(null)}
        footer={
          <>
            <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="danger" disabled={busy} onClick={() => { const list = confirmDelete ?? []; setConfirmDelete(null); void run(() => Promise.all(list.map((c) => campaignService.remove(c.id)))); }}>Delete</Button>
          </>
        }
      >
        <p style={{ margin: 0 }}>{confirmDelete?.length === 1 ? `"${confirmDelete[0].name}" and its leads will be removed. ` : "These campaigns and their leads will be removed. "}This cannot be undone. To stop sending without losing anything, pause the campaign instead.</p>
      </Modal>

      <Modal
        open={rename !== null}
        title="Rename campaign"
        onClose={() => setRename(null)}
        footer={
          <>
            <Button onClick={() => setRename(null)}>Cancel</Button>
            <Button variant="primary" disabled={busy || !renameText.trim()} onClick={() => { const target = rename; setRename(null); if (target) void run(() => campaignService.update(target.id, { name: renameText.trim() })); }}>Save</Button>
          </>
        }
      >
        <input className="sv-input" value={renameText} onChange={(event) => setRenameText(event.target.value)} aria-label="Campaign name" autoFocus />
      </Modal>
    </div>
  );
}
