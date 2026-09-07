import { Sprout, Bell, ChevronRight, Mic, TrendingUp, ShieldCheck, UsersRound, Calculator } from 'lucide-react';
import { useApp } from '../../AppContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { DEMO_FARMER } from '../../data/mockData';
import { formatINR } from '../../utils/format';

export function HomeScreen() {
  const { t, setActiveTab, buyers, groupSales, setView, view } = useApp();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('goodMorning') : hour < 17 ? t('goodAfternoon') : t('goodEvening');

  const topBuyer = buyers.find(b => b.id === 'b2');
  const verifiedCount = buyers.filter(b => b.trust.verifiedBusiness).length;
  const openGroup = groupSales.find(g => g.status === 'open');

  return (
    <div className="px-4 pt-4 pb-2 sm:px-0 sm:pt-2 sm:pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-brand-deep flex items-center justify-center">
            <Sprout size={22} className="text-white" strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-brand-deep leading-none tracking-tight">KisanLink</h1>
            <p className="text-[10px] text-ink-soft mt-0.5">{t('tagline')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView(view === 'farmer' ? 'admin' : 'farmer')}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-card border border-line text-ink-soft hover:bg-surface-alt transition-colors"
            title={view === 'farmer' ? t('adminView') : t('farmerView')}
          >
            <ShieldCheck size={18} />
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-card border border-line text-ink-soft hover:bg-surface-alt transition-colors relative"
            aria-label={t('notifications')}
          >
            <Bell size={18} />
            <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-warning" />
          </button>
          <div className="w-10 h-10 rounded-full bg-brand-soft flex items-center justify-center text-brand-deep font-bold text-sm">
            {DEMO_FARMER.avatar}
          </div>
        </div>
      </div>

      {/* Greeting */}
      <div className="mb-4">
        <h2 className="text-2xl font-extrabold text-ink">{greeting}, {DEMO_FARMER.name}</h2>
        <p className="text-sm text-ink-soft mt-0.5">{DEMO_FARMER.crop} · {DEMO_FARMER.quantity} {t('quintals')} · {DEMO_FARMER.village}, {DEMO_FARMER.district}</p>
      </div>

      {/* KisanVoice Hero Card */}
      <Card className="mb-4 bg-gradient-to-br from-brand-deep to-brand-mid border-0 overflow-hidden" >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
            <Mic size={18} className="text-white" />
          </div>
          <span className="text-white font-bold text-base">KisanVoice</span>
        </div>
        <p className="text-white/90 text-sm mb-4">{t('speakInYourLanguage')}</p>
        <button
          onClick={() => setActiveTab('voice')}
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl bg-white/15 hover:bg-white/20 transition-colors backdrop-blur-sm"
        >
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
              <Mic size={24} className="text-brand-deep" />
            </div>
            <span className="absolute inset-0 rounded-full animate-pulse-ring" />
          </div>
          <span className="text-white font-semibold text-sm">{t('tapToSpeak')}</span>
        </button>
        <p className="text-white/70 text-xs text-center mt-3">मराठी · हिंदी · తెలుగు · English · ગુજરાતી · বাংলা</p>
      </Card>

      {/* Best Selling Opportunity */}
      <div className="mb-4">
        <h3 className="text-sm font-bold text-ink-soft uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <TrendingUp size={15} className="text-brand-deep" />
          {t('bestSellingOpportunity')}
        </h3>
        <Card hoverable onClick={() => setActiveTab('advisor')} className="border-brand-mid/30">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-base font-bold text-ink">{topBuyer?.name}</p>
              <p className="text-sm text-ink-soft">{topBuyer?.location} · {topBuyer?.distanceKm} km</p>
            </div>
            <Chip tone="brand" icon={<span className="w-2 h-2 rounded-full bg-brand-light" />}>{t('recommended')}</Chip>
          </div>
          <div className="flex items-end justify-between mt-3">
            <div>
              <p className="text-2xl font-extrabold text-brand-deep">{formatINR(topBuyer?.pricePerQuintal || 0)}<span className="text-sm font-medium text-ink-soft">{t('perQuintal')}</span></p>
              <p className="text-xs text-ink-soft mt-1">{t('estimatedNetReturn')}: <span className="font-bold text-ink">{formatINR(50000)}</span></p>
            </div>
            <ChevronRight size={20} className="text-ink-faint shrink-0" />
          </div>
        </Card>
      </div>

      {/* Trusted Buyers */}
      <div className="mb-4">
        <h3 className="text-sm font-bold text-ink-soft uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <ShieldCheck size={15} className="text-trust" />
          {t('trustedBuyers')}
        </h3>
        <Card hoverable onClick={() => setActiveTab('buyers')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-bold text-ink">{verifiedCount} {t('verifiedBuyersMatch')}</p>
              <p className="text-sm text-ink-soft mt-0.5">{t('buyerMatch')}</p>
            </div>
            <ChevronRight size={20} className="text-ink-faint shrink-0" />
          </div>
        </Card>
      </div>

      {/* Group Selling */}
      {openGroup && (
        <div className="mb-4">
          <h3 className="text-sm font-bold text-ink-soft uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <UsersRound size={15} className="text-market" />
            {t('groupSellingOpportunity')}
          </h3>
          <Card hoverable onClick={() => setActiveTab('groups')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-bold text-ink">{openGroup.buyerName} {t('needs')} {openGroup.requiredQuantity} {t('quintals')}</p>
                <p className="text-sm text-ink-soft mt-0.5">{formatINR(openGroup.pricePerQuintal)}{t('perQuintal')} · {t('verifiedBuyer')}</p>
              </div>
              <ChevronRight size={20} className="text-ink-faint shrink-0" />
            </div>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-2">
        <button
          onClick={() => setActiveTab('advisor')}
          className="flex flex-col items-center gap-2 p-4 rounded-3xl bg-surface-card border border-line hover:border-ink-faint transition-colors"
        >
          <div className="w-11 h-11 rounded-2xl bg-brand-soft flex items-center justify-center">
            <Calculator size={22} className="text-brand-deep" />
          </div>
          <span className="text-sm font-semibold text-ink">{t('netReturnAdvisor')}</span>
        </button>
        <button
          onClick={() => setActiveTab('voice')}
          className="flex flex-col items-center gap-2 p-4 rounded-3xl bg-surface-card border border-line hover:border-ink-faint transition-colors"
        >
          <div className="w-11 h-11 rounded-2xl bg-market-soft flex items-center justify-center">
            <Mic size={22} className="text-market-deep" />
          </div>
          <span className="text-sm font-semibold text-ink">KisanVoice</span>
        </button>
      </div>
    </div>
  );
}
