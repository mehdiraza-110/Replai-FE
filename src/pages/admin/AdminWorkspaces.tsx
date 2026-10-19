import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@heroui/react";
import { Eye, Pause, Play, Plus } from "lucide-react";
import { adminApi, errorMessage, type AdminWorkspace, type WorkspaceType } from "../../services/adminApi";
import { setViewAs } from "../../utils/viewAs";
import { AdminModal, ConfirmDialog, ErrorBanner } from "../../components/admin/AdminModal";
import { Field, PageHeader, Pagination, SearchBox, formatDate, inputClass, useDebounced } from "../../components/admin/AdminBits";
import { ProductPills, WorkspaceStatusPill, WorkspaceTypePill } from "../../components/admin/WorkspaceStatusPill";
import { SkeletonRow } from "../../components/ui/Skeleton";

const LIMIT = 20;

export function AdminWorkspaces() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const [status, setStatus] = useState<"" | "active" | "suspended">("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminWorkspace[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [target, setTarget] = useState<AdminWorkspace | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await adminApi.listWorkspaces({ search: debounced.trim(), status, page, limit: LIMIT });
      setItems(result.items);
      setTotal(result.total);
    } catch (e) {
      setError(errorMessage(e, "Unable to load workspaces."));
    } finally {
      setIsLoading(false);
    }
  }, [debounced, status, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debounced, status]);

  function viewAs(w: AdminWorkspace) {
    setViewAs({ id: w.id, name: w.name });
    navigate("/");
  }

  async function toggleStatus() {
    if (!target) return;
    setIsBusy(true);
    setActionError(null);
    try {
      await adminApi.updateWorkspace(target.id, { status: target.status === "active" ? "suspended" : "active" });
      setTarget(null);
      await load();
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setIsBusy(false);
    }
  }

  const suspending = target?.status === "active";

  return (
    <div className="mx-auto flex max-w-[1480px] flex-col gap-5">
      <PageHeader
        actions={
          <Button size="sm" variant="primary" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Create workspace
          </Button>
        }
        description="Every tenant on the platform. Suspended workspaces cannot sign in or send."
        title="Workspaces"
      />

      {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-surface">
        <div className="flex flex-wrap items-center gap-3 border-b border-border/70 px-4 py-3">
          <SearchBox placeholder="Search by name or slug" value={search} onChange={setSearch} />
          <select
            aria-label="Filter by status"
            className={`${inputClass} w-auto`}
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-border/70 text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Workspace</th>
                <th className="px-2 py-3 font-medium">Type</th>
                <th className="px-2 py-3 font-medium">Status</th>
                <th className="px-2 py-3 font-medium">Owner</th>
                <th className="px-2 py-3 font-medium">Members</th>
                <th className="px-2 py-3 font-medium">Products</th>
                <th className="px-2 py-3 font-medium">Created</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow columns={8} key={i} />)
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-sm font-medium text-muted" colSpan={8}>
                    {search || status ? "No workspaces match your filters." : "No workspaces yet. Create the first one."}
                  </td>
                </tr>
              ) : (
                items.map((w) => (
                  <tr className="border-b border-border/60 last:border-0" key={w.id}>
                    <td className="px-4 py-3">
                      <Link className="font-medium text-foreground hover:text-accent" to={`/admin/workspaces/${w.id}`}>
                        {w.name}
                      </Link>
                      <p className="text-[12px] text-muted">{w.slug}</p>
                    </td>
                    <td className="px-2 py-3"><WorkspaceTypePill type={w.type} /></td>
                    <td className="px-2 py-3"><WorkspaceStatusPill status={w.status} /></td>
                    <td className="px-2 py-3">
                      {w.owner ? (
                        <>
                          <p className="text-foreground">{w.owner.name || w.owner.email}</p>
                          {w.owner.name ? <p className="text-[12px] text-muted">{w.owner.email}</p> : null}
                        </>
                      ) : (
                        <span className="text-muted">No owner</span>
                      )}
                    </td>
                    <td className="px-2 py-3 tabular-nums">{w.member_count}</td>
                    <td className="px-2 py-3"><ProductPills autoResponder={w.auto_responder_enabled} coldMailer={w.cold_mailer_enabled} /></td>
                    <td className="px-2 py-3 text-muted">{formatDate(w.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/workspaces/${w.id}`)}>Open</Button>
                        <Button size="sm" variant="secondary" onClick={() => viewAs(w)}>
                          <Eye className="size-4" />
                          View as
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setActionError(null);
                            setTarget(w);
                          }}
                        >
                          {w.status === "active" ? <Pause className="size-4" /> : <Play className="size-4" />}
                          {w.status === "active" ? "Suspend" : "Reactivate"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination limit={LIMIT} page={page} total={total} onPage={setPage} />
      </div>

      <ConfirmDialog
        confirmLabel={suspending ? "Suspend workspace" : "Reactivate workspace"}
        description={
          suspending
            ? `Suspend ${target?.name}? Its members will be blocked until it is reactivated.`
            : `Reactivate ${target?.name}? Its members will regain access.`
        }
        error={actionError}
        isBusy={isBusy}
        isOpen={target !== null}
        title={suspending ? "Suspend workspace?" : "Reactivate workspace?"}
        tone={suspending ? "danger" : "primary"}
        onClose={() => setTarget(null)}
        onConfirm={() => void toggleStatus()}
      />

      <CreateWorkspaceModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(w) => {
          setCreateOpen(false);
          navigate(`/admin/workspaces/${w.id}`);
        }}
      />
    </div>
  );
}

function CreateWorkspaceModal({ isOpen, onClose, onCreated }: { isOpen: boolean; onClose: () => void; onCreated: (w: AdminWorkspace) => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<WorkspaceType>("organization");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [errors, setErrors] = useState<{ name?: string; ownerEmail?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setType("organization");
      setOwnerEmail("");
      setErrors({});
      setServerError(null);
    }
  }, [isOpen]);

  async function submit() {
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Enter a workspace name.";
    if (!/^\S+@\S+\.\S+$/.test(ownerEmail.trim())) next.ownerEmail = "Enter a valid owner email.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setIsBusy(true);
    setServerError(null);
    try {
      onCreated(await adminApi.createWorkspace({ name: name.trim(), type, ownerEmail: ownerEmail.trim() }));
    } catch (e) {
      setServerError(errorMessage(e));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <AdminModal
      description="The owner must already have an account."
      footer={
        <>
          <Button isDisabled={isBusy} size="sm" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button isDisabled={isBusy} size="sm" variant="primary" onClick={() => void submit()}>
            {isBusy ? "Creating..." : "Create workspace"}
          </Button>
        </>
      }
      isOpen={isOpen}
      title="Create workspace"
      onClose={onClose}
    >
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Field error={errors.name} label="Name">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Type">
          <select className={inputClass} value={type} onChange={(e) => setType(e.target.value as WorkspaceType)}>
            <option value="organization">Organization</option>
            <option value="individual">Individual</option>
          </select>
        </Field>
        <Field error={errors.ownerEmail} label="Owner email">
          <input className={inputClass} type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
        </Field>
        {serverError ? <ErrorBanner message={serverError} /> : null}
      </form>
    </AdminModal>
  );
}
