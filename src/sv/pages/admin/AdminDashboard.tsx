import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, Eye, RefreshCw } from "lucide-react";
import { adminApi, type AdminAnalytics, type InfraHealth } from "../../../services/adminApi";
import { useSvTitle } from "../../layout/chrome";
import { svPath } from "../../nav";
import { Badge, Button, Card, PageHeader, StatCard, SkeletonRows } from "../../ui";
import { AreaChart } from "../../ui/AreaChart";
import { Banner, TableCard, useRemote } from "../crm/shared";
import { dateText, useViewAsAction } from "./shared";

type Row = AdminAnalytics["byWorkspace"][number];
type SortKey = "emailsSent" | "repliesReceived" | "draftsGenerated" | "domains" | "mailboxes" | "campaigns" | "lastActivityAt";

const RANGES = [7, 30, 90];
const TOTALS: Array<[keyof AdminAnalytics["totals"], string]> = [
  ["workspaces", "Workspaces"], ["users", "Users"], ["domains", "Domains"], ["mailboxes", "Mailboxes"], ["campaigns", "Campaigns"],
  ["emailsSent", "Emails sent"], ["repliesReceived", "Replies received"], ["draftsGenerated", "Drafts generated"], ["meetingsBooked", "Meetings booked"],
];
const COLUMNS: Array<[SortKey, string]> = [
  ["emailsSent", "Emails sent"], ["repliesReceived", "Replies"], ["draftsGenerated", "Drafts"], ["domains", "Domains"], ["mailboxes", "Mailboxes"], ["campaigns", "Campaigns"], ["lastActivityAt", "Last activity"],
];
const SERIES = [{ key: "emailsSent", label: "Emails sent", color: "#2d6fa1" }, { key: "repliesReceived", label: "Replies", color: "#e8863a" }];

