import { Button, Chip, Modal, Spinner, Switch, useOverlayState } from "@heroui/react";
import { Copy, Plus, Trash2, Workflow as WorkflowIcon, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BuiltInFlows } from "../../components/workflows/BuiltInFlows";
import { NewWorkflowModal } from "../../components/workflows/NewWorkflowModal";
import { formatWhen, statusTone } from "../../components/workflows/runUi";
import { useWorkflowAccess } from "../../components/workflows/useWorkflowAccess";
import { Skeleton } from "../../components/ui/Skeleton";
import { WorkflowProblemsError, errorMessage, workflowApi, type WorkflowSummary } from "../../services/workflowApi";

export function Workflows() {
  const navigate = useNavigate();
  const { canWrite } = useWorkflowAccess();
  const [items, setItems] = useState<WorkflowSummary[]>([]);
  const [plusvibeConnected, setPlusvibeConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [templateDefault, setTemplateDefault] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<WorkflowSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const newModal = useOverlayState({});
  const deleteModal = useOverlayState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, meta] = await Promise.all([workflowApi.list(), workflowApi.meta().catch(() => null)]);
      setItems(list);
      setPlusvibeConnected(Boolean(meta?.plusvibeConnected));
    } catch (e) {
      setError(errorMessage(e, "Unable to load workflows"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openNew(template: boolean) {
    setTemplateDefault(template);
    setCreateError(null);
    newModal.open();
  }

  async function create(name: string, template: boolean) {
    setCreating(true);
    setCreateError(null);
    try {
      const wf = await workflowApi.create({ name, ...(template ? { template: "default_reply" as const } : {}) });
      newModal.close();
      navigate(`/workflows/${wf.id}`);
    } catch (e) {
      setCreateError(errorMessage(e, "Unable to create the workflow"));
    } finally {
      setCreating(false);
    }
  }

  async function toggle(item: WorkflowSummary, next: boolean) {
    setBusyId(item.id);
    setNotice(null);
    setError(null);
    try {
      await workflowApi.update(item.id, { is_active: next });
      setItems((cur) => cur.map((w) => (w.id === item.id ? { ...w, is_active: next } : w)));
    } catch (e) {
      if (e instanceof WorkflowProblemsError) {
        setError(`${item.name} could not be activated: ${e.problems.map((p) => p.message).join(" ")}`);
      } else {
        setError(errorMessage(e, "Unable to change the workflow"));
      }
    } finally {
      setBusyId(null);
    }
  }

  async function duplicate(item: WorkflowSummary) {
    setBusyId(item.id);
    setError(null);
    try {
      const source = await workflowApi.get(item.id);
      const copy = await workflowApi.create({ name: `${item.name} (copy)`, description: item.description ?? undefined });
      await workflowApi.update(copy.id, { graph: source.graph });
      await load();
      setNotice(`Created ${item.name} (copy), inactive.`);
    } catch (e) {
      setError(errorMessage(e, "Unable to duplicate the workflow"));
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await workflowApi.remove(deleteTarget.id);
      deleteModal.close();
      setDeleteTarget(null);
      await load();
    } catch (e) {
      deleteModal.close();
      setError(errorMessage(e, "Unable to delete the workflow"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Workflows</h2>
          <p className="text-[13px] text-muted">How this workspace handles incoming replies, step by step.</p>
        </div>
        {canWrite ? (
          <Button onPress={() => openNew(false)} size="sm"><Plus className="size-4" />New workflow</Button>
        ) : null}
      </div>

      <p className="rounded-xl border border-border/70 bg-surface px-3 py-2 text-[12px] text-muted lg:hidden">
        Editing a workflow needs a larger screen. You can still review and switch workflows on or off here.
      </p>

      {error ? (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
          <span>{error}</span>
          <Button onPress={() => void load()} size="sm" variant="secondary">Retry</Button>
        </div>
      ) : null}
      {notice ? <p className="rounded-2xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-success" role="status">{notice}</p> : null}

      {!loading && !error ? <BuiltInFlows items={items} plusvibeConnected={plusvibeConnected} /> : null}

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton className="h-36 rounded-2xl" key={i} />)}
        </div>
      ) : items.length === 0 && !error ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-14 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-full bg-accent/10 text-accent"><WorkflowIcon className="size-5" /></span>
          <h3 className="mt-3 text-[15px] font-semibold text-foreground">No workflows yet</h3>
          <p className="mx-auto mt-1 max-w-md text-[13px] leading-5 text-muted">
            A workflow decides what happens when a reply arrives: save it, let an AI agent draft an answer, then send it through PlusVibe or one of your mailboxes. Most workspaces only need one, and you can start from a ready-made version.
          </p>
          {canWrite ? (
            <div className="mt-4 flex justify-center gap-2">
              <Button onPress={() => openNew(true)} size="sm">Start from the default reply</Button>
              <Button onPress={() => openNew(false)} size="sm" variant="secondary">Blank workflow</Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <article className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-surface p-4 transition hover:border-foreground/25" key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <button className="min-w-0 text-left focus-visible:outline-2 focus-visible:outline-accent" onClick={() => navigate(`/workflows/${item.id}`)} type="button">
                  <h3 className="truncate text-[14px] font-semibold text-foreground hover:underline">{item.name}</h3>
                  <p className="mt-0.5 line-clamp-2 text-[12px] text-muted">{item.description || `${item.node_count} nodes`}</p>
                </button>
                <Switch aria-label={`${item.name} active`} isDisabled={!canWrite || busyId === item.id} isSelected={item.is_active} onChange={(v) => void toggle(item, v)}>
                  <Switch.Content><Switch.Control><Switch.Thumb /></Switch.Control></Switch.Content>
                </Switch>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted">
                <Chip color={item.is_active ? "success" : "default"} size="sm" variant="soft">{item.is_active ? "Active" : "Inactive"}</Chip>
                <span>{item.node_count} nodes</span>
                <span aria-hidden>·</span>
                {item.last_run ? (
                  <span className="flex items-center gap-1.5">
                    Last run <Chip color={statusTone(item.last_run.status)} size="sm" variant="soft">{item.last_run.status}</Chip> {formatWhen(item.last_run.started_at)}
                  </span>
                ) : <span>Never run</span>}
              </div>
              <div className="flex items-center justify-between border-t border-border/60 pt-3">
                <Button onPress={() => navigate(`/workflows/${item.id}`)} size="sm" variant="secondary">{canWrite ? "Open editor" : "View"}</Button>
                {canWrite ? (
                  <div className="flex items-center gap-1">
                    <button aria-label={`Duplicate ${item.name}`} className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-surface-secondary hover:text-foreground disabled:opacity-40" disabled={busyId === item.id} onClick={() => void duplicate(item)} type="button">
                      {busyId === item.id ? <Spinner color="current" size="sm" /> : <Copy className="size-4" />}
                    </button>
                    <button aria-label={`Delete ${item.name}`} className="grid size-8 place-items-center rounded-full text-danger transition hover:bg-danger/10" onClick={() => { setDeleteTarget(item); deleteModal.open(); }} type="button">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      <NewWorkflowModal error={createError} initialTemplate={templateDefault} isCreating={creating} key={String(templateDefault) + String(newModal.isOpen)} onCreate={(n, t) => void create(n, t)} state={newModal} />

      <Modal state={deleteModal}>
        <Modal.Backdrop className="bg-foreground/30 backdrop-blur-[2px]">
          <Modal.Container className="w-[min(440px,calc(100vw-32px))]" placement="center" size="md">
            <Modal.Dialog className="overflow-hidden rounded-[20px] border border-border/70 bg-surface shadow-[0_8px_30px_color-mix(in_oklch,var(--foreground)_18%,transparent)]">
              <Modal.Header className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4">
                <Modal.Heading className="text-base font-semibold text-foreground">Delete workflow?</Modal.Heading>
                <Modal.CloseTrigger aria-label="Close" className="grid size-8 shrink-0 place-items-center rounded-full bg-default-100 text-foreground hover:bg-default-200"><X className="size-4" /></Modal.CloseTrigger>
              </Modal.Header>
              <Modal.Body className="px-5 py-5 text-sm leading-6 text-foreground">
                Delete <span className="font-semibold">{deleteTarget?.name}</span>? {deleteTarget?.is_active ? "It is active, so incoming replies will go back to the default handling. " : ""}This cannot be undone.
              </Modal.Body>
              <Modal.Footer className="flex justify-end gap-2 border-t border-border/70 px-5 py-4">
                <Button isDisabled={deleting} onClick={deleteModal.close} size="sm" variant="secondary">Cancel</Button>
                <Button isDisabled={deleting} onClick={() => void confirmDelete()} size="sm" variant="danger">
                  <Trash2 className="size-4" />{deleting ? "Deleting..." : "Delete"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
