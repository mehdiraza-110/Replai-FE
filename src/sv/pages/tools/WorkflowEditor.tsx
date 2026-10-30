import "@xyflow/react/dist/style.css";
import { Background, BackgroundVariant, Controls, MiniMap, ReactFlow, ReactFlowProvider, addEdge, useEdgesState, useNodesState, useReactFlow, type Connection } from "@xyflow/react";
import { ArrowLeft, FlaskConical, History, LayoutGrid, Redo2, Save, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  WorkflowProblemsError,
  errorMessage,
  workflowApi,
  type NodeType,
  type Run,
  type SampleEmail,
  type Workflow,
  type WorkflowMeta,
  type WorkflowNodeData,
  type WorkflowProblem,
} from "../../../services/workflowApi";
import { useSvTitle } from "../../layout/chrome";
import { svPath } from "../../nav";
import { Button } from "../../ui";
import { Switch } from "./workflow/Form";
import { connectionError, fromFlow, graphKey, layoutGraph, nextNodeId, toFlow, type FlowEdge, type FlowNode } from "./workflow/graphRules";
import { WorkflowMetaContext } from "./workflow/metaContext";
import { NODE_DEF_BY_TYPE, isTrigger } from "./workflow/nodeDefs";
import { NodeInspector } from "./workflow/NodeInspector";
import { DRAG_MIME, NodePalette } from "./workflow/NodePalette";
import { RunsDrawer } from "./workflow/RunsDrawer";
import { runStatusMap } from "./workflow/runUi";
import { TestRunDrawer } from "./workflow/TestRunDrawer";
import { useGraphHistory } from "./workflow/useGraphHistory";
import { useWorkflowAccess } from "./workflow/useWorkflowAccess";
import { nodeTypes } from "./workflow/WorkflowNode";
import "./workflow/workflow.css";

export function WorkflowEditor() {
  return (
    <ReactFlowProvider>
      <EditorInner />
    </ReactFlowProvider>
  );
}

