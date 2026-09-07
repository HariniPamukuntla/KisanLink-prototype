import { useState } from 'react';
import {
  UsersRound, MapPin, ShieldCheck, CheckCircle2, Package,
  ArrowRight, User
} from 'lucide-react';
import { useApp } from '../../AppContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { Modal } from '../ui/Modal';
import { ScreenHeader } from '../ui/ScreenHeader';
import { formatINR } from '../../utils/format';
import { DEMO_FARMER } from '../../data/mockData';
import type { GroupSale } from '../../types';

export function GroupsScreen() {
  const { t, groupSales, joinGroup, confirmGroupSale } = useApp();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const selectedGroup = groupSales.find(g => g.id === selectedGroupId) || null;
  const openGroups = groupSales.filter(g => g.status === 'open');

  const handleJoin = (group: GroupSale) => {
    setSelectedGroupId(group.id);
    joinGroup(group.id);
  };

  const handleConfirm = () => {
    if (selectedGroup) {
      confirmGroupSale(selectedGroup.id);
      setConfirmed(true);
    }
  };

  const handleClose = () => {
    setShowConfirm(false);
    setConfirmed(false);
    setSelectedGroupId(null);
  };

  if (selectedGroup) {
    const totalQuantity = selectedGroup.farmers.reduce((s, f) => s + f.quantity, 0);
    const userFarmer = selectedGroup.farmers.find(f => f.isCurrentUser);
    const joinedFarmers = selectedGroup.farmers.filter(f => f.joined);
    const joinedQty = joinedFarmers.reduce((s, f) => s + f.quantity, 0);

    return (
      <div className="px-4 pt-4 pb-2 sm:px-0 sm:pt-2 sm:pb-4">
        <ScreenHeader
          title={t('groupSelling')}
          subtitle={`${selectedGroup.buyerName} · ${selectedGroup.crop} Grade ${selectedGroup.grade}`}
        />

        {/* Buyer demand card */}
        <Card className="mb-4 bg-gradient-to-br from-brand-deep to-brand-mid border-0">
          <div className="flex items-center gap-2 mb-2">
            <Package size={18} className="text-white" />
            <span className="text-white font-bold">{t('buyerDemand')}</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-extrabold text-white tabular-nums">{selectedGroup.requiredQuantity}<span className="text-base font-medium text-white/70"> {t('quintals')}</span></p>
              <p className="text-sm text-white/80 mt-1">{selectedGroup.buyerName} · {selectedGroup.buyerLocation}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold text-white tabular-nums">{formatINR(selectedGroup.pricePerQuintal)}</p>
              <p className="text-xs text-white/70">{t('perQuintal')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/15">
            <ShieldCheck size={14} className="text-white" />
            <span className="text-xs text-white/80">{t('verifiedBuyer')} · {t('trustScore')}: {selectedGroup.buyerTrustScore}/100</span>
          </div>
        </Card>

        {/* Group summary */}
        <Card className="mb-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-extrabold text-brand-deep tabular-nums">{totalQuantity}</p>
              <p className="text-xs text-ink-soft">{t('totalGroup')} {t('quintals')}</p>
            </div>
            <div className="border-x border-line">
              <p className="text-2xl font-extrabold text-ink tabular-nums">{selectedGroup.requiredQuantity}</p>
              <p className="text-xs text-ink-soft">{t('requiredQuantity')}</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-trust tabular-nums">{joinedQty}</p>
              <p className="text-xs text-ink-soft">{t('joined')}</p>
            </div>
          </div>
        </Card>

        {/* Farmer list */}
        <div className="mb-4">
          <h3 className="text-sm font-bold text-ink-soft uppercase tracking-wide mb-2">{t('matchedBuyers')}</h3>
          <Card className="py-3">
            <div className="space-y-2.5">
              {selectedGroup.farmers.map(f => (
                <div key={f.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                      f.isCurrentUser ? 'bg-brand-deep text-white' : 'bg-surface-alt text-ink-soft'
                    }`}>
                      {f.isCurrentUser ? <User size={16} /> : f.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {f.isCurrentUser ? `${t('you')}` : f.name}
                        {f.isCurrentUser && <span className="text-xs text-brand-deep ml-1">({DEMO_FARMER.name})</span>}
                      </p>
                      <p className="text-xs text-ink-soft">{f.village}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-ink tabular-nums">{f.quantity} {t('quintals')}</span>
                    {f.joined ? (
                      <CheckCircle2 size={16} className="text-brand-light" />
                    ) : (
                      <span className="text-[10px] text-ink-faint">{t('notJoined')}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Your contribution */}
        {userFarmer && (
          <Card className="mb-4 bg-surface-alt border-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-ink-soft font-semibold">{t('yourContribution')}</p>
                <p className="text-lg font-extrabold text-brand-deep tabular-nums">{userFarmer.quantity} {t('quintals')}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-ink-soft font-semibold">{t('estimatedPrice')}</p>
                <p className="text-lg font-extrabold text-ink tabular-nums">{formatINR(userFarmer.quantity * selectedGroup.pricePerQuintal)}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Action */}
        {selectedGroup.status === 'confirmed' ? (
          <Card className="border-2 border-brand-mid bg-brand-tint">
            <div className="flex flex-col items-center text-center py-2">
              <div className="w-14 h-14 rounded-full bg-brand-deep flex items-center justify-center mb-3">
                <CheckCircle2 size={32} className="text-white" />
              </div>
              <p className="text-lg font-extrabold text-brand-deep">{t('groupSaleConfirmed')}</p>
              <p className="text-sm text-ink-soft mt-1">{selectedGroup.buyerName} · {selectedGroup.requiredQuantity} {t('quintals')}</p>
            </div>
          </Card>
        ) : userFarmer?.joined ? (
          <Button fullWidth size="lg" onClick={() => setShowConfirm(true)}>
            <CheckCircle2 size={18} />
            {t('confirmGroup')}
          </Button>
        ) : (
          <Button fullWidth size="lg" onClick={() => handleJoin(selectedGroup)}>
            <UsersRound size={18} />
            {t('joinGroup')}
          </Button>
        )}

        {/* Confirm modal */}
        <Modal open={showConfirm && !confirmed} onClose={handleClose} title={t('confirmGroup')}>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-alt">
              <div className="w-12 h-12 rounded-2xl bg-brand-soft flex items-center justify-center">
                <Package size={24} className="text-brand-deep" />
              </div>
              <div>
                <p className="text-sm font-bold text-ink">{selectedGroup.buyerName}</p>
                <p className="text-xs text-ink-soft">{selectedGroup.requiredQuantity} {t('quintals')} · {formatINR(selectedGroup.pricePerQuintal)}{t('perQuintal')}</p>
              </div>
            </div>
            <Button fullWidth size="lg" onClick={handleConfirm}>
              {t('confirm')}
              <ArrowRight size={18} />
            </Button>
          </div>
        </Modal>

        {/* Confirmed modal */}
        <Modal open={confirmed} onClose={handleClose} title={t('groupSaleConfirmed')}>
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-20 h-20 rounded-full bg-brand-deep flex items-center justify-center mb-4 shadow-brand-glow">
              <CheckCircle2 size={44} className="text-white" />
            </div>
            <p className="text-xl font-extrabold text-brand-deep mb-1">{t('groupSaleConfirmed')}</p>
            <p className="text-sm text-ink-soft mb-4">
              {selectedGroup.buyerName} will buy {selectedGroup.requiredQuantity} {t('quintals')} at {formatINR(selectedGroup.pricePerQuintal)}{t('perQuintal')}
            </p>
            <Button fullWidth size="lg" variant="primary" onClick={handleClose}>
              {t('close')}
            </Button>
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-2 sm:px-0 sm:pt-2 sm:pb-4">
      <ScreenHeader title={t('groupSelling')} subtitle={`${openGroups.length} ${t('open')}`} />

      <div className="space-y-3">
        {openGroups.map(group => {
          const totalQty = group.farmers.reduce((s, f) => s + f.quantity, 0);
          return (
            <Card key={group.id} hoverable onClick={() => setSelectedGroupId(group.id)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-brand-soft flex items-center justify-center">
                    <UsersRound size={24} className="text-brand-deep" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-ink">{group.buyerName}</p>
                    <p className="text-xs text-ink-soft flex items-center gap-1 mt-0.5">
                      <MapPin size={12} />
                      {group.buyerLocation}
                    </p>
                  </div>
                </div>
                {group.buyerTrustScore >= 80 && (
                  <Chip tone="brand" icon={<ShieldCheck size={12} />}>{t('verifiedBuyer')}</Chip>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 py-3 border-y border-line">
                <div>
                  <p className="text-[10px] text-ink-faint font-semibold uppercase">{t('demand')}</p>
                  <p className="text-sm font-bold text-ink tabular-nums">{group.requiredQuantity} {t('quintals')}</p>
                </div>
                <div className="border-x border-line px-2">
                  <p className="text-[10px] text-ink-faint font-semibold uppercase">{t('price')}</p>
                  <p className="text-sm font-bold text-brand-deep tabular-nums">{formatINR(group.pricePerQuintal)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-ink-faint font-semibold uppercase">{t('groupAvailable')}</p>
                  <p className="text-sm font-bold text-trust tabular-nums">{totalQty} {t('quintals')}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-1.5">
                  <div className="flex -space-x-1.5">
                    {group.farmers.slice(0, 4).map((f, i) => (
                      <div key={f.id} className={`w-6 h-6 rounded-full border-2 border-surface-card flex items-center justify-center text-[9px] font-bold ${
                        f.isCurrentUser ? 'bg-brand-deep text-white' : 'bg-surface-alt text-ink-soft'
                      }`} style={{ zIndex: 4 - i }}>
                        {f.name.charAt(0)}
                      </div>
                    ))}
                  </div>
                  <span className="text-xs text-ink-soft">{group.farmers.length} {t('matchedBuyers')}</span>
                </div>
                <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); setSelectedGroupId(group.id); }}>
                  {t('viewBuyer')}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
