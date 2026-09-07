import type { ReactNode } from 'react';

type Tone = 'brand' | 'market' | 'trust' | 'neutral' | 'success' | 'warning';

interface ChipProps {
  children: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  className?: string;
}

const tones: Record<Tone, string> = {
  brand: 'bg-brand-soft text-brand-deep',
  market: 'bg-market-soft text-market-deep',
  trust: 'bg-trust-soft text-trust-deep',
  neutral: 'bg-surface-alt text-ink-soft',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-red-50 text-warning',
};

export function Chip({ children, tone = 'neutral', icon, className = '' }: ChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${tones[tone]} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}
