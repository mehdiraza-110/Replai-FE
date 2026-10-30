import { Handle, NodeToolbar, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { memo } from "react";
import type { FlowNode } from "./graphRules";
import { useWorkflowMeta } from "./metaContext";
import { GROUP_KIND, NODE_DEF_BY_TYPE, NODE_HANDLES, isTrigger, summarize } from "./nodeDefs";

function ringClass(status?: string, hasProblems?: boolean, selected?: boolean) {
  if (hasProblems) return "is-problem";
  if (status === "success") return "is-success";
  if (status === "failed") return "is-failed";
  if (status === "skipped") return "is-skipped";
  if (selected) return "is-selected";
  return "";
}

function WorkflowNodeView({ id, type, data, selected }: NodeProps<FlowNode>) {
  const meta = useWorkflowMeta();
  const { deleteElements } = useReactFlow();
  const def = NODE_DEF_BY_TYPE[type!];
  if (!def) return null;
  const Icon = def.icon;
  const problems = data.__problems ?? [];
  const status = data.__status;
  const trigger = isTrigger(type!);
  const handles = NODE_HANDLES[type!];
  const isEnd = type === "action.send_reply";

  return (
    <div className={`wf-node ${ringClass(status, problems.length > 0, selected)}`}>
      <NodeToolbar isVisible={selected} offset={8} position={Position.Top}>
        <button type="button" aria-label={`Delete ${def.label}`} className="wf-node-delete" onClick={() => deleteElements({ nodes: [{ id }] })}>
          <Trash2 className="sv-icon" aria-hidden />
          Delete
        </button>
      </NodeToolbar>

      {!trigger ? <Handle className="wf-handle is-in" position={Position.Left} type="target" /> : null}

      <div className="wf-node-body">
        <span className={`wf-badge ${def.tone}`}><Icon className="sv-icon" /></span>
        <div className="wf-grow">
          <p className="wf-kicker">{GROUP_KIND[def.group]}</p>
          <p className="wf-title wf-ellipsis">{def.label}</p>
          <p className="wf-summary">{summarize({ type: type!, data }, meta)}</p>
        </div>
        {status ? <span className={`wf-status is-${status}`}>{status}</span> : null}
      </div>

      {problems.length > 0 ? (
        <div className="wf-node-problem">
          <AlertTriangle className="sv-icon" aria-hidden />
          <span>{problems[0]}{problems.length > 1 ? ` (+${problems.length - 1} more)` : ""}</span>
        </div>
      ) : null}

      {handles ? (
        <>
          {handles.map((h, index) => {
            const top = `${Math.round(((index + 1) / (handles.length + 1)) * 100)}%`;
            return (
              <span key={h.id}>
                <Handle className={`wf-handle is-out is-${h.tone}`} id={h.id} position={Position.Right} style={{ top }} type="source" />
                <span className={`wf-handle-label is-${h.tone}`} style={{ top }}>{h.label}</span>
              </span>
            );
          })}
        </>
      ) : !isEnd ? (
        <Handle className="wf-handle is-out" position={Position.Right} type="source" />
      ) : null}
    </div>
  );
}

export const WorkflowNodeComponent = memo(WorkflowNodeView);
export const nodeTypes = Object.fromEntries(Object.keys(NODE_DEF_BY_TYPE).map((t) => [t, WorkflowNodeComponent]));