/** The mail server's own hostnames and IPs are shared by every sending domain, so a problem there hits all of them at once. */
function InfraHealthCard() {
  const health = useRemote<InfraHealth>(() => adminApi.getInfraHealth(), []);
  const h = health.data;
  const tone = (s: string) => (s === "ok" ? "green" : s === "warn" ? "yellow" : "red") as "green" | "yellow" | "red";
  const word = (s: string) => (s === "ok" ? "Healthy" : s === "warn" ? "Check" : "Problem");
  return (
    <div style={{ marginBottom: 16 }}>
    <Card className="sv-pad">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 className="sv-set-title" style={{ margin: 0 }}>Mail server identity {h ? <Badge tone={tone(h.status)}>{word(h.status)}</Badge> : null}</h2>
          <p className="sv-hint" style={{ margin: "2px 0 0" }}>Every sending domain relies on {h ? <b>{h.infraDomain}</b> : "the mail server's domain"} for its mail host, SPF include, bounce address and reverse DNS. If it breaks or lapses, all of them break.</p>
        </div>
        <Button size="sm" icon={RefreshCw} onClick={health.reload}>Check again</Button>
      </div>
      {health.error ? <p className="sv-banner is-error" role="alert" style={{ margin: "12px 0 0" }}>{health.error}</p> : null}
      {!h && !health.error ? <p className="sv-hint" style={{ margin: "12px 0 0" }}>Checking the live DNS…</p> : null}
      {h ? (
        <div className="sv-stack" style={{ gap: 6, marginTop: 12 }}>
          {h.items.map((i) => (
            <div key={i.key} style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
              <Badge tone={tone(i.status)}>{word(i.status)}</Badge>
              <b>{i.label}</b>
              <span className="sv-hint">{i.detail}</span>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
    </div>
  );
}

export function AdminDashboard() {
  useSvTitle([{ label: "Admin" }, { label: "Dashboard" }]);
  const viewAs = useViewAsAction();
  const [days, setDays] = useState(30);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "emailsSent", dir: -1 });
  const analytics = useRemote(() => adminApi.getAnalytics(days), [days]);
  const data = analytics.data;

  const rows = useMemo(() => {
    const list = [...(data?.byWorkspace ?? [])];
    list.sort((a: Row, b: Row) => {
      const value = (r: Row) => (sort.key === "lastActivityAt" ? (r.lastActivityAt ? Date.parse(r.lastActivityAt) : 0) : r[sort.key]);
      return (value(a) - value(b)) * sort.dir;
    });
    return list;
  }, [data, sort]);

  const header = (label: string, key: SortKey) => (
    <th key={key} className={key === "lastActivityAt" ? undefined : "is-num"} aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button type="button" className="adm-th-btn" onClick={() => setSort((c) => (c.key === key ? { key, dir: c.dir === 1 ? -1 : 1 } : { key, dir: -1 }))}>
        {label}{sort.key === key ? sort.dir === 1 ? <ArrowUp className="sv-icon" style={{ width: 12, height: 12 }} aria-hidden /> : <ArrowDown className="sv-icon" style={{ width: 12, height: 12 }} aria-hidden /> : null}
      </button>
    </th>
  );

  return (
    <div className="sv-page">
      <PageHeader
        title="Platform overview"
        subtitle="Platform-wide activity across every workspace."
        actions={
          <>
            <div className="sv-seg" role="group" aria-label="Date range">
              {RANGES.map((r) => <button key={r} type="button" className={days === r ? "is-active" : ""} aria-pressed={days === r} onClick={() => setDays(r)}>{r} days</button>)}
            </div>
            <Button icon={RefreshCw} onClick={analytics.reload}>Refresh</Button>
          </>
        }
      />
      <Banner error={analytics.error} />
      <InfraHealthCard />
      <div className="adm-stats">
        {TOTALS.map(([key, label]) => <StatCard key={key} label={label} value={data ? data.totals[key].toLocaleString() : "—"} />)}
      </div>

      <Card className="sv-pad" >
        <h2 className="sv-set-title" style={{ marginBottom: 2 }}>Emails sent and replies</h2>
        <p className="sv-hint" style={{ marginTop: 0 }}>Daily volume over the last {days} days.</p>
        {data && data.series.length === 0 ? <p className="sv-hint" style={{ margin: "24px 0" }}>No sending activity in this range.</p> : <AreaChart data={(data?.series ?? []).map((p) => ({ ...p }))} series={SERIES} height={240} />}
      </Card>

      <h2 className="sv-set-title" style={{ margin: "24px 0 4px" }}>Workspaces</h2>
      <p className="sv-hint" style={{ marginTop: 0 }}>Open a workspace, or use View as to work inside it. Click a column to sort.</p>
      <TableCard
        head={<><th>Workspace</th>{COLUMNS.map(([key, label]) => header(label, key))}<th style={{ width: 110 }} /></>}
        empty={data && rows.length === 0 ? "No workspaces have recorded activity yet." : undefined}
      >
        {!data && !analytics.error ? <SkeletonRows columns={9} /> : null}
        {rows.map((row) => (
          <tr key={row.workspaceId}>
            <td><Link className="sv-table-link" to={svPath(`admin/workspaces/${row.workspaceId}`)}>{row.name}</Link></td>
            <td className="is-num">{row.emailsSent.toLocaleString()}</td>
            <td className="is-num">{row.repliesReceived.toLocaleString()}</td>
            <td className="is-num">{row.draftsGenerated.toLocaleString()}</td>
            <td className="is-num">{row.domains}</td>
            <td className="is-num">{row.mailboxes}</td>
            <td className="is-num">{row.campaigns}</td>
            <td>{dateText(row.lastActivityAt)}</td>
            <td><Button size="sm" icon={Eye} className="adm-viewas" aria-label={`View as ${row.name}`} onClick={() => viewAs({ id: row.workspaceId, name: row.name })}>View as</Button></td>
          </tr>
        ))}
      </TableCard>
    </div>
  );
}
