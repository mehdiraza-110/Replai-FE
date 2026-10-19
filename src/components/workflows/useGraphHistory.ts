import { useCallback, useRef, useState } from "react";
import type { FlowEdge, FlowNode } from "./graphRules";

interface Snapshot { nodes: FlowNode[]; edges: FlowEdge[] }
const clone = (s: Snapshot): Snapshot => ({
  nodes: s.nodes.map((n) => ({ ...n, position: { ...n.position }, data: { ...n.data }, selected: false })),
  edges: s.edges.map((e) => ({ ...e, selected: false })),
});

/** Simple undo/redo stack over whole-graph snapshots. */
export function useGraphHistory(getCurrent: () => Snapshot, apply: (s: Snapshot) => void) {
  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const lastCoalesce = useRef(0);
  const [, force] = useState(0);
  const bump = () => force((n) => n + 1);

  const push = useCallback((coalesceMs = 0) => {
    const now = Date.now();
    if (coalesceMs && now - lastCoalesce.current < coalesceMs) { lastCoalesce.current = now; return; }
    lastCoalesce.current = coalesceMs ? now : 0;
    past.current = [...past.current.slice(-49), clone(getCurrent())];
    future.current = [];
    bump();
  }, [getCurrent]);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(clone(getCurrent()));
    apply(prev);
    bump();
  }, [apply, getCurrent]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(clone(getCurrent()));
    apply(next);
    bump();
  }, [apply, getCurrent]);

  const reset = useCallback(() => { past.current = []; future.current = []; bump(); }, []);

  return { push, undo, redo, reset, canUndo: past.current.length > 0, canRedo: future.current.length > 0 };
}
