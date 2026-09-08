import { useMemo, useState, type ReactNode } from 'react';
import { Home, MapPin, Package, Search, ShoppingCart, SlidersHorizontal, User, X, LogOut, CheckCircle2, Clock3, Send, Star } from 'lucide-react';
import { useApp } from '../AppContext';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Chip } from './ui/Chip';
import { getFarmerProfiles } from '../services/authService';
import { daysSinceHarvest, SAMPLE_PRODUCE_LISTINGS } from '../data/buyerData';
import type { BuyerRequest, ProduceListing } from '../types';
import { formatINR } from '../utils/format';

type BuyerTab = 'home' | 'marketplace' | 'requests' | 'profile';

export function BuyerDashboard() {
  const { buyerProfile, buyerRequests, sendBuyerRequest, logout, t } = useApp();
  const [tab, setTab] = useState<BuyerTab>('home');
  const [selectedListing, setSelectedListing] = useState<ProduceListing | null>(null);
  const [requestListing, setRequestListing] = useState<ProduceListing | null>(null);
  const [requestedQuantity, setRequestedQuantity] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [query, setQuery] = useState('');
  const [cropFilter, setCropFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [freshnessFilter, setFreshnessFilter] = useState('all');
  const [minQuantity, setMinQuantity] = useState('');

  const listings = useMemo(() => {
    const farmerListings = getFarmerProfiles().flatMap(profile => {
      if (!profile.produce) return [];
      const produce = profile.produce;
      return [{
        ...produce,
        id: produce.id || `listing-${profile.id}`,
        farmerId: profile.id,
        farmerName: profile.name,
        district: profile.district,
        state: produce.state || 'Maharashtra',
        expectedPricePerQuintal: produce.expectedPricePerQuintal || (produce.grade === 'A' ? 2600 : produce.grade === 'B' ? 2300 : 1900),
      } satisfies ProduceListing];
    });
    const realIds = new Set(farmerListings.map(listing => listing.id));
    return [...farmerListings, ...SAMPLE_PRODUCE_LISTINGS.filter(listing => !realIds.has(listing.id))];
  }, []);

  const crops = useMemo(() => Array.from(new Set(listings.map(listing => listing.cropName))).sort(), [listings]);
  const locations = useMemo(() => Array.from(new Set(listings.map(listing => listing.district))).sort(), [listings]);

  const filteredListings = useMemo(() => listings.filter(listing => {
    const days = daysSinceHarvest(listing.harvestDate);
    const matchesQuery = !query.trim() || `${listing.cropName} ${listing.variety || ''} ${listing.district} ${listing.farmerName}`.toLowerCase().includes(query.toLowerCase());
    const matchesCrop = !cropFilter || listing.cropName === cropFilter;
    const matchesGrade = !gradeFilter || listing.grade === gradeFilter;
    const matchesLocation = !locationFilter || listing.district === locationFilter;
    const matchesQuantity = !minQuantity || listing.quantityQuintals >= Number(minQuantity);
    const matchesFreshness = freshnessFilter === 'all' || (days !== null && (freshnessFilter === 'fresh' ? days <= 7 : freshnessFilter === 'recent' ? days <= 14 : days > 14));
    return matchesQuery && matchesCrop && matchesGrade && matchesLocation && matchesQuantity && matchesFreshness;
  }), [cropFilter, freshnessFilter, gradeFilter, listings, locationFilter, minQuantity, query]);

  const matchedListings = useMemo(() => {
    if (!buyerProfile) return [];
    return [...listings].sort((a, b) => matchScore(b, buyerProfile) - matchScore(a, buyerProfile)).slice(0, 3);
  }, [buyerProfile, listings]);

  if (!buyerProfile) return null;

  const openRequest = (listing: ProduceListing) => {
    setSelectedListing(null);
    setRequestListing(listing);
    setRequestedQuantity(String(Math.min(buyerProfile.typicalQuantityQuintals, listing.quantityQuintals)));
    setRequestSent(false);
  };

  const submitRequest = () => {
    if (!requestListing || Number(requestedQuantity) <= 0 || Number(requestedQuantity) > requestListing.quantityQuintals) return;
    sendBuyerRequest({
      listingId: requestListing.id,
      cropName: requestListing.cropName,
      farmerName: requestListing.farmerName,
      requestedQuantity: Number(requestedQuantity),
      expectedPricePerQuintal: requestListing.expectedPricePerQuintal,
      grade: requestListing.grade,
    });
    setRequestSent(true);
  };

  const title = tab === 'home' ? t('buyerHome') : tab === 'marketplace' ? t('marketplace') : tab === 'requests' ? t('requestsOrders') : t('buyerProfile');

  return (
    <div className="min-h-screen bg-surface pb-24">
      <div className="mx-auto max-w-2xl px-4 pt-4 sm:px-0">
        <header className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-market-deep"><ShoppingCart size={21} className="text-white" /></div>
            <div><p className="text-lg font-extrabold leading-none text-market-deep">KisanLink</p><p className="mt-1 text-xs text-ink-soft">{t('buyerPortal')}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block"><p className="text-sm font-bold text-ink">{buyerProfile.businessName}</p><p className="text-xs text-ink-soft">{buyerProfile.district}</p></div>
            <button type="button" onClick={logout} className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface-card text-ink-soft" aria-label={t('signOut')}><LogOut size={17} /></button>
          </div>
        </header>

        <div className="mb-5 flex items-center justify-between">
          <div><p className="text-xs font-bold uppercase tracking-wide text-market-deep">{t('buyerDashboard')}</p><h1 className="text-2xl font-extrabold text-ink">{title}</h1></div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-market-soft text-market-deep"><User size={21} /></div>
        </div>

        {tab === 'home' && <BuyerHome listings={matchedListings} allListings={listings} onView={setSelectedListing} onRequest={openRequest} t={t} />}
        {tab === 'marketplace' && <Marketplace listings={filteredListings} crops={crops} locations={locations} query={query} setQuery={setQuery} cropFilter={cropFilter} setCropFilter={setCropFilter} gradeFilter={gradeFilter} setGradeFilter={setGradeFilter} locationFilter={locationFilter} setLocationFilter={setLocationFilter} freshnessFilter={freshnessFilter} setFreshnessFilter={setFreshnessFilter} minQuantity={minQuantity} setMinQuantity={setMinQuantity} onView={setSelectedListing} onRequest={openRequest} t={t} />}
        {tab === 'requests' && <Requests requests={buyerRequests} onView={listingId => setSelectedListing(listings.find(listing => listing.id === listingId) || null)} t={t} />}
        {tab === 'profile' && <BuyerProfileView t={t} />}
      </div>

      <BuyerNav tab={tab} setTab={setTab} t={t} />

      {selectedListing && <ListingDetails listing={selectedListing} onClose={() => setSelectedListing(null)} onRequest={() => openRequest(selectedListing)} t={t} />}
      {requestListing && <RequestDialog listing={requestListing} quantity={requestedQuantity} setQuantity={setRequestedQuantity} sent={requestSent} onClose={() => setRequestListing(null)} onSubmit={submitRequest} t={t} />}
    </div>
  );
}

function BuyerHome({ listings, allListings, onView, onRequest, t }: { listings: ProduceListing[]; allListings: ProduceListing[]; onView: (listing: ProduceListing) => void; onRequest: (listing: ProduceListing) => void; t: (key: string) => string }) {
  return (
    <div className="space-y-4">
      <Card className="border-0 bg-gradient-to-br from-market-deep to-market-mid text-white">
        <p className="text-sm font-semibold text-white/80">{t('availableProduce')}</p>
        <div className="mt-2 flex items-end justify-between"><p className="text-4xl font-extrabold">{allListings.length}</p><p className="max-w-[180px] text-right text-sm text-white/80">{t('buyerHomeSubtitle')}</p></div>
      </Card>
      <section>
        <SectionHeading icon={<Star size={16} />} title={t('aiMatchedProduce')} subtitle={t('aiMatchedSubtitle')} />
        <div className="space-y-3">{listings.map(listing => <ListingCard key={listing.id} listing={listing} onView={onView} onRequest={onRequest} t={t} />)}</div>
      </section>
      <section>
        <SectionHeading icon={<Package size={16} />} title={t('availableProduce')} subtitle={t('browseMarketplace')} />
        <div className="grid gap-3 sm:grid-cols-2">{allListings.slice(0, 4).map(listing => <CompactListing key={listing.id} listing={listing} onView={onView} t={t} />)}</div>
      </section>
    </div>
  );
}

function Marketplace({ listings, crops, locations, query, setQuery, cropFilter, setCropFilter, gradeFilter, setGradeFilter, locationFilter, setLocationFilter, freshnessFilter, setFreshnessFilter, minQuantity, setMinQuantity, onView, onRequest, t }: {
  listings: ProduceListing[];
  crops: string[];
  locations: string[];
  query: string;
  setQuery: (value: string) => void;
  cropFilter: string;
  setCropFilter: (value: string) => void;
  gradeFilter: string;
  setGradeFilter: (value: string) => void;
  locationFilter: string;
  setLocationFilter: (value: string) => void;
  freshnessFilter: string;
  setFreshnessFilter: (value: string) => void;
  minQuantity: string;
  setMinQuantity: (value: string) => void;
  onView: (listing: ProduceListing) => void;
  onRequest: (listing: ProduceListing) => void;
  t: (key: string) => string;
}) {
  return (
    <div>
      <Card className="mb-4">
        <div className="relative"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={t('searchProduce')} className="w-full rounded-2xl border border-line bg-surface-alt py-3 pl-10 pr-3 text-sm text-ink outline-none focus:border-market-deep" /></div>
        <div className="mt-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink-soft"><SlidersHorizontal size={15} /> {t('filters')}</div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Filter value={cropFilter} onChange={setCropFilter} placeholder={t('allCrops')} options={crops} />
          <Filter value={gradeFilter} onChange={setGradeFilter} placeholder={t('allGrades')} options={['A', 'B', 'C']} prefix="Grade " />
          <Filter value={locationFilter} onChange={setLocationFilter} placeholder={t('allLocations')} options={locations} />
          <Filter value={freshnessFilter} onChange={setFreshnessFilter} placeholder={t('allFreshness')} options={['fresh', 'recent', 'older']} labels={{ fresh: t('freshUnder7'), recent: t('freshUnder14'), older: t('olderProduce') }} />
          <input value={minQuantity} onChange={event => setMinQuantity(event.target.value)} type="number" min="0" placeholder={t('minimumQuantity')} className="rounded-xl border border-line bg-surface-card px-3 py-2 text-xs text-ink outline-none focus:border-market-deep" />
        </div>
      </Card>
      <div className="mb-3 flex items-center justify-between"><p className="text-sm font-bold text-ink">{listings.length} {t('listingsFound')}</p><p className="text-xs text-ink-soft">{t('aiAssistedAssessment')}</p></div>
      <div className="space-y-3">{listings.map(listing => <ListingCard key={listing.id} listing={listing} onView={onView} onRequest={onRequest} t={t} />)}</div>
      {!listings.length && <Card className="text-center"><p className="font-bold text-ink">{t('noListings')}</p><p className="mt-1 text-sm text-ink-soft">{t('tryDifferentFilters')}</p></Card>}
    </div>
  );
}

function Requests({ requests, onView, t }: { requests: BuyerRequest[]; onView: (listingId: string) => void; t: (key: string) => string }) {
  return requests.length ? <div className="space-y-3">{requests.map(request => <Card key={request.id}><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-ink">{request.cropName} · Grade {request.grade}</p><p className="mt-1 text-sm text-ink-soft">{request.farmerName} · {request.requestedQuantity} {t('quintals')}</p></div><Status status={request.status} t={t} /></div><div className="mt-3 flex items-center justify-between border-t border-line pt-3"><p className="text-xs text-ink-soft">{t('requestSent')} {new Date(request.createdAt).toLocaleDateString()}</p><button type="button" onClick={() => onView(request.listingId)} className="text-xs font-bold text-market-deep">{t('viewDetails')}</button></div></Card>)}</div> : <Card className="text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-market-soft text-market-deep"><Send size={20} /></div><p className="mt-3 font-bold text-ink">{t('noRequests')}</p><p className="mt-1 text-sm text-ink-soft">{t('noRequestsSubtitle')}</p></Card>;
}

function BuyerProfileView({ t }: { t: (key: string) => string }) {
  const { buyerProfile } = useApp();
  if (!buyerProfile) return null;
  return <div className="space-y-4"><Card className="border-market-mid/20"><div className="flex items-center gap-3"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-market-soft text-xl font-extrabold text-market-deep">{buyerProfile.businessName.slice(0, 2).toUpperCase()}</div><div><h2 className="text-xl font-extrabold text-ink">{buyerProfile.businessName}</h2><p className="text-sm text-ink-soft">{buyerProfile.buyerType} · {buyerProfile.district}, {buyerProfile.state}</p></div></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><Info label={t('cropsPurchased')} value={buyerProfile.crops.join(', ')} /><Info label={t('preferredGrades')} value={buyerProfile.preferredGrades.map(grade => `Grade ${grade}`).join(', ')} /><Info label={t('typicalQuantity')} value={`${buyerProfile.typicalQuantityQuintals} ${t('quintals')}`} /><Info label={t('verificationStatus')} value={buyerProfile.verified ? t('verified') : t('prototypeVerification')} /></div></Card><Card><div className="flex items-center gap-2"><CheckCircle2 size={18} className="text-trust" /><h2 className="font-bold text-ink">{t('buyerTrustProfile')}</h2></div><div className="mt-4 grid grid-cols-3 gap-3 text-center"><div><p className="text-2xl font-extrabold text-market-deep">{buyerProfile.trust.trustScore}</p><p className="text-xs text-ink-soft">{t('trustScore')}</p></div><div><p className="text-2xl font-extrabold text-ink">{buyerProfile.trust.completedDeals}</p><p className="text-xs text-ink-soft">{t('completedDeals')}</p></div><div><p className="text-2xl font-extrabold text-trust">{buyerProfile.trust.onTimePaymentPct}%</p><p className="text-xs text-ink-soft">{t('onTimePayments')}</p></div></div></Card></div>;
}

function ListingCard({ listing, onView, onRequest, t }: { listing: ProduceListing; onView: (listing: ProduceListing) => void; onRequest: (listing: ProduceListing) => void; t: (key: string) => string }) {
  const days = daysSinceHarvest(listing.harvestDate);
  return <Card className="overflow-hidden p-0"><div className="flex gap-3 p-3"><ListingImage listing={listing} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><h3 className="font-extrabold text-ink">{listing.cropName}</h3><p className="text-xs text-ink-soft">{listing.variety || t('varietyNotAvailable')} · {listing.farmerName}</p></div><Grade grade={listing.grade} /></div><div className="mt-2 grid grid-cols-2 gap-1 text-xs text-ink-soft"><span>{listing.quantityQuintals} {t('quintals')}</span><span>{listing.district}</span><span>{t('qualityScore')}: {listing.qualityScore || '—'}</span><span>{days === null ? '—' : `${days} ${t('daysSinceHarvest')}`}</span></div><p className="mt-2 font-extrabold text-market-deep">{formatINR(listing.expectedPricePerQuintal)}<span className="text-xs font-medium text-ink-soft">{t('perQuintal')}</span></p></div></div><div className="grid grid-cols-2 gap-2 border-t border-line p-3"><Button variant="outline" size="sm" onClick={() => onView(listing)}>{t('viewDetails')}</Button><Button size="sm" onClick={() => onRequest(listing)}><Send size={14} /> {t('sendRequest')}</Button></div></Card>;
}

function CompactListing({ listing, onView, t }: { listing: ProduceListing; onView: (listing: ProduceListing) => void; t: (key: string) => string }) {
  return <button type="button" onClick={() => onView(listing)} className="text-left"><Card className="h-full p-3 transition hover:border-market-mid"><div className="mb-2 overflow-hidden rounded-2xl"><ListingImage listing={listing} compact /></div><div className="flex items-start justify-between gap-2"><p className="font-bold text-ink">{listing.cropName}</p><Grade grade={listing.grade} /></div><p className="mt-1 text-xs text-ink-soft">{listing.quantityQuintals} {t('quintals')} · {listing.district}</p></Card></button>;
}

function ListingDetails({ listing, onClose, onRequest, t }: { listing: ProduceListing; onClose: () => void; onRequest: () => void; t: (key: string) => string }) {
  const days = daysSinceHarvest(listing.harvestDate);
  return <Overlay onClose={onClose}><div className="mb-4 flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-market-deep">{t('produceDetails')}</p><h2 className="text-2xl font-extrabold text-ink">{listing.cropName}</h2></div><CloseButton onClick={onClose} /></div><div className="overflow-hidden rounded-3xl"><ListingImage listing={listing} large /></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><Info label={t('farmer')} value={`${listing.farmerName} · ${listing.district}`} /><Info label={t('variety')} value={listing.variety || t('varietyNotAvailable')} /><Info label={t('quantity')} value={`${listing.quantityQuintals} ${t('quintals')}`} /><Info label={t('grade')} value={`Grade ${listing.grade} · ${listing.qualityScore || '—'}/100`} /><Info label={t('harvestDate')} value={listing.harvestDate || '—'} /><Info label={t('daysSinceHarvest')} value={days === null ? '—' : `${days} ${t('days')}`} /><Info label={t('location')} value={`${listing.district}, ${listing.state}`} /><Info label={t('expectedPrice')} value={`${formatINR(listing.expectedPricePerQuintal)}${t('perQuintal')}`} /></div><p className="mt-4 rounded-2xl bg-market-soft px-3 py-2 text-xs font-semibold leading-relaxed text-market-deep">{t('aiAssistedDisclaimer')}</p><Button fullWidth size="lg" className="mt-4" onClick={onRequest}><Send size={17} /> {t('contactSendRequest')}</Button></Overlay>;
}

function RequestDialog({ listing, quantity, setQuantity, sent, onClose, onSubmit, t }: { listing: ProduceListing; quantity: string; setQuantity: (value: string) => void; sent: boolean; onClose: () => void; onSubmit: () => void; t: (key: string) => string }) {
  return <Overlay onClose={onClose}><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-market-deep">{t('sendRequest')}</p><h2 className="text-xl font-extrabold text-ink">{listing.cropName} · Grade {listing.grade}</h2></div><CloseButton onClick={onClose} /></div>{sent ? <div className="py-8 text-center"><CheckCircle2 size={44} className="mx-auto text-trust" /><h3 className="mt-3 text-lg font-extrabold text-ink">{t('requestSentTitle')}</h3><p className="mt-1 text-sm text-ink-soft">{t('requestSentSubtitle')}</p><Button className="mt-5" onClick={onClose}>{t('close')}</Button></div> : <><p className="mt-4 text-sm leading-relaxed text-ink-soft">{t('requestQuantityHelp')} {listing.farmerName}.</p><label className="mt-4 block"><span className="mb-1.5 block text-xs font-bold text-ink-soft">{t('requiredQuantity')}</span><input type="number" min="1" max={listing.quantityQuintals} value={quantity} onChange={event => setQuantity(event.target.value)} className="w-full rounded-2xl border border-line bg-surface-card px-4 py-3 text-sm outline-none focus:border-market-deep" /></label><Button fullWidth size="lg" className="mt-5" onClick={onSubmit}><Send size={17} /> {t('sendRequest')}</Button></>}</Overlay>;
}

function ListingImage({ listing, compact = false, large = false }: { listing: ProduceListing; compact?: boolean; large?: boolean }) {
  const source = listing.photos?.[0];
  return source ? <img src={source} alt={`${listing.cropName} produce`} className={`w-full object-cover ${large ? 'aspect-[16/9]' : compact ? 'aspect-[2/1]' : 'h-24 w-28 rounded-2xl'}`} /> : <div className={`flex items-center justify-center bg-market-soft text-3xl ${large ? 'aspect-[16/9]' : compact ? 'aspect-[2/1]' : 'h-24 w-28 rounded-2xl'}`}>🌾</div>;
}

function BuyerNav({ tab, setTab, t }: { tab: BuyerTab; setTab: (tab: BuyerTab) => void; t: (key: string) => string }) {
  const items: Array<{ id: BuyerTab; icon: typeof Home; label: string }> = [{ id: 'home', icon: Home, label: t('home') }, { id: 'marketplace', icon: Search, label: t('marketplace') }, { id: 'requests', icon: Package, label: t('requestsOrders') }, { id: 'profile', icon: User, label: t('profile') }];
  return <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-surface-card shadow-nav safe-bottom"><div className="mx-auto flex max-w-2xl items-stretch">{items.map(({ id, icon: Icon, label }) => <button key={id} type="button" onClick={() => setTab(id)} className={`flex flex-1 flex-col items-center gap-1 py-2.5 ${tab === id ? 'text-market-deep' : 'text-ink-faint'}`}><span className={`flex h-8 w-12 items-center justify-center rounded-2xl ${tab === id ? 'bg-market-soft' : ''}`}><Icon size={21} /></span><span className="text-[11px] font-semibold">{label}</span></button>)}</div></nav>;
}

function SectionHeading({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) { return <div className="mb-2 flex items-end justify-between"><div><h2 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-ink-soft">{icon}{title}</h2><p className="mt-1 text-xs text-ink-faint">{subtitle}</p></div></div>; }
function Filter({ value, onChange, placeholder, options, prefix = '', labels = {} }: { value: string; onChange: (value: string) => void; placeholder: string; options: string[]; prefix?: string; labels?: Record<string, string> }) { return <select value={value} onChange={event => onChange(event.target.value)} className="rounded-xl border border-line bg-surface-card px-2 py-2 text-xs text-ink outline-none focus:border-market-deep"><option value="">{placeholder}</option>{options.map(option => <option key={option} value={option}>{labels[option] || `${prefix}${option}`}</option>)}</select>; }
function Grade({ grade }: { grade: string }) { return <Chip tone={grade === 'A' ? 'brand' : grade === 'B' ? 'market' : 'warning'}>Grade {grade}</Chip>; }
function Status({ status, t }: { status: BuyerRequest['status']; t: (key: string) => string }) { return <Chip tone={status === 'accepted' ? 'brand' : status === 'rejected' ? 'warning' : 'neutral'} icon={status === 'pending' ? <Clock3 size={12} /> : <CheckCircle2 size={12} />}>{status === 'pending' ? t('pending') : status === 'accepted' ? t('accepted') : t('rejected')}</Chip>; }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-bold uppercase tracking-wide text-ink-faint">{label}</p><p className="mt-1 font-semibold text-ink">{value}</p></div>; }
function Overlay({ children, onClose }: { children: ReactNode; onClose: () => void }) { return <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/40 px-4 py-8" onClick={event => { if (event.target === event.currentTarget) onClose(); }}><div className="mx-auto max-w-lg rounded-3xl bg-surface-card p-5 shadow-2xl">{children}</div></div>; }
function CloseButton({ onClick }: { onClick: () => void }) { return <button type="button" onClick={onClick} className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-soft"><X size={18} /></button>; }

function matchScore(listing: ProduceListing, buyer: { crops: string[]; preferredGrades: string[]; typicalQuantityQuintals: number; district: string }) {
  const crop = buyer.crops.some(preferred => listing.cropName.toLowerCase().includes(preferred.toLowerCase()) || preferred.toLowerCase().includes(listing.cropName.toLowerCase()));
  const grade = buyer.preferredGrades.includes(listing.grade);
  const quantity = listing.quantityQuintals >= buyer.typicalQuantityQuintals;
  const location = listing.district.toLowerCase() === buyer.district.toLowerCase();
  return Number(crop) * 45 + Number(grade) * 25 + Number(quantity) * 20 + Number(location) * 10 + (listing.qualityScore || 0) / 100;
}