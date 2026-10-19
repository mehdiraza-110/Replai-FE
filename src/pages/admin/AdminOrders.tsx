import { Button } from "@heroui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AdminModal, ConfirmDialog, ErrorBanner } from "../../components/admin/AdminModal";
import { PageHeader, Pagination } from "../../components/admin/AdminBits";
import { AssignDomainsPanel } from "../../components/orders/AssignDomainsPanel";
import { OrderDetailsList, OrderStatusPill, formatDateTime, orderTitle } from "../../components/orders/shared";
import { SkeletonRow } from "../../components/ui/Skeleton";
import {
  ADMIN_TRANSITIONS,
  ORDER_STATUS_LABEL,
  adminOrderService,
  type AdminOrderRequest,
  type OrderCounts,
  type OrderStatus,
} from "../../services/orderApi";

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

const ACTION_LABEL: Record<OrderStatus, string> = {
  requested: "Reopen",
  approved: "Approve",
  in_progress: "Start work",
  fulfilled: "Mark fulfilled",
  rejected: "Reject",
  cancelled: "Cancel request",
};

export function AdminOrders() {
  const [filter, setFilter] = useState<Filter>("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminOrderRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<OrderCounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminOrderRequest | null>(null);
  const requestSeq = useRef(0);

  const loadCounts = useCallback(() => {
    adminOrderService.count().then(setCounts).catch(() => undefined);
  }, []);

  const load = useCallback(async () => {
    const seq = ++requestSeq.current;
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminOrderService.list({ status: filter, page, limit: LIMIT });
      if (seq !== requestSeq.current) return;
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      if (seq === requestSeq.current) setError(e instanceof Error ? e.message : "We could not load requests.");
    } finally {
      if (seq === requestSeq.current) setIsLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  function handleUpdated(updated: AdminOrderRequest) {
    setSelected(updated);
    setItems((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    loadCounts();
    // A status change can move the row out of the current filter.
    if (filter && updated.status !== filter) void load();
  }

  return (
    <div className="mx-auto flex max-w-[1480px] flex-col gap-5">
      <PageHeader description="Review domain and mailbox requests from every workspace, then approve and fulfil them." title="Orders" />

      <div aria-label="Filter by status" className="flex flex-wrap gap-1.5" role="tablist">
        {TABS.map((tab) => {
          const count = tab.countKey && counts ? counts[tab.countKey] : null;
          const active = filter === tab.id;
          return (
            <button
              aria-selected={active}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition ${
                active ? "border-foreground bg-foreground text-background" : "border-border/70 bg-surface text-foreground hover:bg-default-100"
              }`}
              key={tab.label}
              role="tab"
              type="button"
              onClick={() => {
                setFilter(tab.id);
                setPage(1);
              }}
            >
              {tab.label}
              {count !== null ? <span className={`text-[11px] ${active ? "opacity-80" : "text-muted"}`}>{count}</span> : null}
            </button>
          );
        })}
      </div>

      {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-border/70 text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Workspace</th>
                <th className="px-2 py-3 font-medium">Type</th>
                <th className="px-2 py-3 font-medium">Quantity</th>
                <th className="px-2 py-3 font-medium">Requested by</th>
                <th className="px-2 py-3 font-medium">Status</th>
                <th className="px-2 py-3 font-medium">Created</th>
                <th className="px-4 py-3 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow columns={7} key={i} />)
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-sm font-medium text-muted" colSpan={7}>
                    {filter ? `No ${ORDER_STATUS_LABEL[filter as OrderStatus].toLowerCase()} requests.` : "No requests yet."}
                  </td>
                </tr>
              ) : (
                items.map((order) => (
                  <tr className="border-b border-border/60 last:border-0" key={order.id}>
                    <td className="px-4 py-3">
                      <Link className="font-medium text-foreground hover:text-accent" to={`/admin/workspaces/${order.workspace.id}`}>
                        {order.workspace.name}
                      </Link>
                    </td>
                    <td className="px-2 py-3 capitalize">{order.type}</td>
                    <td className="px-2 py-3">{order.quantity}</td>
                    <td className="px-2 py-3">
                      <p className="text-foreground">{order.requested_by?.name || order.requested_by?.email || "-"}</p>
                      {order.requested_by?.name ? <p className="text-[12px] text-muted">{order.requested_by.email}</p> : null}
                    </td>
                    <td className="px-2 py-3">
                      <OrderStatusPill status={order.status} />
                    </td>
                    <td className="px-2 py-3 text-muted">{formatDateTime(order.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="secondary" onClick={() => setSelected(order)}>
                        Review
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination limit={LIMIT} page={page} total={total} onPage={setPage} />
      </div>

      <OrderDetailModal order={selected} onClose={() => setSelected(null)} onUpdated={handleUpdated} />
    </div>
  );
}

function OrderDetailModal({
  order,
  onClose,
  onUpdated,
}: {
  order: AdminOrderRequest | null;
  onClose: () => void;
  onUpdated: (order: AdminOrderRequest) => void;
}) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<OrderStatus | null>(null);
  const orderId = order?.id;
  const serverNotes = order?.admin_notes ?? "";

  useEffect(() => {
    setNotes(serverNotes);
    setError(null);
    setSaved(false);
    setConfirmStatus(null);
    // Reset only when a different order is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  async function apply(patch: { status?: OrderStatus; admin_notes?: string }) {
    if (!order) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await adminOrderService.update(order.id, patch);
      onUpdated({ ...order, ...updated, workspace: updated.workspace ?? order.workspace });
      if (patch.admin_notes !== undefined) setSaved(true);
      setConfirmStatus(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The request could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  const next = order ? ADMIN_TRANSITIONS[order.status] : [];
  const notesDirty = notes !== serverNotes;
  const destructive = (s: OrderStatus) => s === "rejected" || s === "cancelled";

  return (
    <>
      <AdminModal
        description={order ? `${order.workspace.name} · Request #${order.id}` : undefined}
        footer={
          <Button size="sm" variant="secondary" onClick={onClose}>
            Close
          </Button>
        }
        isOpen={order !== null && confirmStatus === null}
        title={order ? `${orderTitle(order)} requested` : "Request"}
        width={560}
        onClose={onClose}
      >
        {order ? (
          <div className="grid gap-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] text-muted">Status</span>
              <OrderStatusPill status={order.status} />
            </div>

            <OrderDetailsList order={order} />

            <div>
              <label className="text-sm font-medium text-foreground" htmlFor="admin-notes">
                Admin notes
              </label>
              <p className="text-[12px] text-muted">Visible to the workspace on their Orders page.</p>
              <textarea
                className="mt-1.5 min-h-[84px] w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
                id="admin-notes"
                maxLength={2000}
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setSaved(false);
                }}
              />
              <div className="mt-2 flex items-center gap-3">
                <Button isDisabled={busy || !notesDirty} size="sm" variant="secondary" onClick={() => void apply({ admin_notes: notes })}>
                  Save notes
                </Button>
                {saved ? <span className="text-[12px] text-success" role="status">Saved</span> : null}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-foreground">Move this request forward</p>
              {next.length === 0 ? (
                <p className="mt-1 text-[13px] text-muted">This request is {ORDER_STATUS_LABEL[order.status].toLowerCase()} and cannot change further.</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {next.map((status) => (
                    <Button
                      isDisabled={busy}
                      key={status}
                      size="sm"
                      variant={destructive(status) ? "danger" : "primary"}
                      onClick={() => (destructive(status) ? setConfirmStatus(status) : void apply({ status, ...(notesDirty ? { admin_notes: notes } : {}) }))}
                    >
                      {ACTION_LABEL[status]}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {error ? <ErrorBanner message={error} /> : null}

            <AssignDomainsPanel
              linkable={!["fulfilled", "rejected", "cancelled"].includes(order.status)}
              orderId={order.id}
              workspaceId={order.workspace.id}
              workspaceName={order.workspace.name}
            />
          </div>
        ) : null}
      </AdminModal>

      <ConfirmDialog
        confirmLabel={confirmStatus ? ACTION_LABEL[confirmStatus] : "Confirm"}
        description={
          confirmStatus && order
            ? `${ACTION_LABEL[confirmStatus]} for request #${order.id}? The workspace will see the new status${notes.trim() ? " and your notes" : ""}. This cannot be undone.`
            : undefined
        }
        error={error}
        isBusy={busy}
        isOpen={confirmStatus !== null}
        title={confirmStatus === "rejected" ? "Reject this request?" : "Cancel this request?"}
        tone="danger"
        onClose={() => setConfirmStatus(null)}
        onConfirm={() => confirmStatus && void apply({ status: confirmStatus, ...(notesDirty ? { admin_notes: notes } : {}) })}
      />
    </>
  );
}
