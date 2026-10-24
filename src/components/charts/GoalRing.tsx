/** GoalRing — distinctive circular progress toward a savings target. */

export function GoalRing({
  percent,
  size = 168,
  stroke = 11,
  label = 'of target',
}: {
  percent: number;
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className="goal-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Progress: ${clamped.toFixed(1)}%`}>
        <defs>
          <linearGradient id="goalRingGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0fa97c" />
            <stop offset="100%" stopColor="#35e0ab" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#1b2027"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#goalRingGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="goal-ring-center">
        <div className="goal-ring-pct tnum">
          {clamped.toFixed(clamped >= 100 ? 0 : 1)}
          <span style={{ fontSize: 15, fontWeight: 560, marginLeft: 1 }}>%</span>
        </div>
        <div className="goal-ring-label">{label}</div>
      </div>
    </div>
  );
}
