import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { feedbackApi, type InboxPage, type TicketStatus } from "../../api/feedback";
import { FeedbackDetail } from "../../feedback/FeedbackDetail";
import { TicketCard } from "../../feedback/TicketCard";
import { TicketSettings } from "../../feedback/TicketSettings";
import { FEEDBACK_STATUSES } from "../../feedback/feedbackStatus";
import { markTicketsSeen } from "../../feedback/useTicketAlerts";
import { useSvTitle } from "../../layout/chrome";
import { EmptyState, PageHeader, SkeletonCard } from "../../ui";
import { Pager } from "../crm/shared";

type Tab = TicketStatus | "all" | "settings";
const TABS: { id: Tab; label: string }[] = [{ id: "all", label: "All" }, ...FEEDBACK_STATUSES.map((s) => ({ id: s.id as Tab, label: s.label })), { id: "settings", label: "Settings" }];

/** Support team: every ticket, with status tabs, search, and the settings for recordings and Asana. */
export function TicketDashboard() {
  useSvTitle([{ label: "Support" }, { label: "Ticket dashboard" }]);
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<InboxPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => { markTicketsSeen(); }, []);
  useEffect(() => { const t = window.setTimeout(() => { setQuery(search.trim()); setPage(1); }, 300); return () => window.clearTimeout(t); }, [search]);

  const load = useCallback(() => {
    if (tab === "settings") return;
    feedbackApi.inbox({ status: tab === "all" ? undefined : tab, search: query || undefined, page }).then((d) => { setData(d); setError(null); }).catch((e) => setError(e instanceof Error ? e.message : "We could not load the tickets."));
  }, [tab, query, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    // New tickets show up without a reload, and the team badge stays cleared while this page is open.
    const refresh = () => { markTicketsSeen(); load(); };
    window.addEventListener("ticket-new", refresh);
    const timer = window.setInterval(load, 60_000);
    return () => { window.removeEventListener("ticket-new", refresh); window.clearInterval(timer); };
  }, [load]);

  return (
    <div className="sv-page">
      <PageHeader title="Ticket dashboard" subtitle="Everything people have reported. Reply, set a status, or open the Asana task." />
      <div className="sv-fb-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`sv-fb-tab${tab === t.id ? " is-on" : ""}`} onClick={() => { setTab(t.id); setPage(1); setData(null); }}>
            {t.label}{t.id !== "settings" && data ? <span className="sv-fb-count">{data.counts[t.id as keyof typeof data.counts]}</span> : null}
          </button>
        ))}
      </div>

      {tab === "settings" ? <TicketSettings /> : (
        <>
          <label className="sv-settings-search" style={{ margin: "16px 0", width: 320, height: 36 }}>
            <Search className="sv-icon" aria-hidden />
            <input placeholder="Search title, text, name or email…" aria-label="Search tickets" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          {error ? <p className="sv-fb-error" role="alert">{error}</p> : null}
          {!data && !error ? <SkeletonCard lines={6} /> : null}
          {data && data.items.length === 0 ? <EmptyState title="No tickets here" body={query ? "Nothing matches that search." : "New tickets will show up here as they arrive."} /> : null}
          {data && data.items.length > 0 ? <div className="sv-fb-list">{data.items.map((t) => <TicketCard key={t.id} ticket={t} showReporter onOpen={() => setOpen(t.id)} />)}</div> : null}
          {data ? <Pager page={data.page} limit={data.pageSize} total={data.total} totalPages={Math.max(1, Math.ceil(data.total / data.pageSize))} onPage={setPage} /> : null}
        </>
      )}
      <FeedbackDetail id={open} staff onClose={() => { setOpen(null); load(); }} onChanged={load} />
    </div>
  );
}
