const LINES = Array.from({ length: 18 }, (_, i) => {
  const period = i % 3 === 0 ? 1440 : 720;
  const amplitude = 26 + ((i * 17) % 44);
  const baseline = 40 + i * 28;
  const half = period / 2;
  const quarter = period / 4;

  let d = `M 0 ${baseline} Q ${quarter} ${baseline - amplitude} ${half} ${baseline}`;
  for (let x = half * 2; x <= 2880 + period; x += half) d += ` T ${x} ${baseline}`;

  return { d, opacity: 0.18 + (i % 4) * 0.07 };
});

export function WaveLines({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      fill="none"
      preserveAspectRatio="none"
      viewBox="0 0 1440 600"
    >
      <g className="mkt-wave">
        {LINES.map((line, index) => (
          <path
            d={line.d}
            key={index}
            stroke="var(--mkt-accent-text)"
            strokeOpacity={line.opacity}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
    </svg>
  );
}
