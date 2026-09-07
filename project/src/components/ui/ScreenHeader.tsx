import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
}

export function ScreenHeader({ title, subtitle, onBack, right }: ScreenHeaderProps) {
  return (
    <div className="flex items-center gap-3 px-4 pt-4 pb-2 sm:px-0 sm:pt-0 sm:pb-4">
      {onBack && (
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-card border border-line text-ink-soft hover:bg-surface-alt transition-colors shrink-0"
        >
          <ArrowLeft size={20} />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-extrabold text-ink leading-tight truncate">{title}</h1>
        {subtitle && <p className="text-sm text-ink-soft mt-0.5 truncate">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}
