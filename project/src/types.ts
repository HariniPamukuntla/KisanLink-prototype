export type LanguageCode =
  | 'mr' | 'hi' | 'te' | 'en' | 'gu' | 'bn'
  | 'ta' | 'kn' | 'ml' | 'pa' | 'or' | 'as' | 'ur';

export interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
  script: string;
}

export type ConnectivityMode = 'online' | 'call' | 'sms';

export type ScreenTab = 'home' | 'voice' | 'advisor' | 'buyers' | 'groups';

export type View = 'farmer' | 'admin';

export interface TrustMetrics {
  trustScore: number;
  completedDeals: number;
  successfulDeals: number;
  onTimePaymentPct: number;
  avgPaymentDays: number;
  complaints: number;
  farmerRating: number;
  verifiedBusiness: boolean;
}

export interface Transaction {
  id: string;
  buyerId: string;
  crop: string;
  quantity: number;
  pricePerQuintal: number;
  totalValue: number;
  date: string;
  paymentStatus: 'on-time' | 'delayed' | 'pending';
  paymentDays: number;
  rating: number;
}

export interface Buyer {
  id: string;
  name: string;
  type: string;
  location: string;
  distanceKm: number;
  pricePerQuintal: number;
  demandQuintals: number;
  crop: string;
  grade: string;
  trust: TrustMetrics;
  recentTransactions: Transaction[];
}

export interface MarketOption {
  id: string;
  name: string;
  type: 'apmc' | 'buyer';
  location: string;
  distanceKm: number;
  pricePerQuintal: number;
  transportCost: number;
  otherCosts: number;
  trust?: TrustMetrics;
}

export interface GroupFarmer {
  id: string;
  name: string;
  village: string;
  quantity: number;
  joined: boolean;
  isCurrentUser?: boolean;
}

export interface GroupSale {
  id: string;
  buyerId: string;
  buyerName: string;
  crop: string;
  grade: string;
  requiredQuantity: number;
  pricePerQuintal: number;
  buyerLocation: string;
  buyerTrustScore: number;
  farmers: GroupFarmer[];
  status: 'open' | 'confirmed';
}

export interface VoiceExchange {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  language?: LanguageCode;
}

export interface ConnectivityInfo {
  mode: ConnectivityMode;
  label: string;
  description: string;
}
