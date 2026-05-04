type ConditionChartProps = {
  points: Array<{
    at: string;
    label: string;
    score: number;
  }>;
};

export function ConditionChart({ points }: ConditionChartProps) {
  if (!points.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
        No condition history yet.
      </div>
    );
  }

  const width = 320;
  const height = 132;
  const padding = 16;

  const coordinates = points.map((point, index) => {
    const x =
      points.length === 1
        ? width / 2
        : padding + (index / (points.length - 1)) * (width - padding * 2);
    const y = height - padding - (point.score / 100) * (height - padding * 2);

    return { x, y };
  });

  const line = coordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const area = [
    `M ${coordinates[0]?.x ?? 0} ${height - padding}`,
    ...coordinates.map((point) => `L ${point.x} ${point.y}`),
    `L ${coordinates.at(-1)?.x ?? width} ${height - padding}`,
    "Z",
  ].join(" ");

  return (
    <div className="space-y-3 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-[0_14px_40px_-28px_rgba(15,23,42,0.4)]">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Condition score
          </p>
          <p className="font-[family:var(--font-display)] text-3xl font-semibold text-slate-950">
            {points.at(-1)?.score ?? 0}
          </p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <p>{new Date(points[0].at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</p>
          <p>{new Date(points.at(-1)?.at ?? points[0].at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</p>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
        <defs>
          <linearGradient id="conditionArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#0f766e" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#0f766e" stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {[25, 50, 75].map((gridline) => {
          const y = height - padding - (gridline / 100) * (height - padding * 2);
          return (
            <line
              key={gridline}
              x1={padding}
              x2={width - padding}
              y1={y}
              y2={y}
              stroke="#cbd5e1"
              strokeDasharray="4 6"
              strokeWidth="1"
            />
          );
        })}

        <path d={area} fill="url(#conditionArea)" />
        <polyline
          fill="none"
          stroke="#0f766e"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={line}
        />

        {coordinates.map((point, index) => (
          <g key={points[index].at}>
            <circle cx={point.x} cy={point.y} r="5.5" fill="#fff" stroke="#0f766e" strokeWidth="3" />
          </g>
        ))}
      </svg>
    </div>
  );
}
