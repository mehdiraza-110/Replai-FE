import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { GripVertical, LayoutGrid, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import { aiSdrApi } from "../api/aiSdr";
import { crmApi, type DashboardView, type ViewWidget, type WidgetData, type WidgetDef, type WidgetSize } from "../api/crm";
import { useSvTitle } from "../layout/chrome";
import { svPath } from "../nav";
import { Badge, Button, Card, Menu, Modal, Skeleton, SkeletonCard, SkeletonLines } from "../ui";
import { AreaChart, type ChartSeries } from "../ui/AreaChart";
import { dateTime, errorText, money, useRemote } from "./crm/shared";

const RANGE_LABEL: Record<number, string> = { 7: "Last 7 days", 30: "Last 30 days", 90: "Last 90 days" };
const SPAN: Record<WidgetSize, number> = { s: 1, m: 2, l: 4 };
const SIZE_LABEL: Record<WidgetSize, string> = { s: "Small", m: "Medium", l: "Large" };
const CHART_SERIES: Record<string, ChartSeries[]> = {
  sent_vs_replies: [{ key: "sent", label: "Emails sent", color: "#2d6fa1" }, { key: "replies", label: "Replies", color: "#2d8a5f" }],
  meetings_per_day: [{ key: "meetings", label: "Meetings booked", color: "#7a54c4" }],
  new_leads_per_day: [{ key: "leads", label: "New leads", color: "#c4742d" }],
};
const STAGE_NAMES: Record<string, string> = { lead: "Lead", qualified: "Qualified", meeting: "Meeting booked", proposal: "Proposal", won: "Won", lost: "Lost" };

function delta(value: number, previous: number | undefined, days: number) {
  if (previous === undefined) return null;
  if (previous === 0) return value === 0 ? "No change" : "New this period";
  const pct = Math.round(((value - previous) / previous) * 100);
  return `${pct > 0 ? "+" : ""}${pct}% vs previous ${days} days`;
}

function WidgetBody({ def, data, days }: { def: WidgetDef; data: WidgetData | undefined; days: number }) {
  if (!data) {
    if (def.type === "stat") return <div className="sv-skel-stack" role="status" aria-label="Loading"><Skeleton width="50%" height={28} /><Skeleton width="65%" /></div>;
    if (def.type === "chart") return <div role="status" aria-label="Loading"><Skeleton height={def.key === "sent_vs_replies" ? 240 : 180} style={{ borderRadius: 8 }} /></div>;
    return <SkeletonLines lines={4} />;
  }
  if (def.type === "stat") {
    const value = data.value ?? 0;
    const change = delta(value, data.previous, days);
    return (
      <>
        <div className="sv-stat-value">{def.format === "money" ? money(value) : value.toLocaleString()}</div>
        {change ? <div className="sv-hint">{change}</div> : <div className="sv-hint">Right now</div>}
      </>
    );
  }
  if (def.type === "chart") {
    const series = CHART_SERIES[def.key] ?? [];
    const rows = data.series ?? [];
    const empty = rows.every((row) => series.every((s) => !Number(row[s.key])));
    return (
      <>
        <div style={{ display: "flex", gap: 14, marginBottom: 6, flexWrap: "wrap" }}>{series.map((s) => <span key={s.key} className="sv-hint" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><i style={{ width: 8, height: 8, borderRadius: 4, background: s.color, display: "inline-block" }} />{s.label}</span>)}</div>
        {empty ? <p className="sv-hint" style={{ margin: "24px 0" }}>Nothing in this period yet.</p> : <AreaChart data={rows} series={series} height={def.key === "sent_vs_replies" ? 240 : 180} />}
      </>
    );
  }
  const rows = data.rows ?? [];
  if (def.key === "pipeline_by_stage") {
    return <ul className="sv-dash-list">{rows.map((r) => <li key={String(r.stage)}><span>{STAGE_NAMES[String(r.stage)]}</span><span className="sv-hint">{String(r.count)} · {money(Number(r.value))}</span></li>)}</ul>;
  }
  if (rows.length === 0) return <p className="sv-hint">{def.key === "tasks_due" ? "No open tasks." : "Nothing booked yet."}</p>;
  return (
    <ul className="sv-dash-list">
      {rows.map((r) => (
        <li key={String(r.id)}><span style={{ fontWeight: 500, color: r.overdue ? "var(--ds-red-text)" : undefined }}>{String(r.title)}</span><span className="sv-hint">{r.at ? dateTime(String(r.at)) : "No date"}</span></li>
      ))}
    </ul>
  );
}

export function Dashboard() {
  useSvTitle([{ label: "Dashboard" }]);
  const [days, setDays] = useState(30);
  const [viewId, setViewId] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [naming, setNaming] = useState<"new" | "rename" | null>(null);
  const [nameText, setNameText] = useState("");
  const [error, setError] = useState("");
  const [dragKey, setDragKey] = useState<string | null>(null);

  const catalog = useRemote(() => crmApi.catalog(), []);
  const views = useRemote(() => crmApi.views(), []);
  const brain = useRemote(() => aiSdrApi.settings().then((b) => b.brain), []);
  const [local, setLocal] = useState<DashboardView[] | null>(null);
  useEffect(() => { if (views.data) setLocal(views.data); }, [views.data]);

  const list = local ?? [];
  const view = list.find((v) => v.id === viewId) ?? list.find((v) => v.isDefault) ?? list[0] ?? null;
  const defs = useMemo(() => Object.fromEntries((catalog.data?.widgets ?? []).map((w) => [w.key, w])), [catalog.data]);
  const keys = (view?.widgets ?? []).map((w) => w.key).join(",");
  const values = useRemote(() => (keys ? crmApi.dashboardData(days, keys.split(",")) : Promise.resolve({ days, widgets: {} as Record<string, WidgetData> })), [keys, days]);

  const firstName = (brain.data?.senderFirstName || "").trim();
  const brainEmpty = brain.data ? !brain.data.whatYouSell.trim() && !brain.data.whoYouSellTo.trim() : false;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  async function persist(next: ViewWidget[]) {
    if (!view) return;
    const before = local;
    setLocal((cur) => (cur ?? []).map((v) => (v.id === view.id ? { ...v, widgets: next } : v)));
    try { await crmApi.updateView(view.id, { widgets: next }); } catch (caught) { setLocal(before); setError(errorText(caught)); }
  }
  async function run(action: () => Promise<unknown>) {
    setError("");
    try { await action(); views.reload(); } catch (caught) { setError(errorText(caught)); }
  }

  const move = (from: string, to: string) => {
    if (!view || from === to) return;
    const arr = [...view.widgets];
    const i = arr.findIndex((w) => w.key === from);
    const j = arr.findIndex((w) => w.key === to);
    if (i < 0 || j < 0) return;
    const [item] = arr.splice(i, 1);
    arr.splice(j, 0, item);
    void persist(arr);
  };

  const available = (catalog.data?.widgets ?? []).filter((w) => !view?.widgets.some((x) => x.key === w.key));

  return (
    <div className="sv-page">
      {brainEmpty ? (
        <div className="sv-banner is-warn" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <Sparkles className="sv-icon" aria-hidden /><span style={{ flex: 1 }}><b>Tell the AI what you sell.</b> Your replies and campaigns are only as good as what it knows about your business.</span>
          <Link className="sv-btn" to={svPath("settings/brain")}>Open Brain</Link>
        </div>
      ) : null}
      <div className="sv-page-head" style={{ marginBottom: 20 }}>
        <div><h1 className="sv-h1">{greeting}{firstName ? `, ${firstName}` : ""}</h1><p className="sv-hint" style={{ margin: "4px 0 0" }}>Here's your business performance overview</p></div>
        <div className="sv-actions">
          <Menu label="Dashboard view" trigger={<><LayoutGrid className="sv-icon" aria-hidden /> {view?.name ?? "Overview"}{view?.isDefault ? " (Default)" : ""}</>}
            items={[...list.map((v) => ({ label: `${v.name}${v.isDefault ? " (Default)" : ""}`, selected: v.id === view?.id, onSelect: () => { setViewId(v.id); setEditing(false); } })), { label: "New view", icon: Plus, onSelect: () => { setNaming("new"); setNameText(""); } }]} />
          <Menu label="Date range" trigger={<>{RANGE_LABEL[days]}</>} items={(catalog.data?.ranges ?? [7, 30, 90]).map((r) => ({ label: RANGE_LABEL[r] ?? `${r} days`, selected: r === days, onSelect: () => setDays(r) }))} />
          {editing ? <Button icon={Plus} onClick={() => setAdding(true)}>Add widget</Button> : null}
          {view && !editing ? (
            <Menu className="sv-btn" align="right" label="View options" trigger={<>View options</>}
              items={[
                { label: "Edit layout", icon: Pencil, onSelect: () => setEditing(true) },
                { label: "Rename view", onSelect: () => { setNaming("rename"); setNameText(view.name); } },
                { label: "Make default", disabled: view.isDefault, onSelect: () => void run(() => crmApi.updateView(view.id, { isDefault: true })) },
                { label: "Delete view", icon: Trash2, danger: true, disabled: view.isDefault, onSelect: () => void run(async () => { await crmApi.deleteView(view.id); setViewId(null); }) },
              ]} />
          ) : null}
          {editing ? <Button variant="primary" onClick={() => setEditing(false)}>Done</Button> : null}
        </div>
      </div>
      {error || catalog.error || views.error || values.error ? <p className="sv-banner is-error" role="alert" style={{ marginBottom: 16 }}>{error || catalog.error || views.error || values.error}</p> : null}

      {view && view.widgets.length === 0 ? (
        <Card className="sv-pad" ><p style={{ margin: 0 }}>This view is empty. <button type="button" className="sv-link" onClick={() => { setEditing(true); setAdding(true); }}>Add a widget</button> to get started.</p></Card>
      ) : null}

      <div className="sv-dash-grid">
        {!view && !error && !views.error && !catalog.error ? [1, 1, 1, 1, 2, 2].map((span, i) => <div key={i} className="sv-dash-cell" style={{ gridColumn: `span ${span}` }}><SkeletonCard lines={span === 1 ? 1 : 4} /></div>) : null}
        {view?.widgets.map((w) => {
          const def = defs[w.key];
          if (!def) return null;
          return (
            <div key={w.key} className={`sv-dash-cell${dragKey === w.key ? " is-dragging" : ""}`} style={{ gridColumn: `span ${SPAN[w.size]}` }}
              onDragOver={(e) => editing && e.preventDefault()} onDrop={() => editing && dragKey && (move(dragKey, w.key), setDragKey(null))}>
              <Card className="sv-pad sv-dash-card">
                <div className="sv-dash-head">
                  <span className="sv-stat-label" title={def.description}>{def.label}</span>
                  {editing ? (
                    <span className="sv-actions">
                      <Menu className="sv-icon-btn" align="right" label={`Size of ${def.label}`} trigger={<Badge>{SIZE_LABEL[w.size]}</Badge>} items={(["s", "m", "l"] as WidgetSize[]).map((s) => ({ label: SIZE_LABEL[s], selected: s === w.size, onSelect: () => void persist(view.widgets.map((x) => (x.key === w.key ? { ...x, size: s } : x))) }))} />
                      <span draggable onDragStart={() => setDragKey(w.key)} onDragEnd={() => setDragKey(null)} className="sv-icon-btn" style={{ cursor: "grab" }} title="Drag to reorder" aria-label={`Drag ${def.label}`}><GripVertical className="sv-icon" aria-hidden /></span>
                      <button type="button" className="sv-icon-btn" aria-label={`Remove ${def.label}`} onClick={() => void persist(view.widgets.filter((x) => x.key !== w.key))}><X className="sv-icon" aria-hidden /></button>
                    </span>
                  ) : null}
                </div>
                <WidgetBody def={def} data={values.data?.widgets[w.key]} days={days} />
              </Card>
            </div>
          );
        })}
      </div>

      <Modal open={adding} title="Add widget" onClose={() => setAdding(false)} footer={<Button onClick={() => setAdding(false)}>Close</Button>}>
        {available.length === 0 ? <p className="sv-hint">Every widget is already on this view.</p> : null}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 360, overflowY: "auto" }}>
          {available.map((w) => (
            <button key={w.key} type="button" className="sv-menu-item" onClick={() => { void persist([...(view?.widgets ?? []), { key: w.key, size: w.defaultSize }]); }}>
              <span style={{ flex: 1, textAlign: "left" }}><b style={{ fontWeight: 500 }}>{w.label}</b><br /><span className="sv-hint">{w.description}</span></span><Badge>{w.type === "stat" ? "Number" : w.type === "chart" ? "Chart" : "List"}</Badge>
            </button>
          ))}
        </div>
      </Modal>
      <Modal open={naming !== null} title={naming === "new" ? "New view" : "Rename view"} onClose={() => setNaming(null)}
        footer={<><Button onClick={() => setNaming(null)}>Cancel</Button><Button variant="primary" disabled={!nameText.trim()} onClick={() => { const mode = naming; setNaming(null); void run(async () => { if (mode === "new") { const created = await crmApi.createView({ name: nameText.trim(), widgets: view?.widgets }); setViewId(created.id); } else if (view) await crmApi.updateView(view.id, { name: nameText.trim() }); }); }}>Save</Button></>}>
        <input className="sv-input" aria-label="View name" value={nameText} onChange={(e) => setNameText(e.target.value)} autoFocus placeholder="Sales overview" />
        {naming === "new" ? <p className="sv-hint">The new view starts with the widgets on the current one.</p> : null}
      </Modal>
    </div>
  );
}
