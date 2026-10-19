import { NODE_DEFS, type NodeGroup } from "./nodeDefs";
import type { NodeType } from "../../services/workflowApi";

const GROUPS: NodeGroup[] = ["Triggers", "Actions", "Meetings", "Logic"];
export const DRAG_MIME = "application/x-replai-node";

export function NodePalette({ onAdd, disabled }: { onAdd: (type: NodeType) => void; disabled?: boolean }) {
  return (
    <aside aria-label="Node palette" className="hidden w-[232px] shrink-0 flex-col gap-4 overflow-y-auto border-r border-border/70 bg-surface p-3 md:flex">
      <p className="px-1 text-[12px] leading-4 text-muted">Click a node to add it, or drag it onto the canvas.</p>
      {GROUPS.map((group) => (
        <section key={group}>
          <h3 className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{group}</h3>
          <div className="space-y-1.5">
            {NODE_DEFS.filter((d) => d.group === group).map((def) => {
              const Icon = def.icon;
              return (
                <button
                  className="flex w-full cursor-grab items-center gap-2.5 rounded-xl border border-border/70 bg-surface-secondary p-2 text-left transition hover:border-accent/50 hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent active:cursor-grabbing disabled:opacity-50"
                  disabled={disabled}
                  draggable
                  key={def.type}
                  onClick={() => onAdd(def.type)}
                  onDragStart={(event) => {
                    event.dataTransfer.setData(DRAG_MIME, def.type);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  type="button"
                >
                  <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${def.tone}`}>
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-foreground">{def.label}</span>
                    <span className="block text-[11px] leading-4 text-muted">{def.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </aside>
  );
}
