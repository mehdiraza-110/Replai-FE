import { Button } from "@heroui/react";
import { ChevronDown, PackageOpen, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog, ErrorBanner } from "../components/admin/AdminModal";
import { PageHeader } from "../components/admin/AdminBits";
import { NewOrderModal } from "../components/orders/NewOrderModal";
import { OrderDetailsList, OrderStatusPill, formatDateTime, orderTitle } from "../components/orders/shared";
import { Skeleton } from "../components/ui/Skeleton";
import { useAuth } from "../context/AuthContext";
import { orderService, type OrderRequest } from "../services/orderApi";

const MAX_OPEN = 10;

export function Orders() {
  const { activeWorkspace } = useAuth();
  const canManage = activeWorkspace ? activeWorkspace.role !== "member" : true;
  const [orders, setOrders] = useState<OrderRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [cancelTarget, setCancelTarget] = useState<OrderRequest | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setOrders(await orderService.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : "We could not load your requests.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCount = orders.filter((o) => ["requested", "approved", "in_progress"].includes(o.status)).length;

  async function confirmCancel() {
    if (!cancelTarget) return;
    setIsCancelling(true);
    setCancelError(null);
    try {
      const updated = await orderService.cancel(cancelTarget.id);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      setCancelTarget(null);
      setNotice("Your request was cancelled.");
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : "We could not cancel this request.");
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-5">
      <PageHeader
        actions={
          canManage ? (
            <Button size="sm" onClick={() => setIsModalOpen(true)}>
              <Plus className="size-4" />
              New request
            </Button>
          ) : null
        }
        description="Request domains or mailboxes. Our team provisions them and they appear in your workspace."
        title="Orders"
      />

      {!canManage ? (
        <div className="rounded-xl border border-border/70 bg-default-100 px-4 py-3 text-[13px] text-foreground" role="note">
          You can view requests but not create or cancel them. Only workspace owners and admins can order. Ask one of them if you need something provisioned.
        </div>
      ) : openCount >= MAX_OPEN ? (
        <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-[13px] text-foreground" role="note">
          You have {openCount} open requests, which is the maximum. Wait for some to be fulfilled or cancel one before submitting another.
        </div>
      ) : null}

      {notice ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-foreground" role="status">
          {notice}
          <Button size="sm" variant="secondary" onClick={() => setNotice(null)}>
            Dismiss
          </Button>
        </div>
      ) : null}

      {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-surface">
        <div className="border-b border-border/70 px-4 py-3">
          <h2 className="text-base font-semibold text-foreground">Your requests</h2>
          <p className="text-[13px] text-muted">
            {isLoading ? "Loading..." : `${orders.length} ${orders.length === 1 ? "request" : "requests"}, ${openCount} open.`}
          </p>
        </div>

        {isLoading ? (
          <ul>
            {Array.from({ length: 4 }).map((_, i) => (
              <li className="flex items-center gap-4 border-b border-border/60 px-4 py-4 last:border-0" key={i}>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="ml-auto h-4 w-28" />
              </li>
            ))}
          </ul>
        ) : orders.length === 0 && !error ? (
          <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
            <PackageOpen className="size-8 text-muted" />
            <p className="text-sm font-medium text-foreground">No requests yet</p>
            <p className="max-w-sm text-[13px] text-muted">
              {canManage
                ? "Submit a request when you need more domains or mailboxes. You can follow its progress here."
                : "Requests made by your workspace owners and admins will appear here."}
            </p>
            {canManage ? (
              <Button className="mt-2" size="sm" onClick={() => setIsModalOpen(true)}>
                <Plus className="size-4" />
                New request
              </Button>
            ) : null}
          </div>
        ) : (
          <ul>
            {orders.map((order) => {
              const isOpen = expanded === order.id;
              const canCancel = canManage && (order.status === "requested" || order.status === "approved");
              return (
                <li className="border-b border-border/60 last:border-0" key={order.id}>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                    <button
                      aria-controls={`order-${order.id}`}
                      aria-expanded={isOpen}
                      className="flex min-w-0 flex-1 basis-60 items-center gap-3 text-left"
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : order.id)}
                    >
                      <ChevronDown className={`size-4 shrink-0 text-muted transition ${isOpen ? "rotate-180" : ""}`} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {orderTitle(order)}
                        </span>
                        <span className="block text-[12px] text-muted">
                          Request #{order.id} · {formatDateTime(order.created_at)}
                        </span>
                      </span>
                    </button>
                    <OrderStatusPill status={order.status} />
                    {canCancel ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setCancelError(null);
                          setCancelTarget(order);
                        }}
                      >
                        Cancel
                      </Button>
                    ) : null}
                  </div>

                  {isOpen ? (
                    <div className="grid gap-4 border-t border-border/60 bg-default-50 px-4 py-4 pl-11" id={`order-${order.id}`}>
                      <OrderDetailsList order={order} />
                      {order.admin_notes ? (
                        <div className="rounded-xl border border-border/70 bg-surface px-3 py-2.5">
                          <p className="text-[12px] font-medium text-muted">Note from our team</p>
                          <p className="mt-1 whitespace-pre-wrap text-[13px] text-foreground">{order.admin_notes}</p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <NewOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={(created) => {
          setOrders((prev) => [created, ...prev]);
          setIsModalOpen(false);
          setNotice("Request submitted. We will review it shortly.");
        }}
      />

      <ConfirmDialog
        confirmLabel="Cancel request"
        description={cancelTarget ? `Cancel request #${cancelTarget.id} (${orderTitle(cancelTarget)})? This cannot be undone.` : undefined}
        error={cancelError}
        isBusy={isCancelling}
        isOpen={cancelTarget !== null}
        title="Cancel this request?"
        tone="danger"
        onClose={() => setCancelTarget(null)}
        onConfirm={() => void confirmCancel()}
      />
    </div>
  );
}
