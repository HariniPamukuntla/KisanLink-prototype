import { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, XCircle, Check, X } from 'lucide-react';
import { useApp } from '../AppContext';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { loadMarket, respondToBuyerRequest } from '../services/marketService';
import type { BuyerRequest } from '../types';

type LinkedRequest = BuyerRequest & {
  buyerName?: string;
  buyerMobile?: string;
  buyerEmail?: string;
  buyerDistrict?: string;
  buyerState?: string;
  message?: string;
  requesterRole?: 'buyer' | 'farmer';
};

export function FarmerConnectionsScreen() {
  const { profile } = useApp();
  const [requests, setRequests] = useState<LinkedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = async () => {
    if (!profile) return;
    try {
      const data = await loadMarket('farmer', profile.id);
      setRequests(data.requests as LinkedRequest[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    if (!profile) return;
    const timer = window.setInterval(() => void refresh(), 3000);
    return () => window.clearInterval(timer);
  }, [profile?.id]);

  const respond = async (request: LinkedRequest, status: 'accepted' | 'rejected') => {
    if (!profile) return;
    setBusy(request.id);
    try {
      await respondToBuyerRequest(request.id, profile.id, 'farmer', status);
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  if (!profile) return null;

  return (
    <div className="px-4 pt-4 pb-2 sm:px-0">
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-wide text-brand-deep">KisanLink</p>
        <h1 className="text-xl font-extrabold text-ink">Farmer–Buyer Connections</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Buyer requests arrive here automatically. You decide whether to accept or reject them.
          Requests you start wait for the buyer.
        </p>
      </div>

      {loading ? (
        <Card>Loading connections…</Card>
      ) : requests.length === 0 ? (
        <Card>
          <p className="font-bold text-ink">No connection requests yet.</p>
          <p className="mt-1 text-sm text-ink-soft">
            When a buyer requests one of your listings, it will appear here.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <Card key={request.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-extrabold text-ink">{request.buyerName || 'Buyer'}</p>
                  <p className="mt-1 text-sm text-ink-soft">
                    {request.cropName} · {request.requestedQuantity} qtl · Grade {request.grade}
                  </p>
                  <p className="mt-1 text-xs text-ink-faint">
                    {request.buyerDistrict || ''}
                    {request.buyerState ? `, ${request.buyerState}` : ''}
                  </p>
                </div>
                <Status status={request.status} />
              </div>

              {request.message && (
                <p className="mt-3 rounded-xl bg-surface-alt p-3 text-sm text-ink-soft">
                  {request.message}
                </p>
              )}

              {request.status === 'pending' && request.requesterRole === 'buyer' && (
                <>
                  <div className="mt-3 rounded-xl bg-market-soft p-3 text-xs font-semibold text-market-deep">
                    <CheckCircle2 size={14} className="mr-1 inline" />
                    This request was sent by the buyer. Accept it here to create the connection.
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => void respond(request, 'accepted')}
                      disabled={busy === request.id}
                    >
                      <Check size={15} /> Accept buyer request
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void respond(request, 'rejected')}
                      disabled={busy === request.id}
                    >
                      <X size={15} /> Reject
                    </Button>
                  </div>
                </>
              )}

              {request.status === 'pending' && request.requesterRole === 'farmer' && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-caution/10 p-3 text-xs font-semibold text-caution">
                  <Clock3 size={15} />
                  You sent this request · waiting for the buyer to respond.
                </div>
              )}

              {request.status === 'accepted' && (
                <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl bg-brand-soft p-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-ink-soft">Buyer business</p>
                    <p className="font-bold text-ink">{request.buyerName || 'Buyer'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-soft">Mobile</p>
                    <p className="font-bold text-ink">{request.buyerMobile || 'Not available'}</p>
                  </div>
                  {request.buyerEmail && (
                    <div>
                      <p className="text-xs text-ink-soft">Email</p>
                      <p className="font-bold text-ink">{request.buyerEmail}</p>
                    </div>
                  )}
                </div>
              )}

              {request.status === 'rejected' && (
                <p className="mt-3 text-xs font-semibold text-warning">
                  This connection was rejected.
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Status({ status }: { status: BuyerRequest['status'] }) {
  if (status === 'accepted') {
    return (
      <span className="flex items-center gap-1 rounded-full bg-brand-soft px-2 py-1 text-xs font-bold text-brand-deep">
        <CheckCircle2 size={14} /> Accepted
      </span>
    );
  }

  if (status === 'rejected') {
    return (
      <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-bold text-red-600">
        <XCircle size={14} /> Rejected
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 rounded-full bg-caution/10 px-2 py-1 text-xs font-bold text-caution">
      <Clock3 size={14} /> Pending
    </span>
  );
}
