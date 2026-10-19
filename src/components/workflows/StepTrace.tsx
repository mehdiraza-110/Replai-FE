import { Chip } from "@heroui/react";
import type { Run } from "../../services/workflowApi";
import { NODE_DEF_BY_TYPE } from "./nodeDefs";
import { describeStep, statusTone } from "./runUi";

export function StepTrace({ run, nodeLabels }: { run: Run; nodeLabels?: Record<string, string> }) {
  return (
    <ol className="space-y-2">
      {run.steps.length === 0 ? <li className="text-[12px] text-muted">No steps were recorded.</li> : null}
      {run.steps.map((step, i) => {
        const def = NODE_DEF_BY_TYPE[step.type as keyof typeof NODE_DEF_BY_TYPE];
        const output = step.output === undefined || step.output === null ? null : typeof step.output === "string" ? step.output : JSON.stringify(step.output, null, 2);
        return (
          <li className="rounded-xl border border-border/70 bg-surface-secondary p-3" key={`${step.nodeId}-${i}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-medium text-foreground">{i + 1}. {nodeLabels?.[step.nodeId] ?? def?.label ?? step.type}</p>
              <Chip color={statusTone(step.status)} size="sm" variant="soft">{step.status}</Chip>
            </div>
            {describeStep(step) ? <p className="mt-1.5 text-[12px] leading-4 text-foreground">{describeStep(step)}</p> : null}
            {step.error ? <p className="mt-1.5 text-[12px] text-danger">{step.error}</p> : null}
            {output ? <pre className="mt-1.5 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-surface p-2 text-[11px] leading-4 text-muted">{output}</pre> : null}
          </li>
        );
      })}
    </ol>
  );
}
