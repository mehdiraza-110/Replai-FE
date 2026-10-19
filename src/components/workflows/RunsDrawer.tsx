import { Chip, Spinner } from "@heroui/react";
import { useEffect, useState } from "react";
import { errorMessage, workflowApi, type Run } from "../../services/workflowApi";
import { StepTrace } from "./StepTrace";
import { DrawerShell } from "./TestRunDrawer";
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
    <DrawerShell isOpen={isOpen} onClose={onClose} subtitle="The 20 most recent runs, live and test." title="Run history">
      {loading ? <div className="grid place-items-center py-10"><Spinner color="accent" /></div> : null}
      {error ? <p className="rounded-xl border border-danger/25 bg-danger/10 px-3 py-2 text-[12px] text-danger">{error}</p> : null}
      {!loading && !error && runs.length === 0 ? <p className="text-[13px] text-muted">This workflow has not run yet. Use Test run to try it.</p> : null}
      <ul className="space-y-2">
        {runs.map((run) => (
          <li className="rounded-xl border border-border/70 bg-surface" key={run.id}>
            <button className="flex w-full items-center justify-between gap-3 p-3 text-left" onClick={() => setOpenId(openId === run.id ? null : run.id)} type="button">
              <span>
                <span className="block text-[13px] font-medium text-foreground">{formatWhen(run.started_at)}{run.dry_run ? " (test)" : ""}</span>
                <span className="block text-[11px] text-muted">{run.trigger_type} · {run.steps.length} steps</span>
              </span>
              <Chip color={statusTone(run.status)} size="sm" variant="soft">{run.status}</Chip>
            </button>
            {openId === run.id ? (
              <div className="space-y-3 border-t border-border/70 p-3">
                {run.error ? <p className="text-[12px] text-danger">{run.error}</p> : null}
                <StepTrace nodeLabels={nodeLabels} run={run} />
                <button className="text-[12px] font-medium text-accent hover:underline" onClick={() => { onShow(run); onClose(); }} type="button">Show on canvas</button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </DrawerShell>
  );
}
