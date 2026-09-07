import {
  Users, Store, TrendingUp, TrendingDown, Package, Clock,
  ShieldCheck, AlertTriangle, ArrowLeft, BarChart3, Sprout, LogOut
} from 'lucide-react';
import { useApp } from '../../AppContext';
import { Card } from '../ui/Card';
import { Chip } from '../ui/Chip';
import { ScreenHeader } from '../ui/ScreenHeader';
import { Button } from '../ui/Button';
import {
  ADMIN_KPIS, ADMIN_PRICE_TRENDS, ADMIN_REGIONAL_DEMAND,
  ADMIN_BUYER_RELIABILITY, ADMIN_MONTHLY_TRANSACTIONS
} from '../../data/mockData';
import { formatINR, formatNumber, formatINRShort } from '../../utils/format';

export function AdminScreen() {
  const { t, setView, setActiveTab, setAuthenticated } = useApp();

  const maxTxnCount = Math.max(...ADMIN_MONTHLY_TRANSACTIONS.map(m => m.count));

  return (
    <div className="px-4 pt-4 pb-2 sm:px-0 sm:pt-2 sm:pb-4">
      <ScreenHeader
        title={t('governmentDashboard')}
        subtitle="Aggregated Market Intelligence"
        onBack={() => { setView('farmer'); setActiveTab('home'); }}
        right={
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-trust-soft text-trust-deep text-xs font-bold">
              <ShieldCheck size={14} />
              {t('adminView')}
            </div>
            <button onClick={() => setAuthenticated(false)} className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-soft" aria-label="Log out">
              <LogOut size={15} />
            </button>
          </div>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <KpiCard icon={<Users size={18} />} label={t('totalFarmers')} value={formatNumber(ADMIN_KPIS.totalFarmers)} tone="brand" />
        <KpiCard icon={<Store size={18} />} label={t('activeBuyers')} value={formatNumber(ADMIN_KPIS.activeBuyers)} tone="trust" />
        <KpiCard icon={<Package size={18} />} label={t('totalVolume')} value={`${formatNumber(ADMIN_KPIS.totalVolumeQuintals)} qtl`} tone="market" />
        <KpiCard icon={<BarChart3 size={18} />} label={t('transactions')} value={formatNumber(ADMIN_KPIS.totalTransactions)} tone="neutral" />
        <KpiCard icon={<Clock size={18} />} label={t('avgPaymentDelay')} value={`${ADMIN_KPIS.avgPaymentDelayDays} ${t('days')}`} tone="brand" />
        <KpiCard icon={<ShieldCheck size={18} />} label={t('trustScoreAvg')} value={`${ADMIN_KPIS.trustAvgScore}/100`} tone="trust" />
      </div>

      {/* Price trends */}
      <div className="mb-4">
        <h3 className="text-sm font-bold text-ink-soft uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <TrendingUp size={15} className="text-brand-deep" />
          {t('averagePrices')}
        </h3>
        <Card className="py-3">
          <div className="space-y-3">
            {ADMIN_PRICE_TRENDS.map(p => (
              <div key={p.crop} className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">{p.crop}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-ink tabular-nums">{formatINR(p.thisWeek)}{t('perQtl')}</span>
                  <span className={`text-xs font-semibold tabular-nums w-14 text-right ${
                    p.changePct > 0 ? 'text-brand-deep' : p.changePct < 0 ? 'text-warning' : 'text-ink-faint'
                  }`}>
                    {p.changePct > 0 ? '+' : ''}{p.changePct}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Regional supply/demand */}
      <div className="mb-4">
        <h3 className="text-sm font-bold text-ink-soft uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <Sprout size={15} className="text-brand-deep" />
          {t('supplyDemandTrends')}
        </h3>
        <Card className="py-3">
          <div className="space-y-3">
            {ADMIN_REGIONAL_DEMAND.map(r => {
              const maxVal = Math.max(r.supply, r.demand);
              return (
                <div key={r.region}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-ink">{r.region}</span>
                    {r.gap < 0 ? (
                      <Chip tone="warning">{formatNumber(Math.abs(r.gap))} {t('deficit')}</Chip>
                    ) : r.gap > 0 ? (
                      <Chip tone="brand">{formatNumber(r.gap)} {t('surplus')}</Chip>
                    ) : (
                      <Chip tone="neutral">{t('balanced')}</Chip>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-5 bg-surface-alt rounded-lg overflow-hidden">
                      <div className="h-full bg-brand-light rounded-lg" style={{ width: `${(r.supply / maxVal) * 100}%` }} />
                    </div>
                    <span className="text-xs text-ink-soft w-12 text-right tabular-nums">{formatNumber(r.supply)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-5 bg-surface-alt rounded-lg overflow-hidden">
                      <div className="h-full bg-trust rounded-lg" style={{ width: `${(r.demand / maxVal) * 100}%` }} />
                    </div>
                    <span className="text-xs text-ink-soft w-12 text-right tabular-nums">{formatNumber(r.demand)}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-line">
            <span className="flex items-center gap-1.5 text-xs text-ink-soft"><span className="w-3 h-3 rounded bg-brand-light" /> {t('regionalSupply')}</span>
            <span className="flex items-center gap-1.5 text-xs text-ink-soft"><span className="w-3 h-3 rounded bg-trust" /> {t('buyerDemandAdmin')}</span>
          </div>
        </Card>
      </div>

      {/* Monthly transactions chart */}
      <div className="mb-4">
        <h3 className="text-sm font-bold text-ink-soft uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <BarChart3 size={15} className="text-brand-deep" />
          {t('transactions')}
        </h3>
        <Card className="py-4">
          <div className="flex items-end justify-between gap-2 h-40">
            {ADMIN_MONTHLY_TRANSACTIONS.map(m => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-ink-soft tabular-nums">{m.count}</span>
                <div className="w-full rounded-t-lg bg-gradient-to-t from-brand-deep to-brand-light transition-all" style={{ height: `${(m.count / maxTxnCount) * 100}%` }} />
                <span className="text-[10px] text-ink-faint font-semibold">{m.month}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-line">
            <span className="text-xs text-ink-soft">{t('transactionCount')} · {t('valueLakhs')}</span>
            <span className="text-xs font-bold text-brand-deep">{formatINRShort(ADMIN_MONTHLY_TRANSACTIONS[ADMIN_MONTHLY_TRANSACTIONS.length - 1].value * 100000)}</span>
          </div>
        </Card>
      </div>

      {/* Buyer reliability */}
      <div className="mb-4">
        <h3 className="text-sm font-bold text-ink-soft uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <ShieldCheck size={15} className="text-trust" />
          {t('buyerReliability')}
        </h3>
        <Card className="py-3">
          <div className="space-y-3">
            {ADMIN_BUYER_RELIABILITY.map(b => (
              <div key={b.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold" style={{
                    background: b.score >= 80 ? '#DCFCE7' : b.score >= 60 ? '#FEF3C7' : '#FEE2E2',
                    color: b.score >= 80 ? '#166534' : b.score >= 60 ? '#B45309' : '#DC2626'
                  }}>
                    {b.score}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">{b.name}</p>
                    <p className="text-[10px] text-ink-soft">{b.deals} deals · {b.onTime}% on-time · {b.avgDays}d avg</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {b.onTime >= 90 ? (
                    <TrendingUp size={14} className="text-brand-deep" />
                  ) : (
                    <TrendingDown size={14} className="text-caution" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Open complaints */}
      <Card className="mb-4 bg-surface-alt border-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-caution" />
            <span className="text-sm font-bold text-ink">{t('openComplaints')}</span>
          </div>
          <span className="text-lg font-extrabold text-caution tabular-nums">{ADMIN_KPIS.complaintsOpen}</span>
        </div>
      </Card>

      <Button fullWidth size="lg" variant="outline" onClick={() => { setView('farmer'); setActiveTab('home'); }}>
        <ArrowLeft size={18} />
        {t('farmerView')}
      </Button>
    </div>
  );
}

function KpiCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: 'brand' | 'trust' | 'market' | 'neutral' }) {
  const tones = {
    brand: 'bg-brand-soft text-brand-deep',
    trust: 'bg-trust-soft text-trust-deep',
    market: 'bg-market-soft text-market-deep',
    neutral: 'bg-surface-alt text-ink-soft',
  };
  return (
    <Card className="py-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${tones[tone]}`}>
        {icon}
      </div>
      <p className="text-lg font-extrabold text-ink tabular-nums">{value}</p>
      <p className="text-xs text-ink-soft">{label}</p>
    </Card>
  );
}
