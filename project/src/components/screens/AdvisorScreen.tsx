import { TrendingUp, TrendingDown, MapPin, Truck, Receipt, CheckCircle2, Info } from 'lucide-react';
import { useApp } from '../../AppContext';
import { Card } from '../ui/Card';
import { Chip } from '../ui/Chip';
import { ScreenHeader } from '../ui/ScreenHeader';
import { DEMO_FARMER, MARKET_OPTIONS } from '../../data/mockData';
import { formatINR } from '../../utils/format';
import type { MarketOption } from '../../types';

function calcNetReturn(opt: MarketOption): number {
  const saleValue = opt.pricePerQuintal * DEMO_FARMER.quantity;
  return saleValue - opt.transportCost - opt.otherCosts;
}

export function AdvisorScreen() {
  const { t } = useApp();

  const sorted = [...MARKET_OPTIONS].sort((a, b) => calcNetReturn(b) - calcNetReturn(a));
  const recommended = sorted[0];
  const alternatives = sorted.slice(1);

  const recSaleValue = recommended.pricePerQuintal * DEMO_FARMER.quantity;
  const recNet = calcNetReturn(recommended);

  return (
    <div className="px-4 pt-4 pb-2 sm:px-0 sm:pt-2 sm:pb-4">
      <ScreenHeader
        title={t('netReturnAdvisor')}
        subtitle={`${DEMO_FARMER.crop} · ${DEMO_FARMER.quantity} ${t('quintals')} · ${t('estimatedNetReturn')}`}
      />

      {/* Farmer input summary */}
      <Card className="mb-4 bg-surface-alt border-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-ink-soft font-semibold">{t('crop')}</p>
            <p className="text-base font-bold text-ink">{DEMO_FARMER.crop} · {DEMO_FARMER.quantity} {t('quintals')}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-ink-soft font-semibold">{t('grade')}</p>
            <p className="text-base font-bold text-ink">Grade {DEMO_FARMER.grade}</p>
          </div>
        </div>
      </Card>

      {/* Recommended option */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-brand-deep flex items-center justify-center">
            <CheckCircle2 size={16} className="text-white" />
          </div>
          <h3 className="text-sm font-bold text-brand-deep uppercase tracking-wide">{t('recommendedOption')}</h3>
        </div>

        <Card className="border-2 border-brand-mid bg-gradient-to-br from-brand-tint to-surface-card">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-lg font-extrabold text-ink">{recommended.name}</p>
              <p className="text-sm text-ink-soft flex items-center gap-1 mt-0.5">
                <MapPin size={13} />
                {recommended.location}
              </p>
            </div>
            <Chip tone="brand">
              {recommended.trust ? `${recommended.trust.trustScore}/100` : '—'}
            </Chip>
          </div>

          {/* Breakdown */}
          <div className="space-y-2.5 py-3 border-y border-line">
            <div className="flex justify-between items-center text-sm">
              <span className="text-ink-soft">{t('saleValue')}</span>
              <span className="font-semibold text-ink tabular-nums">{formatINR(recSaleValue)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-ink-soft flex items-center gap-1.5">
                <Truck size={14} />
                {t('transportCost')}
              </span>
              <span className="font-semibold text-warning tabular-nums">−{formatINR(recommended.transportCost)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-ink-soft flex items-center gap-1.5">
                <Receipt size={14} />
                {t('otherCosts')}
              </span>
              <span className="font-semibold text-warning tabular-nums">−{formatINR(recommended.otherCosts)}</span>
            </div>
          </div>

          {/* Net return */}
          <div className="flex justify-between items-baseline pt-3">
            <span className="text-sm font-bold text-ink">{t('finalNetReturn')}</span>
            <span className="text-2xl font-extrabold text-brand-deep tabular-nums">{formatINR(recNet)}</span>
          </div>
        </Card>

        {/* Why recommended */}
        <div className="mt-3 p-3.5 rounded-2xl bg-brand-soft border border-brand-mid/20">
          <p className="text-sm text-brand-deep leading-relaxed">
            <span className="font-bold">{t('whyRecommended')}:</span>{' '}
            {recommended.name === 'ABC Foods (Pune)'
              ? 'Highest net return after transport costs. Verified buyer with 91/100 trust score and 96% on-time payments.'
              : 'Best balance of price, proximity, and buyer reliability.'}
          </p>
        </div>
      </div>

      {/* Alternative options */}
      <div className="mb-4">
        <h3 className="text-sm font-bold text-ink-soft uppercase tracking-wide mb-2">{t('alternativeOptions')}</h3>
        <div className="space-y-2.5">
          {alternatives.map(opt => {
            const net = calcNetReturn(opt);
            const diff = net - recNet;
            return (
              <Card key={opt.id} className="py-3.5">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-bold text-ink">{opt.name}</p>
                    <p className="text-xs text-ink-soft flex items-center gap-1 mt-0.5">
                      <MapPin size={12} />
                      {opt.location}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-ink tabular-nums">{formatINR(opt.pricePerQuintal)}{t('perQtl')}</p>
                    <p className="text-xs text-ink-soft tabular-nums">{formatINR(net)} {t('netReturn')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {diff < 0 ? (
                    <Chip tone="warning" icon={<TrendingDown size={12} />}>
                      {formatINR(Math.abs(diff))} less
                    </Chip>
                  ) : (
                    <Chip tone="neutral" icon={<TrendingUp size={12} />}>
                      {formatINR(diff)} more
                    </Chip>
                  )}
                  {opt.trust && (
                    <Chip tone={opt.trust.trustScore >= 80 ? 'trust' : 'neutral'}>
                      Trust {opt.trust.trustScore}
                    </Chip>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-3.5 rounded-2xl bg-surface-alt">
        <Info size={16} className="text-ink-faint shrink-0 mt-0.5" />
        <p className="text-xs text-ink-soft leading-relaxed">
          This recommendation is based on available market data. Prices may fluctuate. Transport costs are estimates based on distance.
        </p>
      </div>
    </div>
  );
}
