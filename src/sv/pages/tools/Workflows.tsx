import { Copy, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WorkflowProblemsError, errorMessage, workflowApi, type TriggerType, type WorkflowSummary } from "../../../services/workflowApi";
import { useSvTitle } from "../../layout/chrome";
import { svPath } from "../../nav";
import { Badge, Button, Card, EmptyState, Modal, PageHeader, SkeletonCard } from "../../ui";
import { BuiltInFlows } from "./workflow/BuiltInFlows";
import { Switch } from "./workflow/Form";
import { NewWorkflowModal, type WorkflowTemplate } from "./workflow/NewWorkflowModal";
import { formatWhen, statusTone } from "./workflow/runUi";
import { useWorkflowAccess } from "./workflow/useWorkflowAccess";
import "./workflow/workflow.css";

const TRIGGER_LABEL: Record<TriggerType, string> = {
  "trigger.plusvibe_reply": "PlusVibe reply",
  "trigger.inbox_mail": "Inbox mail",
  "trigger.mail_sent": "Mail sent",
};

function scopeLabel(item: WorkflowSummary) {
  const noun = item.trigger_type === "trigger.plusvibe_reply" ? "campaigns" : "mailboxes";
  return item.trigger_scope === "all" ? `All ${noun}` : `Specific ${noun}`;
}

const ORDINALS = ["1st", "2nd", "3rd"];
const ordinal = (n: number) => ORDINALS[n - 1] ?? `${n}th`;

function overlaps(a: WorkflowSummary, b: WorkflowSummary) {
  if (a.trigger_type !== b.trigger_type) return false;
  const ta = a.trigger_targets;
  const tb = b.trigger_targets;
  if (ta === "all" || tb === "all" || ta == null || tb == null) return true;
  const set = new Set(tb.map(String));
  return ta.some((v) => set.has(String(v)));
}

const specificity = (w: WorkflowSummary) => (w.trigger_targets === "all" ? 0 : 1);

/**
 * For each active workflow that shares scope with other active ones (same trigger, same campaign/mailbox or "all"):
 * its place in the run order (priority, then more specific scope first, then id) and how many run together.
 */
function runOrderOf(items: WorkflowSummary[]) {
  const active = items.filter((w) => w.is_active && w.trigger_type);
  const result = new Map<number, { position: number; total: number }>();
  for (const w of active) {
    const group = active.filter((o) => o.id === w.id || overlaps(w, o));
    if (group.length < 2) continue;
    const before = group.filter((o) => o.id !== w.id && (
      (o.priority ?? 100) - (w.priority ?? 100) || specificity(w) - specificity(o) || o.id - w.id
    ) < 0).length;
    result.set(w.id, { position: before + 1, total: group.length });
  }
  return result;
}

