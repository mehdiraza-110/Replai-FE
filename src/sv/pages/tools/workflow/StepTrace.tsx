import type { Run } from "../../../../services/workflowApi";
import { Badge } from "../../../ui";
import { NODE_DEF_BY_TYPE } from "./nodeDefs";
import { describeStep, statusTone } from "./runUi";

export function StepTrace({ run, nodeLabels }: { run: Run; nodeLabels?: Record<string, string> }) {
  return (
    <ol className="wf-trace">
      {run.steps.length === 0 ? <li className="wf-hint">No steps were recorded.</li> : null}
      {run.steps.map((step, i) => {
        const def = NODE_DEF_BY_TYPE[step.type as keyof typeof NODE_DEF_BY_TYPE];
        const output = step.output === undefined || step.output === null ? null : typeof step.output === "string" ? step.output : JSON.stringify(step.output, null, 2);
        return (
          <li className="wf-trace-step" key={`${step.nodeId}-${i}`}>
            <div className="wf-row">
              <p className="wf-title">{i + 1}. {nodeLabels?.[step.nodeId] ?? def?.label ?? step.type}</p>
              <Badge tone={statusTone(step.status)}>{step.status}</Badge>
            </div>
            {describeStep(step) ? <p className="wf-trace-text">{describeStep(step)}</p> : null}
            {step.error ? <p className="wf-trace-text is-error">{step.error}</p> : null}
            {output ? <pre className="wf-pre">{output}</pre> : null}
          </li>
        );
      })}
    </ol>
  );
}
