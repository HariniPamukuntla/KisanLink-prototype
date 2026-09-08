import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type {
  LanguageCode,
  ConnectivityMode,
  ScreenTab,
  View,
  Buyer,
  GroupSale,
  Transaction,
  FarmerProfile,
  FarmerProduce,
  HistoryItem,
} from './types';
import { BUYERS, GROUP_SALES } from './data/mockData';
import { t as translate } from './data/translations';
import {
  clearCurrentProfile,
  getCurrentProfile,
  loginAccount,
  registerAccount,
  updateStoredLanguage,
  updateStoredProduce,
  type RegistrationInput,
} from './services/authService';

interface AppContextValue {
  // Language
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;
  profile: FarmerProfile | null;
  setProduce: (produce: FarmerProduce) => void;

  // Connectivity
  connectivity: ConnectivityMode;
  setConnectivity: (mode: ConnectivityMode) => void;

  // Navigation
  activeTab: ScreenTab;
  setActiveTab: (tab: ScreenTab) => void;
  voiceInputMode: 'voice' | 'type';
  setVoiceInputMode: (mode: 'voice' | 'type') => void;

  // View
  view: View;
  setView: (v: View) => void;

  // Auth
  authenticated: boolean;
  setAuthenticated: (a: boolean) => void;
  register: (input: RegistrationInput) => Promise<{ ok: boolean; error?: string }>;
  login: (identifier: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  history: HistoryItem[];
  addHistory: (item: Omit<HistoryItem, 'id' | 'createdAt'>) => void;

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
  const initialProfile = getCurrentProfile();
  const [profile, setProfile] = useState<FarmerProfile | null>(initialProfile);
  const [language, setLanguageState] = useState<LanguageCode>(initialProfile?.language || 'mr');
  const [connectivity, setConnectivity] = useState<ConnectivityMode>('online');
  const [activeTab, setActiveTab] = useState<ScreenTab>('home');
  const [voiceInputMode, setVoiceInputMode] = useState<'voice' | 'type'>('voice');
  const [view, setView] = useState<View>('farmer');
  const [authenticated, setAuthenticatedState] = useState(Boolean(initialProfile));
  const [buyers, setBuyers] = useState<Buyer[]>(BUYERS);
  const [groupSales, setGroupSales] = useState<GroupSale[]>(GROUP_SALES);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    if (typeof window === 'undefined' || !initialProfile) return [];
    try {
      const value = JSON.parse(window.localStorage.getItem(`kisanlink-history:${initialProfile.id}`) || '[]');
      return Array.isArray(value) ? value as HistoryItem[] : [];
    } catch {
      return [];
    }
  });

  const t = useCallback((key: string) => translate(language, key), [language]);

  const setLanguage = useCallback((nextLanguage: LanguageCode) => {
    setLanguageState(nextLanguage);
    setProfile(current => current ? updateStoredLanguage(current, nextLanguage) : current);
  }, []);

  const setProduce = useCallback((produce: FarmerProduce) => {
    setProfile(current => current ? updateStoredProduce(current, produce) : current);
  }, []);

  const applyProfile = useCallback((nextProfile: FarmerProfile) => {
    setProfile(nextProfile);
    setLanguageState(nextProfile.language);
    setAuthenticatedState(true);
    setActiveTab('home');
    setHistory(() => {
      try {
        const value = JSON.parse(window.localStorage.getItem(`kisanlink-history:${nextProfile.id}`) || '[]');
        return Array.isArray(value) ? value as HistoryItem[] : [];
      } catch {
        return [];
      }
    });
  }, []);

  const register = useCallback(async (input: RegistrationInput) => {
    const result = await registerAccount(input);
    if (result.ok && result.profile) applyProfile(result.profile);
    return { ok: result.ok, error: result.error };
  }, [applyProfile]);

  const login = useCallback(async (identifier: string, password: string) => {
    const result = await loginAccount(identifier, password);
    if (result.ok && result.profile) applyProfile(result.profile);
    return { ok: result.ok, error: result.error };
  }, [applyProfile]);

  const logout = useCallback(() => {
    clearCurrentProfile();
    setProfile(null);
    setAuthenticatedState(false);
    setHistory([]);
    setActiveTab('home');
    setVoiceInputMode('voice');
  }, []);

  const updateAuthenticated = useCallback((value: boolean) => {
    if (value && profile) {
      setAuthenticatedState(true);
      return;
    }
    logout();
  }, [logout, profile]);

  const addHistory = useCallback((item: Omit<HistoryItem, 'id' | 'createdAt'>) => {
    if (!profile) return;
    const nextItem: HistoryItem = {
      ...item,
      id: `history-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    setHistory(previous => {
      const next = [nextItem, ...previous].slice(0, 100);
      window.localStorage.setItem(`kisanlink-history:${profile.id}`, JSON.stringify(next));
      return next;
    });
  }, [profile]);

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
        profile,
        setProduce,
        connectivity,
        setConnectivity,
        activeTab,
        setActiveTab,
        voiceInputMode,
        setVoiceInputMode,
        view,
        setView,
        authenticated,
        setAuthenticated: updateAuthenticated,
        register,
        login,
        logout,
        history,
        addHistory,
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
