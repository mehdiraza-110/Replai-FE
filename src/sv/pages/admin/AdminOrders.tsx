import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ADMIN_TRANSITIONS, adminOrderService, ORDER_STATUS_LABEL, type AdminOrderRequest, type OrderCounts, type OrderStatus } from "../../../services/orderApi";
import { Button, Card, Modal, PageHeader, SkeletonRows } from "../../ui";
import { useSvTitle } from "../../layout/chrome";
import { svPath } from "../../nav";
import { Banner, Pager } from "../crm/shared";
import { ConfirmModal } from "./domainParts";
import { AssignDomainsPanel, formatDateTime, OrderDetailsList, OrderStatusBadge, orderTitle } from "./orderParts";
import "./ops.css";

const LIMIT = 20;
type Filter = OrderStatus | "";
const TABS: { id: Filter; label: string; countKey?: keyof OrderCounts }[] = [
  { id: "", label: "All" },
  { id: "requested", label: "Requested", countKey: "requested" },
  { id: "approved", label: "Approved", countKey: "approved" },
  { id: "in_progress", label: "In progress", countKey: "in_progress" },
  { id: "fulfilled", label: "Fulfilled" },
  { id: "rejected", label: "Rejected" },
  { id: "cancelled", label: "Cancelled" },
];
const ACTION_LABEL: Record<OrderStatus, string> = { requested: "Reopen", approved: "Approve", in_progress: "Start work", fulfilled: "Mark fulfilled", rejected: "Reject", cancelled: "Cancel request" };

