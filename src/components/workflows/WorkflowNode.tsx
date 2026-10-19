import { Handle, NodeToolbar, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { memo } from "react";
import { WorkflowMetaContext, useWorkflowMeta } from "./metaContext";
import { NODE_DEF_BY_TYPE, isTrigger, summarize } from "./nodeDefs";
import type { FlowNode } from "./graphRules";

const handleBase = "!size-3 !border-2 !border-surface !bg-muted transition-colors hover:!bg-accent";

function ringClass(status?: string, hasProblems?: boolean, selected?: boolean) {
  if (hasProblems) return "border-danger ring-2 ring-danger/30";
  if (status === "success") return "border-success ring-2 ring-success/30";
  if (status === "failed") return "border-danger ring-2 ring-danger/30";
  if (status === "skipped") return "border-border border-dashed opacity-60";
  if (selected) return "border-accent ring-2 ring-accent/25";
  return "border-border/80 hover:border-foreground/30";
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
  const isCondition = type === "condition.keyword";
  const isEnd = type === "action.send_reply";

  return (
    <div
      className={`group relative w-[240px] rounded-2xl border bg-surface shadow-sm transition ${ringClass(status, problems.length > 0, selected)}`}
    >
      <NodeToolbar isVisible={selected} offset={8} position={Position.Top}>
        <button
          aria-label={`Delete ${def.label}`}
          className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[12px] font-medium text-danger shadow-sm transition hover:bg-danger/10"
          onClick={() => deleteElements({ nodes: [{ id }] })}
          type="button"
        >
          <Trash2 className="size-3.5" />
          Delete
        </button>
      </NodeToolbar>

      {!trigger ? <Handle className={`${handleBase} !-left-1.5`} position={Position.Left} type="target" /> : null}

      <div className="flex items-start gap-3 p-3">
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${def.tone}`}>
          <Icon className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted">{def.group.slice(0, -1)}</p>
          <p className="truncate text-[13px] font-semibold text-foreground">{def.label}</p>
          <p className="mt-0.5 line-clamp-2 text-[12px] leading-4 text-muted">{summarize({ type: type!, data }, meta)}</p>
        </div>
        {status ? (
          <span
            className={`mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
              status === "success" ? "bg-success/15 text-success" : status === "failed" ? "bg-danger/15 text-danger" : "bg-default-200 text-muted"
            }`}
          >
            {status}
          </span>
        ) : null}
      </div>

      {problems.length > 0 ? (
        <div className="flex items-start gap-1.5 border-t border-danger/20 px-3 py-2 text-[11px] leading-4 text-danger">
          <AlertTriangle className="mt-0.5 size-3 shrink-0" />
          <span className="line-clamp-2">{problems[0]}{problems.length > 1 ? ` (+${problems.length - 1} more)` : ""}</span>
        </div>
      ) : null}

      {isCondition ? (
        <>
          <Handle className={`${handleBase} !-right-1.5 !top-[34%] !bg-success`} id="yes" position={Position.Right} type="source" />
          <Handle className={`${handleBase} !-right-1.5 !top-[68%] !bg-danger`} id="no" position={Position.Right} type="source" />
          <span className="pointer-events-none absolute -right-8 top-[34%] -translate-y-1/2 text-[10px] font-semibold text-success">yes</span>
          <span className="pointer-events-none absolute -right-7 top-[68%] -translate-y-1/2 text-[10px] font-semibold text-danger">no</span>
        </>
      ) : !isEnd ? (
        <Handle className={`${handleBase} !-right-1.5`} position={Position.Right} type="source" />
      ) : null}
    </div>
  );
}

export const WorkflowNodeComponent = memo(WorkflowNodeView);
export const nodeTypes = Object.fromEntries(
  Object.keys(NODE_DEF_BY_TYPE).map((t) => [t, WorkflowNodeComponent]),
);
export { WorkflowMetaContext };
