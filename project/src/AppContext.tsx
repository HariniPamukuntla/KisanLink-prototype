import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { LanguageCode, ConnectivityMode, ScreenTab, View, Buyer, GroupSale, Transaction } from './types';
import { BUYERS, GROUP_SALES } from './data/mockData';
import { t as translate } from './data/translations';

interface AppContextValue {
  // Language
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;

  // Connectivity
  connectivity: ConnectivityMode;
  setConnectivity: (mode: ConnectivityMode) => void;

  // Navigation
  activeTab: ScreenTab;
  setActiveTab: (tab: ScreenTab) => void;

  // View
  view: View;
  setView: (v: View) => void;

  // Auth
  authenticated: boolean;
  setAuthenticated: (a: boolean) => void;

  // Data
  buyers: Buyer[];
  groupSales: GroupSale[];

  // Trust simulation
  simulateTransaction: (buyerId: string, rating: number, onTime: boolean) => void;

  // Group joining
  joinGroup: (groupId: string) => void;
  confirmGroupSale: (groupId: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<LanguageCode>('mr');
  const [connectivity, setConnectivity] = useState<ConnectivityMode>('online');
  const [activeTab, setActiveTab] = useState<ScreenTab>('home');
  const [view, setView] = useState<View>('farmer');
  const [authenticated, setAuthenticated] = useState(false);
  const [buyers, setBuyers] = useState<Buyer[]>(BUYERS);
  const [groupSales, setGroupSales] = useState<GroupSale[]>(GROUP_SALES);

  const t = useCallback((key: string) => translate(language, key), [language]);

  const simulateTransaction = useCallback((buyerId: string, rating: number, onTime: boolean) => {
    setBuyers(prev =>
      prev.map(b => {
        if (b.id !== buyerId) return b;
        const newTxn: Transaction = {
          id: `tx-${Date.now()}`,
          buyerId,
          crop: 'Onion',
          quantity: 20,
          pricePerQuintal: b.pricePerQuintal,
          totalValue: b.pricePerQuintal * 20,
          date: new Date().toISOString().split('T')[0],
          paymentStatus: onTime ? 'on-time' : 'delayed',
          paymentDays: onTime ? 2 : 5,
          rating,
        };

        const allTxns = [...b.recentTransactions, newTxn];
        const completedDeals = b.trust.completedDeals + 1;
        const successfulDeals = b.trust.successfulDeals + (rating >= 4 ? 1 : 0);
        const onTimeCount = allTxns.filter(tx => tx.paymentStatus === 'on-time').length;
        const onTimePaymentPct = Math.round((onTimeCount / allTxns.length) * 100);
        const avgPaymentDays = +(allTxns.reduce((s, tx) => s + tx.paymentDays, 0) / allTxns.length).toFixed(1);
        const ratedTxns = allTxns.filter(tx => tx.rating > 0);
        const farmerRating = +(ratedTxns.reduce((s, tx) => s + tx.rating, 0) / ratedTxns.length).toFixed(1);
        const complaints = b.trust.complaints + (rating <= 2 ? 1 : 0);

        // Recalculate trust score
        let score = 50;
        score += (onTimePaymentPct - 80) * 0.3;
        score += (farmerRating - 3.5) * 8;
        score += Math.min(completedDeals * 0.1, 15);
        score -= complaints * 1.5;
        score -= Math.max(0, avgPaymentDays - 2) * 3;
        if (b.trust.verifiedBusiness) score += 5;
        score = Math.max(0, Math.min(100, Math.round(score)));

        return {
          ...b,
          recentTransactions: allTxns.slice(-10),
          trust: {
            ...b.trust,
            trustScore: score,
            completedDeals,
            successfulDeals,
            onTimePaymentPct,
            avgPaymentDays,
            farmerRating,
            complaints,
          },
        };
      })
    );
  }, []);

  const joinGroup = useCallback((groupId: string) => {
    setGroupSales(prev =>
      prev.map(g => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          farmers: g.farmers.map(f =>
            f.isCurrentUser ? { ...f, joined: true } : f
          ),
        };
      })
    );
  }, []);

  const confirmGroupSale = useCallback((groupId: string) => {
    setGroupSales(prev =>
      prev.map(g => (g.id === groupId ? { ...g, status: 'confirmed' } : g))
    );
  }, []);

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        t,
        connectivity,
        setConnectivity,
        activeTab,
        setActiveTab,
        view,
        setView,
        authenticated,
        setAuthenticated,
        buyers,
        groupSales,
        simulateTransaction,
        joinGroup,
        confirmGroupSale,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
