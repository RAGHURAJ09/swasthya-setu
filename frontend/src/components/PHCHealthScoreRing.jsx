import { getHealthScoreColor } from '../utils/helpers';

export default function PHCHealthScoreRing({ score, size = 80 }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getHealthScoreColor(score);

  return (
    <div className="score-ring-container" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--color-surface-3)" strokeWidth={6}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div className="score-ring-label">
        <div style={{ fontSize: size * 0.22, fontWeight: 800, color, lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: size * 0.12, color: 'var(--color-text-dim)' }}>/100</div>
      </div>
    </div>
  );
}
