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
export type AccountRole = 'farmer' | 'buyer';

export type ScreenTab = 'home' | 'voice' | 'advisor' | 'buyers' | 'groups' | 'history';

export type View = 'farmer' | 'admin';

export interface FarmerProfile {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  aadhaarLast4: string;
  district: string;
  language: LanguageCode;
  createdAt: string;
  produce?: FarmerProduce;
}

export interface FarmerProduce {
  id?: string;
  farmerId?: string;
  farmerName?: string;
  district?: string;
  state?: string;
  cropName: string;
  variety?: string;
  quantityQuintals: number;
  grade: 'A' | 'B' | 'C';
  qualityScore?: number;
  harvestDate?: string;
  assessedAt?: string;
  expectedPricePerQuintal?: number;
  photos?: string[];
  qualityConfidence?: 'high' | 'medium' | 'low';
}

export interface BuyerProfile {
  id: string;
  role: 'buyer';
  businessName: string;
  mobile: string;
  email?: string;
  state: string;
  district: string;
  buyerType: 'Wholesaler' | 'Retailer' | 'Processor' | 'Other';
  crops: string[];
  preferredGrades: Array<'A' | 'B' | 'C'>;
  typicalQuantityQuintals: number;
  language: LanguageCode;
  createdAt: string;
  verified: boolean;
  trust: {
    trustScore: number;
    completedDeals: number;
    successfulDeals: number;
    onTimePaymentPct: number;
    complaints: number;
  };
}

export type AppProfile = FarmerProfile | BuyerProfile;

export interface AuthSession {
  role: AccountRole;
  profile: AppProfile;
}

export interface BuyerRequest {
  id: string;
  buyerId: string;
  listingId: string;
  cropName: string;
  farmerName: string;
  requestedQuantity: number;
  expectedPricePerQuintal?: number;
  grade: 'A' | 'B' | 'C';
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export type ProduceListing = FarmerProduce & {
  id: string;
  farmerId: string;
  farmerName: string;
  district: string;
  state: string;
  expectedPricePerQuintal: number;
};

export type HistoryType = 'conversation' | 'quality' | 'recommendation' | 'buyer';

export interface HistoryItem {
  id: string;
  type: HistoryType;
  title: string;
  summary: string;
  result: string;
  createdAt: string;
  details: string[];
}

export interface CropQualityInput {
  cropName: string;
  variety: string;
  harvestDate: string;
  quantityQuintals: number;
  storageCondition: string;
  storageLocation: string;
  handlingNotes: string;
}

export interface CropQualityResult {
  grade: 'A' | 'B' | 'C';
  score: number;
  reasoning: string;
  visibleObservations: string[];
  freshnessAssessment: string;
  recommendations: string[];
  sellingRecommendation: string;
  confidence: 'high' | 'medium' | 'low';
}

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
