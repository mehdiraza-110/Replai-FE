import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card } from "@heroui/react";
import { ArrowDown, ArrowUp, RefreshCw } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { adminApi, errorMessage, type AdminAnalytics } from "../../services/adminApi";
import { ErrorBanner } from "../../components/admin/AdminModal";
import { PageHeader, StatTile, formatDate } from "../../components/admin/AdminBits";
import { Skeleton, SkeletonRow } from "../../components/ui/Skeleton";

type Row = AdminAnalytics["byWorkspace"][number];
type SortKey = "emailsSent" | "repliesReceived" | "draftsGenerated" | "domains" | "mailboxes" | "campaigns" | "lastActivityAt";

const ranges = [7, 30, 90];

const totalCards: Array<[keyof AdminAnalytics["totals"], string]> = [
  ["workspaces", "Workspaces"],
  ["users", "Users"],
  ["domains", "Domains"],
  ["mailboxes", "Mailboxes"],
  ["campaigns", "Campaigns"],
  ["emailsSent", "Emails sent"],
  ["repliesReceived", "Replies received"],
  ["draftsGenerated", "Drafts generated"],
  ["meetingsBooked", "Meetings booked"],
];

const columns: Array<[SortKey, string]> = [
  ["emailsSent", "Emails sent"],
  ["repliesReceived", "Replies"],
  ["draftsGenerated", "Drafts"],
  ["domains", "Domains"],
  ["mailboxes", "Mailboxes"],
  ["campaigns", "Campaigns"],
  ["lastActivityAt", "Last activity"],
];

export function AdminDashboard() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("emailsSent");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await adminApi.getAnalytics(days));
    } catch (e) {
      setError(errorMessage(e, "Unable to load platform analytics."));
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    const list = [...(data?.byWorkspace ?? [])];
    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a: Row, b: Row) => {
      if (sortKey === "lastActivityAt") {
        return ((a.lastActivityAt ? Date.parse(a.lastActivityAt) : 0) - (b.lastActivityAt ? Date.parse(b.lastActivityAt) : 0)) * dir;
      }
      return (a[sortKey] - b[sortKey]) * dir;
    });
    return list;
  }, [data, sortKey, sortDir]);

  const series = useMemo(
    () => (data?.series ?? []).map((p) => ({ ...p, label: new Date(p.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) })),
    [data],
  );

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <div className="mx-auto flex max-w-[1480px] flex-col gap-5">
      <PageHeader
        actions={
          <>
            <div className="inline-flex rounded-full border border-border bg-surface p-0.5" role="group" aria-label="Date range">
              {ranges.map((r) => (
                <button
                  aria-pressed={days === r}
                  className={`h-8 rounded-full px-3 text-[13px] font-medium transition ${days === r ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"}`}
                  key={r}
                  type="button"
                  onClick={() => setDays(r)}
                >
                  {r} days
                </button>
              ))}
            </div>
            <Button isDisabled={isLoading} size="sm" variant="secondary" onClick={() => void load()}>
              <RefreshCw className="size-4" />
              Refresh
            </Button>
          </>
        }
        description="Platform-wide activity across every workspace."
        title="Platform overview"
      />

      {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {totalCards.map(([key, label]) => (
          <StatTile key={key} label={label} loading={isLoading && !data} value={data?.totals[key] ?? 0} />
        ))}
      </section>

      <Card className="apple-shadow border border-border/70 bg-surface p-4">
        <Card.Header className="p-0">
          <Card.Title className="text-[15px] font-semibold">Emails sent and replies</Card.Title>
          <Card.Description>Daily volume over the last {days} days.</Card.Description>
        </Card.Header>
        <Card.Content className="p-0 pt-4">
          {isLoading && !data ? (
            <Skeleton className="h-[260px] w-full" />
          ) : series.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">No sending activity in this range.</p>
          ) : (
            <div className="h-[260px] w-full">
              <ResponsiveContainer height="100%" width="100%">
                <LineChart data={series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke="var(--separator)" vertical={false} />
                  <XAxis axisLine={false} dataKey="label" minTickGap={24} tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} />
                  <YAxis allowDecimals={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} width={40} />
                  <Tooltip
                    content={({ label, payload }) => (
                      <div className="min-w-[140px] rounded-xl border border-border/70 bg-surface px-3 py-2 text-[11px] apple-shadow">
                        <div className="mb-1 font-semibold text-foreground">{label}</div>
                        {payload?.map((item) => (
                          <div className="flex items-center justify-between gap-4" key={String(item.dataKey)}>
                            <span className="flex items-center gap-1.5 text-muted">
                              <i className="size-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                              {item.name}
                            </span>
                            <span className="font-semibold text-foreground">{Number(item.value).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Line dataKey="emailsSent" dot={false} name="Emails sent" stroke="var(--accent)" strokeWidth={2} type="monotone" />
                  <Line dataKey="repliesReceived" dot={false} name="Replies" stroke="var(--warning)" strokeWidth={2} type="monotone" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card.Content>
      </Card>

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-surface">
        <div className="border-b border-border/70 px-4 py-3">
          <h2 className="text-[15px] font-semibold text-foreground">Workspaces</h2>
          <p className="text-[12px] text-muted">Select a row to open the workspace. Click a column to sort.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-border/70 text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Workspace</th>
                {columns.map(([key, label]) => (
                  <th aria-sort={sortKey === key ? (sortDir === "asc" ? "ascending" : "descending") : "none"} className="px-2 py-3 font-medium" key={key}>
                    <button className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-foreground" type="button" onClick={() => toggleSort(key)}>
                      {label}
                      {sortKey === key ? sortDir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : null}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && !data ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow columns={8} key={i} />)
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-sm font-medium text-muted" colSpan={8}>
                    No workspaces have recorded activity yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr className="border-b border-border/60 last:border-0 hover:bg-default-50" key={row.workspaceId}>
                    <td className="px-4 py-3">
                      <Link className="font-medium text-foreground hover:text-accent" to={`/admin/workspaces/${row.workspaceId}`}>
                        {row.name}
                      </Link>
                    </td>
                    <td className="px-2 py-3 tabular-nums">{row.emailsSent.toLocaleString()}</td>
                    <td className="px-2 py-3 tabular-nums">{row.repliesReceived.toLocaleString()}</td>
                    <td className="px-2 py-3 tabular-nums">{row.draftsGenerated.toLocaleString()}</td>
                    <td className="px-2 py-3 tabular-nums">{row.domains}</td>
                    <td className="px-2 py-3 tabular-nums">{row.mailboxes}</td>
                    <td className="px-2 py-3 tabular-nums">{row.campaigns}</td>
                    <td className="px-2 py-3 text-muted">{formatDate(row.lastActivityAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