function EditorInner() {
  useSvTitle([{ label: "Workflows" }, { label: "Editor" }]);
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { canWrite } = useWorkflowAccess();
  const flow = useReactFlow<FlowNode, FlowEdge>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [meta, setMeta] = useState<WorkflowMeta | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [priority, setPriority] = useState(100);
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);
  const [savedKey, setSavedKey] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [problems, setProblems] = useState<WorkflowProblem[]>([]);
  const [notice, setNotice] = useState<{ tone: "danger" | "info"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [runsOpen, setRunsOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<Run | null>(null);
  const [paintRun, setPaintRun] = useState<Run | null>(null);

  const latest = useRef({ nodes, edges });
  latest.current = { nodes, edges };
  const getCurrent = useCallback(() => latest.current, []);
  const apply = useCallback((s: { nodes: FlowNode[]; edges: FlowEdge[] }) => {
    setNodes(s.nodes);
    setEdges(s.edges);
    setSelectedId(null);
    setPaintRun(null);
  }, [setEdges, setNodes]);
  const history = useGraphHistory(getCurrent, apply);

  const load = useCallback(async () => {
    setLoadError(null);
    setWorkflow(null);
    try {
      const [wf, m] = await Promise.all([
        workflowApi.get(id),
        workflowApi.meta().catch(() => null),
      ]);
      const f = toFlow(wf.graph ?? { nodes: [], edges: [] });
      setWorkflow(wf);
      setMeta(m);
      setName(wf.name);
      setIsActive(wf.is_active);
      setPriority(wf.priority ?? 100);
      setNodes(f.nodes);
      setEdges(f.edges);
      setSavedKey(graphKey(f.nodes, f.edges) + wf.name + "|" + (wf.priority ?? 100));
      history.reset();
    } catch (error) {
      setLoadError(errorMessage(error, "Unable to load this workflow"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, setEdges, setNodes]);

  useEffect(() => { void load(); }, [load]);

  const priorityValid = Number.isInteger(priority) && priority >= 1 && priority <= 1000;
  const isDirty = workflow !== null && graphKey(nodes, edges) + name + "|" + priority !== savedKey;

  // Leave guards: tab close, and in-app link clicks.
  useEffect(() => {
    if (!isDirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.origin !== window.location.origin) return;
      if (!window.confirm("You have unsaved changes. Leave without saving?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [isDirty]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const nodeLabels = useMemo(
    () => Object.fromEntries(nodes.map((n) => [n.id, NODE_DEF_BY_TYPE[n.type!]?.label ?? n.id])),
    [nodes],
  );

  const displayNodes = useMemo(() => {
    const status = paintRun ? runStatusMap(paintRun) : {};
    const byNode: Record<string, string[]> = {};
    problems.forEach((p) => { if (p.nodeId) (byNode[p.nodeId] ??= []).push(p.message); });
    return nodes.map((n) => ({ ...n, data: { ...n.data, __status: status[n.id], __problems: byNode[n.id] } }));
  }, [nodes, paintRun, problems]);

  const selectedNode = displayNodes.find((n) => n.id === selectedId) ?? null;
  // The settings panel shrinks the canvas; re-fit when it opens or closes so no node ends up hidden behind it.
  const inspectorOpen = Boolean(selectedNode);
  useEffect(() => {
    const timer = window.setTimeout(() => flow.fitView({ duration: 200, padding: 0.25, maxZoom: 1 }), 60);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspectorOpen]);
  const generalProblems = problems.filter((p) => !p.nodeId || !nodes.some((n) => n.id === p.nodeId));

  function addNode(type: NodeType, position?: { x: number; y: number }) {
    if (!canWrite) return;
    if (isTrigger(type) && nodes.some((n) => isTrigger(n.type!))) {
      setNotice({ tone: "danger", text: "A workflow can only have one trigger. Remove the existing one first." });
      return;
    }
    history.push();
    const rect = wrapperRef.current?.getBoundingClientRect();
    const pos = position ?? flow.screenToFlowPosition({
      x: (rect?.left ?? 0) + (rect?.width ?? 600) / 2 - 120 + (nodes.length % 5) * 24,
      y: (rect?.top ?? 0) + (rect?.height ?? 400) / 2 - 40 + (nodes.length % 5) * 24,
    });
    const node: FlowNode = { id: nextNodeId(nodes, type), type, position: pos, data: NODE_DEF_BY_TYPE[type].defaults() };
    setNodes((current) => [...current.map((n) => ({ ...n, selected: false })), { ...node, selected: true }]);
    setSelectedId(node.id);
  }

  function onConnect(connection: Connection) {
    const reason = connectionError(connection, nodes, edges);
    if (reason) { setNotice({ tone: "danger", text: reason }); return; }
    history.push();
    setEdges((current) => addEdge({ ...connection, id: `e_${connection.source}_${connection.sourceHandle ?? "out"}_${connection.target}` }, current));
  }

  function updateNodeData(nodeId: string, data: WorkflowNodeData) {
    history.push(1200);
    const { __problems, __status, ...clean } = data;
    void __problems; void __status;
    setNodes((current) => current.map((n) => (n.id === nodeId ? { ...n, data: clean } : n)));
    setProblems((current) => current.filter((p) => p.nodeId !== nodeId));
  }

  function handleProblems(error: unknown, fallback: string) {
    if (error instanceof WorkflowProblemsError) {
      setProblems(error.problems);
      const highlighted = error.problems.some((p) => p.nodeId && nodes.some((n) => n.id === p.nodeId));
      setNotice({ tone: "danger", text: highlighted ? `${error.message} Check the highlighted nodes.` : error.message });
    } else {
      setNotice({ tone: "danger", text: errorMessage(error, fallback) });
    }
  }

  async function persist(extra: { is_active?: boolean } = {}) {
    if (!priorityValid) {
      setNotice({ tone: "danger", text: "Run order must be a whole number from 1 to 1000." });
      return false;
    }
    setSaving(true);
    setProblems([]);
    try {
      const saved = await workflowApi.update(id, { name: name.trim() || "Untitled workflow", graph: fromFlow(nodes, edges), priority, ...extra });
      setWorkflow((w) => (w ? { ...w, ...saved, graph: w.graph } : w));
      setIsActive(saved.is_active ?? extra.is_active ?? isActive);
      setSavedKey(graphKey(nodes, edges) + name + "|" + priority);
      return true;
    } catch (error) {
      handleProblems(error, "Unable to save the workflow");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    if (await persist()) setNotice({ tone: "info", text: "Workflow saved." });
  }

  async function toggleActive(next: boolean) {
    if (await persist({ is_active: next })) {
      setIsActive(next);
      setNotice({ tone: "info", text: next ? "Workflow is now active." : "Workflow paused." });
    }
  }

  async function runTest(sample: SampleEmail) {
    setTestError(null);
    if (isDirty && !(await persist())) {
      setTestError("Fix the problems on the canvas and save before testing.");
      setTestOpen(false);
      return;
    }
    setTesting(true);
    try {
      const run = await workflowApi.test(id, sample);
      setLastRun(run);
      setPaintRun(run);
    } catch (error) {
      setTestError(errorMessage(error, "The test run failed"));
    } finally {
      setTesting(false);
    }
  }

  const onKey = (event: React.KeyboardEvent) => {
    const target = event.target as HTMLElement;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) history.redo(); else history.undo();
    } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      if (canWrite) void save();
    }
  };

  if (loadError) {
    return (
      <div className="sv-page">
        <p className="sv-banner is-error" role="alert">{loadError}</p>
        <span className="sv-actions">
          <Button onClick={() => navigate(svPath("workflows"))}>Back to workflows</Button>
          <Button variant="primary" onClick={() => void load()}>Retry</Button>
        </span>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="sv-page">
        <div className="wf-skeleton" style={{ height: 52, marginBottom: 12 }} />
        <div className="wf-skeleton" style={{ height: "60vh" }} />
      </div>
    );
  }

  return (
    <WorkflowMetaContext.Provider value={meta}>
      <div className="wf-small-only wf-too-small">
        <p>Editing workflows needs a larger screen. Open this page on a tablet or computer.</p>
        <Button onClick={() => navigate(svPath("workflows"))}>Back to workflows</Button>
      </div>

      <div className="wf-editor" onKeyDown={onKey}>
        <header className="wf-editor-bar">
          <button type="button" aria-label="Back to workflows" className="sv-icon-btn" onClick={() => { if (!isDirty || window.confirm("You have unsaved changes. Leave without saving?")) navigate(svPath("workflows")); }}>
            <ArrowLeft className="sv-icon" aria-hidden />
          </button>
          <input aria-label="Workflow name" className="wf-name-input" disabled={!canWrite} onChange={(e) => setName(e.target.value)} value={name} />
          <label className="wf-order" title="Several workflows can run for the same campaign. Lower numbers run first; the first one that writes a reply handles it, the rest only do non-reply steps like notifications.">
            Run order
            <input
              aria-invalid={!priorityValid}
              aria-label="Run order (lower runs first)"
              className={`sv-input${priorityValid ? "" : " is-invalid"}`}
              disabled={!canWrite}
              max={1000}
              min={1}
              onChange={(e) => setPriority(e.target.value === "" ? Number.NaN : Number(e.target.value))}
              type="number"
              value={Number.isNaN(priority) ? "" : priority}
            />
          </label>
          <span className={`wf-saved${isDirty ? " is-dirty" : ""}`} role="status">{isDirty ? "Unsaved changes" : "All changes saved"}</span>
          <div className="wf-bar-actions">
            <button type="button" aria-label="Undo" className="sv-icon-btn" disabled={!history.canUndo || !canWrite} onClick={history.undo}><Undo2 className="sv-icon" aria-hidden /></button>
            <button type="button" aria-label="Redo" className="sv-icon-btn" disabled={!history.canRedo || !canWrite} onClick={history.redo}><Redo2 className="sv-icon" aria-hidden /></button>
            <Button size="sm" icon={LayoutGrid} disabled={!canWrite} onClick={() => { history.push(); setNodes(layoutGraph(nodes, edges)); window.setTimeout(() => flow.fitView({ duration: 300, padding: 0.2 }), 50); }}>Auto layout</Button>
            <Button size="sm" icon={History} onClick={() => setRunsOpen(true)}>Runs</Button>
            <Button size="sm" icon={FlaskConical} onClick={() => { setTestError(null); setTestOpen(true); }}>Test run</Button>
            <label className="wf-active">
              <Switch label="Workflow active" disabled={!canWrite || saving} checked={isActive} onChange={(v) => void toggleActive(v)} />
              Active
            </label>
            <Button size="sm" variant="primary" icon={Save} disabled={!canWrite || saving || !isDirty} onClick={() => void save()}>{saving ? "Saving…" : "Save"}</Button>
          </div>
        </header>

        {notice || generalProblems.length > 0 ? (
          <div aria-live="polite" className={`wf-editor-notice is-${notice?.tone === "info" ? "info" : "danger"}`}>
            {notice ? <p>{notice.text}</p> : null}
            {generalProblems.length > 0 ? <ul>{generalProblems.map((p, i) => <li key={i}>{p.message}</li>)}</ul> : null}
          </div>
        ) : null}

        <div className="wf-editor-main">
          <NodePalette disabled={!canWrite} onAdd={(type) => addNode(type)} />
          <div className="wf-canvas" ref={wrapperRef}>
            <ReactFlow<FlowNode, FlowEdge>
              deleteKeyCode={canWrite ? ["Backspace", "Delete"] : null}
              edges={edges}
              fitView
              fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
              isValidConnection={(c) => !connectionError(c, nodes, edges)}
              maxZoom={1.6}
              minZoom={0.3}
              nodes={displayNodes}
              nodesConnectable={canWrite}
              nodesDraggable={canWrite}
              nodeTypes={nodeTypes}
              onBeforeDelete={async () => { history.push(); return canWrite; }}
              onConnect={onConnect}
              onConnectEnd={(_, state) => {
                // An invalid drop never reaches onConnect, so explain why nothing was connected.
                if (state.isValid !== false || !state.fromNode || !state.toNode || state.fromHandle?.type !== "source") return;
                const reason = connectionError({ source: state.fromNode.id, target: state.toNode.id, sourceHandle: state.fromHandle.id ?? null, targetHandle: state.toHandle?.id ?? null }, nodes, edges);
                if (reason) setNotice({ tone: "danger", text: reason });
              }}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
              onDrop={(e) => {
                e.preventDefault();
                const type = e.dataTransfer.getData(DRAG_MIME) as NodeType;
                if (type && NODE_DEF_BY_TYPE[type]) addNode(type, flow.screenToFlowPosition({ x: e.clientX - 120, y: e.clientY - 30 }));
              }}
              onEdgesChange={onEdgesChange}
              onNodeDragStart={() => history.push()}
              onNodesChange={onNodesChange}
              onPaneClick={() => setSelectedId(null)}
              onSelectionChange={({ nodes: sel }) => setSelectedId(sel.length === 1 ? sel[0].id : null)}
              proOptions={{ hideAttribution: true }}
              snapGrid={[16, 16]}
              snapToGrid
              defaultEdgeOptions={{ type: "smoothstep", style: { strokeWidth: 1.75 } }}
            >
              <Background gap={16} size={1.2} variant={BackgroundVariant.Dots} />
              <Controls position="bottom-left" showInteractive={false} />
              <MiniMap pannable zoomable className="wf-minimap" />
            </ReactFlow>
            {nodes.length === 0 ? (
              <div className="wf-canvas-empty">
                <p className="wf-hint">The canvas is empty. Add a trigger from the palette to start.</p>
              </div>
            ) : null}
          </div>
          {selectedNode ? (
            <NodeInspector
              meta={meta}
              node={selectedNode}
              nodes={nodes}
              edges={edges}
              onChange={(data) => updateNodeData(selectedNode.id, data)}
              onClose={() => setSelectedId(null)}
              readOnly={!canWrite}
            />
          ) : null}
        </div>
      </div>

      <TestRunDrawer error={testError} isDirty={isDirty} isOpen={testOpen} isRunning={testing} nodeLabels={nodeLabels} onClose={() => setTestOpen(false)} onRun={(s) => void runTest(s)} run={lastRun} />
      <RunsDrawer isOpen={runsOpen} nodeLabels={nodeLabels} onClose={() => setRunsOpen(false)} onShow={(run) => setPaintRun(run)} workflowId={workflow.id} />
    </WorkflowMetaContext.Provider>
  );
}
