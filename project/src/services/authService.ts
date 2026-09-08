import type { FarmerProfile, FarmerProduce, LanguageCode } from '../types';

const ACCOUNTS_KEY = 'kisanlink-accounts';
const CURRENT_USER_KEY = 'kisanlink-current-user';

interface StoredAccount {
  profile: FarmerProfile;
  passwordHash: string;
  aadhaarHash: string;
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

export interface AuthResult {
  ok: boolean;
  error?: string;
  profile?: FarmerProfile;
}

function readAccounts(): StoredAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(ACCOUNTS_KEY) || '[]');
    return Array.isArray(value) ? value as StoredAccount[] : [];
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
  window.localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(profile));
}

export function getCurrentProfile(): FarmerProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = JSON.parse(window.localStorage.getItem(CURRENT_USER_KEY) || 'null');
    return value && typeof value.id === 'string' ? value as FarmerProfile : null;
  } catch {
    return null;
  }
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
    profile,
    passwordHash: await hashValue(input.password),
    aadhaarHash,
    mobileKey,
    emailKey,
  });
  saveAccounts(accounts);
  saveCurrentProfile(profile);
  return { ok: true, profile };
}

export async function loginAccount(identifier: string, password: string): Promise<AuthResult> {
  const key = normalizeIdentifier(identifier);
  const passwordHash = await hashValue(password);
  const account = readAccounts().find(item => (
    item.mobileKey === key || item.emailKey === key
  ));

  if (!account || account.passwordHash !== passwordHash) {
    return { ok: false, error: 'The login details do not match an account.' };
  }

  saveCurrentProfile(account.profile);
  return { ok: true, profile: account.profile };
}

export function updateStoredLanguage(profile: FarmerProfile, language: LanguageCode) {
  const accounts = readAccounts();
  const updatedProfile = { ...profile, language };
  const updated = accounts.map(account => (
    account.profile.id === profile.id ? { ...account, profile: updatedProfile } : account
  ));
  saveAccounts(updated);
  saveCurrentProfile(updatedProfile);
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