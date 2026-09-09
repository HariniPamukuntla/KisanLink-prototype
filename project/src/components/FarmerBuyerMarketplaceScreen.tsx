import { useEffect, useState } from 'react';
import { CheckCircle2, Send, ShieldCheck, Star } from 'lucide-react';
import { useApp } from '../AppContext';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { loadMarket, createBuyerRequest } from '../services/marketService';
import type { Buyer } from '../types';

export function FarmerBuyerMarketplaceScreen() {
  const { profile } = useApp();
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<string[]>([]);
  useEffect(() => { if(!profile)return; setLoading(true); loadMarket('farmer',profile.id).then(data=>{setBuyers(data.buyers);setRequests(data.requests);}).finally(()=>setLoading(false)); },[profile?.id]);
  if(!profile)return null;
  const listingId=profile.produce?.id || `listing-${profile.id}`;
  const send=async(buyer:Buyer)=>{if(!profile.produce)return;setSending(buyer.id);try{await createBuyerRequest({farmer:profile,buyerId:buyer.id,listingId,requestedQuantity:Math.min(profile.produce.quantityQuintals,buyer.demandQuintals),message:`Request from ${profile.name} for ${profile.produce.cropName}.`});setSent(v=>[...v,buyer.id]);}finally{setSending(null);}};
  return <div className="px-4 pt-4 pb-2 sm:px-0"><div className="mb-4"><p className="text-xs font-bold uppercase tracking-wide text-brand-deep">Buyer marketplace</p><h1 className="text-xl font-extrabold text-ink">Connect with buyers</h1><p className="mt-1 text-sm text-ink-soft">Send a request. The buyer can accept or reject it. After acceptance, both sides see each other’s contact details.</p></div>{!profile.produce&&<Card className="mb-4"><p className="font-bold text-ink">Add your produce first</p><p className="mt-1 text-sm text-ink-soft">Your crop, quantity and grade are required before you can send a buyer request.</p></Card>}{loading?<Card>Loading buyers from SQLite…</Card>:<div className="space-y-3">{buyers.map(b=><Card key={b.id}><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft font-extrabold text-brand-deep">{b.name.charAt(0)}</div><div><p className="font-extrabold text-ink">{b.name}</p><p className="text-xs text-ink-soft">{b.type} · {b.location}</p></div></div>{b.trust.verifiedBusiness&&<span className="flex items-center gap-1 text-xs font-bold text-brand-deep"><ShieldCheck size={14}/> Verified</span>}</div><div className="mt-3 grid grid-cols-3 gap-2 text-xs"><div><p className="text-ink-faint">Trust</p><p className="font-bold text-ink">{b.trust.trustScore}</p></div><div><p className="text-ink-faint">Demand</p><p className="font-bold text-ink">{b.demandQuintals} qtl</p></div><div><p className="text-ink-faint">Crops</p><p className="font-bold text-ink">{b.crop}</p></div></div><div className="mt-3 flex items-center justify-between border-t border-line pt-3"><span className="flex items-center gap-1 text-xs text-ink-soft"><Star size={13} className="fill-market text-market"/> {b.trust.farmerRating}</span><Button size="sm" disabled={!profile.produce||sending===b.id||sent.includes(b.id)||requests.some(r=>r.buyerId===b.id&&r.status==='pending')} onClick={()=>send(b)}>{sent.includes(b.id)||requests.some(r=>r.buyerId===b.id&&r.status==='pending')?<><CheckCircle2 size={15}/> Request sent</>:<><Send size={15}/> Send request</>}</Button></div></Card>)}{!buyers.length&&<Card>No buyers available.</Card>}</div>}</div>;
}
