interface TrustDialProps {
  score: number;
  size?: number;
  showLabel?: boolean;
}

export function TrustDial({ score, size = 64, showLabel = true }: TrustDialProps) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 80 ? '#166534' : score >= 60 ? '#F59E0B' : '#DC2626';
  const label =
    score >= 80 ? 'HIGH' : score >= 60 ? 'MEDIUM' : 'LOW';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#E5EBE2"
            strokeWidth="5"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.3s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-extrabold text-ink tabular-nums" style={{ fontSize: size * 0.28 }}>
            {score}
          </span>
          <span className="text-[9px] font-semibold text-ink-faint">/100</span>
        </div>
      </div>
      {showLabel && (
        <span
          className="text-[10px] font-bold tracking-wider"
          style={{ color }}
        >
          {label} TRUST
        </span>
      )}
    </div>
  );
}
