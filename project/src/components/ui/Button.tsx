import type { ReactNode, ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'market' | 'trust';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary: 'bg-brand-deep text-white hover:bg-brand-mid active:bg-brand-deep shadow-sm',
  secondary: 'bg-brand-soft text-brand-deep hover:bg-brand-tint active:bg-brand-soft',
  ghost: 'bg-transparent text-ink-soft hover:bg-surface-alt active:bg-surface-alt',
  outline: 'bg-transparent border border-line text-ink hover:border-ink-faint hover:bg-surface-alt',
  market: 'bg-market text-white hover:bg-market-deep active:bg-market shadow-sm',
  trust: 'bg-trust text-white hover:bg-trust-deep active:bg-trust shadow-sm',
};

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-xl gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-2xl gap-2',
  lg: 'px-6 py-3.5 text-base rounded-2xl gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  fullWidth,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-semibold transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100 ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
