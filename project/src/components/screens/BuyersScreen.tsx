import { useState } from 'react';
import {
  MapPin, ShieldCheck, ArrowLeft, TrendingUp, Clock, AlertTriangle,
  Star, CheckCircle2, Plus
} from 'lucide-react';
import { useApp } from '../../AppContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { TrustDial } from '../ui/TrustDial';
import { StarRating } from '../ui/StarRating';
import { ScreenHeader } from '../ui/ScreenHeader';
import { formatINR } from '../../utils/format';
import type { Buyer } from '../../types';

export function BuyersScreen() {
  const { t, buyers, setActiveTab } = useApp();
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);

  const selectedBuyer = buyers.find(b => b.id === selectedBuyerId) || null;

  if (selectedBuyer) {
    return <TrustCardView buyer={selectedBuyer} onBack={() => setSelectedBuyerId(null)} />;
  }

  // Sort by trust score then price
  const sorted = [...buyers].sort((a, b) => {
    const aScore = a.trust.trustScore * 0.6 + a.pricePerQuintal * 0.004;
    const bScore = b.trust.trustScore * 0.6 + b.pricePerQuintal * 0.004;
    return bScore - aScore;
  });

  return (
    <div className="px-4 pt-4 pb-2 sm:px-0 sm:pt-2 sm:pb-4">
      <ScreenHeader title={t('buyerMatch')} subtitle={`${buyers.length} ${t('matchedBuyers')}`} />

      <div className="space-y-3">
        {sorted.map((buyer, idx) => (
          <Card key={buyer.id} hoverable onClick={() => setSelectedBuyerId(buyer.id)}>
            {idx === 0 && (
              <div className="mb-2">
                <Chip tone="brand" icon={<Star size={12} />}>{t('bestMatch')}</Chip>
              </div>
            )}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold ${
                  buyer.trust.verifiedBusiness ? 'bg-brand-soft text-brand-deep' : 'bg-surface-alt text-ink-soft'
                }`}>
                  {buyer.name.charAt(0)}
                </div>
                <div>
                  <p className="text-base font-bold text-ink">{buyer.name}</p>
                  <p className="text-xs text-ink-soft">{buyer.type}</p>
                </div>
              </div>
              {buyer.trust.verifiedBusiness && (
                <Chip tone="brand" icon={<ShieldCheck size={12} />}>{t('verifiedBusiness')}</Chip>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
              <div>
                <p className="text-[10px] text-ink-faint font-semibold uppercase">{t('price')}</p>
                <p className="text-sm font-bold text-brand-deep tabular-nums">{formatINR(buyer.pricePerQuintal)}<span className="text-[10px] text-ink-soft">{t('perQtl')}</span></p>
              </div>
              <div>
                <p className="text-[10px] text-ink-faint font-semibold uppercase">{t('distance')}</p>
                <p className="text-sm font-bold text-ink tabular-nums">{buyer.distanceKm} km</p>
              </div>
              <div>
                <p className="text-[10px] text-ink-faint font-semibold uppercase">{t('demand')}</p>
                <p className="text-sm font-bold text-ink tabular-nums">{buyer.demandQuintals} {t('quintals')}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-line">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{
                  background: buyer.trust.trustScore >= 80 ? '#DCFCE7' : buyer.trust.trustScore >= 60 ? '#FEF3C7' : '#FEE2E2'
                }}>
                  <span className="text-xs font-extrabold" style={{
                    color: buyer.trust.trustScore >= 80 ? '#166534' : buyer.trust.trustScore >= 60 ? '#B45309' : '#DC2626'
                  }}>{buyer.trust.trustScore}</span>
                </div>
                <span className="text-xs font-semibold text-ink-soft">{t('trustScore')}</span>
              </div>
              <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); setSelectedBuyerId(buyer.id); }}>{t('viewBuyer')}</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TrustCardView({ buyer, onBack }: { buyer: Buyer; onBack: () => void }) {
  const { t, simulateTransaction, setActiveTab } = useApp();
  const [simulating, setSimulating] = useState(false);

  const handleSimulate = (rating: number, onTime: boolean) => {
    setSimulating(true);
    simulateTransaction(buyer.id, rating, onTime);
    setTimeout(() => setSimulating(false), 600);
  };

  const trust = buyer.trust;
  const trustColor = trust.trustScore >= 80 ? '#166534' : trust.trustScore >= 60 ? '#B45309' : '#DC2626';
  const trustLabel = trust.trustScore >= 80 ? t('highTrust') : trust.trustScore >= 60 ? t('mediumTrust') : t('lowTrust');

  return (
    <div className="px-4 pt-4 pb-2 sm:px-0 sm:pt-2 sm:pb-4">
      {/* Back header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-card border border-line text-ink-soft hover:bg-surface-alt transition-colors shrink-0"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-ink leading-tight">{t('trustCard')}</h1>
          <p className="text-sm text-ink-soft">{buyer.name}</p>
        </div>
      </div>

      {/* Trust dial */}
      <Card className="mb-4 flex flex-col items-center py-6">
        <TrustDial score={trust.trustScore} size={120} />
        <div className="flex items-center gap-2 mt-3">
          {trust.verifiedBusiness && (
            <Chip tone="brand" icon={<ShieldCheck size={12} />}>{t('verifiedBusiness')}</Chip>
          )}
          <span className="text-xs font-bold tracking-wider" style={{ color: trustColor }}>{trustLabel}</span>
        </div>
        <p className="text-xs text-ink-soft mt-2 text-center max-w-xs">{t('trustScoreUpdated')}</p>
      </Card>

      {/* Trust metrics */}
      <Card className="mb-4">
        <div className="space-y-3">
          <MetricRow icon={<CheckCircle2 size={16} className="text-brand-deep" />} label={t('completedDeals')} value={`${trust.completedDeals}`} />
          <MetricRow icon={<CheckCircle2 size={16} className="text-brand-deep" />} label={t('onTimePayments')} value={`${trust.onTimePaymentPct}%`} />
          <MetricRow icon={<Clock size={16} className="text-trust" />} label={t('avgPaymentTime')} value={`${trust.avgPaymentDays} ${t('days')}`} />
          <MetricRow icon={<AlertTriangle size={16} className="text-caution" />} label={t('complaints')} value={`${trust.complaints}`} />
          <div className="flex items-center justify-between pt-2 border-t border-line">
            <span className="text-sm text-ink-soft flex items-center gap-2">
              <Star size={16} className="text-market fill-market" />
              {t('farmerRating')}
            </span>
            <StarRating rating={trust.farmerRating} size={15} />
          </div>
        </div>
      </Card>

      {/* Transaction history */}
      <div className="mb-4">
        <h3 className="text-sm font-bold text-ink-soft uppercase tracking-wide mb-2">{t('transactionHistory')}</h3>
        <Card className="py-3">
          <div className="space-y-2.5">
            {buyer.recentTransactions.slice(-5).reverse().map(tx => (
              <div key={tx.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    tx.paymentStatus === 'on-time' ? 'bg-brand-light' :
                    tx.paymentStatus === 'delayed' ? 'bg-caution' : 'bg-ink-faint'
                  }`} />
                  <span className="text-ink-soft">{tx.crop}</span>
                  <span className="text-ink-faint">·</span>
                  <span className="text-ink-soft">{tx.quantity} {t('quintals')}</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-ink tabular-nums">{formatINR(tx.totalValue)}</span>
                  <p className="text-[10px] text-ink-faint">{tx.date}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Simulate transaction */}
      <Card className="mb-4 bg-surface-alt border-0">
        <p className="text-sm font-bold text-ink mb-1">{t('simulateTransaction')}</p>
        <p className="text-xs text-ink-soft mb-3">Demo: see how a new transaction updates the trust score</p>
        <div className="flex gap-2">
          <Button size="sm" variant="primary" onClick={() => handleSimulate(5, true)} disabled={simulating}>
            <Plus size={14} /> Good Deal · On-time
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleSimulate(2, false)} disabled={simulating}>
            <Plus size={14} /> Delayed Payment
          </Button>
        </div>
      </Card>

      {/* Action */}
      <Button fullWidth size="lg" onClick={() => setActiveTab('advisor')}>
        <TrendingUp size={18} />
        {t('viewRecommendation')}
      </Button>
    </div>
  );
}

function MetricRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-ink-soft flex items-center gap-2">{icon}{label}</span>
      <span className="text-sm font-bold text-ink tabular-nums">{value}</span>
    </div>
  );
}