export function Workflows() {
  useSvTitle([{ label: "Workflows" }]);
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
  const [newOpen, setNewOpen] = useState<{ template: boolean } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkflowSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const runOrder = useMemo(() => runOrderOf(items), [items]);
  const open = (id: number) => navigate(svPath(`workflows/${id}`));

  async function create(name: string, template: WorkflowTemplate, trigger: "inbox_mail" | "plusvibe_reply") {
    setCreating(true);
    setCreateError(null);
    try {
      const wf = await workflowApi.create({ name, ...(template ? { template } : {}), ...(template === "book_meetings" ? { trigger } : {}) });
      setNewOpen(null);
      open(wf.id);
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
      setDeleteTarget(null);
      await load();
    } catch (e) {
      setDeleteTarget(null);
      setError(errorMessage(e, "Unable to delete the workflow"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="sv-page">
      <PageHeader
        title="Workflows"
        subtitle="How this workspace handles incoming replies, step by step."
        actions={canWrite ? <Button variant="primary" icon={Plus} onClick={() => { setCreateError(null); setNewOpen({ template: false }); }}>New workflow</Button> : undefined}
      />

      <p className="wf-note is-muted wf-small-only">Editing a workflow needs a larger screen. You can still review and switch workflows on or off here.</p>

      {error ? (
        <p className="sv-banner is-error wf-banner" role="alert">
          <span>{error}</span>
          <Button size="sm" onClick={() => void load()}>Retry</Button>
        </p>
      ) : null}
      {notice ? <p className="sv-banner is-ok wf-banner" role="status">{notice}</p> : null}

      <div className="wf-stack is-loose">
        {!loading && runOrder.size > 0 ? (
          <p className="wf-note is-muted" role="note">
            Several workflows can run for the same campaign. They run in order; the first one that writes a reply handles it, the rest only do non-reply steps like notifications.
          </p>
        ) : null}

        {!loading && !error ? <BuiltInFlows items={items} plusvibeConnected={plusvibeConnected} /> : null}

        {loading ? (
          <div className="wf-grid">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} lines={3} />)}</div>
        ) : items.length === 0 && !error ? (
          <EmptyState
            title="No workflows yet"
            body="A workflow decides what happens when a reply arrives: save it, let an AI agent draft an answer, then send it through PlusVibe or one of your mailboxes. Most workspaces only need one, and you can start from a ready-made version."
            action={canWrite ? (
              <span className="sv-actions">
                <Button variant="primary" onClick={() => { setCreateError(null); setNewOpen({ template: true }); }}>Start from the default reply</Button>
                <Button onClick={() => { setCreateError(null); setNewOpen({ template: false }); }}>Blank workflow</Button>
              </span>
            ) : undefined}
          />
        ) : (
          <div className="wf-grid">
            {items.map((item) => (
              <Card className="wf-card" key={item.id}>
                <div className="wf-row">
                  <button type="button" className="wf-card-open" onClick={() => open(item.id)}>
                    <span className="wf-title wf-ellipsis">{item.name}</span>
                    <span className="wf-hint wf-clamp">{item.description || `${item.node_count} nodes`}</span>
                  </button>
                  <Switch label={`${item.name} active`} disabled={!canWrite || busyId === item.id} checked={item.is_active} onChange={(v) => void toggle(item, v)} />
                </div>
                <div className="wf-meta">
                  <Badge tone={item.is_active ? "green" : "neutral"}>{item.is_active ? "Active" : "Inactive"}</Badge>
                  {runOrder.has(item.id) ? <Badge tone="blue">Runs {ordinal(runOrder.get(item.id)!.position)} of {runOrder.get(item.id)!.total}</Badge> : null}
                  {item.trigger_type ? <span>{TRIGGER_LABEL[item.trigger_type]}{item.trigger_scope ? ` · ${scopeLabel(item)}` : ""} ·</span> : null}
                  <span>{item.node_count} nodes ·</span>
                  {item.last_run ? <span className="wf-iconline">Last run <Badge tone={statusTone(item.last_run.status)}>{item.last_run.status}</Badge> {formatWhen(item.last_run.started_at)}</span> : <span>Never run</span>}
                </div>
                <div className="wf-card-foot">
                  <Button size="sm" onClick={() => open(item.id)}>{canWrite ? "Open editor" : "View"}</Button>
                  {canWrite ? (
                    <span className="sv-actions">
                      <button type="button" className="sv-icon-btn" aria-label={`Duplicate ${item.name}`} disabled={busyId === item.id} onClick={() => void duplicate(item)}><Copy className="sv-icon" aria-hidden /></button>
                      <button type="button" className="sv-icon-btn wf-danger" aria-label={`Delete ${item.name}`} onClick={() => setDeleteTarget(item)}><Trash2 className="sv-icon" aria-hidden /></button>
                    </span>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {newOpen ? (
        <NewWorkflowModal error={createError} initialTemplate={newOpen.template} isCreating={creating} onClose={() => setNewOpen(null)} onCreate={(n, t, tr) => void create(n, t, tr)} plusvibeConnected={plusvibeConnected} />
      ) : null}

      <Modal
        open={deleteTarget !== null}
        title="Delete workflow?"
        onClose={() => setDeleteTarget(null)}
        footer={<><Button disabled={deleting} onClick={() => setDeleteTarget(null)}>Cancel</Button><Button variant="danger" icon={Trash2} disabled={deleting} onClick={() => void confirmDelete()}>{deleting ? "Deleting…" : "Delete"}</Button></>}
      >
        <p style={{ margin: 0 }}>
          Delete <strong>{deleteTarget?.name}</strong>? {deleteTarget?.is_active ? "It is active, so incoming replies will go back to the default handling. " : ""}This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

