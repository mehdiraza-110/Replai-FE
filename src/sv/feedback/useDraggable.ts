import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

/** Lets a floating toolbar be dragged out of the way. `reset()` puts it back for the next recording. */
export function useDraggable() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const onPointerDown = useCallback((event: ReactPointerEvent) => {
    drag.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }, [offset]);
  const onPointerMove = useCallback((event: ReactPointerEvent) => {
    if (!drag.current) return;
    setOffset({ x: drag.current.ox + event.clientX - drag.current.x, y: drag.current.oy + event.clientY - drag.current.y });
  }, []);
  const onPointerUp = useCallback(() => { drag.current = null; }, []);
  const reset = useCallback(() => setOffset({ x: 0, y: 0 }), []);

  return { style: { transform: `translate(${offset.x}px, ${offset.y}px)` }, handle: { onPointerDown, onPointerMove, onPointerUp, style: { cursor: "grab", touchAction: "none" as const } }, reset };
}
