import { useState } from 'react';
import { Bot, Camera, ChevronDown, ChevronUp, History as HistoryIcon, MessageCircle, Sparkles } from 'lucide-react';
import { useApp } from '../../AppContext';
import { Card } from '../ui/Card';
import { ScreenHeader } from '../ui/ScreenHeader';
import type { HistoryItem } from '../../types';

const ICONS = {
  conversation: MessageCircle,
  quality: Camera,
  recommendation: Sparkles,
  buyer: Bot,
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function HistoryScreen() {
  const { t, history } = useApp();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="px-4 pt-4 pb-2 sm:px-0 sm:pt-2 sm:pb-4">
      <ScreenHeader title={t('history')} subtitle={t('historySubtitle')} />

      {history.length === 0 ? (
        <Card className="flex flex-col items-center px-6 py-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-soft">
            <HistoryIcon size={30} className="text-brand-deep" />
          </div>
          <h2 className="text-lg font-extrabold text-ink">{t('noHistory')}</h2>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-soft">{t('historyEmpty')}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {history.map(item => (
            <HistoryCard
              key={item.id}
              item={item}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId(current => current === item.id ? null : item.id)}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryCard({
  item,
  expanded,
  onToggle,
  t,
}: {
  item: HistoryItem;
  expanded: boolean;
  onToggle: () => void;
  t: (key: string) => string;
}) {
  const Icon = ICONS[item.type];
  return (
    <Card>
      <button type="button" onClick={onToggle} className="w-full text-left">
        <div className="flex items-start gap-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
            item.type === 'quality' ? 'bg-market-soft text-market-deep' : 'bg-brand-soft text-brand-deep'
          }`}>
            <Icon size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-ink">{item.title}</h3>
              {expanded ? <ChevronUp size={18} className="shrink-0 text-ink-faint" /> : <ChevronDown size={18} className="shrink-0 text-ink-faint" />}
            </div>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">{item.summary}</p>
            <p className="mt-2 text-[11px] font-semibold text-ink-faint">{formatDate(item.createdAt)}</p>
          </div>
        </div>
      </button>
      {expanded && (
        <div className="mt-4 border-t border-line pt-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-soft">{t('result')}</p>
          <p className="text-sm font-semibold leading-relaxed text-brand-deep">{item.result}</p>
          {item.details.length > 0 && (
            <ul className="mt-3 space-y-2">
              {item.details.map((detail, index) => (
                <li key={`${item.id}-${index}`} className="flex gap-2 text-sm leading-relaxed text-ink-soft">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-mid" />
                  {detail}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}