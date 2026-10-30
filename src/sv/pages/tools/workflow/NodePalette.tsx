import type { NodeType } from "../../../../services/workflowApi";
import { NODE_DEFS, type NodeGroup } from "./nodeDefs";

const GROUPS: NodeGroup[] = ["Triggers", "Actions", "Meetings", "Logic"];
export const DRAG_MIME = "application/x-replai-node";

export function NodePalette({ onAdd, disabled }: { onAdd: (type: NodeType) => void; disabled?: boolean }) {
  return (
    <aside aria-label="Node palette" className="wf-palette">
      <p className="wf-hint">Click a node to add it, or drag it onto the canvas.</p>
      {GROUPS.map((group) => (
        <section key={group}>
          <h3 className="wf-group">{group}</h3>
          <div className="wf-stack">
            {NODE_DEFS.filter((d) => d.group === group).map((def) => {
              const Icon = def.icon;
              return (
                <button
                  type="button"
                  className="wf-palette-item"
                  disabled={disabled}
                  draggable
                  key={def.type}
                  onClick={() => onAdd(def.type)}
                  onDragStart={(event) => {
                    event.dataTransfer.setData(DRAG_MIME, def.type);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                >
                  <span className={`wf-badge is-sm ${def.tone}`}><Icon className="sv-icon" /></span>
                  <span className="wf-grow">
                    <span className="wf-title wf-ellipsis">{def.label}</span>
                    <span className="wf-hint">{def.description}</span>
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
