import { useMemo } from "react";

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
}

/** A small dependency-free area/line chart. Values are read from `data[i][series.key]`. */
export function AreaChart({ data, series, height = 260 }: { data: Array<Record<string, number | string>>; series: ChartSeries[]; height?: number }) {
  const width = 900;
  const pad = { top: 12, right: 12, bottom: 28, left: 40 };

  const { max, ticks, paths, xLabels } = useMemo(() => {
    const peak = Math.max(1, ...data.flatMap((row) => series.map((s) => Number(row[s.key]) || 0)));
    const step = peak <= 4 ? 1 : Math.ceil(peak / 4);
    const top = step * Math.ceil(peak / step);
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;
    const x = (i: number) => pad.left + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
    const y = (v: number) => pad.top + innerH - (v / top) * innerH;
    const built = series.map((s) => {
      const points = data.map((row, i) => [x(i), y(Number(row[s.key]) || 0)] as const);
      const line = points.map(([px, py], i) => `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
      const area = points.length ? `${line} L${points[points.length - 1][0].toFixed(1)},${(pad.top + innerH).toFixed(1)} L${points[0][0].toFixed(1)},${(pad.top + innerH).toFixed(1)} Z` : "";
      return { key: s.key, color: s.color, line, area };
    });
    const every = Math.max(1, Math.ceil(data.length / 8));
    return {
      max: top,
      ticks: Array.from({ length: Math.round(top / step) + 1 }, (_, i) => ({ value: i * step, y: y(i * step) })),
      paths: built,
      xLabels: data.map((row, i) => ({ i, x: x(i), text: String(row.date).slice(5) })).filter((label) => (label.i % every === 0 && data.length - 1 - label.i >= every) || label.i === data.length - 1),
    };
  }, [data, series, height]);

  const empty = data.length === 0 || max === 0;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label={`Chart of ${series.map((s) => s.label).join(", ")}`} style={{ display: "block" }}>
      <defs>
        {paths.map((p) => (
          <linearGradient key={p.key} id={`sv-area-${p.key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={p.color} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>
      {ticks.map((tick) => (
        <g key={tick.value}>
          <line x1={pad.left} x2={width - pad.right} y1={tick.y} y2={tick.y} stroke="var(--ds-border)" strokeDasharray="3 4" />
          <text x={pad.left - 8} y={tick.y + 4} textAnchor="end" fontSize="11" fill="var(--ds-text-tertiary)">{tick.value}</text>
        </g>
      ))}
      {paths.map((p, index) => (
        <g key={p.key}>
          {index === 0 ? <path d={p.area} fill={`url(#sv-area-${p.key})`} /> : null}
          <path d={p.line} fill="none" stroke={p.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </g>
      ))}
      {xLabels.map((label) => (
        <text key={label.i} x={label.x} y={height - 8} textAnchor="middle" fontSize="11" fill="var(--ds-text-tertiary)">{label.text}</text>
      ))}
      {empty ? <text x={width / 2} y={height / 2} textAnchor="middle" fontSize="13" fill="var(--ds-text-tertiary)">No activity in this period yet</text> : null}
    </svg>
  );
}
