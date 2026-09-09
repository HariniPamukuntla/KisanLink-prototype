import { useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, Eye, EyeOff, MapPin, ShoppingCart, UserPlus, LogIn } from 'lucide-react';
import { useApp } from '../AppContext';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { LANGUAGES } from '../data/languages';
import type { BuyerProfile, LanguageCode } from '../types';

type AuthMode = 'login' | 'register';
function formatAadhaar(value:string){return value.replace(/\D/g,'').slice(0,12).replace(/(.{4})/g,'$1-').replace(/-$/,'');}
function rawAadhaar(value:string){return value.replace(/\D/g,'');}

export function BuyerAuthScreen({ initialLanguage, onBack }: { initialLanguage: LanguageCode; onBack: () => void }) {
  const { registerBuyer, loginBuyer, t } = useApp();
  const [mode, setMode] = useState<AuthMode>('login');
  const [language, setLanguage] = useState<LanguageCode>(initialLanguage);
  const [identifier, setIdentifier] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [buyerType, setBuyerType] = useState<BuyerProfile['buyerType']>('Wholesaler');
  const [crops, setCrops] = useState('');
  const [grades, setGrades] = useState<Array<'A' | 'B' | 'C'>>(['A']);
  const [quantity, setQuantity] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    if (mode === 'register') {
      const cleanAadhaar=rawAadhaar(aadhaar);
      if (!businessName.trim() || !mobile.trim() || !state.trim() || !district.trim() || !crops.trim()) { setError('Please complete your business, mobile, location, and crop preferences.'); return; }
      if (!/^\d{10}$/.test(mobile.replace(/\D/g, ''))) { setError('Enter a valid 10-digit mobile number.'); return; }
      if (!/^\d{12}$/.test(cleanAadhaar)) { setError('Enter a valid 12-digit Aadhaar number.'); return; }
      if (password.length < 6) { setError('Use a password with at least 6 characters.'); return; }
      if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
      if (!Number(quantity) || Number(quantity) <= 0) { setError('Enter a typical quantity greater than zero.'); return; }
    } else if (!identifier.trim() || !password.trim()) { setError('Enter your phone, email, or Aadhaar number and password to continue.'); return; }
    setBusy(true);
    const result = mode === 'register'
      ? await registerBuyer({ businessName, mobile, email, aadhaar:rawAadhaar(aadhaar), password, language, state, district, buyerType, crops: crops.split(','), preferredGrades: grades, typicalQuantityQuintals: Number(quantity) })
      : await loginBuyer(identifier, password);
    setBusy(false); if (!result.ok) setError(result.error || 'Unable to continue.');
  };

  return <div className="min-h-screen bg-gradient-to-b from-market-soft via-surface to-surface px-4 py-8 sm:py-12"><div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center"><button type="button" onClick={onBack} className="mb-4 flex items-center gap-2 self-start text-sm font-bold text-ink-soft hover:text-market-deep"><ArrowLeft size={17} /> {t('changeRole')}</button><div className="mb-6 text-center"><div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-market-deep shadow-brand-glow"><ShoppingCart size={32} className="text-white" /></div><h1 className="text-3xl font-extrabold tracking-tight text-market-deep">{t('buyerPortal')}</h1><p className="mt-1 text-sm text-ink-soft">{t('buyerTagline')}</p></div><Card><div className="mb-5 flex rounded-2xl bg-surface-alt p-1"><button type="button" onClick={() => { setMode('login'); setError(''); }} className={`flex-1 rounded-xl py-2.5 text-sm font-bold ${mode === 'login' ? 'bg-white text-market-deep shadow-sm' : 'text-ink-soft'}`}><LogIn size={16} className="mr-1.5 inline" /> {t('login')}</button><button type="button" onClick={() => { setMode('register'); setError(''); }} className={`flex-1 rounded-xl py-2.5 text-sm font-bold ${mode === 'register' ? 'bg-white text-market-deep shadow-sm' : 'text-ink-soft'}`}><UserPlus size={16} className="mr-1.5 inline" /> {t('createAccount')}</button></div><div className="mb-5"><label className="mb-2 block text-xs font-bold uppercase tracking-wide text-ink-soft">{t('preferredLanguage')}</label><div className="grid grid-cols-4 gap-2">{(['mr', 'hi', 'te', 'en'] as LanguageCode[]).map(code => {const item = LANGUAGES.find(lang => lang.code === code)!;return <button key={code} type="button" onClick={() => setLanguage(code)} className={`rounded-xl border px-2 py-2 text-sm font-semibold ${language === code ? 'border-market-deep bg-market-soft text-market-deep' : 'border-line bg-surface-card text-ink-soft'}`}>{item.nativeName}</button>;})}</div></div><form onSubmit={submit} className="space-y-3.5">{mode === 'register' ? <><Field label={t('businessName')} value={businessName} onChange={setBusinessName} placeholder={t('businessNamePlaceholder')} /><div className="grid gap-3 sm:grid-cols-2"><Field label={t('mobileNumber')} value={mobile} onChange={setMobile} placeholder="10-digit mobile" inputMode="tel" /><Field label={t('emailOptional')} value={email} onChange={setEmail} placeholder="you@example.com" type="email" required={false} /></div><Field label="Aadhaar number (one-time verification)" value={aadhaar} onChange={value=>setAadhaar(formatAadhaar(value))} placeholder="XXXX-XXXX-XXXX" inputMode="numeric" maxLength={14} /><div className="grid gap-3 sm:grid-cols-2"><Field label={t('state')} value={state} onChange={setState} placeholder={t('statePlaceholder')} /><Field label={t('districtLocation')} value={district} onChange={setDistrict} placeholder={t('districtPlaceholder')} icon={<MapPin size={16} />} /></div><SelectField label={t('buyerType')} value={buyerType} onChange={value => setBuyerType(value as BuyerProfile['buyerType'])} options={['Wholesaler', 'Retailer', 'Processor', 'Other']} /><Field label={t('cropsPurchased')} value={crops} onChange={setCrops} placeholder={t('cropsPlaceholder')} /><div><span className="mb-1.5 block text-xs font-bold text-ink-soft">{t('preferredGrades')}</span><div className="grid grid-cols-3 gap-2">{(['A', 'B', 'C'] as const).map(grade => <button type="button" key={grade} onClick={() => setGrades(previous => previous.includes(grade) ? previous.filter(item => item !== grade) : [...previous, grade])} className={`rounded-xl border py-2 text-sm font-bold ${grades.includes(grade) ? 'border-brand-deep bg-brand-soft text-brand-deep' : 'border-line text-ink-soft'}`}>Grade {grade}</button>)}</div></div><Field label={t('typicalQuantity')} value={quantity} onChange={setQuantity} placeholder="e.g. 100" type="number" inputMode="numeric" /></> : <><Field label="Phone, email, or Aadhaar number" value={identifier} onChange={value=>setIdentifier(value)} placeholder="Mobile / email / XXXX-XXXX-XXXX" autoComplete="username" /></>}<div><label className="mb-1.5 block text-xs font-bold text-ink-soft">{t('password')}</label><div className="relative"><input required type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} placeholder={t('passwordPlaceholder')} className="w-full rounded-2xl border border-line bg-surface-card px-4 py-3 pr-11 text-sm text-ink outline-none focus:border-market-deep"/><button type="button" onClick={() => setShowPassword(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>{mode === 'register' && <Field label={t('confirmPassword')} value={confirmPassword} onChange={setConfirmPassword} placeholder={t('confirmPasswordPlaceholder')} type="password" />}{error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-warning">{error}</p>}<Button size="lg" fullWidth type="submit" disabled={busy}>{busy ? t('processing') : mode === 'login' ? t('loginAsBuyer') : t('createBuyerAccount')}</Button></form><p className="mt-4 text-center text-[11px] leading-relaxed text-ink-faint">Aadhaar is collected once for account verification and login; only a secure hash is stored by this prototype.</p></Card></div></div>;
}

function Field({label,value,onChange,placeholder,type='text',inputMode,icon,required=true,autoComplete,maxLength}:{label:string;value:string;onChange:(value:string)=>void;placeholder:string;type?:string;inputMode?:'text'|'tel'|'email'|'numeric';icon?:ReactNode;required?:boolean;autoComplete?:string;maxLength?:number}){return <label className="block"><span className="mb-1.5 block text-xs font-bold text-ink-soft">{label}</span><div className="relative"><input required={required} maxLength={maxLength} type={type} value={value} onChange={event=>onChange(event.target.value)} placeholder={placeholder} inputMode={inputMode} autoComplete={autoComplete} className={`w-full rounded-2xl border border-line bg-surface-card px-4 py-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-market-deep ${icon?'pr-10':''}`}/>{icon&&<span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint">{icon}</span>}</div></label>}
function SelectField({label,value,onChange,options}:{label:string;value:string;onChange:(value:string)=>void;options:string[]}){return <label className="block"><span className="mb-1.5 block text-xs font-bold text-ink-soft">{label}</span><select value={value} onChange={event=>onChange(event.target.value)} className="w-full rounded-2xl border border-line bg-surface-card px-4 py-3 text-sm text-ink outline-none focus:border-market-deep">{options.map(option=><option key={option}>{option}</option>)}</select></label>}
