import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Tooltip } from "@heroui/react";
import { ShieldCheck, ShieldOff, UserCheck, UserX } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { adminApi, errorMessage, type AdminUser } from "../../services/adminApi";
import { ConfirmDialog, ErrorBanner } from "../../components/admin/AdminModal";
import { PageHeader, Pagination, SearchBox, formatDate, fullName, useDebounced } from "../../components/admin/AdminBits";
import { StatusPill } from "../../components/ui/StatusPill";
import { SkeletonRow } from "../../components/ui/Skeleton";

const LIMIT = 20;

type Pending = { user: AdminUser; kind: "admin" | "active" };

export function AdminUsers() {
  const { user: me } = useAuth();
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await adminApi.listUsers({ search: debounced.trim(), page, limit: LIMIT });
      setItems(result.items);
      setTotal(result.total);
    } catch (e) {
      setError(errorMessage(e, "Unable to load users."));
    } finally {
      setIsLoading(false);
    }
  }, [debounced, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debounced]);

  async function confirm() {
    if (!pending) return;
    setIsBusy(true);
    setActionError(null);
    try {
      const { user, kind } = pending;
      await adminApi.updateUser(user.id, kind === "admin" ? { is_super_admin: !user.is_super_admin } : { is_deleted: !user.is_deleted });
      setPending(null);
      await load();
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setIsBusy(false);
    }
  }

  function open(user: AdminUser, kind: Pending["kind"]) {
    setActionError(null);
    setPending({ user, kind });
  }

  const label = pending ? fullName(pending.user.first_name, pending.user.last_name) || pending.user.email : "";
  const copy = (() => {
    if (!pending) return { title: "", text: "", cta: "", danger: false };
    if (pending.kind === "admin") {
      return pending.user.is_super_admin
        ? { title: "Remove super admin?", text: `${label} will lose access to the admin portal.`, cta: "Remove super admin", danger: true }
        : { title: "Make super admin?", text: `${label} will be able to manage every workspace and user on the platform.`, cta: "Make super admin", danger: false };
    }
    return pending.user.is_deleted
      ? { title: "Reactivate user?", text: `${label} will be able to sign in again.`, cta: "Reactivate", danger: false }
      : { title: "Deactivate user?", text: `${label} will no longer be able to sign in.`, cta: "Deactivate", danger: true };
  })();

  return (
    <div className="mx-auto flex max-w-[1480px] flex-col gap-5">
      <PageHeader description="Every account on the platform and the workspaces they belong to." title="Users" />

      {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-surface">
        <div className="border-b border-border/70 px-4 py-3">
          <SearchBox placeholder="Search by name or email" value={search} onChange={setSearch} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-border/70 text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-2 py-3 font-medium">Workspaces</th>
                <th className="px-2 py-3 font-medium">Flags</th>
                <th className="px-2 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow columns={5} key={i} />)
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-sm font-medium text-muted" colSpan={5}>
                    {search ? "No users match your search." : "No users yet."}
                  </td>
                </tr>
              ) : (
                items.map((u) => {
                  const isSelf = me?.id === u.id;
                  const selfTip = "You cannot change your own account here.";
                  return (
                    <tr className={`border-b border-border/60 last:border-0 ${u.is_deleted ? "opacity-70" : ""}`} key={u.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{fullName(u.first_name, u.last_name) || u.email}</p>
                        {fullName(u.first_name, u.last_name) ? <p className="text-[12px] text-muted">{u.email}</p> : null}
                      </td>
                      <td className="px-2 py-3">
                        {u.workspaces.length === 0 ? (
                          <span className="text-muted">None</span>
                        ) : (
                          <div className="flex flex-wrap gap-x-3 gap-y-1">
                            {u.workspaces.map((w) => (
                              <span className="text-[13px]" key={w.id}>
                                <Link className="text-foreground hover:text-accent" to={`/admin/workspaces/${w.id}`}>{w.name}</Link>
                                <span className="text-muted"> ({w.role})</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex flex-wrap gap-1">
                          {u.is_super_admin ? <StatusPill tone="accent">Super admin</StatusPill> : null}
                          {u.is_deleted ? <StatusPill tone="danger">Deactivated</StatusPill> : null}
                          {isSelf ? <StatusPill>You</StatusPill> : null}
                        </div>
                      </td>
                      <td className="px-2 py-3 text-muted">{formatDate(u.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <GuardedButton disabled={isSelf && u.is_super_admin} reason={selfTip} onPress={() => open(u, "admin")}>
                            {u.is_super_admin ? <ShieldOff className="size-4" /> : <ShieldCheck className="size-4" />}
                            {u.is_super_admin ? "Remove super admin" : "Make super admin"}
                          </GuardedButton>
                          <GuardedButton disabled={isSelf && !u.is_deleted} reason={selfTip} onPress={() => open(u, "active")}>
                            {u.is_deleted ? <UserCheck className="size-4" /> : <UserX className="size-4" />}
                            {u.is_deleted ? "Reactivate" : "Deactivate"}
                          </GuardedButton>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination limit={LIMIT} page={page} total={total} onPage={setPage} />
      </div>

      <ConfirmDialog
        confirmLabel={copy.cta}
        description={copy.text}
        error={actionError}
        isBusy={isBusy}
        isOpen={pending !== null}
        title={copy.title}
        tone={copy.danger ? "danger" : "primary"}
        onClose={() => setPending(null)}
        onConfirm={() => void confirm()}
      />
    </div>
  );
}

function GuardedButton({ disabled, reason, onPress, children }: { disabled: boolean; reason: string; onPress: () => void; children: React.ReactNode }) {
  const button = (
    <Button isDisabled={disabled} size="sm" variant="secondary" onClick={onPress}>
      {children}
    </Button>
  );
  if (!disabled) return button;
  return (
    <Tooltip delay={200}>
      <Tooltip.Trigger>
        <span className="inline-flex">{button}</span>
      </Tooltip.Trigger>
      <Tooltip.Content>{reason}</Tooltip.Content>
    </Tooltip>
  );
}