export function AdminOrders() {
  useSvTitle([{ label: "Admin" }, { label: "Orders" }]);
  const [filter, setFilter] = useState<Filter>("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminOrderRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<OrderCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<AdminOrderRequest | null>(null);
  const seq = useRef(0);

  const loadCounts = useCallback(() => { adminOrderService.count().then(setCounts).catch(() => undefined); }, []);
  const load = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true); setError("");
    try {
      const data = await adminOrderService.list({ status: filter, page, limit: LIMIT });
      if (id !== seq.current) return;
      setItems(data.items); setTotal(data.total);
    } catch (e) { if (id === seq.current) setError(e instanceof Error ? e.message : "We could not load requests."); } finally { if (id === seq.current) setLoading(false); }
  }, [filter, page]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { loadCounts(); }, [loadCounts]);

  function handleUpdated(updated: AdminOrderRequest) {
    setSelected(updated);
    setItems((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    loadCounts();
    if (filter && updated.status !== filter) void load();
  }

  return (
    <div className="sv-page">
      <PageHeader title="Orders" subtitle="Review domain, mailbox and limit requests from every workspace, then approve and fulfil them." />
      <div className="sv-tabs" role="tablist" aria-label="Filter by status">
        {TABS.map((tab) => {
          const count = tab.countKey && counts ? counts[tab.countKey] : null;
          return (
            <button key={tab.label} type="button" role="tab" aria-selected={filter === tab.id} className={`sv-tab${filter === tab.id ? " is-active" : ""}`} onClick={() => { setFilter(tab.id); setPage(1); }}>
              {tab.label}{count !== null ? ` ${count}` : ""}
            </button>
          );
        })}
      </div>
      <Banner error={error} />
      <Card>
        <div className="sv-table-wrap">
          <table className="sv-table ops-table" style={{ minWidth: 800 }}>
            <thead><tr><th>Workspace</th><th>Type</th><th>Quantity</th><th>Requested by</th><th>Status</th><th>Created</th><th className="is-right"><span style={{ position: "absolute", left: -9999 }}>Actions</span></th></tr></thead>
            <tbody>
              {loading ? <SkeletonRows columns={7} />
                : items.length === 0 ? <tr><td colSpan={7} className="sv-hint" style={{ padding: 28, textAlign: "center" }}>{filter ? `No ${ORDER_STATUS_LABEL[filter].toLowerCase()} requests.` : "No requests yet."}</td></tr>
                : items.map((order) => (
                  <tr key={order.id}>
                    <td><Link className="sv-table-link" to={svPath(`admin/workspaces/${order.workspace.id}`)}>{order.workspace.name}</Link></td>
                    <td>{order.type === "limits" ? "More limits" : <span style={{ textTransform: "capitalize" }}>{order.type}</span>}</td>
                    <td>{order.type === "limits" ? `${order.limit_info?.label ?? order.details?.limitKey}: ${order.limit_info?.current_limit?.toLocaleString() ?? "-"} → ${order.details?.requestedLimit?.toLocaleString() ?? "-"}` : order.quantity}</td>
                    <td><div>{order.requested_by?.name || order.requested_by?.email || "-"}</div>{order.requested_by?.name ? <p className="ops-sub">{order.requested_by.email}</p> : null}</td>
                    <td><OrderStatusBadge status={order.status} /></td>
                    <td className="ops-muted">{formatDateTime(order.created_at)}</td>
                    <td className="is-right"><Button size="sm" onClick={() => setSelected(order)}>Review</Button></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Pager page={page} limit={LIMIT} total={total} totalPages={Math.max(1, Math.ceil(total / LIMIT))} onPage={setPage} />
      <OrderDetailModal order={selected} onClose={() => setSelected(null)} onUpdated={handleUpdated} />
    </div>
  );
}

function OrderDetailModal({ order, onClose, onUpdated }: { order: AdminOrderRequest | null; onClose: () => void; onUpdated: (order: AdminOrderRequest) => void }) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<OrderStatus | null>(null);
  const [confirmApply, setConfirmApply] = useState(false);
  const orderId = order?.id;
  const serverNotes = order?.admin_notes ?? "";

  useEffect(() => {
    setNotes(serverNotes); setError(""); setSaved(false); setConfirmStatus(null); setConfirmApply(false);
    // Reset only when a different order is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const notesDirty = notes !== serverNotes;

  async function apply(patch: { status?: OrderStatus; admin_notes?: string }) {
    if (!order) return;
    setBusy(true); setError(""); setSaved(false);
    try {
      const updated = await adminOrderService.update(order.id, patch);
      onUpdated({ ...order, ...updated, workspace: updated.workspace ?? order.workspace });
      if (patch.admin_notes !== undefined) setSaved(true);
      setConfirmStatus(null);
    } catch (e) { setError(e instanceof Error ? e.message : "The request could not be updated."); } finally { setBusy(false); }
  }
  async function applyLimit() {
    if (!order) return;
    setBusy(true); setError("");
    try {
      const updated = await adminOrderService.applyLimits(order.id, notesDirty ? { admin_notes: notes } : {});
      onUpdated({ ...order, ...updated, workspace: updated.workspace ?? order.workspace });
      setConfirmApply(false);
    } catch (e) { setError(e instanceof Error ? e.message : "The limit could not be applied."); } finally { setBusy(false); }
  }

  const isLimits = order?.type === "limits";
  const canApply = Boolean(order && isLimits && ["requested", "approved", "in_progress"].includes(order.status));
  const info = order?.limit_info;
  const next = order ? ADMIN_TRANSITIONS[order.status] : [];
  const destructive = (s: OrderStatus) => s === "rejected" || s === "cancelled";

  return (
    <>
      <Modal open={order !== null && confirmStatus === null && !confirmApply} wide title={order ? `${order.workspace.name} · Request #${order.id}` : "Request"} onClose={onClose} footer={<Button onClick={onClose}>Close</Button>}>
        {order ? (
          <div style={{ display: "grid", gap: 18 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span className="ops-sub" style={{ margin: 0 }}>{isLimits ? orderTitle(order) : `${orderTitle(order)} requested`} ·</span>
              <OrderStatusBadge status={order.status} />
            </div>
            <OrderDetailsList order={order} />
            {isLimits && info ? (
              <div className="ops-note" data-testid="limit-compare">
                <div style={{ fontWeight: 600 }}>{info.label}</div>
                <div className="ops-muted">Current limit now: <b>{info.current_limit?.toLocaleString() ?? "not set"}</b>{info.period ? ` ${info.period === "day" ? "per 24 hours" : "in total"}` : ""} · Requested: <b>{info.requested_limit.toLocaleString()}</b></div>
              </div>
            ) : null}
            <div className="sv-field">
              <label className="sv-field-label" htmlFor="admin-notes">Admin notes</label>
              <p className="sv-hint">Visible to the workspace on their Orders page.</p>
              <textarea id="admin-notes" className="sv-textarea" rows={3} maxLength={2000} value={notes} onChange={(e) => { setNotes(e.target.value); setSaved(false); }} />
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}>
                <Button size="sm" disabled={busy || !notesDirty} onClick={() => void apply({ admin_notes: notes })}>Save notes</Button>
                {saved ? <span className="sv-hint" style={{ color: "#30a46c" }} role="status">Saved</span> : null}
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 500, fontSize: 13 }}>Move this request forward</div>
              {next.length === 0 ? <p className="sv-hint" style={{ marginTop: 4 }}>This request is {ORDER_STATUS_LABEL[order.status].toLowerCase()} and cannot change further.</p> : (
                <div className="sv-actions" style={{ marginTop: 8 }}>
                  {next.map((status) => (
                    <Button key={status} size="sm" variant={destructive(status) ? "danger" : "primary"} disabled={busy} onClick={() => (destructive(status) ? setConfirmStatus(status) : void apply({ status, ...(notesDirty ? { admin_notes: notes } : {}) }))}>{ACTION_LABEL[status]}</Button>
                  ))}
                </div>
              )}
            </div>
            {canApply ? (
              <div>
                <Button size="sm" disabled={busy} onClick={() => setConfirmApply(true)}>Apply requested limit</Button>
                <p className="sv-hint" style={{ marginTop: 4 }}>Sets the limit to the requested value, marks this request fulfilled and emails the requester.</p>
              </div>
            ) : null}
            <Banner error={error} />
            {isLimits ? null : <AssignDomainsPanel linkable={!["fulfilled", "rejected", "cancelled"].includes(order.status)} orderId={order.id} workspaceId={order.workspace.id} workspaceName={order.workspace.name} />}
          </div>
        ) : null}
      </Modal>

      {confirmApply && order && info ? (
        <ConfirmModal title="Apply this limit?" confirmLabel="Apply limit" busy={busy} onClose={() => setConfirmApply(false)} onConfirm={() => void applyLimit()}>
          <p style={{ margin: 0 }}>Set {order.workspace.name}'s {info.label.toLowerCase()} limit from {info.current_limit?.toLocaleString() ?? "unset"} to {info.requested_limit.toLocaleString()}? The request is marked fulfilled and the requester is emailed.</p>
          <Banner error={error} />
        </ConfirmModal>
      ) : null}
      {confirmStatus && order ? (
        <ConfirmModal title={confirmStatus === "rejected" ? "Reject this request?" : "Cancel this request?"} confirmLabel={ACTION_LABEL[confirmStatus]} danger busy={busy} onClose={() => setConfirmStatus(null)} onConfirm={() => void apply({ status: confirmStatus, ...(notesDirty ? { admin_notes: notes } : {}) })}>
          <p style={{ margin: 0 }}>{ACTION_LABEL[confirmStatus]} for request #{order.id}? The workspace will see the new status{notes.trim() ? " and your notes" : ""}. This cannot be undone.</p>
          <Banner error={error} />
        </ConfirmModal>
      ) : null}
    </>
  );
}
