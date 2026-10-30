import { useEffect, useState } from "react";
import { errorMessage, workflowApi, type Run } from "../../../../services/workflowApi";
import { Badge, SkeletonCard } from "../../../ui";
import { Drawer } from "./Drawer";
import { StepTrace } from "./StepTrace";
import { formatWhen, statusTone } from "./runUi";

export function RunsDrawer({ workflowId, isOpen, onClose, nodeLabels, onShow }: { workflowId: number; isOpen: boolean; onClose: () => void; nodeLabels: Record<string, string>; onShow: (run: Run) => void }) {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    workflowApi.runs(workflowId, 20)
      .then(setRuns)
      .catch((e) => setError(errorMessage(e, "Unable to load runs")))
      .finally(() => setLoading(false));
  }, [isOpen, workflowId]);

  return (
    <Drawer isOpen={isOpen} onClose={onClose} subtitle="The 20 most recent runs, live and test." title="Run history">
      {loading ? <div style={{ display: "grid", gap: 12 }}>{[0, 1, 2, 3].map((i) => <SkeletonCard key={i} lines={2} />)}</div> : null}
      {error ? <p className="sv-banner is-error" role="alert" style={{ margin: 0 }}>{error}</p> : null}
      {!loading && !error && runs.length === 0 ? <p className="wf-hint">This workflow has not run yet. Use Test run to try it.</p> : null}
      <ul className="wf-stack">
        {runs.map((run) => (
          <li className="wf-run" key={run.id}>
            <button type="button" className="wf-run-head" aria-expanded={openId === run.id} onClick={() => setOpenId(openId === run.id ? null : run.id)}>
              <span>
                <span className="wf-title">{formatWhen(run.started_at)}{run.dry_run ? " (test)" : ""}</span>
                <span className="wf-hint">{run.trigger_type} · {run.steps.length} steps</span>
              </span>
              <Badge tone={statusTone(run.status)}>{run.status}</Badge>
            </button>
            {openId === run.id ? (
              <div className="wf-run-body">
                {run.error ? <p className="wf-trace-text is-error">{run.error}</p> : null}
                <StepTrace nodeLabels={nodeLabels} run={run} />
                <button type="button" className="sv-link" onClick={() => { onShow(run); onClose(); }}>Show on canvas</button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </Drawer>
  );
}
