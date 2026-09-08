import type {
  AccountRole,
  AppProfile,
  AuthSession,
  BuyerProfile,
  FarmerProfile,
  FarmerProduce,
  LanguageCode,
} from '../types';

const ACCOUNTS_KEY = 'kisanlink-accounts';
const CURRENT_USER_KEY = 'kisanlink-current-user';

interface StoredAccount {
  role: AccountRole;
  profile: AppProfile;
  passwordHash: string;
  aadhaarHash?: string;
  mobileKey: string;
  emailKey?: string;
}

export interface RegistrationInput {
  name: string;
  mobile: string;
  email?: string;
  aadhaar: string;
  password: string;
  language: LanguageCode;
  district: string;
}

export interface BuyerRegistrationInput {
  businessName: string;
  mobile: string;
  email?: string;
  password: string;
  language: LanguageCode;
  state: string;
  district: string;
  buyerType: BuyerProfile['buyerType'];
  crops: string[];
  preferredGrades: BuyerProfile['preferredGrades'];
  typicalQuantityQuintals: number;
}

export interface AuthResult {
  ok: boolean;
  error?: string;
  profile?: AppProfile;
  role?: AccountRole;
}

function readAccounts(): StoredAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(ACCOUNTS_KEY) || '[]');
    return Array.isArray(value)
      ? (value as Array<Partial<StoredAccount> & { profile: AppProfile }>).map(account => ({
        ...account,
        role: account.role || ((account.profile as BuyerProfile).role === 'buyer' ? 'buyer' : 'farmer'),
      })) as StoredAccount[]
      : [];
  } catch {
    return [];
  }
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function normalizeIdentifier(value: string) {
  const trimmed = value.trim();
  return trimmed.includes('@') ? normalize(trimmed) : trimmed.replace(/\D/g, '');
}

async function hashValue(value: string) {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
  }
  return normalize(value);
}

function saveAccounts(accounts: StoredAccount[]) {
  window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function saveCurrentProfile(profile: FarmerProfile) {
  window.localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({ role: 'farmer', profile }));
}

function saveCurrentSession(session: AuthSession) {
  window.localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(session));
}

export function getCurrentSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = JSON.parse(window.localStorage.getItem(CURRENT_USER_KEY) || 'null');
    if (value?.profile && value?.role) return value as AuthSession;
    if (value?.id) return { role: 'farmer', profile: value as FarmerProfile };
    return null;
  } catch {
    return null;
  }
}

export function getCurrentProfile(): FarmerProfile | null {
  const session = getCurrentSession();
  return session?.role === 'farmer' ? session.profile as FarmerProfile : null;
}

export function clearCurrentProfile() {
  if (typeof window !== 'undefined') window.localStorage.removeItem(CURRENT_USER_KEY);
}

export async function registerAccount(input: RegistrationInput): Promise<AuthResult> {
  const aadhaar = input.aadhaar.replace(/\D/g, '');
  const mobileKey = normalizeIdentifier(input.mobile);
  const emailKey = input.email?.trim() ? normalize(input.email) : undefined;
  const accounts = readAccounts();
  const aadhaarHash = await hashValue(aadhaar);

  if (accounts.some(account => account.aadhaarHash === aadhaarHash)) {
    return { ok: false, error: 'This Aadhaar number is already associated with an account.' };
  }
  if (accounts.some(account => account.mobileKey === mobileKey || (emailKey && account.emailKey === emailKey))) {
    return { ok: false, error: 'An account already exists with this mobile number or email.' };
  }

  const profile: FarmerProfile = {
    id: `farmer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: input.name.trim(),
    mobile: input.mobile.trim(),
    email: input.email?.trim() || undefined,
    aadhaarLast4: aadhaar.slice(-4),
    district: input.district.trim(),
    language: input.language,
    createdAt: new Date().toISOString(),
  };

  accounts.push({
    role: 'farmer',
    profile,
    passwordHash: await hashValue(input.password),
    aadhaarHash,
    mobileKey,
    emailKey,
  });
  saveAccounts(accounts);
  saveCurrentProfile(profile);
  return { ok: true, profile, role: 'farmer' };
}

export async function loginAccount(identifier: string, password: string): Promise<AuthResult> {
  return loginForRole(identifier, password, 'farmer');
}

export async function registerBuyerAccount(input: BuyerRegistrationInput): Promise<AuthResult> {
  const mobileKey = normalizeIdentifier(input.mobile);
  const emailKey = input.email?.trim() ? normalize(input.email) : undefined;
  const accounts = readAccounts();

  if (accounts.some(account => account.mobileKey === mobileKey || (emailKey && account.emailKey === emailKey))) {
    return { ok: false, error: 'An account already exists with this mobile number or email.' };
  }

  const profile: BuyerProfile = {
    id: `buyer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: 'buyer',
    businessName: input.businessName.trim(),
    mobile: input.mobile.trim(),
    email: input.email?.trim() || undefined,
    state: input.state.trim(),
    district: input.district.trim(),
    buyerType: input.buyerType,
    crops: input.crops.map(crop => crop.trim()).filter(Boolean),
    preferredGrades: input.preferredGrades,
    typicalQuantityQuintals: input.typicalQuantityQuintals,
    language: input.language,
    createdAt: new Date().toISOString(),
    verified: false,
    trust: {
      trustScore: 72,
      completedDeals: 0,
      successfulDeals: 0,
      onTimePaymentPct: 0,
      complaints: 0,
    },
  };

  accounts.push({
    role: 'buyer',
    profile,
    passwordHash: await hashValue(input.password),
    mobileKey,
    emailKey,
  });
  saveAccounts(accounts);
  saveCurrentSession({ role: 'buyer', profile });
  return { ok: true, profile, role: 'buyer' };
}

export async function loginBuyerAccount(identifier: string, password: string): Promise<AuthResult> {
  return loginForRole(identifier, password, 'buyer');
}

async function loginForRole(identifier: string, password: string, role: AccountRole): Promise<AuthResult> {
  const key = normalizeIdentifier(identifier);
  const passwordHash = await hashValue(password);
  const account = readAccounts().find(item => item.role === role && (
    item.mobileKey === key || item.emailKey === key
  ));

  if (!account || account.passwordHash !== passwordHash) {
    return { ok: false, error: 'The login details do not match an account.' };
  }

  saveCurrentSession({ role: account.role, profile: account.profile });
  return { ok: true, profile: account.profile, role: account.role };
}

export function updateStoredLanguage(profile: AppProfile, language: LanguageCode) {
  const accounts = readAccounts();
  const updatedProfile = { ...profile, language };
  const updated = accounts.map(account => (
    account.profile.id === profile.id ? { ...account, profile: updatedProfile } : account
  ));
  saveAccounts(updated);
  saveCurrentSession({ role: 'role' in profile ? 'buyer' : 'farmer', profile: updatedProfile });
  return updatedProfile;
}

export function updateStoredProduce(profile: FarmerProfile, produce: FarmerProduce) {
  const accounts = readAccounts();
  const updatedProfile = { ...profile, produce };
  const updated = accounts.map(account => (
    account.profile.id === profile.id ? { ...account, profile: updatedProfile } : account
  ));
  saveAccounts(updated);
  saveCurrentProfile(updatedProfile);
  return updatedProfile;
}

export function getFarmerProfiles(): FarmerProfile[] {
  return readAccounts()
    .filter(account => account.role === 'farmer')
    .map(account => account.profile as FarmerProfile);
}