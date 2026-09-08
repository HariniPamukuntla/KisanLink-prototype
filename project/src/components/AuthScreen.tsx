import { useState, type ReactNode, type FormEvent } from 'react';
import { Eye, EyeOff, MapPin, Sprout, UserPlus, LogIn } from 'lucide-react';
import { useApp } from '../AppContext';
import { Button } from './ui/Button';
import { LANGUAGES } from '../data/languages';
import type { LanguageCode } from '../types';

type AuthMode = 'login' | 'register';

export function AuthScreen() {
  const { register, login } = useApp();
  const [mode, setMode] = useState<AuthMode>('login');
  const [language, setLocalLanguage] = useState<LanguageCode>('mr');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [farmerName, setFarmerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [district, setDistrict] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const enterDemo = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (mode === 'register') {
      if (!farmerName.trim() || !mobile.trim() || !district.trim()) {
        setError('Please enter your name, mobile number, and district.');
        return;
      }
      if (!/^\d{10}$/.test(mobile.replace(/\D/g, ''))) {
        setError('Enter a valid 10-digit mobile number.');
        return;
      }
      if (!/^\d{12}$/.test(aadhaar)) {
        setError('Enter a valid 12-digit Aadhaar number.');
        return;
      }
    } else if (!identifier.trim()) {
      setError('Enter your phone number or email to continue.');
      return;
    }
    if (!password.trim()) {
      setError('Enter a password to continue.');
      return;
    }
    const result = mode === 'register'
      ? await register({ name: farmerName, mobile, email, aadhaar, password, language, district })
      : await login(identifier, password);
    if (!result.ok) setError(result.error || 'Unable to continue.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-tint via-surface to-surface px-4 py-8 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-deep shadow-brand-glow">
            <Sprout size={34} className="text-white" strokeWidth={2.2} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-brand-deep">KisanLink</h1>
          <p className="mt-1 text-sm text-ink-soft">Market Intelligence for Farmers</p>
        </div>

        <div className="card">
          <div className="mb-5 flex rounded-2xl bg-surface-alt p-1">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors ${mode === 'login' ? 'bg-white text-brand-deep shadow-sm' : 'text-ink-soft'}`}
            >
              <LogIn size={16} className="mr-1.5 inline" /> Login
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); }}
              className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors ${mode === 'register' ? 'bg-white text-brand-deep shadow-sm' : 'text-ink-soft'}`}
            >
              <UserPlus size={16} className="mr-1.5 inline" /> Create Account
            </button>
          </div>

          <div className="mb-5">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-ink-soft">Preferred language</label>
            <div className="grid grid-cols-4 gap-2">
              {(['mr', 'hi', 'te', 'en'] as LanguageCode[]).map(code => {
                const item = LANGUAGES.find(lang => lang.code === code)!;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLocalLanguage(code)}
                    className={`rounded-xl border px-2 py-2 text-sm font-semibold transition-colors ${language === code ? 'border-brand-deep bg-brand-soft text-brand-deep' : 'border-line bg-surface-card text-ink-soft'}`}
                  >
                    {item.nativeName}
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={enterDemo} className="space-y-3.5">
            {mode === 'register' && (
              <>
                <Field label="Farmer name" value={farmerName} onChange={setFarmerName} placeholder="Enter your full name" />
                <Field label="Mobile number" value={mobile} onChange={setMobile} placeholder="10-digit mobile number" inputMode="tel" />
                <Field label="Email (optional)" value={email} onChange={setEmail} placeholder="you@example.com" type="email" />
                <Field
                  label="Aadhaar number"
                  value={aadhaar}
                  onChange={value => setAadhaar(value.replace(/\D/g, '').slice(0, 12))}
                  placeholder="12-digit Aadhaar number"
                  inputMode="numeric"
                  maxLength={12}
                />
                <Field label="Location / district" value={district} onChange={setDistrict} placeholder="e.g. Nashik" icon={<MapPin size={16} />} />
                <p className="rounded-xl bg-surface-alt px-3 py-2 text-[11px] leading-relaxed text-ink-soft">
                  Demo verification only. Aadhaar is used to associate this prototype account and is never shown in full later.
                </p>
              </>
            )}
            {mode === 'login' && (
              <Field label="Phone number or email" value={identifier} onChange={setIdentifier} placeholder="Enter phone or email" autoComplete="username" />
            )}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-ink-soft">Password</label>
              <div className="relative">
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  placeholder="Enter password"
                  className="w-full rounded-2xl border border-line bg-surface-card px-4 py-3 pr-11 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-brand-mid"
                />
                <button type="button" onClick={() => setShowPassword(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-warning">{error}</p>}
            <Button size="lg" fullWidth type="submit">
              {mode === 'login' ? 'Login to KisanLink' : 'Create demo account'}
            </Button>
          </form>

          {mode === 'login' && (
            <button type="button" onClick={() => setError('Password recovery will be connected when a real authentication provider is configured.')} className="mt-4 block w-full text-center text-sm font-semibold text-brand-deep">
              Forgot Password?
            </button>
          )}
          <p className="mt-4 text-center text-[11px] leading-relaxed text-ink-faint">
             Prototype account mode: your login, selected language, and account history are stored locally in this browser.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  inputMode,
  icon,
  autoComplete,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  inputMode?: 'text' | 'tel' | 'email' | 'numeric';
  icon?: ReactNode;
  autoComplete?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-ink-soft">{label}</label>
      <div className="relative">
        <input
          required={label !== 'Email (optional)'}
          type={type}
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
          autoComplete={autoComplete || (label === 'Email (optional)' ? 'email' : label === 'Mobile number' ? 'tel' : undefined)}
          maxLength={maxLength}
          className={`w-full rounded-2xl border border-line bg-surface-card px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-brand-mid ${icon ? 'pr-10' : ''}`}
        />
        {icon && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint">{icon}</span>}
      </div>
    </div>
  );
}