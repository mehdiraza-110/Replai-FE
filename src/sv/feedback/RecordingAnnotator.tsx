import { useEffect, useRef, useState } from "react";
import { Circle, Eraser, MousePointer2, MoveUpRight, Pencil, Square, Undo2 } from "lucide-react";
import { useDraggable } from "./useDraggable";

type Tool = "off" | "draw" | "arrow" | "rect" | "circle";
type Shape = { tool: Exclude<Tool, "off">; color: string; points: { x: number; y: number }[] };
const COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6"];

function paint(ctx: CanvasRenderingContext2D, shape: Shape) {
  const [a, b] = [shape.points[0], shape.points[shape.points.length - 1]];
  ctx.strokeStyle = shape.color;
  ctx.fillStyle = shape.color;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  if (shape.tool === "draw") {
    shape.points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
  } else if (shape.tool === "rect") {
    ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
  } else if (shape.tool === "circle") {
    ctx.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - 16 * Math.cos(angle - 0.45), b.y - 16 * Math.sin(angle - 0.45));
    ctx.lineTo(b.x - 16 * Math.cos(angle + 0.45), b.y - 16 * Math.sin(angle + 0.45));
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * A canvas laid over the page while recording, so the reporter can point at things. Because the recording captures the
 * current tab, whatever is drawn here is part of the video. The toolbar can be dragged out of the way.
 */
export function RecordingAnnotator() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>("off");
  const [color, setColor] = useState(COLORS[0]);
  const shapes = useRef<Shape[]>([]);
  const current = useRef<Shape | null>(null);
  const bar = useDraggable();

  const redraw = () => {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    [...shapes.current, ...(current.current ? [current.current] : [])].forEach((s) => paint(ctx, s));
  };

  useEffect(() => {
    const resize = () => {
      if (!canvas.current) return;
      canvas.current.width = window.innerWidth;
      canvas.current.height = window.innerHeight;
      redraw();
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const at = (e: React.PointerEvent) => ({ x: e.clientX, y: e.clientY });
  const tools: { id: Tool; icon: typeof Pencil; label: string }[] = [
    { id: "off", icon: MousePointer2, label: "Use the page" },
    { id: "draw", icon: Pencil, label: "Draw" },
    { id: "arrow", icon: MoveUpRight, label: "Arrow" },
    { id: "rect", icon: Square, label: "Rectangle" },
    { id: "circle", icon: Circle, label: "Circle" },
  ];

  return (
    <>
      <canvas
        ref={canvas}
        className="sv-fb-canvas"
        style={{ pointerEvents: tool === "off" ? "none" : "auto", cursor: tool === "off" ? "default" : "crosshair" }}
        onPointerDown={(e) => {
          if (tool === "off") return;
          (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
          current.current = { tool, color, points: [at(e)] };
        }}
        onPointerMove={(e) => {
          if (!current.current) return;
          if (current.current.tool === "draw") current.current.points.push(at(e));
          else current.current.points = [current.current.points[0], at(e)];
          redraw();
        }}
        onPointerUp={() => {
          if (current.current && current.current.points.length > 1) shapes.current.push(current.current);
          current.current = null;
          redraw();
        }}
      />
      <div className="sv-fb-tools" style={bar.style} role="toolbar" aria-label="Annotate your recording">
        <span className="sv-fb-grip" title="Drag to move" {...bar.handle}>⋮⋮</span>
        {tools.map((t) => (
          <button key={t.id} type="button" className={`sv-fb-tool${tool === t.id ? " is-on" : ""}`} aria-label={t.label} title={t.label} aria-pressed={tool === t.id} onClick={() => setTool(t.id)}>
            <t.icon className="sv-icon" aria-hidden />
          </button>
        ))}
        <span className="sv-fb-sep" />
        {COLORS.map((c) => (
          <button key={c} type="button" className={`sv-fb-swatch${color === c ? " is-on" : ""}`} style={{ background: c }} aria-label={`Colour ${c}`} onClick={() => { setColor(c); if (tool === "off") setTool("draw"); }} />
        ))}
        <span className="sv-fb-sep" />
        <button type="button" className="sv-fb-tool" aria-label="Undo" title="Undo" onClick={() => { shapes.current.pop(); redraw(); }}><Undo2 className="sv-icon" aria-hidden /></button>
        <button type="button" className="sv-fb-tool" aria-label="Clear" title="Clear" onClick={() => { shapes.current = []; redraw(); }}><Eraser className="sv-icon" aria-hidden /></button>
      </div>
    </>
  );
}
