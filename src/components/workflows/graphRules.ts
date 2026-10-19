import type { Connection, Edge, Node } from "@xyflow/react";
import type { Graph, GraphEdge, GraphNode, NodeType, WorkflowNodeData } from "../../services/workflowApi";
import { isTrigger } from "./nodeDefs";

export type FlowNodeData = WorkflowNodeData & { __problems?: string[]; __status?: string };
export type FlowNode = Node<FlowNodeData, NodeType>;
export type FlowEdge = Edge;

export function toFlow(graph: Graph): { nodes: FlowNode[]; edges: FlowEdge[] } {
  return {
    nodes: graph.nodes.map((n) => ({ id: n.id, type: n.type, position: n.position, data: { ...n.data } })),
    edges: graph.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      ...(e.sourceHandle ? { sourceHandle: e.sourceHandle } : {}),
    })),
  };
}

/** Strip UI-only fields so the persisted graph matches the contract exactly. */
export function fromFlow(nodes: FlowNode[], edges: FlowEdge[]): Graph {
  const gn: GraphNode[] = nodes.map((n) => {
    const { __problems, __status, ...data } = n.data;
    void __problems;
    void __status;
    return {
      id: n.id,
      type: n.type as NodeType,
      position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
      data,
    };
  });
  const ge: GraphEdge[] = edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    ...(e.sourceHandle ? { sourceHandle: e.sourceHandle } : {}),
  }));
  return { nodes: gn, edges: ge };
}

export function graphKey(nodes: FlowNode[], edges: FlowEdge[]) {
  return JSON.stringify(fromFlow(nodes, edges));
}

function reaches(edges: FlowEdge[], from: string, to: string) {
  const seen = new Set<string>();
  const stack = [from];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === to) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    edges.filter((e) => e.source === cur).forEach((e) => stack.push(e.target));
  }
  return false;
}

/** Returns a human reason when the connection is not allowed, otherwise null. */
export function connectionError(conn: Connection | Edge, nodes: FlowNode[], edges: FlowEdge[]): string | null {
  const source = nodes.find((n) => n.id === conn.source);
  const target = nodes.find((n) => n.id === conn.target);
  if (!source || !target) return "Unknown node.";
  if (source.id === target.id) return "A node cannot connect to itself.";
  if (isTrigger(target.type!)) return "Triggers cannot have inputs.";
  if (source.type === "action.send_reply") return "Send reply is the end of a flow.";
  const dup = edges.some(
    (e) => e.source === conn.source && e.target === conn.target && (e.sourceHandle ?? null) === (conn.sourceHandle ?? null),
  );
  if (dup) return "Those nodes are already connected.";
  if (reaches(edges, target.id, source.id)) return "That connection would create a loop.";
  return null;
}

export function layoutGraph(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
  const depth = new Map<string, number>();
  const roots = nodes.filter((n) => !edges.some((e) => e.target === n.id));
  const queue = roots.map((r) => r.id);
  roots.forEach((r) => depth.set(r.id, 0));
  let guard = 0;
  while (queue.length && guard++ < 2000) {
    const id = queue.shift()!;
    for (const e of edges.filter((x) => x.source === id)) {
      const next = (depth.get(id) ?? 0) + 1;
      if (next > (depth.get(e.target) ?? -1) && next < nodes.length) {
        depth.set(e.target, next);
        queue.push(e.target);
      }
    }
  }
  const columns = new Map<number, FlowNode[]>();
  nodes.forEach((n) => {
    const d = depth.get(n.id) ?? 0;
    columns.set(d, [...(columns.get(d) ?? []), n]);
  });
  const placed = new Map<string, { x: number; y: number }>();
  columns.forEach((col, d) => {
    col.sort((a, b) => a.position.y - b.position.y);
    col.forEach((n, i) => placed.set(n.id, { x: 60 + d * 320, y: 60 + i * 150 - ((col.length - 1) * 150) / 2 + 150 }));
  });
  return nodes.map((n) => ({ ...n, position: placed.get(n.id) ?? n.position }));
}

export function nextNodeId(nodes: FlowNode[], type: string) {
  const base = type.split(".")[1];
  let i = 1;
  while (nodes.some((n) => n.id === `${base}_${i}`)) i += 1;
  return `${base}_${i}`;
}
