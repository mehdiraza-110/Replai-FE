import { Plus } from "lucide-react";
import { motion } from "motion/react";
import { memo, useMemo } from "react";

const HOVER_COLORS = [
  "#0a84ff",
  "#38bdf8",
  "#818cf8",
  "#34d399",
  "#f472b6",
  "#fbbf24",
];

const CELL_W = 48;
const CELL_H = 32;
// Outer loop lays strips side by side (drives total width); inner loop stacks
// cells within each strip (drives total height). Counts are deliberately
// generous so the skewed/scaled grid still fully covers a wide, short
// section on every side instead of leaving a gap on one edge.
const STRIP_COUNT = 56;
const CELLS_PER_STRIP = 26;

function getRandomColor() {
  return HOVER_COLORS[Math.floor(Math.random() * HOVER_COLORS.length)];
}

function BoxesGrid() {
  const strips = useMemo(() => Array.from({ length: STRIP_COUNT }), []);
  const cells = useMemo(() => Array.from({ length: CELLS_PER_STRIP }), []);

  return (
    <div
      className="absolute left-1/2 top-1/2 flex"
      style={{
        width: STRIP_COUNT * CELL_W,
        height: CELLS_PER_STRIP * CELL_H,
        transform: "translate(-50%, -50%) skewX(-12deg) skewY(6deg) scale(0.9)",
      }}
    >
      {strips.map((_, stripIndex) => (
        <div className="relative h-8 w-12 shrink-0 border-l border-[var(--mkt-line-soft)]" key={`strip-${stripIndex}`}>
          {cells.map((_, cellIndex) => (
            <motion.div
              className="relative h-8 w-12 shrink-0 border-t border-r border-[var(--mkt-line-soft)]"
              key={`cell-${cellIndex}`}
              whileHover={{ backgroundColor: getRandomColor(), transition: { duration: 0 } }}
            >
              {cellIndex % 4 === 0 && stripIndex % 4 === 0 ? (
                <Plus className="pointer-events-none absolute -top-[9px] -left-[13px] size-[18px] stroke-[1.4px] text-[var(--mkt-line)]" />
              ) : null}
            </motion.div>
          ))}
        </div>
      ))}
    </div>
  );
}

const MemoBoxesGrid = memo(BoxesGrid);

export function BackgroundBoxes() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      <MemoBoxesGrid />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 60% at 50% 50%, var(--mkt-bg) 0%, color-mix(in oklch, var(--mkt-bg) 65%, transparent) 45%, transparent 78%)",
        }}
      />
    </div>
  );
}
